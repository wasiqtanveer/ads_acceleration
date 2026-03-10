import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
    Upload, Download, X, AlertCircle, FileSpreadsheet,
    Search, BarChart3, Hash, DollarSign, ShoppingCart,
    MousePointerClick, ChevronUp, ChevronDown, Eye, Trash2
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import './NgramAnalyzer.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

const COLUMN_MAP = {
    'Search term': 'searchTerm',
    'Advertised product ID': 'asin',
    'Impressions': 'impressions',
    'Clicks': 'clicks',
    'Purchases': 'purchases',
    'Sales': 'sales',
    'Total cost': 'cost',
    'Units sold': 'units',
};

const REQUIRED_COLUMNS = ['Search term', 'Impressions', 'Clicks', 'Purchases', 'Sales', 'Total cost', 'Units sold'];

// Parse a value that may be a number or a string like "$1,234.56"
function parseNum(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[$€£,\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

// ======================================
// COMPONENT
// ======================================
const NgramAnalyzer = () => {
    // Settings
    const [targetAcos, setTargetAcos] = useState(30);

    // File + Data
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState('');
    const [rawRows, setRawRows] = useState([]);
    const [allAsins, setAllAsins] = useState([]);
    const [selectedAsin, setSelectedAsin] = useState('__ALL__');

    // N-gram results: { 1: [...], 2: [...], 3: [...], 4: [...] }
    const [ngramResults, setNgramResults] = useState(null);

    // UI
    const [activeTab, setActiveTab] = useState(1);
    const [chartMetric, setChartMetric] = useState('cost');
    const [globalSearch, setGlobalSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'cost', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
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

        // Validate columns
        const headers = Object.keys(data[0]);
        const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
        if (missing.length > 0) {
            setError(`Missing required columns: ${missing.join(', ')}`);
            setIsParsing(false);
            return;
        }

        // Extract unique ASINs
        const asinSet = new Set();
        data.forEach(row => {
            const asin = String(row['Advertised product ID'] || '').trim();
            if (asin) asinSet.add(asin);
        });

        setRawRows(data);
        setAllAsins(Array.from(asinSet).sort());
        setSelectedAsin('__ALL__');
        setIsParsing(false);
    };

    // ======================================
    // RUN ANALYSIS
    // ======================================
    const runAnalysis = useCallback(() => {
        setIsParsing(true);
        setError('');

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
                const term = String(row['Search term'] || '').trim().toLowerCase();
                if (!term) continue;

                const imp = parseNum(row['Impressions']);
                const clk = parseNum(row['Clicks']);
                const pur = parseNum(row['Purchases']);
                const sal = parseNum(row['Sales']);
                const cst = parseNum(row['Total cost']);
                const unt = parseNum(row['Units sold']);

                if (!termMap[term]) termMap[term] = { i: 0, c: 0, p: 0, s: 0, co: 0, u: 0 };
                const t = termMap[term];
                t.i += imp; t.c += clk; t.p += pur; t.s += sal; t.co += cst; t.u += unt;
            }

            // Step 2: Generate n-grams (1 through 4)
            const store = { 1: {}, 2: {}, 3: {}, 4: {} };
            const uniqueTerms = Object.keys(termMap);

            for (const fullTerm of uniqueTerms) {
                const stats = termMap[fullTerm];
                const words = fullTerm.split(/\s+/).filter(Boolean);

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
            setActiveTab(1);
            setSortConfig({ key: 'cost', direction: 'desc' });
            setCurrentPage(1);
            setGlobalSearch('');
            setIsParsing(false);
        }, 50);
    }, [rawRows, selectedAsin]);

    // ======================================
    // SUMMARY STATS
    // ======================================
    const summaryStats = useMemo(() => {
        if (!ngramResults) return null;
        // Compute from 1-grams (which aggregate all terms)
        const allGrams = ngramResults[1] || [];
        // But we actually need unique search terms count — use the total freq of all 1-grams?
        // Better: sum from any n-gram size. Use raw row counts
        const totalTerms = new Set(rawRows
            .filter(r => selectedAsin === '__ALL__' || String(r['Advertised product ID'] || '').trim() === selectedAsin)
            .map(r => String(r['Search term'] || '').trim().toLowerCase())
            .filter(Boolean)
        ).size;

        let totalSpend = 0, totalSales = 0, totalClicks = 0, totalImpressions = 0;
        // Sum from raw data (not n-grams, to avoid double-counting)
        for (const row of rawRows) {
            if (selectedAsin !== '__ALL__' && String(row['Advertised product ID'] || '').trim() !== selectedAsin) continue;
            totalSpend += parseNum(row['Total cost']);
            totalSales += parseNum(row['Sales']);
            totalClicks += parseNum(row['Clicks']);
            totalImpressions += parseNum(row['Impressions']);
        }

        const overallAcos = totalSales > 0 ? totalSpend / totalSales : 0;

        return { totalTerms, totalSpend, totalSales, totalClicks, totalImpressions, overallAcos };
    }, [ngramResults, rawRows, selectedAsin]);

    // ======================================
    // SORTED + FILTERED DATA FOR ACTIVE TAB
    // ======================================
    const processedData = useMemo(() => {
        if (!ngramResults || !ngramResults[activeTab]) return [];
        let data = [...ngramResults[activeTab]];

        // Global search
        if (globalSearch.trim()) {
            const q = globalSearch.trim().toLowerCase();
            data = data.filter(d => d.phrase.includes(q));
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
    }, [ngramResults, activeTab, globalSearch, sortConfig]);

    // Pagination
    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // ======================================
    // CHART DATA
    // ======================================
    const chartData = useMemo(() => {
        if (!ngramResults || !ngramResults[activeTab]) return null;

        const sorted = [...ngramResults[activeTab]].sort((a, b) => b[chartMetric] - a[chartMetric]);
        const top15 = sorted.slice(0, 15);

        const metricLabels = { cost: 'Spend', sales: 'Sales', impressions: 'Impressions', acos: 'ACOS' };
        const isCurrency = chartMetric === 'cost' || chartMetric === 'sales';
        const isPercent = chartMetric === 'acos';

        const isDark = !document.body.classList.contains('light-mode');
        const barColor = isDark ? 'rgba(255, 204, 0, 0.8)' : 'rgba(229, 9, 20, 0.8)';
        const barBorder = isDark ? 'rgba(255, 204, 0, 1)' : 'rgba(229, 9, 20, 1)';

        return {
            labels: top15.map(d => d.phrase.length > 25 ? d.phrase.slice(0, 22) + '...' : d.phrase),
            datasets: [{
                label: metricLabels[chartMetric] || chartMetric,
                data: top15.map(d => isPercent ? d[chartMetric] * 100 : d[chartMetric]),
                backgroundColor: barColor,
                borderColor: barBorder,
                borderWidth: 1,
                borderRadius: 4,
            }],
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.raw;
                                if (isPercent) return val.toFixed(2) + '%';
                                if (isCurrency) return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                return val.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: isDark ? '#A0A0A0' : '#555555',
                            callback: (val) => {
                                if (isPercent) return val + '%';
                                if (isCurrency) return '$' + val.toLocaleString();
                                return val.toLocaleString();
                            }
                        },
                        grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
                    },
                    y: {
                        ticks: { color: isDark ? '#A0A0A0' : '#555555', font: { size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        };
    }, [ngramResults, activeTab, chartMetric]);

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
        setCurrentPage(1);
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
        const target = targetAcos;
        if (acosPct <= target * 0.8) return <span className="ngram-badge acos-good">Good</span>;
        if (acosPct <= target * 1.2) return <span className="ngram-badge acos-warn">Near Target</span>;
        return <span className="ngram-badge acos-bad">High ACOS</span>;
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

                {/* Instruction Cards */}
                <div className="ngram-instruction-cards">
                    <div className="ngram-instruction-card">
                        <div className="card-front">
                            <Upload size={32} className="bounce-icon" />
                            <h3>1. Upload Data</h3>
                            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Upload your Search Term Report</p>
                        </div>
                        <div className="card-back">
                            <strong style={{ marginBottom: '0.75rem', display: 'block' }}>Upload Instructions</strong>
                            <ol>
                                <li>Export your <strong>Search Term Report</strong> from Amazon Ads Console</li>
                                <li>Supports <strong>CSV</strong> and <strong>Excel</strong> formats</li>
                                <li>Required columns: Search term, Impressions, Clicks, Purchases, Sales, Cost, Units</li>
                                <li>Optionally includes <strong>Advertised Product ID</strong> for ASIN filtering</li>
                            </ol>
                        </div>
                    </div>
                    <div className="ngram-instruction-card">
                        <div className="card-front">
                            <BarChart3 size={32} className="bounce-icon" />
                            <h3>2. Configure & Analyze</h3>
                            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Set ACOS target & pick ASIN</p>
                        </div>
                        <div className="card-back">
                            <strong style={{ marginBottom: '0.75rem', display: 'block' }}>Analysis Features</strong>
                            <ul>
                                <li><strong>Child Mode:</strong> Analyze one specific ASIN</li>
                                <li><strong>Brand Mode:</strong> Analyze all ASINs at once</li>
                                <li>Extracts <strong>1, 2, 3, 4-word</strong> patterns from search terms</li>
                                <li>Aggregates spend, sales, CTR, CPC, CVR & ACOS per pattern</li>
                            </ul>
                        </div>
                    </div>
                    <div className="ngram-instruction-card">
                        <div className="card-front">
                            <Download size={32} className="bounce-icon" />
                            <h3>3. Export Results</h3>
                            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Download analysis as Excel</p>
                        </div>
                        <div className="card-back">
                            <strong style={{ marginBottom: '0.75rem', display: 'block' }}>Export Details</strong>
                            <ul>
                                <li>Download a <strong>multi-sheet Excel</strong> file (one sheet per n-gram size)</li>
                                <li>All metrics included: Freq, Impressions, Clicks, Spend, Sales, Orders, Units, CTR, CPC, CVR, ACOS</li>
                                <li><strong>Negative keyword candidates</strong> flagged with badges</li>
                                <li>Charts help identify top spend/sales patterns at a glance</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Steps */}
            <div className="ngram-card-container">

                {/* Step 1: Settings */}
                <div className="ngram-step-card">
                    <div className="ngram-step-header">
                        <div className="ngram-step-number">1</div>
                        <div>
                            <h2>Settings</h2>
                            <p className="text-muted">Set your target ACOS for performance badges</p>
                        </div>
                    </div>
                    <div className="ngram-step-content">
                        <div className="ngram-settings-grid">
                            <div className="ngram-form-group">
                                <label>Target ACOS (%)</label>
                                <input
                                    type="number"
                                    className="ngram-input"
                                    value={targetAcos}
                                    onChange={(e) => setTargetAcos(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                                    min="1"
                                    max="200"
                                />
                            </div>
                            {allAsins.length > 0 && (
                                <div className="ngram-form-group">
                                    <label>ASIN Filter</label>
                                    <select
                                        className="ngram-select"
                                        value={selectedAsin}
                                        onChange={(e) => setSelectedAsin(e.target.value)}
                                    >
                                        <option value="__ALL__">All ASINs (Brand Mode) — {allAsins.length} ASINs</option>
                                        {allAsins.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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
                                        onClick={runAnalysis}
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
                        {/* Summary Stats */}
                        <div className="ngram-summary-bar">
                            <div className="ngram-stat-card">
                                <div className="stat-icon blue"><Hash size={18} /></div>
                                <span className="ngram-stat-label">Unique Search Terms</span>
                                <span className="ngram-stat-value">{fmtNum(summaryStats.totalTerms)}</span>
                            </div>
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
                                    onClick={() => { setActiveTab(n); setCurrentPage(1); setGlobalSearch(''); }}
                                >
                                    {n}-Word
                                    <span className="ngram-tab-count">{(ngramResults[n] || []).length}</span>
                                </button>
                            ))}
                        </div>

                        {/* Chart */}
                        {chartData && chartData.labels.length > 0 && (
                            <div className="ngram-chart-section">
                                <div className="ngram-chart-header">
                                    <h3>Top 15 — {activeTab}-Word Patterns</h3>
                                    <div className="ngram-chart-metric-switcher">
                                        {[
                                            { key: 'cost', label: 'Spend' },
                                            { key: 'sales', label: 'Sales' },
                                            { key: 'impressions', label: 'Impressions' },
                                            { key: 'acos', label: 'ACOS' },
                                        ].map(m => (
                                            <button
                                                key={m.key}
                                                className={`ngram-chart-metric-btn ${chartMetric === m.key ? 'active' : ''}`}
                                                onClick={() => setChartMetric(m.key)}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="ngram-chart-container">
                                    <Bar data={chartData} options={chartData.options} />
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
                                            </tr>
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
                                                </tr>
                                            ))}
                                            {paginatedData.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={columns.length + 1}
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
            </div>
        </section>
    );
};

export default NgramAnalyzer;
