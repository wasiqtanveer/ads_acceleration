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

const MATCH_TYPES = ['exact', 'phrase', 'broad'];

const PAGE_SIZE = 100;

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

    // ── File Upload ────────────────────────────────────────────────────────────

    const parseExcel = useCallback((workbook) => {
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
        if (!sheetName) sheetName = available[0];

        const ws = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setSheetInfo(`Sheet: "${sheetName}" · ${json.length.toLocaleString()} rows`);
        return json;
    }, []);

    const buildKeywordIndex = useCallback((rawRows) => {
        // Count how many times each search term appears as a keyword text
        // per match type, across the ENTIRE dataset (no filters applied)
        const idx = new Map();
        rawRows.forEach(row => {
            const kwText = canonical(
                getVal(row, 'Keyword text', 'Keyword Text', 'Keyword', 'keyword text') || ''
            );
            if (!kwText) return;
            const mt = canonical(
                getVal(row, 'Match type', 'Match Type', 'match type') || ''
            );
            if (!idx.has(kwText)) {
                idx.set(kwText, { exact: 0, phrase: 0, broad: 0 });
            }
            const entry = idx.get(kwText);
            if (mt === 'exact') entry.exact++;
            else if (mt === 'phrase') entry.phrase++;
            else if (mt === 'broad') entry.broad++;
        });
        return idx;
    }, []);

    const normalizeRows = useCallback((rawRows) => {
        return rawRows
            .map((row) => {
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

                return {
                    customerSearchTerm,
                    customerSearchTermKey: canonical(customerSearchTerm),
                    keywordText,
                    matchType,
                    campaignName,
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
                const rawRows = parseExcel(wb);
                const idx = buildKeywordIndex(rawRows);
                const norm = normalizeRows(rawRows);
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
    }, [parseExcel, buildKeywordIndex, normalizeRows]);

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
    }, [enrichedRows, acosFilter, conversionFilter, ordersFilter, colFilters, searchTerm, mode]);

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

    // ── Export ────────────────────────────────────────────────────────────────

    const buildExportData = useCallback(() => {
        return sortedRows.map(r => ({
            'Search Term': r.customerSearchTerm,
            'Keyword Text': r.keywordText,
            'Exact Triggers': r.triggers.exact,
            'Phrase Triggers': r.triggers.phrase,
            'Broad Triggers': r.triggers.broad,
            'Campaign Name': r.campaignName,
            'Bid': r.bid.toFixed(2),
            'Orders': r.orders,
            'Conversion Rate (%)': r.conversionRate.toFixed(2),
            'ACOS (%)': r.acos.toFixed(2),
            'Missing Opportunity': r.missingMatchTypes,
            'Opportunity Strength': getStrength(r, acosFilter),
        }));
    }, [sortedRows, acosFilter]);

    const doExportExcel = useCallback(() => {
        const data = buildExportData();
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Missing Opportunities');
        XLSX.writeFile(wb, 'Missing_Opportunity_Sheet.xlsx');
    }, [buildExportData]);

    const doExportCsv = useCallback(() => {
        const data = buildExportData();
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Missing Opportunities');
        XLSX.writeFile(wb, 'Missing_Opportunity_Sheet.csv');
    }, [buildExportData]);

    const handleExportExcel = () => {
        if (isRegistered) { doExportExcel(); return; }
        pendingActionRef.current = 'excel';
        setShowRegModal(true);
    };

    const handleExportCsv = () => {
        if (isRegistered) { doExportCsv(); return; }
        pendingActionRef.current = 'csv';
        setShowRegModal(true);
    };

    const handleRegSuccess = () => {
        setShowRegModal(false);
        if (pendingActionRef.current === 'excel') doExportExcel();
        else if (pendingActionRef.current === 'csv') doExportCsv();
        pendingActionRef.current = null;
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
        const { triggers, customerSearchTermKey } = row;
        const selected = selectedMatches[customerSearchTermKey] || {};
        return (
            <span className="mos-trigger-col">
                <button
                    type="button" 
                    className={`mos-trigger-btn ${triggers.exact > 0 ? 'mos-trigger-locked' : (selected.exact ? 'mos-trigger-active' : 'mos-trigger-available')}`}
                    onClick={(e) => { e.stopPropagation(); triggers.exact === 0 && toggleMatchSelection(customerSearchTermKey, 'exact'); }}
                    disabled={triggers.exact > 0}
                >
                    Exact ({triggers.exact})
                </button>
                <button 
                    type="button"
                    className={`mos-trigger-btn ${triggers.phrase > 0 ? 'mos-trigger-locked' : (selected.phrase ? 'mos-trigger-active' : 'mos-trigger-available')}`}
                    onClick={(e) => { e.stopPropagation(); triggers.phrase === 0 && toggleMatchSelection(customerSearchTermKey, 'phrase'); }}
                    disabled={triggers.phrase > 0}
                >
                    Phrase ({triggers.phrase})
                </button>
                <button 
                    type="button"
                    className={`mos-trigger-btn ${triggers.broad > 0 ? 'mos-trigger-locked' : (selected.broad ? 'mos-trigger-active' : 'mos-trigger-available')}`}
                    onClick={(e) => { e.stopPropagation(); triggers.broad === 0 && toggleMatchSelection(customerSearchTermKey, 'broad'); }}
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
                                    <li>Shows trigger counts (E/P/B) from the <em>full dataset</em></li>
                                    <li>Highlights missing match types and opportunity strength</li>
                                    <li>Export to Excel or CSV for bulk upload</li>
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
                    <div className="mos-filter-group" style={{ flexGrow: 1, minWidth: '220px' }}>
                        <label className="mos-filter-label">Search Term Isolation</label>
                        <div className="mos-radio-pill-group double">
                            <label className={`mos-radio-pill ${mode === 'non-isolate' ? 'active' : ''}`}>
                                <input type="radio" value="non-isolate" checked={mode === 'non-isolate'} onChange={() => { setMode('non-isolate'); setPage(1); }} />
                                Non-Isolate
                            </label>
                            <label className={`mos-radio-pill ${mode === 'isolate' ? 'active' : ''}`}>
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
                            <div className="gf-adgroup-search-wrap">
                                <Search size={15} />
                                <input
                                    type="text"
                                    placeholder="Search search terms…"
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                                />
                            </div>

                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="gf-generate-bulk-btn"
                                    onClick={handleExportExcel}
                                    disabled={!hasResults}
                                >
                                    <Download size={15} /> Export Excel
                                </button>
                                <button
                                    type="button"
                                    className="gf-generate-bulk-btn mos-csv-btn"
                                    onClick={handleExportCsv}
                                    disabled={!hasResults}
                                >
                                    <Download size={15} /> Export CSV
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
                                            <th className="mos-th mos-th-triggers">Triggers (E/P/B)</th>
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
                                                <td colSpan={10} className="gf-optimizer-td gf-empty-cell">
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
