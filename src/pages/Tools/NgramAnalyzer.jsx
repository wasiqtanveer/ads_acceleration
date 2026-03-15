import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
    Upload, Download, X, AlertCircle, FileSpreadsheet,
    Search, BarChart3, Hash, DollarSign, ShoppingCart,
    TrendingUp, TrendingDown, AlertTriangle, Filter,
    ChevronUp, ChevronDown, Eye, Trash2
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import './NgramAnalyzer.css';
import RegistrationModal from '../../components/ui/RegistrationModal';
import ConsultationCard from '../../components/ui/ConsultationCard';
import useRegistration from '../../context/useRegistration';

// ======================================
// HELPERS
// ======================================
const fmtNum = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtCur = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => (Number(n) * 100).toFixed(2) + '%';

function extractNGrams(words, n) {
    const grams = new Set();
    for (let k = 0; k <= words.length - n; k++) {
        grams.add(words.slice(k, k + n).join(' '));
    }
    return grams;
}

const COLUMN_DEFINITIONS = {
    searchTerm:  { label: 'Search term', aliases: ['search term', 'customer search term', 'query'] },
    asin:        { label: 'Advertised product ID', aliases: ['advertised product id', 'asin', 'product id'] },
    impressions: { label: 'Impressions', aliases: ['impressions', 'total impressions'] },
    clicks:      { label: 'Clicks', aliases: ['clicks'] },
    purchases:   { label: 'Purchases', aliases: ['purchases', '7 day total orders', '7-day total orders', 'orders', 'purchases'] },
    sales:       { label: 'Sales', aliases: ['sales', '7 day total sales', '7-day total sales'] },
    cost:        { label: 'Total cost', aliases: ['total cost', 'spend', 'cost'] },
    units:       { label: 'Units sold', aliases: ['units sold', '7 day total units', '7-day total units', 'units'] },
    matchType:   { label: 'Target match type', aliases: ['target match type', 'match type', 'targeting match type'] },
};

const REQUIRED_KEYS = ['searchTerm', 'impressions', 'clicks', 'purchases', 'sales', 'cost', 'units'];

function findColumnMapping(headers) {
    const mapping = {};
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
    
    Object.entries(COLUMN_DEFINITIONS).forEach(([key, def]) => {
        // Find best match in aliases
        for (const alias of def.aliases) {
            const idx = lowerHeaders.indexOf(alias);
            if (idx !== -1) {
                mapping[key] = headers[idx];
                break;
            }
        }
    });
    return mapping;
}

// Parse a value that may be a number or a string like "$1,234.56"
function parseNum(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    // Handle percentages or currency
    const cleaned = String(val).replace(/[$€£,%\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

// Helper: determine if a phrase is in the set of keywords by match type
function buildKeywordSet(normalizedRows) {
    const exact = new Set(), phrase = new Set(), broad = new Set(), auto = new Set();
    for (const row of normalizedRows) {
        const mt = String(row.matchType || '').toLowerCase().trim();
        const term = String(row.searchTerm || '').toLowerCase().trim();
        if (!term) continue;
        if (mt === 'exact') exact.add(term);
        else if (mt === 'phrase') phrase.add(term);
        else if (mt === 'broad') broad.add(term);
        else if (mt.includes('auto') || mt === '') auto.add(term);
    }
    return { exact, phrase, broad, auto };
}

// ======================================
// ITALIAN STOPWORDS
// ======================================
const DEFAULT_STOPWORDS = 'di, il, la, le, gli, i, un, una, uno, da, del, della, delle, dei, degli, al, alla, alle, agli, nel, nella, a, con, per, su, tra, fra, e, o, è, che, in, si, non, lo, ne, ci, ma, se, ad, ed';

// ======================================
// COMPONENT
// ======================================
const NgramAnalyzer = () => {
    const { isRegistered } = useRegistration();
    const [showRegModal, setShowRegModal] = useState(false);

    // File + Data
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState('');
    const [rawRows, setRawRows] = useState([]);
    const [allAsins, setAllAsins] = useState([]);
    const [selectedAsin, setSelectedAsin] = useState('__ALL__');

    // Coverage
    const [keywordSets, setKeywordSets] = useState(null);

    // N-gram results: { 1: [...], 2: [...], 3: [...], 4: [...] }
    const [ngramResults, setNgramResults] = useState(null);

    // Stopwords
    const [stopwordsEnabled, setStopwordsEnabled] = useState(false);
    const [stopwordsRaw, setStopwordsRaw] = useState(DEFAULT_STOPWORDS);
    const [settingsChanged, setSettingsChanged] = useState(false);

    // UI
    const [activeTab, setActiveTab] = useState(1);
    const [exactMatch, setExactMatch] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'cost', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [columnFilters, setColumnFilters] = useState({});
    const [filtersVisible, setFiltersVisible] = useState(false);
    const itemsPerPage = 100;

    const fileInputRef = useRef(null);

    // ======================================
    // FILE UPLOAD & PARSE
    // ======================================
    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        const name = uploadedFile.name.toLowerCase();
        if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
            setError('Please upload a CSV or Excel (.xlsx / .xls) file.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setError('');
        setFile(uploadedFile);
        setIsParsing(true);
        setNgramResults(null);

        if (name.endsWith('.csv')) {
            Papa.parse(uploadedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => processRows(result.data),
                error: () => {
                    setError('Failed to parse CSV file.');
                    setIsParsing(false);
                }
            });
        } else {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const wb = XLSX.read(evt.target.result, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
                    processRows(data);
                } catch {
                    setError('Failed to parse Excel file.');
                    setIsParsing(false);
                }
            };
            reader.readAsArrayBuffer(uploadedFile);
        }
    };

    const processRows = (data) => {
        if (!data || data.length === 0) {
            setError('No data found in the file.');
            setIsParsing(false);
            return;
        }

        // Validate columns using aliases
        const headers = Object.keys(data[0]);
        const mapping = findColumnMapping(headers);
        const missingKeys = REQUIRED_KEYS.filter(k => !mapping[k]);
        
        if (missingKeys.length > 0) {
            const missingLabels = missingKeys.map(k => COLUMN_DEFINITIONS[k].label);
            setError(`Missing required columns: ${missingLabels.join(', ')}. Please ensure your report has these headers or equivalents like 'Spend' or 'Orders'.`);
            setIsParsing(false);
            return;
        }

        // Normalize the data so internal keys are used
        const normalized = data.map(row => {
            const r = {};
            Object.entries(mapping).forEach(([key, actualHeader]) => {
                r[key] = row[actualHeader];
            });
            // Carry over any other needed fields if they exist
            return r;
        });

        // Extract unique ASINs
        const asinSet = new Set();
        normalized.forEach(row => {
            const asinVal = String(row.asin || '').trim();
            if (asinVal) asinSet.add(asinVal);
        });

        setRawRows(normalized);
        setAllAsins(Array.from(asinSet).sort());
        setSelectedAsin('__ALL__');
        setKeywordSets(null);
        setIsParsing(false);
    };

    // ======================================
    // RUN ANALYSIS
    // ======================================
    const stopwordsSet = useMemo(() => {
        return new Set(
            stopwordsRaw.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)
        );
    }, [stopwordsRaw]);

    const runAnalysis = useCallback(() => {
        setIsParsing(true);
        setError('');
        setSettingsChanged(false);

        // snapshot stopwords at run time so closure is stable
        const activeStopwords = stopwordsEnabled
            ? new Set(stopwordsRaw.split(',').map(w => w.trim().toLowerCase()).filter(Boolean))
            : null;

        // Use setTimeout to allow the spinner to render
        setTimeout(() => {
            // Filter rows by selected ASIN
            const filtered = selectedAsin === '__ALL__'
                ? rawRows
                : rawRows.filter(r => String(r['Advertised product ID'] || '').trim() === selectedAsin);

            if (filtered.length === 0) {
                setError('No data found for the selected ASIN.');
                setIsParsing(false);
                return;
            }

            // Step 1: Aggregate by search term
            const termMap = {};
            for (const row of filtered) {
                const term = String(row.searchTerm || '').trim().toLowerCase();
                if (!term) continue;

                const imp = parseNum(row.impressions);
                const clk = parseNum(row.clicks);
                const pur = parseNum(row.purchases);
                const sal = parseNum(row.sales);
                const cst = parseNum(row.cost);
                const unt = parseNum(row.units);

                if (!termMap[term]) termMap[term] = { i: 0, c: 0, p: 0, s: 0, co: 0, u: 0 };
                const t = termMap[term];
                t.i += imp; t.c += clk; t.p += pur; t.s += sal; t.co += cst; t.u += unt;
            }

            // Step 2: Generate n-grams (1 through 4)
            const store = { 1: {}, 2: {}, 3: {}, 4: {} };
            const uniqueTerms = Object.keys(termMap);

            for (const fullTerm of uniqueTerms) {
                const stats = termMap[fullTerm];
                let words = fullTerm.split(/\s+/).filter(Boolean);
                // Strip stopwords before n-gram generation if enabled
                if (activeStopwords) {
                    words = words.filter(w => !activeStopwords.has(w));
                }
                if (words.length === 0) continue;

                for (let n = 1; n <= 4; n++) {
                    if (words.length < n) continue;
                    const grams = extractNGrams(words, n);
                    for (const gram of grams) {
                        if (!store[n][gram]) store[n][gram] = { termCount: 0, i: 0, c: 0, p: 0, s: 0, co: 0, u: 0 };
                        const bucket = store[n][gram];
                        bucket.termCount += 1;
                        bucket.i += stats.i;
                        bucket.c += stats.c;
                        bucket.p += stats.p;
                        bucket.s += stats.s;
                        bucket.co += stats.co;
                        bucket.u += stats.u;
                    }
                }
            }

            // Step 3: Convert to arrays with computed metrics
            const results = {};
            for (let n = 1; n <= 4; n++) {
                const arr = Object.entries(store[n]).map(([phrase, d]) => ({
                    phrase,
                    freq: d.termCount,
                    impressions: d.i,
                    clicks: d.c,
                    cost: d.co,
                    sales: d.s,
                    orders: d.p,
                    units: d.u,
                    ctr: d.i > 0 ? d.c / d.i : 0,
                    cpc: d.c > 0 ? d.co / d.c : 0,
                    cvr: d.c > 0 ? d.p / d.c : 0,
                    acos: d.s > 0 ? d.co / d.s : 0,
                }));
                // Default sort by spend descending
                arr.sort((a, b) => b.cost - a.cost);
                results[n] = arr;
            }

            setNgramResults(results);
            setKeywordSets(buildKeywordSet(rawRows));
            setActiveTab(1);
            setSortConfig({ key: 'cost', direction: 'desc' });
            setCurrentPage(1);
            setGlobalSearch('');
            setIsParsing(false);
        }, 50);
    }, [rawRows, selectedAsin, stopwordsEnabled, stopwordsRaw]);

    // ======================================
    // SUMMARY STATS
    // ======================================
    const summaryStats = useMemo(() => {
        if (!rawRows || rawRows.length === 0) return null;
        const totalTerms = new Set(rawRows
            .filter(r => selectedAsin === '__ALL__' || String(r.asin || '').trim() === selectedAsin)
            .map(r => String(r.searchTerm || '').trim().toLowerCase())
            .filter(Boolean)
        ).size;

        let totalSpend = 0, totalSales = 0, totalClicks = 0, totalImpressions = 0;
        for (const row of rawRows) {
            if (selectedAsin !== '__ALL__' && String(row.asin || '').trim() !== selectedAsin) continue;
            totalSpend += parseNum(row.cost);
            totalSales += parseNum(row.sales);
            totalClicks += parseNum(row.clicks);
            totalImpressions += parseNum(row.impressions);
        }

        const overallAcos = totalSales > 0 ? totalSpend / totalSales : 0;
        return { totalTerms, totalSpend, totalSales, totalClicks, totalImpressions, overallAcos };
    }, [rawRows, selectedAsin]);

    // ======================================
    // COVERAGE HEALTH SCORE (#3)
    // ======================================
    const coverageHealth = useMemo(() => {
        if (!rawRows || !keywordSets) return null;
        const filtered = rawRows.filter(r =>
            selectedAsin === '__ALL__' || String(r.asin || '').trim() === selectedAsin
        );
        const termSet = new Set(filtered.map(r => String(r.searchTerm || '').toLowerCase().trim()).filter(Boolean));
        const totalTerms = termSet.size;
        if (totalTerms === 0) return null;

        let exactCount = 0, phraseCount = 0, broadCount = 0, autoOnlyCount = 0, uncoveredCount = 0;
        for (const term of termSet) {
            const inExact  = keywordSets.exact.has(term);
            const inPhrase = keywordSets.phrase.has(term);
            const inBroad  = keywordSets.broad.has(term);
            const inAuto   = keywordSets.auto.has(term);
            if (inExact)  exactCount++;
            else if (inPhrase) phraseCount++;
            else if (inBroad)  broadCount++;
            else if (inAuto)   autoOnlyCount++;
            else uncoveredCount++;
        }
        return { totalTerms, exactCount, phraseCount, broadCount, autoOnlyCount, uncoveredCount,
            exactPct:  (exactCount / totalTerms) * 100,
            phrasePct: (phraseCount / totalTerms) * 100,
            broadPct:  (broadCount / totalTerms) * 100,
            autoPct:   (autoOnlyCount / totalTerms) * 100,
            uncoveredPct: (uncoveredCount / totalTerms) * 100,
        };
    }, [ngramResults, rawRows, selectedAsin, keywordSets]);

    // ======================================
    // CAMPAIGN STRUCTURE SUMMARY (#5)
    // ======================================
    const structureSummary = useMemo(() => {
        if (!rawRows || rawRows.length === 0) return null;
        const filtered = rawRows.filter(r =>
            selectedAsin === '__ALL__' || String(r.asin || '').trim() === selectedAsin
        );
        const mtSpend = { exact: 0, phrase: 0, broad: 0, auto: 0, other: 0 };
        const mtOrders = { exact: 0, phrase: 0, broad: 0, auto: 0, other: 0 };
        let brandSpend = 0, brandSales = 0, nonBrandSpend = 0, nonBrandSales = 0;
        
        const termCvrs = {};
        for (const row of filtered) {
            const term = String(row.searchTerm || '').toLowerCase().trim();
            if (!term) continue;
            if (!termCvrs[term]) termCvrs[term] = { clicks: 0, purchases: 0, cost: 0, sales: 0 };
            termCvrs[term].clicks += parseNum(row.clicks);
            termCvrs[term].purchases += parseNum(row.purchases);
            termCvrs[term].cost += parseNum(row.cost);
            termCvrs[term].sales += parseNum(row.sales);
        }
        
        const allCvrs = Object.values(termCvrs).filter(t => t.clicks > 5).map(t => t.purchases / t.clicks);
        const avgCvr = allCvrs.length > 0 ? allCvrs.reduce((a, b) => a + b, 0) / allCvrs.length : 0;
        const brandThreshold = avgCvr * 2.5;

        for (const [term, td] of Object.entries(termCvrs)) {
            const termCvr = td.clicks > 0 ? td.purchases / td.clicks : 0;
            if (td.clicks > 5 && termCvr >= brandThreshold) {
                brandSpend += td.cost; brandSales += td.sales;
            } else {
                nonBrandSpend += td.cost; nonBrandSales += td.sales;
            }
        }

        for (const row of filtered) {
            const mt = String(row.matchType || '').toLowerCase().trim();
            const cost = parseNum(row.cost);
            const orders = parseNum(row.purchases);
            if (mt === 'exact') { mtSpend.exact += cost; mtOrders.exact += orders; }
            else if (mt === 'phrase') { mtSpend.phrase += cost; mtOrders.phrase += orders; }
            else if (mt === 'broad') { mtSpend.broad += cost; mtOrders.broad += orders; }
            else if (mt.includes('auto') || mt === '') { mtSpend.auto += cost; mtOrders.auto += orders; }
            else { mtSpend.other += cost; mtOrders.other += orders; }
        }
        const totalSpend = Object.values(mtSpend).reduce((a, b) => a + b, 0);
        return { mtSpend, mtOrders, totalSpend, brandSpend, brandSales, nonBrandSpend, nonBrandSales,
            brandPct:    totalSpend > 0 ? (brandSpend / totalSpend) * 100 : 0,
            nonBrandPct: totalSpend > 0 ? (nonBrandSpend / totalSpend) * 100 : 0,
        };
    }, [rawRows, selectedAsin]);

    // ======================================
    // GLOBAL INSIGHTS (computed from raw rows)
    // ======================================
    const globalInsights = useMemo(() => {
        if (!rawRows || rawRows.length === 0) return null;
        const termMap = {};
        for (const row of rawRows) {
            if (selectedAsin !== '__ALL__' && String(row.asin || '').trim() !== selectedAsin) continue;
            const term = String(row.searchTerm || '').trim().toLowerCase();
            if (!term) continue;
            if (!termMap[term]) termMap[term] = { orders: 0, cost: 0 };
            termMap[term].orders += parseNum(row.purchases);
            termMap[term].cost += parseNum(row.cost);
        }
        let convertingSpend = 0, nonConvertingSpend = 0, convertingCount = 0, nonConvertingCount = 0;
        for (const d of Object.values(termMap)) {
            if (d.orders > 0) { convertingSpend += d.cost; convertingCount++; }
            else { nonConvertingSpend += d.cost; nonConvertingCount++; }
        }
        const total = convertingSpend + nonConvertingSpend;
        return {
            convertingSpend, nonConvertingSpend, convertingCount, nonConvertingCount,
            convertingPct: total > 0 ? (convertingSpend / total) * 100 : 0,
            nonConvertingPct: total > 0 ? (nonConvertingSpend / total) * 100 : 0,
        };
    }, [ngramResults, rawRows, selectedAsin]);

    // ======================================
    // TAB INSIGHTS (computed from active tab n-grams)
    // ======================================
    const tabInsights = useMemo(() => {
        if (!ngramResults || !ngramResults[activeTab]) return { topConverting: [], topNegatives: [] };
        const data = ngramResults[activeTab];
        return {
            topConverting: data.filter(d => d.orders > 0).sort((a, b) => b.sales - a.sales).slice(0, 7),
            topNegatives: data.filter(d => d.cost > 0 && d.orders === 0).sort((a, b) => b.cost - a.cost).slice(0, 7),
        };
    }, [ngramResults, activeTab]);

    // ======================================
    // SORTED + FILTERED DATA FOR ACTIVE TAB
    // ======================================
    const processedData = useMemo(() => {
        if (!ngramResults || !ngramResults[activeTab]) return [];
        let data = [...ngramResults[activeTab]];

        // Global search
        if (globalSearch.trim()) {
            const q = globalSearch.trim().toLowerCase();
            if (exactMatch) {
                data = data.filter(d => d.phrase === q);
            } else {
                data = data.filter(d => d.phrase.includes(q));
            }
        }

        // Column filters
        const cf = columnFilters;
        // Phrase text filter
        if (cf.phrase && cf.phrase.trim()) {
            const pq = cf.phrase.trim().toLowerCase();
            data = data.filter(d => d.phrase.includes(pq));
        }
        // Numeric / currency range filters (raw values)
        for (const k of ['freq', 'impressions', 'clicks', 'cost', 'sales', 'orders', 'units', 'cpc']) {
            const minVal = cf[`${k}_min`];
            const maxVal = cf[`${k}_max`];
            if (minVal !== undefined && minVal !== '') {
                const min = parseFloat(minVal);
                if (!isNaN(min)) data = data.filter(d => d[k] >= min);
            }
            if (maxVal !== undefined && maxVal !== '') {
                const max = parseFloat(maxVal);
                if (!isNaN(max)) data = data.filter(d => d[k] <= max);
            }
        }
        // Percentage range filters — user inputs 0–100, stored as 0–1
        for (const k of ['ctr', 'cvr', 'acos']) {
            const minVal = cf[`${k}_min`];
            const maxVal = cf[`${k}_max`];
            if (minVal !== undefined && minVal !== '') {
                const min = parseFloat(minVal) / 100;
                if (!isNaN(min)) data = data.filter(d => d[k] >= min);
            }
            if (maxVal !== undefined && maxVal !== '') {
                const max = parseFloat(maxVal) / 100;
                if (!isNaN(max)) data = data.filter(d => d[k] <= max);
            }
        }

        // Sort
        if (sortConfig.key) {
            data.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (typeof aVal === 'string') {
                    return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            });
        }

        return data;
    }, [ngramResults, activeTab, globalSearch, sortConfig, columnFilters]);

    // Pagination
    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // ======================================
    // SORT HANDLER
    // ======================================
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
        setCurrentPage(1);
    };

    // ======================================
    // EXPORT
    // ======================================
    const handleExport = () => {
        if (!ngramResults) return;

        const wb = XLSX.utils.book_new();
        const headerRow = ['N-Gram Phrase', 'Frequency', 'Impressions', 'Clicks', 'Spend', 'Sales', 'Orders', 'Units', 'CTR', 'CPC', 'CVR', 'ACOS'];

        for (let n = 1; n <= 4; n++) {
            const data = ngramResults[n] || [];
            const rows = data.map(d => [
                d.phrase, d.freq, d.impressions, d.clicks,
                Math.round(d.cost * 100) / 100,
                Math.round(d.sales * 100) / 100,
                d.orders, d.units,
                Math.round(d.ctr * 10000) / 10000,
                Math.round(d.cpc * 100) / 100,
                Math.round(d.cvr * 10000) / 10000,
                Math.round(d.acos * 10000) / 10000
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);

            // Column widths
            ws['!cols'] = [
                { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
                { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
                { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, n + '-Word');
        }

        const asinLabel = selectedAsin === '__ALL__' ? 'All-ASINs' : selectedAsin;
        XLSX.writeFile(wb, `NGram-Analysis-${asinLabel}.xlsx`);
    };

    // ======================================
    // CLEAR
    // ======================================
    const handleClear = () => {
        setFile(null);
        setRawRows([]);
        setAllAsins([]);
        setSelectedAsin('__ALL__');
        setNgramResults(null);
        setError('');
        setGlobalSearch('');
        setExactMatch(false);
        setSettingsChanged(false);
        setStopwordsEnabled(false);
        setStopwordsRaw(DEFAULT_STOPWORDS);
        setCurrentPage(1);
        setColumnFilters({});
        setFiltersVisible(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ======================================
    // BADGE LOGIC
    // ======================================
    const getAcosBadge = (row) => {
        if (row.sales === 0 && row.cost > 0) {
            return <span className="ngram-badge neg-candidate">Neg. Candidate</span>;
        }
        if (row.sales === 0) {
            return <span className="ngram-badge no-sales">No Sales</span>;
        }
        const acosPct = row.acos * 100;
        if (acosPct <= 24) return <span className="ngram-badge acos-good">Good</span>;
        if (acosPct <= 36) return <span className="ngram-badge acos-warn">Near Target</span>;
        return <span className="ngram-badge acos-bad">High ACOS</span>;
    };

    // Coverage badge per row (#4)
    const getCoverageBadge = (phrase) => {
        if (!keywordSets) return null;
        if (keywordSets.exact.has(phrase))  return <span className="ngram-badge coverage-exact">✓ Exact</span>;
        if (keywordSets.phrase.has(phrase)) return <span className="ngram-badge coverage-phrase">~ Phrase</span>;
        if (keywordSets.broad.has(phrase))  return <span className="ngram-badge coverage-broad">≈ Broad</span>;
        if (keywordSets.auto.has(phrase))   return <span className="ngram-badge coverage-auto">Auto</span>;
        return <span className="ngram-badge coverage-none">Not Targeted</span>;
    };

    // ======================================
    // TABLE COLUMNS
    // ======================================
    const columns = [
        { key: 'phrase', label: 'N-Gram Phrase' },
        { key: 'freq', label: 'Freq.' },
        { key: 'impressions', label: 'Impressions' },
        { key: 'clicks', label: 'Clicks' },
        { key: 'cost', label: 'Spend' },
        { key: 'sales', label: 'Sales' },
        { key: 'orders', label: 'Orders' },
        { key: 'units', label: 'Units' },
        { key: 'ctr', label: 'CTR' },
        { key: 'cpc', label: 'CPC' },
        { key: 'cvr', label: 'CVR' },
        { key: 'acos', label: 'ACOS' },
    ];

    const formatCell = (key, value) => {
        switch (key) {
            case 'impressions': case 'clicks': case 'freq': case 'orders': case 'units':
                return fmtNum(value);
            case 'cost': case 'sales': case 'cpc':
                return fmtCur(value);
            case 'ctr': case 'cvr': case 'acos':
                return fmtPct(value);
            default:
                return value;
        }
    };

    // Page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    // ======================================
    // RENDER
    // ======================================
    return (
        <section className="ngram-analyzer-page container section">
            {/* Header */}
            <div className="ngram-header">
                <div className="ngram-icon-ring">
                    <Search size={36} color="var(--color-primary)" />
                </div>
                <h1>N-Gram Analyzer</h1>
                <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    Discover the hidden word patterns driving your Amazon PPC spend, sales, and conversions.
                </p>

                {/* Info Card */}
                <div className="ngram-info-card">
                    <div className="ngram-info-col">
                        <h4>What This Tool Does</h4>
                        <p>Breaks down your Amazon search terms into 1, 2, 3 and 4-word patterns to reveal which words and phrases are driving spend, sales, and conversions — and which are wasting budget.</p>
                        <ul>
                            <li>Extracts n-gram patterns from your Search Term Report</li>
                            <li>Aggregates spend, sales, CTR, CPC, CVR &amp; ACOS per pattern</li>
                            <li>Surfaces top converting intent and negative keyword candidates</li>
                            <li>Italian stopword filter removes noise words before analysis</li>
                        </ul>
                    </div>
                    <div className="ngram-info-divider" />
                    <div className="ngram-info-col ngram-info-col-scroll">
                        <h4>How To Use</h4>
                        <ol>
                            <li>In Amazon Advertising, go to <strong>Campaign Manager → Measurement &amp; Reporting → Reporting Beta</strong></li>
                            <li>Click <strong>Create Report</strong>, name it, select your Ad Account, Campaigns, Country and Ad Types</li>
                            <li>Under <strong>Customize Columns</strong>, select all of the following:<br />
                                <ul style={{ marginTop: '0.5rem', lineHeight: 1.9, listStyle: 'none', paddingLeft: '0.25rem' }}>
                                    {['Budget currency','Date','Portfolio ID','Portfolio name','Campaign ID','Campaign name','Ad group ID','Ad group name','Advertised product ID','Advertised product SKU','Placement Name','Placement size','Site or app','Placement classification','Target value','Target match type','Search term','Matched target','Ad ID','Ad product','Impressions','Clicks','Purchases','Sales','Units sold','CTR','CPC','Total cost'].map(col => (
                                        <li key={col} style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                            <span style={{ color: 'var(--color-primary)', marginRight: '0.4rem' }}>✓</span>{col}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                            <li>Set your date range, click <strong>Save and Run</strong>, then download the exported file</li>
                            <li>Upload the CSV or Excel file below</li>
                            <li>Optionally filter by ASIN or enable the stopword filter, then click <strong>Run N-Gram Analysis</strong></li>
                            <li>Review the Insights panel, explore the results table, and export as Excel</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Steps */}
            <div className="ngram-card-container">

                {/* Step 1: Settings — always visible once a file is loaded */}
                {file && (
                    <div className="ngram-step-card">
                        <div className="ngram-step-header">
                            <div className="ngram-step-number">1</div>
                            <div>
                                <h2>Settings</h2>
                                <p className="text-muted">Filter by ASIN and configure stopword removal</p>
                            </div>
                        </div>
                        <div className="ngram-step-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                            {allAsins.length > 0 && (
                                <div className="ngram-form-group">
                                    <label>ASIN Filter</label>
                                    <select
                                        className="ngram-select"
                                        value={selectedAsin}
                                        onChange={(e) => { setSelectedAsin(e.target.value); if (ngramResults) setSettingsChanged(true); }}
                                    >
                                        <option value="__ALL__">All ASINs (Brand Mode) — {allAsins.length} ASINs</option>
                                        {allAsins.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Stopword Filter */}
                            <div className="ngram-stopword-section">
                                <div className="ngram-stopword-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                        <Filter size={15} color="var(--color-text-muted)" />
                                        <span className="ngram-stopword-title">Stopword Filter</span>
                                        <span className="ngram-stopword-hint">strips common words before n-gram generation</span>
                                    </div>
                                    <button
                                        className={`ngram-match-toggle ${stopwordsEnabled ? 'active' : ''}`}
                                        style={{ fontSize: '0.72rem', padding: '0.4rem 0.85rem' }}
                                        onClick={() => { setStopwordsEnabled(p => !p); if (ngramResults) setSettingsChanged(true); }}
                                    >
                                        {stopwordsEnabled ? 'On' : 'Off'}
                                    </button>
                                </div>
                                {stopwordsEnabled && (
                                    <div className="ngram-stopword-editor">
                                        <label className="ngram-stopword-label">Stopword list — comma-separated, editable</label>
                                        <textarea
                                            className="ngram-stopword-textarea"
                                            value={stopwordsRaw}
                                            onChange={(e) => { setStopwordsRaw(e.target.value); if (ngramResults) setSettingsChanged(true); }}
                                            rows={3}
                                            spellCheck={false}
                                        />
                                        <div className="ngram-stopword-count">
                                            {stopwordsSet.size} words in list
                                        </div>
                                    </div>
                                )}
                            </div>

                            {settingsChanged && ngramResults && (
                                <div className="ngram-settings-changed-banner">
                                    <AlertCircle size={15} />
                                    Settings changed — re-run analysis to apply
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Upload */}
                <div className="ngram-step-card">
                    <div className="ngram-step-header">
                        <div className="ngram-step-number">2</div>
                        <div>
                            <h2>Upload Search Term Report</h2>
                            <p className="text-muted">Drop your CSV or Excel file from Amazon Ads</p>
                        </div>
                    </div>
                    <div className="ngram-step-content">
                        {error && (
                            <div className="ngram-error-banner">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {!file ? (
                            <div className="ngram-upload-zone">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileUpload}
                                    ref={fileInputRef}
                                />
                                <div className="ngram-upload-content">
                                    <div className="ngram-upload-icon">
                                        <Upload size={28} />
                                    </div>
                                    <h3>Drop your file here</h3>
                                    <p>or click to browse</p>
                                    <span className="ngram-file-hint">Supports .csv, .xlsx, .xls</span>
                                </div>
                            </div>
                        ) : isParsing ? (
                            <div className="ngram-parsing-state">
                                <div className="ngram-spinner" />
                                <p>Processing your data...</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                    <FileSpreadsheet size={24} color="var(--color-primary)" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{file.name}</div>
                                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                            {rawRows.length.toLocaleString()} rows • {allAsins.length} unique ASINs
                                        </div>
                                    </div>
                                    <button className="ngram-clear-btn" onClick={handleClear} style={{ padding: '0.5rem 0.75rem' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {!ngramResults && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => isRegistered ? runAnalysis() : setShowRegModal(true)}
                                        style={{ alignSelf: 'center', marginTop: '0.5rem' }}
                                    >
                                        <BarChart3 size={18} style={{ marginRight: '0.5rem' }} />
                                        Run N-Gram Analysis
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Section */}
                {ngramResults && summaryStats && (
                    <>
                        {/* #1 Context Warning Banner */}
                        <div className="ngram-context-warning">
                            <AlertCircle size={16} className="ngram-context-warning-icon" />
                            <div>
                                <strong>N-gram analysis shows you patterns in queries that <em>already triggered</em> your ads.</strong>{' '}
                                Gaps in your campaign structure — missing match types or untargeted search terms — won't appear here.
                                Fix your keyword architecture first, then let n-grams become a feedback loop, not a guessing game.
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="ngram-summary-bar">
                            <div className="ngram-stat-card">
                                <div className="stat-icon blue"><Hash size={18} /></div>
                                <span className="ngram-stat-label">Unique Search Terms</span>
                                <span className="ngram-stat-value">{fmtNum(summaryStats.totalTerms)}</span>
                            </div>
                            {coverageHealth && (
                                <div className="ngram-stat-card ngram-stat-card--health" title="Exact coverage: % of search terms also targeted as Exact keywords">
                                    <div className="stat-icon green"><TrendingUp size={18} /></div>
                                    <span className="ngram-stat-label">Exact Coverage</span>
                                    <span className="ngram-stat-value">{coverageHealth.exactPct.toFixed(1)}%</span>
                                    <div className="ngram-health-bar-wrap">
                                        <div className="ngram-health-bar" style={{ width: `${coverageHealth.exactPct}%` }} />
                                    </div>
                                </div>
                            )}
                            <div className="ngram-stat-card">
                                <div className="stat-icon red"><DollarSign size={18} /></div>
                                <span className="ngram-stat-label">Total Spend</span>
                                <span className="ngram-stat-value">{fmtCur(summaryStats.totalSpend)}</span>
                            </div>
                            <div className="ngram-stat-card">
                                <div className="stat-icon green"><ShoppingCart size={18} /></div>
                                <span className="ngram-stat-label">Total Sales</span>
                                <span className="ngram-stat-value">{fmtCur(summaryStats.totalSales)}</span>
                            </div>
                            <div className="ngram-stat-card">
                                <div className="stat-icon yellow"><Eye size={18} /></div>
                                <span className="ngram-stat-label">Overall ACOS</span>
                                <span className="ngram-stat-value">{fmtPct(summaryStats.overallAcos)}</span>
                            </div>
                        </div>

                        {/* Tab Switcher */}
                        <div className="ngram-tab-switcher">
                            {[1, 2, 3, 4].map(n => (
                                <button
                                    key={n}
                                    className={`ngram-tab-btn ${activeTab === n ? 'active' : ''}`}
                                    onClick={() => { setActiveTab(n); setCurrentPage(1); setGlobalSearch(''); setColumnFilters({}); }}
                                    title={stopwordsEnabled ? `${n}-word patterns (stopwords removed)` : `${n}-word patterns`}
                                >
                                    {n}-Word{stopwordsEnabled ? <span className="ngram-tab-sw">stopwords</span> : ''}
                                </button>
                            ))}
                        </div>

                        {/* Insights Panel */}
                        {globalInsights && (
                            <div className="ngram-insights-panel">
                                {/* Section A: Global Campaign Overview */}
                                <div className="ngram-insights-section-label">
                                    <span>Campaign Overview</span>
                                    <span className="ngram-insights-tag">Global</span>
                                </div>
                                <div className="ngram-insights-global-grid">
                                    <div className="ngram-insight-card spend-split-card">
                                        <div className="ngram-insight-card-title">
                                            <DollarSign size={13} /> Spend Split
                                        </div>
                                        <div className="ngram-spend-track">
                                            <div className="ngram-spend-fill converting" style={{ width: `${globalInsights.convertingPct}%` }} />
                                            <div className="ngram-spend-fill non-converting" style={{ width: `${globalInsights.nonConvertingPct}%` }} />
                                        </div>
                                        <div className="ngram-spend-legend">
                                            <div className="ngram-spend-legend-item">
                                                <span className="ngram-legend-dot converting" />
                                                <span>Converting</span>
                                                <strong>{fmtCur(globalInsights.convertingSpend)}</strong>
                                                <span className="ngram-legend-pct">{globalInsights.convertingPct.toFixed(1)}%</span>
                                            </div>
                                            <div className="ngram-spend-legend-item">
                                                <span className="ngram-legend-dot non-converting" />
                                                <span>Non-converting</span>
                                                <strong>{fmtCur(globalInsights.nonConvertingSpend)}</strong>
                                                <span className="ngram-legend-pct">{globalInsights.nonConvertingPct.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ngram-insight-card">
                                        <div className="ngram-insight-card-title">
                                            <AlertTriangle size={13} /> Wasted Spend
                                        </div>
                                        <div className="ngram-insight-big-num">{fmtCur(globalInsights.nonConvertingSpend)}</div>
                                        <div className="ngram-insight-sub">{globalInsights.nonConvertingCount.toLocaleString()} search terms with zero conversions</div>
                                        <div className="ngram-insight-sub" style={{ marginTop: '0.35rem' }}>{globalInsights.convertingCount.toLocaleString()} converting search terms</div>
                                    </div>
                                </div>

                                {/* #3 Coverage Health Detail */}
                                {coverageHealth && (
                                    <>
                                        <div className="ngram-insights-section-label" style={{ marginTop: '1.75rem' }}>
                                            <span>Keyword Coverage Health</span>
                                            <span className="ngram-insights-tag" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>Structure</span>
                                        </div>
                                        <div className="ngram-coverage-grid">
                                            {[
                                                { label: 'Exact Targeted', pct: coverageHealth.exactPct,  count: coverageHealth.exactCount,  color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
                                                { label: 'Phrase Only',    pct: coverageHealth.phrasePct, count: coverageHealth.phraseCount, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                                                { label: 'Broad Only',     pct: coverageHealth.broadPct,  count: coverageHealth.broadCount,  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                                                { label: 'Auto Only',      pct: coverageHealth.autoPct,   count: coverageHealth.autoOnlyCount, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
                                                { label: 'Not Targeted',   pct: coverageHealth.uncoveredPct, count: coverageHealth.uncoveredCount, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
                                            ].map(item => (
                                                <div key={item.label} className="ngram-coverage-item" style={{ background: item.bg }}>
                                                    <div className="ngram-coverage-label">{item.label}</div>
                                                    <div className="ngram-coverage-bar-wrap">
                                                        <div className="ngram-coverage-bar-fill" style={{ width: `${item.pct}%`, background: item.color }} />
                                                    </div>
                                                    <div className="ngram-coverage-stats">
                                                        <span style={{ color: item.color, fontWeight: 700 }}>{item.pct.toFixed(1)}%</span>
                                                        <span className="ngram-coverage-count">{item.count.toLocaleString()} terms</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* #5 Campaign Structure Summary */}
                                {structureSummary && structureSummary.totalSpend > 0 && (
                                    <>
                                        <div className="ngram-insights-section-label" style={{ marginTop: '1.75rem' }}>
                                            <span>Campaign Structure</span>
                                            <span className="ngram-insights-tag" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>Spend Allocation</span>
                                        </div>
                                        <div className="ngram-structure-grid">
                                            <div className="ngram-insight-card">
                                                <div className="ngram-insight-card-title"><DollarSign size={13} /> Spend by Match Type</div>
                                                <div className="ngram-matchtype-rows">
                                                    {[['Exact','exact','#22c55e'],['Phrase','phrase','#3b82f6'],['Broad','broad','#f59e0b'],['Auto','auto','#8b5cf6'],['Other','other','#6b7280']].map(([label, key, color]) => {
                                                        if (structureSummary.mtSpend[key] === 0) return null;
                                                        const pct = (structureSummary.mtSpend[key] / structureSummary.totalSpend) * 100;
                                                        return (
                                                            <div key={key} className="ngram-matchtype-row">
                                                                <span className="ngram-matchtype-label" style={{ color }}>{label}</span>
                                                                <div className="ngram-matchtype-bar-wrap">
                                                                    <div className="ngram-matchtype-bar-fill" style={{ width: `${pct}%`, background: color }} />
                                                                </div>
                                                                <span className="ngram-matchtype-pct">{pct.toFixed(1)}%</span>
                                                                <span className="ngram-matchtype-val">{fmtCur(structureSummary.mtSpend[key])}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="ngram-insight-card">
                                                <div className="ngram-insight-card-title"><TrendingUp size={13} /> Brand vs Non-Brand Spend</div>
                                                <div className="ngram-spend-track" style={{ marginTop: '0.5rem' }}>
                                                    <div className="ngram-spend-fill" style={{ width: `${structureSummary.brandPct}%`, background: 'linear-gradient(90deg,#3b82f6,#1d4ed8)' }} />
                                                    <div className="ngram-spend-fill" style={{ width: `${structureSummary.nonBrandPct}%`, background: 'linear-gradient(90deg,#f59e0b,#d97706)' }} />
                                                </div>
                                                <div className="ngram-spend-legend" style={{ marginTop: '0.75rem' }}>
                                                    <div className="ngram-spend-legend-item">
                                                        <span className="ngram-legend-dot" style={{ background: '#3b82f6' }} />
                                                        <span>Brand (high CVR terms)</span>
                                                        <strong>{fmtCur(structureSummary.brandSpend)}</strong>
                                                        <span className="ngram-legend-pct">{structureSummary.brandPct.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="ngram-spend-legend-item">
                                                        <span className="ngram-legend-dot" style={{ background: '#f59e0b' }} />
                                                        <span>Non-Brand</span>
                                                        <strong>{fmtCur(structureSummary.nonBrandSpend)}</strong>
                                                        <span className="ngram-legend-pct">{structureSummary.nonBrandPct.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                                <p className="ngram-structure-note">Brand terms estimated by CVR ≥ 2.5× account average.</p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Section B: Per-tab */}
                                <div className="ngram-insights-section-label" style={{ marginTop: '1.75rem' }}>
                                    <span>{activeTab}-Word Patterns</span>
                                    <span className="ngram-insights-tag tab">Per Tab</span>
                                </div>
                                <div className="ngram-insights-tab-grid">
                                    <div className="ngram-insight-card">
                                        <div className="ngram-insight-card-title converting">
                                            <TrendingUp size={13} /> Top Converting Intent
                                        </div>
                                        {tabInsights.topConverting.length === 0 ? (
                                            <p className="ngram-insight-empty">No converting patterns in this tab.</p>
                                        ) : (
                                            <div className="ngram-insight-list">
                                                {tabInsights.topConverting.map((row, i) => (
                                                    <div key={row.phrase} className="ngram-insight-row">
                                                        <span className="ngram-insight-rank">#{i + 1}</span>
                                                        <span className="ngram-insight-phrase" title={row.phrase}>{row.phrase}</span>
                                                        <span className="ngram-insight-revenue">{fmtCur(row.sales)}</span>
                                                        <span className="ngram-insight-orders">{row.orders} orders</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="ngram-insight-card">
                                        <div className="ngram-insight-card-title negative">
                                            <TrendingDown size={13} /> Negative Candidates
                                        </div>
                                        {tabInsights.topNegatives.length === 0 ? (
                                            <p className="ngram-insight-empty">No negative candidates in this tab.</p>
                                        ) : (
                                            <div className="ngram-insight-list">
                                                {tabInsights.topNegatives.map((row, i) => (
                                                    <div key={row.phrase} className="ngram-insight-row">
                                                        <span className="ngram-insight-rank">#{i + 1}</span>
                                                        <span className="ngram-insight-phrase" title={row.phrase}>{row.phrase}</span>
                                                        <span className="ngram-insight-spend">{fmtCur(row.cost)}</span>
                                                        <span className="ngram-insight-zero">0 orders</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Results Table */}
                        <div className="ngram-results-card">
                            <div className="ngram-results-header">
                                <div className="ngram-step-number mini">3</div>
                                <h3>{activeTab}-Word N-Gram Results</h3>
                            </div>
                            <div className="ngram-results-body">
                                {/* Toolbar */}
                                <div className="ngram-toolbar">
                                    <div className="ngram-search-wrap">
                                        <input
                                            type="text"
                                            className="ngram-search-input"
                                            placeholder="Search n-gram phrases..."
                                            value={globalSearch}
                                            onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
                                        />
                                    </div>
                                    <button
                                        className={`ngram-match-toggle ${exactMatch ? 'active' : ''}`}
                                        onClick={() => { setExactMatch(prev => !prev); setCurrentPage(1); }}
                                        title={exactMatch ? 'Exact match active — showing only exact phrase matches' : 'Click to enable exact match'}
                                    >
                                        Exact match
                                    </button>
                                    <button
                                        className={`ngram-match-toggle ${filtersVisible ? 'active' : ''}`}
                                        onClick={() => setFiltersVisible(p => !p)}
                                        title="Toggle column filters"
                                    >
                                        <Filter size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
                                        Filters{Object.values(columnFilters).filter(v => v !== '').length > 0 ? ` (${Object.values(columnFilters).filter(v => v !== '').length})` : ''}
                                    </button>
                                    <button className="ngram-export-btn" onClick={handleExport}>
                                        <Download size={16} /> Export Excel
                                    </button>
                                    <button className="ngram-clear-btn" onClick={handleClear}>
                                        <X size={16} /> Clear
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="ngram-table-container">
                                    <table className="ngram-table">
                                        <thead>
                                            <tr>
                                                {columns.map(col => (
                                                    <th
                                                        key={col.key}
                                                        className="ngram-th"
                                                        onClick={() => handleSort(col.key)}
                                                    >
                                                        <span className="ngram-th-content">
                                                            {col.label}
                                                            <span className="ngram-sort-icons">
                                                                <ChevronUp size={10} className={`ngram-sort-icon ${sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'active' : ''}`} />
                                                                <ChevronDown size={10} className={`ngram-sort-icon ${sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'active' : ''}`} />
                                                            </span>
                                                        </span>
                                                    </th>
                                                ))}
                                                <th className="ngram-th">Status</th>
                                <th className="ngram-th">Coverage</th>
                                            </tr>
                                            {filtersVisible && (
                                                <tr className="ngram-filter-row">
                                                    {columns.map(col => (
                                                        <td key={col.key} className="ngram-filter-cell">
                                                            {col.key === 'phrase' ? (
                                                                <input
                                                                    className="ngram-col-filter-text"
                                                                    type="text"
                                                                    placeholder="filter…"
                                                                    value={columnFilters.phrase || ''}
                                                                    onChange={e => { setColumnFilters(p => ({ ...p, phrase: e.target.value })); setCurrentPage(1); }}
                                                                />
                                                            ) : (
                                                                <div className="ngram-col-filter-range">
                                                                    <input
                                                                        className="ngram-col-filter-num"
                                                                        type="number"
                                                                        placeholder={['ctr','cvr','acos'].includes(col.key) ? 'min %' : 'min'}
                                                                        value={columnFilters[`${col.key}_min`] || ''}
                                                                        onChange={e => { setColumnFilters(p => ({ ...p, [`${col.key}_min`]: e.target.value })); setCurrentPage(1); }}
                                                                    />
                                                                    <input
                                                                        className="ngram-col-filter-num"
                                                                        type="number"
                                                                        placeholder={['ctr','cvr','acos'].includes(col.key) ? 'max %' : 'max'}
                                                                        value={columnFilters[`${col.key}_max`] || ''}
                                                                        onChange={e => { setColumnFilters(p => ({ ...p, [`${col.key}_max`]: e.target.value })); setCurrentPage(1); }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="ngram-filter-cell">
                                                        {Object.values(columnFilters).some(v => v !== '') && (
                                                            <button
                                                                className="ngram-filter-clear-btn"
                                                                onClick={() => { setColumnFilters({}); setCurrentPage(1); }}
                                                                title="Clear all column filters"
                                                            >
                                                                <X size={12} /> Clear
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </thead>
                                        <tbody>
                                            {paginatedData.map((row, idx) => (
                                                <tr key={row.phrase + idx} className="ngram-tr">
                                                    {columns.map(col => (
                                                        <td
                                                            key={col.key}
                                                            className={`ngram-td ${col.key === 'phrase' ? 'ngram-phrase-cell' : ''}`}
                                                            title={col.key === 'phrase' ? row.phrase : undefined}
                                                        >
                                                            {formatCell(col.key, row[col.key])}
                                                        </td>
                                                    ))}
                                                    <td className="ngram-td">{getAcosBadge(row)}</td>
                                                    <td className="ngram-td">{getCoverageBadge(row.phrase)}</td>
                                                </tr>
                                            ))}
                                            {paginatedData.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={columns.length + 2}
                                                        className="ngram-td"
                                                        style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}
                                                    >
                                                        No n-grams found matching your search.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="ngram-pagination">
                                        <span className="ngram-pagination-info">
                                            Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length}
                                        </span>
                                        <div className="ngram-pagination-controls">
                                            <button
                                                className="ngram-pagination-btn"
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                Prev
                                            </button>
                                            <div className="ngram-page-numbers">
                                                {getPageNumbers().map(p => (
                                                    <button
                                                        key={p}
                                                        className={`ngram-page-num ${currentPage === p ? 'active' : ''}`}
                                                        onClick={() => setCurrentPage(p)}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                className="ngram-pagination-btn"
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* #2 Cross-Tool Insight Card */}
                {ngramResults && (
                    <div className="ngram-crosstool-card">
                        <div className="ngram-crosstool-icon"><AlertTriangle size={22} /></div>
                        <div className="ngram-crosstool-body">
                            <h4>N-gram patterns show what's triggering — not what's <em>missing</em>.</h4>
                            <p>
                                If your account has structural gaps — untargeted search terms, wrong match types,
                                no auto-to-manual graduation — your n-gram data only reflects your blind spots.
                                Use the <strong>Missing Opportunity Sheet</strong> to surface converting search terms
                                that have zero Exact or Phrase keyword coverage.
                            </p>
                        </div>
                        <a href="/tools/missing-opportunity-sheet" className="ngram-crosstool-btn">
                            Open Missing Opportunity Sheet →
                        </a>
                    </div>
                )}

                <ConsultationCard />
            </div>

            {/* Registration Gate Modal */}
            <RegistrationModal
                isOpen={showRegModal}
                onClose={() => setShowRegModal(false)}
                onSuccess={() => { setShowRegModal(false); runAnalysis(); }}
                toolSlug="ngram-analyzer"
            />
        </section>
    );
};

export default NgramAnalyzer;
