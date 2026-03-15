import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
    Upload,
    FileSpreadsheet,
    Search,
    Filter,
    Download,
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Info,
    FileDown,
    Eye,
    X,
    TrendingUp,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import RegistrationModal from '../../components/ui/RegistrationModal';
import ConsultationCard from '../../components/ui/ConsultationCard';
import useRegistration from '../../context/useRegistration';
import './MissingOpportunitySheet.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v).replace(/[$,₹€£%]/g, '').replace(/\s+/g, '').trim();
    if (!s) return 0;
    const neg = s.startsWith('(') && s.endsWith(')');
    const n = parseFloat(neg ? s.slice(1, -1) : s);
    return isNaN(n) ? 0 : (neg ? -n : n);
}

function canonical(v) {
    return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getVal(row, ...keys) {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== '') return row[key];
        const lower = key.toLowerCase();
        const match = rowKeys.find(k => k.toLowerCase() === lower);
        if (match && row[match] !== undefined && row[match] !== '') return row[match];
    }
    return null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SP_SHEET_NAMES = [
    'SP Search Term Report',
    'Sponsored Products Search Term Report',
    'Search Term Report',
    'SP Campaigns',
];

const PRODUCT_SHEET_NAMES = [
    'Sponsored Products Campaigns',
    'Sponsored Products Advertised Product Report',
    'SP Campaigns',
    'Advertised Product Report'
];

const MATCH_TYPES = ['exact', 'phrase', 'broad'];

const PAGE_SIZE = 100;

const DEFAULT_CAMPAIGN_TEMPLATE = 'SP - [SKU] - [BID RANGE] [MATCH TYPE]';

// ─── Amazon Bulk Operations Helpers (same format as Campaign Builder) ─────────

const AMAZON_COLUMNS = [
    'Product', 'Entity', 'Operation', 'Campaign Id', 'Ad Group Id',
    'Portfolio Id', 'Ad Id', 'Keyword Id', 'Product Targeting Id',
    'Campaign Name', 'Ad Group Name', 'Start Date', 'End Date',
    'Targeting Type', 'State', 'Daily Budget', 'SKU', 'ASIN',
    'Ad Group Default Bid', 'Bid', 'Keyword Text', 'Match Type',
    'Bidding Strategy', 'Placement', 'Percentage', 'Product Targeting Expression'
];

const fmtDate = () => new Date().toISOString().split('T')[0].replace(/-/g, '');

const mkRow = (data) => {
    const r = {};
    AMAZON_COLUMNS.forEach(c => { r[c] = ''; });
    return Object.assign(r, data);
};

const buildMosBulkRows = (enrichedRows, selectedMatches, campaignNameTemplate, isolate) => {
    const rows = [];
    const date = fmtDate();
    const matchTypeLabels = { exact: 'Exact', phrase: 'Phrase', broad: 'Broad' };

    enrichedRows.forEach(row => {
        const selected = selectedMatches[row.id] || {};
        const activeMatchTypes = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
        if (activeMatchTypes.length === 0) return;

        const sku = row.skus ? row.skus.split(',')[0].trim() : '';
        const keyword = row.customerSearchTerm;

        activeMatchTypes.forEach(mt => {
            const matchLabel = matchTypeLabels[mt] || mt;
            const campaignName = campaignNameTemplate
                .replace(/\[SKU\]/gi, sku || row.campaignName)
                .replace(/\[MATCH TYPE\]/gi, matchLabel)
                .replace(/\[BID RANGE\]/gi, row.bid > 0 ? `$${row.bid.toFixed(2)}` : 'Manual');

            const agName = campaignName + ' - Ad Group';

            // Campaign row
            rows.push(mkRow({
                Product: 'Sponsored Products', Entity: 'Campaign', Operation: 'Create',
                'Campaign Id': campaignName, 'Campaign Name': campaignName,
                'Start Date': date,
                'Targeting Type': 'Manual', State: 'enabled',
                'Daily Budget': '10.00', 'Bidding Strategy': 'Dynamic bids - down only',
            }));

            // Placement rows
            [['Placement Top', '0'], ['Placement Product Page', '0'], ['Placement Rest Of Search', '0']]
                .forEach(([p, v]) => rows.push(mkRow({
                    Product: 'Sponsored Products', Entity: 'Bidding Adjustment', Operation: 'Create',
                    'Campaign Id': campaignName, 'Campaign Name': campaignName,
                    Placement: p, Percentage: v,
                })));

            // Ad Group row
            rows.push(mkRow({
                Product: 'Sponsored Products', Entity: 'Ad Group', Operation: 'Create',
                'Campaign Id': campaignName, 'Ad Group Id': agName,
                'Campaign Name': campaignName, 'Ad Group Name': agName,
                'Ad Group Default Bid': row.bid > 0 ? row.bid.toFixed(2) : '1.00', State: 'enabled',
            }));

            // Product Ad row (SKU from mapped data)
            rows.push(mkRow({
                Product: 'Sponsored Products', Entity: 'Product Ad', Operation: 'Create',
                'Campaign Id': campaignName, 'Ad Group Id': agName,
                'Campaign Name': campaignName, 'Ad Group Name': agName,
                SKU: sku, State: 'enabled',
            }));

            // Keyword row
            const ktext = mt === 'broad' ? keyword.split(/\s+/).map(w => `+${w}`).join(' ') : keyword;
            rows.push(mkRow({
                Product: 'Sponsored Products', Entity: 'Keyword', Operation: 'Create',
                'Campaign Id': campaignName, 'Ad Group Id': agName,
                'Campaign Name': campaignName, 'Ad Group Name': agName,
                'Keyword Text': mt === 'broad' ? ktext : keyword,
                'Match Type': mt, Bid: row.bid > 0 ? row.bid.toFixed(2) : '1.00',
                State: 'enabled',
            }));

            // Isolation Logic (Inject Negative Keywords)
            if (isolate) {
                if (mt === 'phrase' && activeMatchTypes.includes('exact')) {
                    rows.push(mkRow({
                        Product: 'Sponsored Products', Entity: 'Campaign Negative Keyword', Operation: 'Create',
                        'Campaign Id': campaignName, 'Campaign Name': campaignName,
                        'Keyword Text': keyword, 'Match Type': 'negativeExact', State: 'enabled',
                    }));
                } else if (mt === 'broad' && (activeMatchTypes.includes('exact') || activeMatchTypes.includes('phrase'))) {
                    rows.push(mkRow({
                        Product: 'Sponsored Products', Entity: 'Campaign Negative Keyword', Operation: 'Create',
                        'Campaign Id': campaignName, 'Campaign Name': campaignName,
                        'Keyword Text': keyword, 'Match Type': 'negativeExact', State: 'enabled',
                    }));
                }
            }
        });
    });

    return rows;
};

// ─── Opportunity Strength ─────────────────────────────────────────────────────

function getStrength(row, acosFilter) {
    const acosOk = !acosFilter || parseNum(acosFilter) === 0 || row.acos <= parseNum(acosFilter);
    if (row.orders >= 2 && acosOk) return 'High';
    if (row.orders >= 1) return 'Medium';
    return 'Low';
}

// ─── Component ────────────────────────────────────────────────────────────────

const MissingOpportunitySheet = () => {
    const { isRegistered } = useRegistration();
    const [showRegModal, setShowRegModal] = useState(false);
    const pendingActionRef = useRef(null);

    // Info accordion
    const [infoOpen, setInfoOpen] = useState(true);

    // File
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState('');
    const [sheetInfo, setSheetInfo] = useState('');
    const fileInputRef = useRef(null);

    // Raw normalized rows from file (all rows with Bid)
    const [allRows, setAllRows] = useState([]);

    // The full keyword index built from ALL rows (never filtered)
    // Map<canonicalTerm, { exact: number, phrase: number, broad: number }>
    const [keywordIndex, setKeywordIndex] = useState(new Map());

    // Filters
    const [acosFilter, setAcosFilter] = useState('');
    const [conversionFilter, setConversionFilter] = useState('');
    const [ordersFilter, setOrdersFilter] = useState('');
    const [skuAsinFilter, setSkuAsinFilter] = useState('');
    const [mode, setMode] = useState('non-isolate'); // 'non-isolate' | 'isolate'

    // Table state
    const [sortCol, setSortCol] = useState('orders');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilterCol, setActiveFilterCol] = useState(null);
    const [colFilters, setColFilters] = useState({});
    const [selectedMatches, setSelectedMatches] = useState({});

    // Preview
    const [showPreview, setShowPreview] = useState(false);

    // Campaign Name Template for bulk generation
    const [campaignNameTemplate, setCampaignNameTemplate] = useState(DEFAULT_CAMPAIGN_TEMPLATE);

    // ── File Upload ────────────────────────────────────────────────────────────

    const parseSearchTermSheet = useCallback((workbook) => {
        const available = workbook.SheetNames;
        let sheetName = null;
        for (const name of SP_SHEET_NAMES) {
            const match = available.find(s => s.toLowerCase().trim() === name.toLowerCase().trim());
            if (match) { sheetName = match; break; }
        }
        // Fuzzy fallback: contains "search term" and "sp" or "sponsored products"
        if (!sheetName) {
            sheetName = available.find(s => {
                const sl = s.toLowerCase();
                return sl.includes('search term') && (sl.includes('sp') || sl.includes('sponsored'));
            });
        }
        if (!sheetName) return null;

        const ws = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setSheetInfo(`Sheet: "${sheetName}" · ${json.length.toLocaleString()} rows`);
        return json;
    }, []);

    const parseProductSheet = useCallback((workbook) => {
        const available = workbook.SheetNames;
        let sheetName = null;
        for (const name of PRODUCT_SHEET_NAMES) {
            const match = available.find(s => s.toLowerCase().trim() === name.toLowerCase().trim());
            if (match) { sheetName = match; break; }
        }
        if (!sheetName) return [];
        const ws = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(ws, { defval: '' });
    }, []);

    const buildProductMap = useCallback((productRows) => {
        const map = new Map();
        productRows.forEach(row => {
            const campId = String(getVal(row, 'Campaign ID', 'campaign_id', 'Campaign Id', 'campaign id') || '').trim();
            const adGroupId = String(getVal(row, 'Ad Group ID', 'ad_group_id', 'Ad Group Id', 'ad group id') || '').trim();
            
            if (!campId || !adGroupId) return;
            
            const sku = String(getVal(row, 'Advertised SKU', 'advertised_sku', 'SKU', 'sku', 'Advertised sku') || '').trim();
            const asin = String(getVal(row, 'Advertised ASIN', 'advertised_asin', 'ASIN', 'asin', 'Advertised asin') || '').trim();
            
            if (!sku && !asin) return;
            
            const key = `${campId}_${adGroupId}`;
            if (!map.has(key)) {
                map.set(key, { skus: new Set(), asins: new Set() });
            }
            const entry = map.get(key);
            if (sku) entry.skus.add(sku);
            if (asin) entry.asins.add(asin);
        });
        return map;
    }, []);

    const buildKeywordIndex = useCallback((rawRows) => {
        // Count how many unique campaigns each search term is targeted in per match type
        const tempIdx = new Map();
        rawRows.forEach(row => {
            const kwText = canonical(
                getVal(row, 'Keyword text', 'Keyword Text', 'Keyword', 'keyword text') || ''
            );
            if (!kwText) return;
            const mt = canonical(
                getVal(row, 'Match type', 'Match Type', 'match type') || ''
            );
            const campId = String(getVal(row, 'Campaign ID', 'campaign_id', 'Campaign Id', 'campaign id') || '').trim();
            
            if (!tempIdx.has(kwText)) {
                tempIdx.set(kwText, { exact: new Set(), phrase: new Set(), broad: new Set() });
            }
            const entry = tempIdx.get(kwText);
            if (mt === 'exact') entry.exact.add(campId);
            else if (mt === 'phrase') entry.phrase.add(campId);
            else if (mt === 'broad') entry.broad.add(campId);
        });

        // Convert the Sets into integers for the UI
        const finalIdx = new Map();
        tempIdx.forEach((val, key) => {
            finalIdx.set(key, {
                exact: val.exact.size,
                phrase: val.phrase.size,
                broad: val.broad.size
            });
        });
        
        return finalIdx;
    }, []);

    const normalizeRows = useCallback((rawRows, productMap) => {
        return rawRows
            .map((row, index) => {
                const bid = getVal(row, 'Bid', 'bid');
                // Only include rows where Bid has a value
                if (bid === '' || bid === null || bid === undefined) return null;

                const customerSearchTerm = String(
                    getVal(row, 'Customer Search Term', 'Customer search term', 'Search Term', 'search_query', 'Query') || ''
                ).trim();
                if (!customerSearchTerm) return null;

                const customerSearchTermKey = canonical(customerSearchTerm);
                
                // Ignore ASINs (Search terms starting with 'b0' and having no spaces)
                if (customerSearchTermKey.startsWith('b0') && !customerSearchTermKey.includes(' ')) {
                    return null;
                }

                const keywordText = String(
                    getVal(row, 'Keyword text', 'Keyword Text', 'Keyword', 'keyword text') || ''
                ).trim();
                const matchType = String(
                    getVal(row, 'Match type', 'Match Type', 'match type') || ''
                ).trim();
                const campaignName = String(
                    getVal(row, 'Campaign name (Informational only)', 'Campaign name', 'Campaign Name', 'Campaign', 'campaign') || ''
                ).trim();

                const clicks = parseNum(getVal(row, 'Clicks', 'clicks'));
                const impressions = parseNum(getVal(row, 'Impressions', 'impressions'));
                const orders = parseNum(getVal(row, 'Orders', '14 Day Total Orders', '7 Day Total Orders', 'Total Orders', 'orders'));
                const spend = parseNum(getVal(row, 'Spend', 'Cost', 'spend'));
                const sales = parseNum(getVal(row, 'Sales', '14 Day Total Sales', '7 Day Total Sales', 'Total Sales', 'sales'));
                const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;
                const acos = sales > 0 ? (spend / sales) * 100 : 0;

                const campId = String(getVal(row, 'Campaign ID', 'campaign_id', 'Campaign Id', 'campaign id') || '').trim();
                const adGroupId = String(getVal(row, 'Ad Group ID', 'ad_group_id', 'Ad Group Id', 'ad group id') || '').trim();
                
                let skus = '';
                let asins = '';
                if (campId && adGroupId && productMap) {
                    const productData = productMap.get(`${campId}_${adGroupId}`);
                    if (productData) {
                        skus = Array.from(productData.skus).join(', ');
                        asins = Array.from(productData.asins).join(', ');
                    }
                }

                return {
                    id: index.toString(),
                    customerSearchTerm,
                    customerSearchTermKey,
                    keywordText,
                    matchType,
                    campaignName,
                    campaignId: campId,
                    adGroupId: adGroupId,
                    skus,
                    asins,
                    bid: parseNum(bid),
                    clicks, impressions, orders, spend, sales, conversionRate, acos,
                };
            })
            .filter(Boolean);
    }, []);

    const onFileUpload = useCallback((e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const lower = f.name.toLowerCase();
        if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
            setParseError('Please upload a valid Excel (.xlsx or .xls) file.');
            return;
        }
        setFile(f);
        setIsParsing(true);
        setParseError('');
        setAllRows([]);
        setKeywordIndex(new Map());
        setSheetInfo('');
        setPage(1);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                
                const rawRows = parseSearchTermSheet(wb);
                if (!rawRows || rawRows.length === 0) {
                    setParseError('No Search Term Report sheet found in file.');
                    setIsParsing(false);
                    return;
                }
                
                const productRows = parseProductSheet(wb);
                const productMap = buildProductMap(productRows);
                
                const idx = buildKeywordIndex(rawRows);
                const norm = normalizeRows(rawRows, productMap);
                
                setKeywordIndex(idx);
                setAllRows(norm);
                if (norm.length === 0) {
                    setParseError('No rows with a Bid value found. Ensure you upload an SP Search Term Report sheet.');
                }
                setIsParsing(false);
            } catch (err) {
                console.error(err);
                setParseError('Failed to parse Excel file. Ensure it is a valid Amazon bulk operations file.');
                setIsParsing(false);
            }
        };
        reader.onerror = () => { setParseError('Error reading file.'); setIsParsing(false); };
        reader.readAsArrayBuffer(f);
    }, [parseSearchTermSheet, buildKeywordIndex, normalizeRows, parseProductSheet, buildProductMap]);

    const clearFile = useCallback(() => {
        setFile(null);
        setAllRows([]);
        setKeywordIndex(new Map());
        setSheetInfo('');
        setParseError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // ── Enriched rows (adds trigger counts, opportunity data) ─────────────────

    const enrichedRows = useMemo(() => {
        return allRows.map(row => {
            // Look up existing keyword coverage from FULL dataset index
            const key = row.customerSearchTermKey;
            const triggers = keywordIndex.get(key) || { exact: 0, phrase: 0, broad: 0 };

            // Determine missing match types
            const missing = [];
            if (triggers.exact === 0) missing.push('Exact');
            if (triggers.phrase === 0) missing.push('Phrase');
            const missingText = missing.length > 0 ? missing.join(' + ') : '—';

            // Opportunity type (for display purposes)
            const opportunityType = missing.length > 0 ? missing[0] : null; // primary opportunity

            return {
                ...row,
                triggers,
                missingMatchTypes: missingText,
                opportunityType,
                isOpportunity: missing.length > 0,
            };
        });
    }, [allRows, keywordIndex]);

    // ── Filtered rows (respects user filters) ─────────────────────────────────

    const filteredRows = useMemo(() => {
        let list = enrichedRows.filter(r => r.isOpportunity); // only actual opportunities

        // ACOS filter (≤)
        if (acosFilter && parseNum(acosFilter) > 0) {
            list = list.filter(r => r.acos <= parseNum(acosFilter));
        }
        // Conversion filter (≥)
        if (conversionFilter && parseNum(conversionFilter) > 0) {
            list = list.filter(r => r.conversionRate >= parseNum(conversionFilter));
        }
        // Orders filter (≥)
        if (ordersFilter && parseNum(ordersFilter) > 0) {
            list = list.filter(r => r.orders >= parseNum(ordersFilter));
        }

        // Column filters
        if (colFilters.customerSearchTerm) {
            const q = canonical(colFilters.customerSearchTerm);
            list = list.filter(r => r.customerSearchTermKey.includes(q));
        }
        if (colFilters.keywordText) {
            const q = canonical(colFilters.keywordText);
            list = list.filter(r => canonical(r.keywordText).includes(q));
        }
        if (colFilters.matchType) {
            const q = canonical(colFilters.matchType);
            list = list.filter(r => canonical(r.matchType).includes(q));
        }
        if (colFilters.skus) {
            const q = canonical(colFilters.skus);
            list = list.filter(r => canonical(r.skus).includes(q));
        }
        if (colFilters.asins) {
            const q = canonical(colFilters.asins);
            list = list.filter(r => canonical(r.asins).includes(q));
        }

        // SKU / ASIN filter
        if (skuAsinFilter) {
            const q = canonical(skuAsinFilter);
            list = list.filter(r => 
                canonical(r.skus).includes(q) || 
                canonical(r.asins).includes(q)
            );
        }

        // Search bar
        if (searchTerm) {
            const q = canonical(searchTerm);
            list = list.filter(r =>
                r.customerSearchTermKey.includes(q) ||
                canonical(r.keywordText).includes(q)
            );
        }

        // Isolate mode: deduplicate by search term, pick best row (most orders, then lowest ACOS)
        if (mode === 'isolate') {
            const seen = new Map();
            list.forEach(r => {
                const existing = seen.get(r.customerSearchTermKey);
                if (!existing) {
                    seen.set(r.customerSearchTermKey, r);
                } else {
                    // prefer more orders, then lower ACOS
                    if (r.orders > existing.orders || (r.orders === existing.orders && r.acos < existing.acos)) {
                        seen.set(r.customerSearchTermKey, r);
                    }
                }
            });
            list = Array.from(seen.values());
        }

        return list;
    }, [enrichedRows, acosFilter, conversionFilter, ordersFilter, colFilters, searchTerm, mode, skuAsinFilter]);

    // ── Sort ──────────────────────────────────────────────────────────────────

    const sortedRows = useMemo(() => {
        if (!sortCol) return filteredRows;
        return [...filteredRows].sort((a, b) => {
            let av = a[sortCol], bv = b[sortCol];
            if (typeof av === 'string') av = canonical(av);
            if (typeof bv === 'string') bv = canonical(bv);
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredRows, sortCol, sortDir]);

    // ── Pagination ────────────────────────────────────────────────────────────

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
    const pageStart = (page - 1) * PAGE_SIZE;
    const pageRows = sortedRows.slice(pageStart, pageStart + PAGE_SIZE);

    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('desc'); }
        setPage(1);
    };

    const SortIcon = ({ col }) => {
        if (sortCol !== col) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
        return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
    };

    // ── Bulk Campaign Generation ───────────────────────────────────────────────

    const selectedCount = useMemo(() => {
        return Object.values(selectedMatches).reduce((acc, row) => {
            return acc + Object.values(row).filter(Boolean).length;
        }, 0);
    }, [selectedMatches]);

    const doGenerateBulk = useCallback(() => {
        const isolate = mode === 'isolate';
        const rows = buildMosBulkRows(sortedRows, selectedMatches, campaignNameTemplate, isolate);
        if (rows.length === 0) {
            alert('No triggers selected. Click Exact / Phrase / Broad buttons in the results table to select keywords to generate.');
            return;
        }
        const ws = XLSX.utils.json_to_sheet(rows, { header: AMAZON_COLUMNS });
        ws['!cols'] = AMAZON_COLUMNS.map(h => ({ wch: Math.max(h.length + 2, 16) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sponsored Products');
        XLSX.writeFile(wb, `MOS_Bulk_Upload_${fmtDate()}.xlsx`);
    }, [enrichedRows, selectedMatches, campaignNameTemplate]);

    const handleGenerateBulk = () => {
        if (isRegistered) { doGenerateBulk(); return; }
        pendingActionRef.current = 'bulk';
        setShowRegModal(true);
    };

    const handleRegSuccess = () => {
        setShowRegModal(false);
        if (pendingActionRef.current === 'bulk') doGenerateBulk();
        pendingActionRef.current = null;
    };

    const handleToggleAllFor = (type) => {
        setSelectedMatches(prev => {
            const next = { ...prev };
            let allSelected = true;
            sortedRows.forEach(row => {
                if (row.triggers[type] === 0) {
                    if (!next[row.id] || !next[row.id][type]) {
                        allSelected = false;
                    }
                }
            });

            sortedRows.forEach(row => {
                if (row.triggers[type] === 0) {
                    // Ensure deep copy of the nested object for this search term
                    next[row.id] = { ...next[row.id], [type]: !allSelected };
                }
            });
            return next;
        });
    };

    // ── Filter popover helpers ─────────────────────────────────────────────────

    const setColFilter = (col, val) => {
        setColFilters(prev => ({ ...prev, [col]: val }));
        setPage(1);
    };

    const ThSort = ({ col, label }) => (
        <th
            className="mos-th mos-th-sortable"
            onClick={() => handleSort(col)}
        >
            <div className="gf-th-inner">
                <span>{label}</span>
                <SortIcon col={col} />
            </div>
        </th>
    );

    const ThFilter = ({ col, label }) => (
        <th className="mos-th mos-th-sortable" onClick={() => handleSort(col)}>
            <div className="gf-th-inner">
                <span>{label}</span>
                <SortIcon col={col} />
                <button
                    className={`gf-filter-trigger ${colFilters[col] ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveFilterCol(activeFilterCol === col ? null : col); }}
                >
                    <Filter size={11} />
                </button>
                {activeFilterCol === col && (
                    <div className="gf-filter-popover" onClick={e => e.stopPropagation()}>
                        <input
                            autoFocus
                            placeholder={`Filter ${label}...`}
                            value={colFilters[col] || ''}
                            onChange={e => setColFilter(col, e.target.value)}
                        />
                    </div>
                )}
            </div>
        </th>
    );

    // ── Badge helpers ──────────────────────────────────────────────────────────

    const StrengthBadge = ({ row }) => {
        const s = getStrength(row, acosFilter);
        return <span className={`mos-strength-badge mos-strength-${s.toLowerCase()}`}>{s}</span>;
    };

    const AcosBadge = ({ val }) => {
        if (!val) return <span className="gf-muted-dash">—</span>;
        const cls = val > 50 ? 'bad' : val > 30 ? 'warn' : 'good';
        return <span className={`gf-acos-badge ${cls}`}>{val.toFixed(1)}%</span>;
    };

    const toggleMatchSelection = useCallback((rowKey, matchType) => {
        setSelectedMatches(prev => {
            const rowSelected = prev[rowKey] || {};
            return {
                ...prev,
                [rowKey]: {
                    ...rowSelected,
                    [matchType]: !rowSelected[matchType]
                }
            };
        });
    }, []);

    const TriggerCounts = ({ row }) => {
        const { triggers, id } = row;
        const selected = selectedMatches[id] || {};
        return (
            <span className="mos-trigger-col">
                <button
                    type="button" 
                    className={`mos-trigger-btn ${triggers.exact > 0 ? 'mos-trigger-locked' : (selected.exact ? 'mos-trigger-active' : 'mos-trigger-available')}`}
                    onClick={(e) => { e.stopPropagation(); triggers.exact === 0 && toggleMatchSelection(id, 'exact'); }}
                    disabled={triggers.exact > 0}
                >
                    Exact ({triggers.exact})
                </button>
                <button 
                    type="button"
                    className={`mos-trigger-btn ${triggers.phrase > 0 ? 'mos-trigger-locked' : (selected.phrase ? 'mos-trigger-active' : 'mos-trigger-available')}`}
                    onClick={(e) => { e.stopPropagation(); triggers.phrase === 0 && toggleMatchSelection(id, 'phrase'); }}
                    disabled={triggers.phrase > 0}
                >
                    Phrase ({triggers.phrase})
                </button>
                <button 
                    type="button"
                    className={`mos-trigger-btn ${triggers.broad > 0 ? 'mos-trigger-locked' : (selected.broad ? 'mos-trigger-active' : 'mos-trigger-available')}`}
                    onClick={(e) => { e.stopPropagation(); triggers.broad === 0 && toggleMatchSelection(id, 'broad'); }}
                    disabled={triggers.broad > 0}
                >
                    Broad ({triggers.broad})
                </button>
            </span>
        );
    };

    const hasResults = sortedRows.length > 0;

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <section className="mos-page container section" onClick={() => setActiveFilterCol(null)}>

            {/* ── Page Header ── */}
            <div className="gf-header text-center mos-page-header">
                <div className="gf-icon-ring">
                    <TrendingUp size={36} color="var(--color-primary)" />
                </div>
                <h1>Missing Opportunity Sheet</h1>
                <p className="text-muted gf-subtitle">
                    Analyse your SP Search Term Report to surface high-performing search terms not yet targeted as Exact or Phrase keywords.
                </p>
            </div>

            {/* ── Info Accordion ── */}
            <div className="gf-info-card">
                <button
                    type="button"
                    className="gf-info-toggle"
                    onClick={(e) => { e.stopPropagation(); setInfoOpen(v => !v); }}
                >
                    <div className="gf-info-toggle-left">
                        <Info size={16} />
                        <span>Missing Opportunity Sheet</span>
                    </div>
                    <ChevronDown size={16} className={`gf-chevron ${infoOpen ? 'open' : ''}`} />
                </button>

                {infoOpen && (
                    <div className="gf-info-body">
                        <div className="gf-info-columns">
                            <div className="gf-info-col">
                                <h4>What This Tool Does</h4>
                                <p>Identifies search terms converting in your SP campaigns that are missing Exact or Phrase keyword targeting — turning auto/broad wins into controlled manual campaigns.</p>
                                <ul>
                                    <li>Auto-selects the <strong>SP Search Term Report</strong> sheet</li>
                                    <li>Compares search terms against all existing keywords</li>
                                    <li>Shows trigger counts (E/P/B) mapped by unique campaigns</li>
                                    <li>Highlights missing match types and opportunity strength</li>
                                    <li>Generate a bulk campaign creation file specifically for selected terms</li>
                                </ul>
                            </div>
                            <div className="gf-info-col">
                                <h4>How To Use</h4>
                                <ol>
                                    <li>Download your Amazon Ads Bulk Operations file</li>
                                    <li>Upload the file below — the SP sheet is auto-detected</li>
                                    <li>Set ACOS, Conversion, and Orders filters as needed</li>
                                    <li>Review search terms and their missing match types</li>
                                    <li>Export the sheet and use it to build new keywords</li>
                                </ol>
                                <a
                                    href="https://advertising.amazon.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gf-info-link"
                                >
                                    <FileDown size={14} /> Download Bulk Operations File
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Step 1: Upload ── */}
            <div className="gf-section-card gf-step-card" onClick={e => e.stopPropagation()}>
                <div className="mos-step-header">
                    <div className="mos-step-number">1</div>
                    <div>
                        <h2>Upload SP Search Term Report</h2>
                        <p className="text-muted">Auto-selects the correct sheet from your Bulk Operations file</p>
                    </div>
                </div>

                {!file ? (
                    <label className="gf-upload-zone" htmlFor="mos-file-input">
                        <input
                            id="mos-file-input"
                            type="file"
                            accept=".xlsx,.xls"
                            ref={fileInputRef}
                            onChange={onFileUpload}
                        />
                        <div className="gf-upload-icon">
                            <Upload size={28} />
                        </div>
                        <div className="gf-upload-text">
                            <strong>Amazon Bulk Operations File</strong>
                            <p className="text-muted">Click to upload Excel file (.xlsx, .xls) — SP Search Term Report auto-selected</p>
                        </div>
                    </label>
                ) : (
                    <div className="gf-file-loaded">
                        <div className="gf-file-info">
                            <FileSpreadsheet size={20} color="var(--color-primary)" />
                            <div>
                                <strong className="gf-file-name">{file.name}</strong>
                                {sheetInfo && <p className="text-muted gf-sheet-info">{sheetInfo} · {allRows.length.toLocaleString()} rows with Bid</p>}
                            </div>
                        </div>
                        <button type="button" className="gf-file-clear" onClick={clearFile} title="Remove file">×</button>
                    </div>
                )}

                {isParsing && <div className="gf-parsing-indicator"><span className="gf-spinner" /> Parsing file…</div>}

                {parseError && (
                    <div className="gf-alert-error">
                        <AlertCircle size={16} />
                        <span>{parseError}</span>
                    </div>
                )}
            </div>

            {/* ── Step 2: Filters ── */}
            <div className="gf-section-card gf-step-card" onClick={e => e.stopPropagation()}>
                <div className="mos-step-header">
                    <div className="mos-step-number">2</div>
                    <div>
                        <h2>Set Filters & Mode</h2>
                        <p className="text-muted">Define your opportunity criteria and isolation mode</p>
                    </div>
                </div>
                <div className="mos-filter-panel">
                    <div className="mos-filter-group">
                        <label className="mos-filter-label">ACOS ≤ (%)</label>
                        <input
                            type="number"
                            className="gf-criteria-input mos-filter-input"
                            placeholder="e.g. 50"
                            min="0"
                            step="1"
                            value={acosFilter}
                            onChange={e => { setAcosFilter(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="mos-filter-group">
                        <label className="mos-filter-label">Conversion ≥ (%)</label>
                        <input
                            type="number"
                            className="gf-criteria-input mos-filter-input"
                            placeholder="e.g. 5"
                            min="0"
                            step="0.1"
                            value={conversionFilter}
                            onChange={e => { setConversionFilter(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="mos-filter-group">
                        <label className="mos-filter-label">Orders ≥ (%)</label>
                        <input
                            type="number"
                            className="gf-criteria-input mos-filter-input"
                            placeholder="e.g. 1"
                            min="0"
                            step="1"
                            value={ordersFilter}
                            onChange={e => { setOrdersFilter(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="mos-filter-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="mos-filter-label">Campaign Name Structure</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="text"
                                className="gf-criteria-input mos-filter-input"
                                placeholder="SP - [SKU] - [BID RANGE] [MATCH TYPE]"
                                value={campaignNameTemplate}
                                onChange={e => setCampaignNameTemplate(e.target.value)}
                                style={{ fontFamily: 'monospace', fontSize: '0.8rem', width: '100%' }}
                            />
                            <button
                                type="button"
                                className="mos-reset-template-btn"
                                title="Reset to default"
                                onClick={() => setCampaignNameTemplate(DEFAULT_CAMPAIGN_TEMPLATE)}
                            >↺</button>
                        </div>
                        <p className="mos-template-hint">[SKU] [MATCH TYPE] [BID RANGE] are replaced automatically</p>
                    </div>
                    <div className="mos-filter-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="mos-filter-label">Search Term Isolation</label>
                        <div className="mos-radio-pill-group double" style={{ display: 'flex', width: '100%', gap: '1rem' }}>
                            <label className={`mos-radio-pill ${mode === 'non-isolate' ? 'active' : ''}`} style={{ flex: 1 }}>
                                <input type="radio" value="non-isolate" checked={mode === 'non-isolate'} onChange={() => { setMode('non-isolate'); setPage(1); }} />
                                Non-Isolate
                            </label>
                            <label className={`mos-radio-pill ${mode === 'isolate' ? 'active' : ''}`} style={{ flex: 1 }}>
                                <input type="radio" value="isolate" checked={mode === 'isolate'} onChange={() => { setMode('isolate'); setPage(1); }} />
                                Isolate
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Step 3: Results ── */}
            {allRows.length > 0 && (
                <div className="gf-section-card gf-step-card" onClick={e => e.stopPropagation()}>
                    <div className="mos-step-header">
                        <div className="mos-step-number mos-step-number--green">3</div>
                        <div>
                            <h2>Missing Opportunity Results</h2>
                            <p className="text-muted" style={{ margin: 0, fontSize: '0.88rem' }}>
                                {sortedRows.length.toLocaleString()} opportunit{sortedRows.length !== 1 ? 'ies' : 'y'} found
                                {mode === 'isolate' && ' (Isolate mode — unique terms only)'}
                            </p>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div>
                        <div className="gf-adgroup-toolbar" style={{ paddingTop: '0' }}>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div className="gf-adgroup-search-wrap" style={{ flex: 1, minWidth: '200px' }}>
                                    <Search size={15} />
                                    <input
                                        type="text"
                                        placeholder="Search search terms…"
                                        value={searchTerm}
                                        onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                                    />
                                </div>
                                <div className="gf-adgroup-search-wrap" style={{ flex: 1, minWidth: '200px' }}>
                                    <Search size={15} />
                                    <input
                                        type="text"
                                        placeholder="Search SKU or ASIN…"
                                        value={skuAsinFilter}
                                        onChange={e => { setSkuAsinFilter(e.target.value); setPage(1); }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    className="gf-generate-bulk-btn mos-bulk-generate-btn"
                                    onClick={handleGenerateBulk}
                                    disabled={selectedCount === 0}
                                >
                                    <Download size={15} />
                                    Generate Bulk File{selectedCount > 0 ? ` (${selectedCount})` : ''}
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="gf-candidates-list-wrap">
                            <div className="gf-optimizer-table-container mos-table-container">
                                <table className="gf-optimizer-table mos-table">
                                    <thead>
                                        <tr>
                                            <ThFilter col="customerSearchTerm" label="Search Term" />
                                            <ThFilter col="keywordText" label="Keyword Text" />
                                            <th className="mos-th mos-th-triggers">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                                                    <span>Triggers</span>
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button className="mos-trigger-all-btn exact" onClick={(e) => { e.stopPropagation(); handleToggleAllFor('exact'); }} title="Toggle All Exact">Exact</button>
                                                        <button className="mos-trigger-all-btn phrase" onClick={(e) => { e.stopPropagation(); handleToggleAllFor('phrase'); }} title="Toggle All Phrase">Phrase</button>
                                                        <button className="mos-trigger-all-btn broad" onClick={(e) => { e.stopPropagation(); handleToggleAllFor('broad'); }} title="Toggle All Broad">Broad</button>
                                                    </div>
                                                </div>
                                            </th>
                                            <ThSort col="orders" label="Orders" />
                                            <ThSort col="conversionRate" label="CVR %" />
                                            <ThSort col="acos" label="ACOS" />
                                            <ThSort col="bid" label="Bid" />
                                            <th className="mos-th">Missing Opp.</th>
                                            <th className="mos-th">Strength</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="gf-optimizer-td gf-empty-cell">
                                                    {allRows.length > 0 ? 'No opportunities match your filters.' : 'Upload a file above to see results.'}
                                                </td>
                                            </tr>
                                        ) : pageRows.map((row, i) => (
                                            <tr key={i} className="gf-optimizer-tr">
                                                <td className="gf-optimizer-td gf-term-cell">{row.customerSearchTerm}</td>
                                                <td className="gf-optimizer-td gf-truncate-cell">
                                                    {row.keywordText
                                                        ? <span className="gf-target-badge">{row.keywordText}</span>
                                                        : <span className="gf-muted-dash">—</span>}
                                                </td>
                                                <td className="gf-optimizer-td"><TriggerCounts row={row} /></td>
                                                <td className="gf-optimizer-td">{row.orders > 0 ? row.orders : '—'}</td>
                                                <td className="gf-optimizer-td">{row.conversionRate > 0 ? `${row.conversionRate.toFixed(1)}%` : '—'}</td>
                                                <td className="gf-optimizer-td"><AcosBadge val={row.acos} /></td>
                                                <td className="gf-optimizer-td">{row.bid > 0 ? `$${row.bid.toFixed(2)}` : '—'}</td>
                                                <td className="gf-optimizer-td">
                                                    <span className="mos-missing-col">{row.missingMatchTypes}</span>
                                                </td>
                                                <td className="gf-optimizer-td"><StrengthBadge row={row} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="gf-pagination-row" style={{ padding: '0.75rem 1rem' }}>
                                <span className="text-muted">
                                    {sortedRows.length === 0 ? 'No results' : (
                                        `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, sortedRows.length)} of ${sortedRows.length.toLocaleString()}`
                                    )}
                                </span>
                                <div className="gf-pagination-controls">
                                    <button
                                        type="button" className="gf-page-btn"
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="text-muted">Page {page} / {totalPages}</span>
                                    <button
                                        type="button" className="gf-page-btn"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConsultationCard />

            {/* ── Registration Modal ── */}
            <RegistrationModal
                isOpen={showRegModal}
                onClose={() => { setShowRegModal(false); pendingActionRef.current = null; }}
                onSuccess={handleRegSuccess}
                toolSlug="missing-opportunity-sheet"
            />

            {/* ── Web Preview Modal ── */}
            {showPreview && (
                <div className="mos-preview-overlay" onClick={() => setShowPreview(false)}>
                    <div className="mos-preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="mos-preview-header">
                            <h2>Missing Opportunity Sheet — Preview</h2>
                            <button type="button" className="mos-preview-close" onClick={() => setShowPreview(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-muted" style={{ margin: '0 0 1rem', fontSize: '0.84rem' }}>
                            {sortedRows.length.toLocaleString()} rows · {mode === 'isolate' ? 'Isolate' : 'Non-Isolate'} mode
                        </p>
                        <div className="mos-preview-scroll">
                            <table className="mos-preview-table">
                                <thead>
                                    <tr>
                                        <th>Search Term</th>
                                        <th>Keyword Text</th>
                                        <th>Triggers (E/P/B)</th>
                                        <th>Orders</th>
                                        <th>CVR %</th>
                                        <th>ACOS %</th>
                                        <th>Bid</th>
                                        <th>Missing Opportunity</th>
                                        <th>Strength</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRows.slice(0, 200).map((row, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'mos-preview-even' : ''}>
                                            <td>{row.customerSearchTerm}</td>
                                            <td>{row.keywordText || '—'}</td>
                                            <td>Exact({row.triggers.exact}) Phrase({row.triggers.phrase}) Broad({row.triggers.broad})</td>
                                            <td>{row.orders || '—'}</td>
                                            <td>{row.conversionRate > 0 ? `${row.conversionRate.toFixed(1)}%` : '—'}</td>
                                            <td>{row.acos > 0 ? `${row.acos.toFixed(1)}%` : '—'}</td>
                                            <td>{row.bid > 0 ? `$${row.bid.toFixed(2)}` : '—'}</td>
                                            <td>{row.missingMatchTypes}</td>
                                            <td>{getStrength(row, acosFilter)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {sortedRows.length > 200 && (
                                <p className="text-muted" style={{ textAlign: 'center', padding: '1rem', fontSize: '0.82rem' }}>
                                    Showing first 200 rows in preview. Export for full data.
                                </p>
                            )}
                        </div>
                        <div className="mos-preview-footer">
                            <button type="button" className="gf-generate-bulk-btn" onClick={handleExportExcel}>
                                <Download size={15} /> Export Excel
                            </button>
                            <button type="button" className="gf-generate-bulk-btn mos-csv-btn" onClick={handleExportCsv}>
                                <Download size={15} /> Export CSV
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default MissingOpportunitySheet;
