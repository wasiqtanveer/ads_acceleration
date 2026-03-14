import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
    Upload,
    FileSpreadsheet,
    Target,
    Download,
    AlertCircle,
    Check,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Info,
    HelpCircle,
    GraduationCap,
    FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import RegistrationModal from '../../components/ui/RegistrationModal';
import ConsultationCard from '../../components/ui/ConsultationCard';
import useRegistration from '../../context/useRegistration';
import './GraduationFinder.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const AD_TYPES = [
    { id: 'SP', label: 'Sponsored Products', subtitle: 'Sponsored Products' },
    { id: 'SB', label: 'SB', subtitle: 'Sponsored Brands' },
    { id: 'SD', label: 'SD', subtitle: 'Sponsored Display' },
];

// For SP and SB, prefer the Search Term Report sheets (contain actual customer search terms)
// For SD, use the campaigns sheet (targeting expressions used as targets)
const SHEET_NAME_MAP = {
    SP: [
        'SP Search Term Report',
        'Sponsored Products Search Term Report',
        'Search Term Report',
        'Sponsored Products Campaigns',
        'SP Campaigns',
        'Sponsored Products',
    ],
    SB: [
        'SB Search Term Report',
        'Sponsored Brands Search Term Report',
        'Sponsored Brands campaigns',
        'Sponsored Brands Campaigns',
        'SB Campaigns',
        'Sponsored Brands',
    ],
    SD: [
        'SD Search Term Report',
        'Sponsored Display campaigns',
        'Sponsored Display Campaigns',
        'SD Campaigns',
        'Sponsored Display',
    ],
};

const DEFAULT_CRITERIA = {
    clicksMin: '10', clicksMax: '0',
    ordersMin: '2', ordersMax: '0',
    acosMin: '0', acosMax: '50',
    impressionsMin: '100', impressionsMax: '0',
    cvrMin: '5', cvrMax: '0',
    ctrMin: '0.5', ctrMax: '0',
    spendMin: '5', spendMax: '0',
    startingBid: '1.00',
};

const CRITERIA_FIELDS = [
    { key: 'clicks', label: 'Clicks', step: '1', tooltip: 'Total clicks on the keyword/target across the date range' },
    { key: 'orders', label: 'Orders', step: '1', tooltip: 'Total attributed orders' },
    { key: 'acos', label: 'ACOS (%)', step: '0.1', tooltip: 'Advertising Cost of Sale – lower is more profitable' },
    { key: 'impressions', label: 'Impressions', step: '10', tooltip: 'Total ad impressions' },
    { key: 'cvr', label: 'CVR (%)', step: '0.1', tooltip: 'Conversion rate (Orders / Clicks × 100)' },
    { key: 'ctr', label: 'CTR (%)', step: '0.1', tooltip: 'Click-through rate (Clicks / Impressions × 100)' },
    { key: 'spend', label: 'Spend ($)', step: '0.01', tooltip: 'Total ad spend (cost)' },
];

const MATCH_TYPE_CONFIG = {
    broad: { label: 'Broad', formatter: (t) => t },
    phrase: { label: 'Phrase', formatter: (t) => `"${t}"` },
    exact: { label: 'Exact', formatter: (t) => `[${t}]` },
};

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

function normalizeHeader(v) {
    return String(v || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
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

function matchesCriteria(row, criteria) {
    const checks = [
        { val: row.clicks, min: parseNum(criteria.clicksMin), max: parseNum(criteria.clicksMax) },
        { val: row.orders, min: parseNum(criteria.ordersMin), max: parseNum(criteria.ordersMax) },
        { val: row.acos, min: parseNum(criteria.acosMin), max: parseNum(criteria.acosMax) },
        { val: row.impressions, min: parseNum(criteria.impressionsMin), max: parseNum(criteria.impressionsMax) },
        { val: row.cvr, min: parseNum(criteria.cvrMin), max: parseNum(criteria.cvrMax) },
        { val: row.ctr, min: parseNum(criteria.ctrMin), max: parseNum(criteria.ctrMax) },
        { val: row.spend, min: parseNum(criteria.spendMin), max: parseNum(criteria.spendMax) },
    ];
    return checks.every(({ val, min, max }) => {
        if (val < min) return false;
        if (max > 0 && val > max) return false;
        return true;
    });
}

function buildBulkRows(candidates, candidateSettings, adGroupSettings, startingBid, adType) {
    const rows = [];
    const productMap = {
        'SP': 'Sponsored Products',
        'SB': 'Sponsored Brands',
        'SD': 'Sponsored Display'
    };
    const productStr = productMap[adType] || 'Sponsored Products';

    candidates.forEach(cand => {
        if (!candidateSettings[cand.searchTermKey]?.selected) return;

        // check if ASIN
        const isAsin = /^[B][0-9A-Z]{9}$/i.test(cand.searchTerm) || /^[0-9]{10}$/.test(cand.searchTerm);

        cand.contexts.forEach(ctx => {
            const setting = adGroupSettings[ctx.contextKey];
            if (!setting) return;
            const mt = setting.matchTypes;
            if (!mt?.broad && !mt?.phrase && !mt?.exact) return;

            if (isAsin) {
                rows.push({
                    'Product': productStr,
                    'Entity': 'Product Targeting',
                    'Operation': 'Create',
                    'Campaign Id': '',
                    'Ad Group Id': '',
                    'Portfolio Id': '',
                    'Campaign': ctx.campaignName,
                    'Ad Group': ctx.adGroupName,
                    'Start Date': '',
                    'End Date': '',
                    'Targeting Type': 'manual',
                    'State': 'enabled',
                    'Daily Budget': '',
                    'SKU': '',
                    'Ad Group Default Bid': '',
                    'Bid': parseNum(startingBid).toFixed(2),
                    'Keyword Text': '',
                    'Match Type': '',
                    'Bidding Strategy': '',
                    'Placement': '',
                    'Percentage': '',
                    'Product Targeting Expression': `asin="${cand.searchTerm.toUpperCase()}"`
                });
            } else {
                ['broad', 'phrase', 'exact'].forEach((typeKey) => {
                    if (!mt[typeKey]) return;
                    rows.push({
                        'Product': productStr,
                        'Entity': 'Keyword',
                        'Operation': 'Create',
                        'Campaign Id': '',
                        'Ad Group Id': '',
                        'Portfolio Id': '',
                        'Campaign': ctx.campaignName,
                        'Ad Group': ctx.adGroupName,
                        'Start Date': '',
                        'End Date': '',
                        'Targeting Type': '',
                        'State': 'enabled',
                        'Daily Budget': '',
                        'SKU': '',
                        'Ad Group Default Bid': '',
                        'Bid': parseNum(startingBid).toFixed(2),
                        'Keyword Text': cand.searchTerm,
                        'Match Type': typeKey,
                        'Bidding Strategy': '',
                        'Placement': '',
                        'Percentage': '',
                        'Product Targeting Expression': ''
                    });
                });
            }
        });
    });
    return rows;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GraduationFinder = () => {
    const { isRegistered } = useRegistration();
    const [showRegModal, setShowRegModal] = useState(false);
    const pendingActionRef = useRef(null);

    // Ad Type
    const [adType, setAdType] = useState('SP');

    // Graduation Criteria – per ad type
    const [spCriteria, setSpCriteria] = useState({ ...DEFAULT_CRITERIA });
    const [sbCriteria, setSbCriteria] = useState({ ...DEFAULT_CRITERIA });
    const [sdCriteria, setSdCriteria] = useState({ ...DEFAULT_CRITERIA });

    const criteriaMap = { SP: spCriteria, SB: sbCriteria, SD: sdCriteria };
    const criteriaSetters = { SP: setSpCriteria, SB: setSbCriteria, SD: setSdCriteria };

    const currentCriteria = criteriaMap[adType];
    const updateCriteria = useCallback((field, value) => {
        criteriaSetters[adType](prev => ({ ...prev, [field]: value }));
    }, [adType]);

    // Info accordion
    const [infoOpen, setInfoOpen] = useState(true);

    // File upload
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState('');
    const [normalizedRows, setNormalizedRows] = useState([]);
    const [sheetInfo, setSheetInfo] = useState('');
    const fileInputRef = useRef(null);

    // Step 2 sub-tab
    const [candidateTab, setCandidateTab] = useState('bulk'); // 'bulk' | 'manual'
    const [manualInput, setManualInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Results
    const [candidates, setCandidates] = useState([]); // graduation candidates
    const [candidateSettings, setCandidateSettings] = useState({});
    const [candidateSearch, setCandidateSearch] = useState('');
    const [candidatesPage, setCandidatesPage] = useState(1);
    const candidatesPageSize = 25;
    const [adGroupRows, setAdGroupRows] = useState([]);
    const [asinMap, setAsinMap] = useState({}); // campaign__adgroup -> [asin1, asin2...]
    const [adGroupSettings, setAdGroupSettings] = useState({});
    const [adGroupSearch, setAdGroupSearch] = useState('');
    const [filterConfigs, setFilterConfigs] = useState({}); // column filters
    const [activeFilterCol, setActiveFilterCol] = useState(null);
    const [adGroupPage, setAdGroupPage] = useState(1);
    const adGroupPageSize = 25;

    const hasResults = candidates.length > 0;

    // ── File Upload ────────────────────────────────────────────────────────────

    const parseExcelRows = useCallback((workbook) => {
        const preferredNames = SHEET_NAME_MAP[adType] || [];
        const available = workbook.SheetNames;
        console.log('[DEBUG] Available sheets in Excel:', available);
        console.log('[DEBUG] Looking for adType:', adType, 'using preferred names:', preferredNames);

        let sheetName = null;
        for (const name of preferredNames) {
            const match = available.find(s => s.toLowerCase().trim() === name.toLowerCase().trim());
            if (match) { sheetName = match; break; }
        }
        if (!sheetName) {
            console.warn('[DEBUG] No direct match for preferred sheet names. Defaulting to first sheet:', available[0]);
            sheetName = available[0];
        }

        console.log('[DEBUG] Using sheet:', sheetName);
        const ws = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        console.log('[DEBUG] Raw rows count from sheet:', json.length);
        if (json.length > 0) console.log('[DEBUG] Sample raw row (first):', json[0]);

        setSheetInfo(`Sheet: "${sheetName}" · ${json.length} rows`);
        return json;
    }, [adType]);

    const normalizeJsonRows = useCallback((rawRows) => {
        const normalized = rawRows
            .map((row, i) => {
                // ── Determine the "target" (search term / keyword / targeting expression) ──
                // Priority 1: Customer Search Term (from Search Term Report sheets)
                const searchTerm = String(
                    getVal(row,
                        'Customer Search Term',
                        'Customer search term',
                        'Search Term',
                        'search_query',
                        'Query'
                    ) || ''
                ).trim();

                // Priority 2: Keyword text (from bulk SP/SB keyword rows)
                const keywordText = String(
                    getVal(row,
                        'Keyword text',
                        'Keyword Text',
                        'Keyword',
                        'Keyword text (Informational only)'
                    ) || ''
                ).trim();

                // Priority 3: Targeting expression (SD campaign rows)
                const targetingExpr = String(
                    getVal(row,
                        'Targeting expression',
                        'Resolved targeting expression (Informational only)',
                        'Targeting Expression',
                        'Product Targeting Expression'
                    ) || ''
                ).trim();

                const target = searchTerm || keywordText || targetingExpr;

                // Skip rows with no meaningful target AND no metrics
                // (e.g. pure header/portfolio rows)
                const entity = String(getVal(row, 'Entity', 'Record Type') || '').toLowerCase();

                // For Campaign-level rows in SD (no search term), still include them
                // so the user can see campaign performance context
                // but only if they have clicks or impressions
                const clicks = parseNum(getVal(row, 'Clicks', 'clicks'));
                const impressions = parseNum(getVal(row, 'Impressions', 'impressions'));

                if (!target) {
                    // Campaign rows with no target — skip if no engagement
                    if (clicks === 0 && impressions === 0) return null;
                    // Use campaign name as a fallback identifier for SD campaign rows
                    const campaignFallback = String(
                        getVal(row, 'Campaign name', 'Campaign name (Informational only)', 'Campaign Name') || ''
                    ).trim();
                    if (!campaignFallback) return null;
                    // Skip — we only want real keyword/search-term data for opportunities
                    return null;
                }

                const orders = parseNum(getVal(row, 'Orders', '14 Day Total Orders', '7 Day Total Orders', 'Total Orders', 'Orders (Views & Clicks)', 'orders'));
                const spend = parseNum(getVal(row, 'Spend', 'Cost', 'spend', 'cost'));
                const sales = parseNum(getVal(row, 'Sales', '14 Day Total Sales', '7 Day Total Sales', 'Total Sales', 'Sales (Views & Clicks)', 'sales'));
                const cvr = clicks > 0 ? (orders / clicks) * 100 : 0;
                const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                const acos = sales > 0 ? (spend / sales) * 100 : 0;

                return {
                    _row: i + 2,
                    searchTerm: target,
                    searchTermKey: canonical(target),
                    campaignName: String(getVal(row, 'Campaign name (Informational only)', 'Campaign name', 'Campaign Name', 'Campaign', 'campaign') || '').trim(),
                    adGroupName: String(getVal(row, 'Ad group name (Informational only)', 'Ad group name', 'Ad Group Name', 'Ad Group', 'ad group') || '').trim(),
                    matchType: String(getVal(row, 'Match type', 'Match Type', 'match type') || '').trim(),
                    portfolio: String(getVal(row, 'Portfolio name (Informational only)', 'Portfolio', 'Portfolio name', 'Portfolio Name', 'portfolio') || '').trim(),
                    asin: String(getVal(row, 'ASIN (Informational only)', 'ASIN', 'Advertised ASIN', 'asin') || '').trim(),
                    clicks, orders, spend, sales, impressions, cvr, ctr, acos,
                };
            })
            .filter(Boolean);

        console.log('[DEBUG] Normalized rows count:', normalized.length);
        if (normalized.length > 0) console.log('[DEBUG] Sample normalized row (first):', normalized[0]);
        else console.warn('[DEBUG] No rows normalized. Check that the sheet has Customer Search Term or Keyword text or Targeting expression columns.');

        return normalized;
    }, []);

    const extractAsinMap = useCallback((workbook) => {
        const map = {};
        workbook.SheetNames.forEach(name => {
            const ws = workbook.Sheets[name];
            const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
            json.forEach(row => {
                const c = String(getVal(row, 'Campaign Name', 'Campaign', 'Campaign name', 'Campaign name (Informational only)') || '').trim();
                const ag = String(getVal(row, 'Ad Group Name', 'Ad Group', 'Ad group name', 'Ad group name (Informational only)') || '').trim();
                const asin = String(getVal(row, 'ASIN', 'Advertised ASIN', 'ASIN (Informational only)', 'asin') || '').trim();
                if (c && ag && asin) {
                    const key = `${c}__${ag}`;
                    if (!map[key]) map[key] = new Set();
                    map[key].add(asin);
                }
            });
        });
        const final = {};
        Object.keys(map).forEach(k => final[k] = Array.from(map[k]));
        return final;
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
        setNormalizedRows([]);
        setAsinMap({});
        setSheetInfo('');
        setCandidates([]);
        setAdGroupRows([]);
        setAdGroupSettings({});
        setFilterConfigs({});

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                const amap = extractAsinMap(wb);
                const rawRows = parseExcelRows(wb);
                const norm = normalizeJsonRows(rawRows);
                
                setAsinMap(amap);
                setNormalizedRows(norm);
                
                if (norm.length === 0) {
                    setParseError('No recognizable search term or keyword rows found in this file.');
                }
                setIsParsing(false);
            } catch (err) {
                console.error(err);
                setParseError('Failed to parse Excel file. Ensure it is a valid Amazon Bulk Operations file.');
                setIsParsing(false);
            }
        };
        reader.onerror = () => { setParseError('Error reading file.'); setIsParsing(false); };
        reader.readAsArrayBuffer(f);
    }, [parseExcelRows, normalizeJsonRows, extractAsinMap]);

    const clearFile = useCallback(() => {
        setFile(null);
        setNormalizedRows([]);
        setSheetInfo('');
        setParseError('');
        setCandidates([]);
        setAdGroupRows([]);
        setAdGroupSettings({});
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // ── Find Graduation Candidates ─────────────────────────────────────────────

    const findCandidates = useCallback(() => {
        let termList = [];

        if (candidateTab === 'manual') {
            termList = manualInput
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean)
                .map(term => ({
                    searchTerm: term,
                    searchTermKey: canonical(term),
                    clicks: 0, orders: 0, spend: 0, sales: 0,
                    impressions: 0, cvr: 0, ctr: 0, acos: 0,
                    campaignName: '', adGroupName: '', matchType: '',
                    portfolio: '', asin: '',
                }));
        } else {
            if (normalizedRows.length === 0) {
                setParseError('Upload an Amazon Bulk Operations Excel file first.');
                return;
            }
            // Filter by criteria
            const eligible = normalizedRows.filter(row => matchesCriteria(row, currentCriteria));
            // Aggregate by search term
            const termMap = new Map();
            eligible.forEach(row => {
                if (!termMap.has(row.searchTermKey)) {
                    termMap.set(row.searchTermKey, {
                        searchTerm: row.searchTerm,
                        searchTermKey: row.searchTermKey,
                        clicks: 0, orders: 0, spend: 0, sales: 0,
                        impressions: 0, cvr: 0, ctr: 0, acos: 0,
                        contexts: new Map(),
                    });
                }
                const bucket = termMap.get(row.searchTermKey);
                bucket.clicks += row.clicks;
                bucket.orders += row.orders;
                bucket.spend += row.spend;
                bucket.sales += row.sales;
                bucket.impressions += row.impressions;

                const contextKey = `${row.campaignName}__${row.adGroupName}`;
                if (!bucket.contexts.has(contextKey)) {
                    bucket.contexts.set(contextKey, {
                        contextKey,
                        campaignName: row.campaignName,
                        adGroupName: row.adGroupName,
                        portfolio: row.portfolio || '',
                        asinOptions: new Set(row.asin ? [row.asin] : []),
                    });
                } else if (row.asin) {
                    bucket.contexts.get(contextKey).asinOptions.add(row.asin);
                }
            });

            // Keep only search terms NOT already in exact match keywords
            const existingKeywords = new Set(normalizedRows.map(r => canonical(r.searchTerm)).filter(Boolean));
            termList = Array.from(termMap.values())
                .filter(t => !existingKeywords.has(t.searchTermKey) || candidateTab === 'bulk')
                .map(t => {
                    const clicks = t.clicks;
                    const orders = t.orders;
                    const acos = t.sales > 0 ? (t.spend / t.sales) * 100 : 0;
                    const cvr = clicks > 0 ? (orders / clicks) * 100 : 0;
                    const ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
                    return {
                        searchTerm: t.searchTerm,
                        searchTermKey: t.searchTermKey,
                        clicks, orders, spend: t.spend, sales: t.sales,
                        impressions: t.impressions, cvr, ctr, acos,
                        contexts: Array.from(t.contexts.values()).map(ctx => ({
                            ...ctx,
                            asinOptions: Array.from(ctx.asinOptions || []),
                        })),
                    };
                });
        }

        const nextCandidateSettings = {};
        termList.forEach(t => {
            nextCandidateSettings[t.searchTermKey] = { selected: true };
        });

        // Build ad group map from candidates with contexts
        const adGroupMap = new Map();
        termList.forEach(cand => {
            (cand.contexts || []).forEach(ctx => {
                const key = ctx.contextKey;
                // Get additional ASINs from our global map if available
                const extendedAsins = asinMap[key] || [];
                const combinedAsins = Array.from(new Set([...(ctx.asinOptions || []), ...extendedAsins])).filter(Boolean);

                if (!adGroupMap.has(key)) {
                    adGroupMap.set(key, {
                        contextKey: key,
                        campaignName: ctx.campaignName || 'Unknown Campaign',
                        adGroupName: ctx.adGroupName || 'Unknown Ad Group',
                        portfolio: ctx.portfolio || '-',
                        asinOptions: combinedAsins,
                        selectedAsin: combinedAsins[0] || '',
                    });
                } else if (combinedAsins.length > 0) {
                    const existing = adGroupMap.get(key);
                    const fresh = Array.from(new Set([...existing.asinOptions, ...combinedAsins])).filter(Boolean);
                    existing.asinOptions = fresh;
                    if (!existing.selectedAsin) existing.selectedAsin = fresh[0] || '';
                }
            });
        });

        const nextAdGroupRows = Array.from(adGroupMap.values()).sort((a, b) =>
            `${a.campaignName} ${a.adGroupName}`.localeCompare(`${b.campaignName} ${b.adGroupName}`)
        );

        const defaultSettings = {};
        nextAdGroupRows.forEach(row => {
            defaultSettings[row.contextKey] = {
                matchTypes: { broad: false, phrase: false, exact: false },
            };
        });

        setCandidates(termList);
        setCandidateSettings(nextCandidateSettings);
        setAdGroupRows(nextAdGroupRows);
        setAdGroupSettings(defaultSettings);
        setAdGroupSearch('');
        setCandidateSearch('');
        setFilterConfigs({});
        setAdGroupPage(1);
        setCandidatesPage(1);
        setParseError('');
    }, [candidateTab, manualInput, normalizedRows, currentCriteria, asinMap]);

    const toggleAdGroupSelected = useCallback((contextKey) => {
        setAdGroupSettings(prev => ({
            ...prev,
            [contextKey]: { ...prev[contextKey], selected: !prev[contextKey]?.selected },
        }));
    }, []);

    const toggleCandidateSelected = useCallback((searchTermKey) => {
        setCandidateSettings(prev => ({
            ...prev,
            [searchTermKey]: { ...prev[searchTermKey], selected: !prev[searchTermKey]?.selected }
        }));
    }, []);

    const selectAllCandidates = useCallback((checked) => {
        setCandidateSettings(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { next[k] = { ...next[k], selected: checked }; });
            return next;
        });
    }, []);

    const toggleAdGroupMatchType = useCallback((contextKey, typeKey) => {
        setAdGroupSettings(prev => ({
            ...prev,
            [contextKey]: {
                ...prev[contextKey],
                matchTypes: { ...prev[contextKey]?.matchTypes, [typeKey]: !prev[contextKey]?.matchTypes?.[typeKey] },
            },
        }));
    }, []);

    const updateAdGroupAsin = useCallback((contextKey, asin) => {
        setAdGroupSettings(prev => ({ ...prev, [contextKey]: { ...prev[contextKey], asin } }));
    }, []);

    const selectAllAdGroups = useCallback((checked) => {
        setAdGroupSettings(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { next[k] = { ...next[k], selected: checked }; });
            return next;
        });
    }, []);

    // ── Filtered/Paginated Ad Groups ───────────────────────────────────────────

    const selectAllAdGroupMatchTypes = useCallback((typeKey, checked) => {
        setAdGroupSettings(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { 
                next[k] = { 
                    ...next[k], 
                    matchTypes: { ...next[k]?.matchTypes, [typeKey]: checked } 
                }; 
            });
            return next;
        });
    }, []);

    // ── Filtered/Paginated Candidates ─────────────────────────────────────────

    const filteredCandidates = useMemo(() => {
        let list = candidates;
        const q = canonical(candidateSearch);
        if (q) {
            list = list.filter(c => c.searchTermKey.includes(q));
        }
        Object.entries(filterConfigs).forEach(([col, val]) => {
            if (!val || col.startsWith('ag_')) return;
            const configVal = canonical(val);
            if (col === 'searchTerm') {
                list = list.filter(c => c.searchTermKey.includes(configVal));
            } else if (col === 'currentTarget') {
                list = list.filter(c => {
                    const target = c.contexts?.[0]?.campaignName || '';
                    return canonical(target).includes(configVal);
                });
            }
        });
        return list;
    }, [candidates, candidateSearch, filterConfigs]);

    const candidatesTotalPages = Math.max(1, Math.ceil(filteredCandidates.length / candidatesPageSize));
    const candidatesStart = (candidatesPage - 1) * candidatesPageSize;
    const candidatesPageRows = filteredCandidates.slice(candidatesStart, candidatesStart + candidatesPageSize);
    
    const allCandidatesSelected = candidates.length > 0 && candidates.every(c => candidateSettings[c.searchTermKey]?.selected);

    // ── Filtered/Paginated Ad Groups ───────────────────────────────────────────

    const filteredAdGroupRows = useMemo(() => {
        let list = adGroupRows;
        const q = canonical(adGroupSearch);
        if (q) {
            list = list.filter(row =>
                [row.campaignName, row.adGroupName, row.portfolio, ...row.asinOptions]
                    .join(' ').toLowerCase().includes(q)
            );
        }
        // Column filters (Step 3)
        Object.entries(filterConfigs).forEach(([col, val]) => {
            if (!val || !col.startsWith('ag_')) return;
            const field = col.replace('ag_', '');
            const configVal = canonical(val);
            list = list.filter(row => {
                const rowVal = String(row[field] || '').toLowerCase();
                return rowVal.includes(configVal);
            });
        });
        return list;
    }, [adGroupRows, adGroupSearch, filterConfigs]);

    const adGroupTotalPages = Math.max(1, Math.ceil(filteredAdGroupRows.length / adGroupPageSize));
    const adGroupStart = (adGroupPage - 1) * adGroupPageSize;
    const adGroupPageRows = filteredAdGroupRows.slice(adGroupStart, adGroupStart + adGroupPageSize);

    const candidatesSelectedCount = candidates.filter(r => candidateSettings[r.searchTermKey]?.selected).length;

    // ── Export ────────────────────────────────────────────────────────────────

    const doGenerateBulkFile = useCallback(() => {
        const startingBid = currentCriteria.startingBid;
        const bulkRows = buildBulkRows(candidates, candidateSettings, adGroupSettings, startingBid, adType);
        if (bulkRows.length === 0) {
            setParseError('No ad groups selected with active match types. Please select at least one ad group.');
            return;
        }
        const ws = XLSX.utils.json_to_sheet(bulkRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Graduation Keywords');
        XLSX.writeFile(wb, 'Graduation_Bulk_Operations.xlsx');
    }, [candidates, adGroupSettings, currentCriteria]);

    const handleGenerateClick = () => {
        if (isRegistered) { doGenerateBulkFile(); return; }
        pendingActionRef.current = 'generate';
        setShowRegModal(true);
    };

    const handleRegSuccess = () => {
        setShowRegModal(false);
        if (pendingActionRef.current === 'generate') doGenerateBulkFile();
        pendingActionRef.current = null;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <section className="gf-page container section">

            {/* ── Page Header ── */}
            <div className="gf-header text-center">
                <div className="gf-icon-ring">
                    <GraduationCap size={36} color="var(--color-primary)" />
                </div>
                <h1>Graduation Finder</h1>
                <p className="text-muted gf-subtitle">
                    Identify high-performing search terms ready to graduate from broad match to exact match keywords for better control and efficiency.
                </p>
            </div>

            {/* ── Info Accordion ── */}
            <div className="gf-info-card">
                <button
                    type="button"
                    className="gf-info-toggle"
                    onClick={() => setInfoOpen(v => !v)}
                >
                    <div className="gf-info-toggle-left">
                        <Info size={16} />
                        <span>Graduation Finder</span>
                    </div>
                    <ChevronDown size={16} className={`gf-chevron ${infoOpen ? 'open' : ''}`} />
                </button>

                {infoOpen && (
                    <div className="gf-info-body">
                        <div className="gf-info-columns">
                            <div className="gf-info-col">
                                <h4>What This Tool Does</h4>
                                <p>Identify high performing search terms converting in auto and broad campaigns that should be added as exact match keywords in manual campaigns for better control and efficiency.</p>
                                <ul>
                                    <li>Performance-based keyword graduation from broad/auto to exact</li>
                                    <li>Configurable per ad type performance thresholds</li>
                                    <li>Multi-metric analysis across clicks, orders, ACOS, and more</li>
                                    <li>Generates Amazon-ready bulk operations upload file</li>
                                    <li>ACOS-based filtering and performance metrics</li>
                                </ul>
                            </div>
                            <div className="gf-info-col">
                                <h4>How To Use</h4>
                                <ol>
                                    <li>Download your bulk operations file from Amazon Ads</li>
                                    <li>Select the ad type and set your graduation thresholds</li>
                                    <li>Upload the file and click Find Graduation Candidates</li>
                                    <li>Review and select high performing terms from results</li>
                                    <li>Choose ad groups and click Generate Bulk Operations File</li>
                                    <li>Upload the generated file back to Amazon Ads</li>
                                </ol>
                                <a
                                    href="https://advertising.amazon.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gf-info-link"
                                >
                                    <FileDown size={14} /> Download Bulk Operations File · Get your search term data
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Section: Ad Type & Graduation Criteria ── */}
            <div className="gf-section-card">
                <div className="gf-section-header">
                    <div className="gf-section-number-wrap">
                        <span className="gf-section-num">2</span>
                    </div>
                    <div>
                        <h3>Select Ad Type &amp; Set Graduation Criteria</h3>
                    </div>
                    <div className="gf-section-header-right">
                        <button type="button" className="gf-help-btn" title="Set min/max thresholds for each metric. 0 = no limit.">
                            <HelpCircle size={16} />
                        </button>
                    </div>
                </div>

                {/* Ad Type Tabs */}
                <div className="gf-adtype-tabs">
                    {AD_TYPES.map(at => (
                        <button
                            key={at.id}
                            type="button"
                            className={`gf-adtype-tab ${adType === at.id ? 'active' : ''}`}
                            onClick={() => setAdType(at.id)}
                        >
                            <span className="gf-tab-id">{at.id}</span>
                            <span className="gf-tab-sub">{at.subtitle}</span>
                        </button>
                    ))}
                </div>

                {/* Graduation Criteria Grid */}
                <div className="gf-criteria-section">
                    <div className="gf-criteria-label-row">
                        <span></span>
                        <span className="gf-criteria-col-label">Min Clicks</span>
                        <span className="gf-criteria-col-label">Max Clicks</span>
                        <span className="gf-criteria-col-label">Min Orders</span>
                        <span className="gf-criteria-col-label">Max Orders</span>
                    </div>
                    <div className="gf-criteria-row">
                        <span className="gf-criteria-row-label">Clicks &amp; Orders</span>
                        <input
                            type="number" className="gf-criteria-input" step="1" min="0"
                            value={currentCriteria.clicksMin}
                            onChange={e => updateCriteria('clicksMin', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="1" min="0"
                            value={currentCriteria.clicksMax}
                            onChange={e => updateCriteria('clicksMax', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="1" min="0"
                            value={currentCriteria.ordersMin}
                            onChange={e => updateCriteria('ordersMin', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="1" min="0"
                            value={currentCriteria.ordersMax}
                            onChange={e => updateCriteria('ordersMax', e.target.value)}
                        />
                    </div>

                    <div className="gf-criteria-label-row">
                        <span></span>
                        <span className="gf-criteria-col-label">Min ACOS (%)</span>
                        <span className="gf-criteria-col-label">Max ACOS (%)</span>
                        <span className="gf-criteria-col-label">Min Impr.</span>
                        <span className="gf-criteria-col-label">Max Impr.</span>
                    </div>
                    <div className="gf-criteria-row">
                        <span className="gf-criteria-row-label">ACOS &amp; Impressions</span>
                        <input
                            type="number" className="gf-criteria-input" step="0.1" min="0"
                            value={currentCriteria.acosMin}
                            onChange={e => updateCriteria('acosMin', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="0.1" min="0"
                            value={currentCriteria.acosMax}
                            onChange={e => updateCriteria('acosMax', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="10" min="0"
                            value={currentCriteria.impressionsMin}
                            onChange={e => updateCriteria('impressionsMin', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="10" min="0"
                            value={currentCriteria.impressionsMax}
                            onChange={e => updateCriteria('impressionsMax', e.target.value)}
                        />
                    </div>

                    <div className="gf-criteria-label-row">
                        <span></span>
                        <span className="gf-criteria-col-label">Min CVR (%)</span>
                        <span className="gf-criteria-col-label">Max CVR (%)</span>
                        <span className="gf-criteria-col-label">Min CTR (%)</span>
                        <span className="gf-criteria-col-label">Max CTR (%)</span>
                    </div>
                    <div className="gf-criteria-row">
                        <span className="gf-criteria-row-label">CVR &amp; CTR</span>
                        <input
                            type="number" className="gf-criteria-input" step="0.1" min="0"
                            value={currentCriteria.cvrMin}
                            onChange={e => updateCriteria('cvrMin', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="0.1" min="0"
                            value={currentCriteria.cvrMax}
                            onChange={e => updateCriteria('cvrMax', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="0.1" min="0"
                            value={currentCriteria.ctrMin}
                            onChange={e => updateCriteria('ctrMin', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="0.1" min="0"
                            value={currentCriteria.ctrMax}
                            onChange={e => updateCriteria('ctrMax', e.target.value)}
                        />
                    </div>

                    <div className="gf-criteria-label-row">
                        <span></span>
                        <span className="gf-criteria-col-label">Min Spend ($)</span>
                        <span className="gf-criteria-col-label">Max Spend ($)</span>
                        <span className="gf-criteria-col-label">Starting Bid ($)</span>
                        <span></span>
                    </div>
                    <div className="gf-criteria-row">
                        <span className="gf-criteria-row-label">Spend &amp; Bid</span>
                        <input
                            type="number" className="gf-criteria-input" step="0.01" min="0"
                            value={currentCriteria.spendMin}
                            onChange={e => updateCriteria('spendMin', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="0.01" min="0"
                            value={currentCriteria.spendMax}
                            onChange={e => updateCriteria('spendMax', e.target.value)}
                        />
                        <input
                            type="number" className="gf-criteria-input" step="0.01" min="0.02"
                            value={currentCriteria.startingBid}
                            onChange={e => updateCriteria('startingBid', e.target.value)}
                        />
                        <div />
                    </div>
                </div>
            </div>

            {/* ── Step 1: Upload File ── */}
            <div className="gf-section-card gf-step-card">
                <div className="gf-step-label">Step 1: Upload File</div>

                {!file ? (
                    <label className="gf-upload-zone" htmlFor="gf-file-input">
                        <input
                            id="gf-file-input"
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
                            <p className="text-muted">Click to upload Excel file (.xlsx, .xls)</p>
                        </div>
                    </label>
                ) : (
                    <div className="gf-file-loaded">
                        <div className="gf-file-info">
                            <FileSpreadsheet size={20} color="var(--color-primary)" />
                            <div>
                                <strong className="gf-file-name">{file.name}</strong>
                                {sheetInfo && <p className="text-muted gf-sheet-info">{sheetInfo} · {normalizedRows.length} rows parsed</p>}
                            </div>
                        </div>
                        <button type="button" className="gf-file-clear" onClick={clearFile} title="Remove file">×</button>
                    </div>
                )}

                {isParsing && <div className="gf-parsing-indicator"><span className="gf-spinner" /> Parsing file...</div>}

                {parseError && (
                    <div className="gf-alert-error">
                        <AlertCircle size={16} />
                        <span>{parseError}</span>
                    </div>
                )}
            </div>

            {/* ── Step 2: Graduation Candidates ── */}
            <div className="gf-section-card gf-step-card">
                <div className="gf-step-label">Step 2: Graduation Candidates</div>

                {/* Sub-tabs */}
                <div className="gf-subtabs">
                    <button
                        type="button"
                        className={`gf-subtab ${candidateTab === 'bulk' ? 'active' : ''}`}
                        onClick={() => setCandidateTab('bulk')}
                    >
                        From Bulk File
                    </button>
                    <button
                        type="button"
                        className={`gf-subtab ${candidateTab === 'manual' ? 'active' : ''}`}
                        onClick={() => setCandidateTab('manual')}
                    >
                        Manual Input
                    </button>
                </div>

                {candidateTab === 'bulk' ? (
                    <div className="gf-subtab-content">
                        <p className="text-muted gf-tab-desc">
                            Upload your Amazon Bulk Operations file above then click the button below to automatically identify graduation candidates based on your criteria. The tool will find search terms that meet your performance thresholds.
                        </p>
                        <div className="gf-find-row">
                            <button
                                type="button"
                                className="gf-find-btn"
                                onClick={findCandidates}
                                disabled={!file || isParsing || normalizedRows.length === 0}
                            >
                                <Search size={16} />
                                Find Graduation Candidates
                            </button>
                            {candidates.length > 0 && (
                                <span className="gf-candidate-count">
                                    <Check size={14} /> {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} found
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="gf-subtab-content">
                        <p className="text-muted gf-tab-desc">
                            Enter search terms manually below (one per line) to use as graduation targets.
                        </p>
                        <textarea
                            className="gf-manual-textarea"
                            placeholder="Enter graduation targets here, one per line..."
                            value={manualInput}
                            onChange={e => setManualInput(e.target.value)}
                            rows={6}
                        />
                        <div className="gf-find-row">
                            <button
                                type="button"
                                className="gf-find-btn"
                                onClick={findCandidates}
                                disabled={!manualInput.trim()}
                            >
                                <Check size={16} />
                                Use These Targets
                            </button>
                            {candidates.length > 0 && (
                                <span className="gf-candidate-count">
                                    <Check size={14} /> {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} loaded
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Candidates preview list (when found via bulk file) */}
                {hasResults && candidateTab === 'bulk' && (
                    <div className="gf-candidates-list-wrap">
                        <div className="gf-candidates-header">
                            <span className="gf-candidates-title">
                                {candidates.length} Graduation Candidate{candidates.length !== 1 ? 's' : ''} Found
                            </span>
                            <div className="gf-candidates-search">
                                <Search size={14} />
                                <input
                                    type="text"
                                    placeholder="Search candidates..."
                                    value={candidateSearch}
                                    onChange={e => { setCandidateSearch(e.target.value); setCandidatesPage(1); }}
                                />
                            </div>
                        </div>
                        <div className="gf-optimizer-table-container">
                            <table className="gf-optimizer-table">
                                <thead>
                                    <tr>
                                        <th className="gf-optimizer-th gf-th-check">
                                            <input
                                                type="checkbox"
                                                className="gf-checkbox"
                                                checked={allCandidatesSelected}
                                                onChange={e => selectAllCandidates(e.target.checked)}
                                                title="Select all"
                                            />
                                        </th>
                                        <th className="gf-optimizer-th">
                                            <div className="gf-th-inner">
                                                <span>Search Term</span>
                                                <button className={`gf-filter-trigger ${filterConfigs.searchTerm ? 'active' : ''}`} onClick={() => setActiveFilterCol(activeFilterCol === 'searchTerm' ? null : 'searchTerm')}>
                                                    <Filter size={12} />
                                                </button>
                                                {activeFilterCol === 'searchTerm' && (
                                                    <div className="gf-filter-popover">
                                                        <input 
                                                            autoFocus
                                                            placeholder="Filter search term..." 
                                                            value={filterConfigs.searchTerm || ''} 
                                                            onChange={e => {
                                                                setFilterConfigs(prev => ({...prev, searchTerm: e.target.value}));
                                                                setCandidatesPage(1);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                        <th className="gf-optimizer-th">
                                            <div className="gf-th-inner">
                                                <span>Current Target</span>
                                                <button className={`gf-filter-trigger ${filterConfigs.currentTarget ? 'active' : ''}`} onClick={() => setActiveFilterCol(activeFilterCol === 'currentTarget' ? null : 'currentTarget')}>
                                                    <Filter size={12} />
                                                </button>
                                                {activeFilterCol === 'currentTarget' && (
                                                    <div className="gf-filter-popover">
                                                        <input 
                                                            autoFocus
                                                            placeholder="Filter target..." 
                                                            value={filterConfigs.currentTarget || ''} 
                                                            onChange={e => {
                                                                setFilterConfigs(prev => ({...prev, currentTarget: e.target.value}));
                                                                setCandidatesPage(1);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                        <th className="gf-optimizer-th">Impressions</th>
                                        <th className="gf-optimizer-th">Clicks</th>
                                        <th className="gf-optimizer-th">Orders</th>
                                        <th className="gf-optimizer-th">Sales</th>
                                        <th className="gf-optimizer-th">Spend</th>
                                        <th className="gf-optimizer-th">ACOS</th>
                                        <th className="gf-optimizer-th">CTR</th>
                                        <th className="gf-optimizer-th">CVR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidatesPageRows.map((c, i) => {
                                        const settings = candidateSettings[c.searchTermKey] || { selected: false };
                                        return (
                                            <tr key={i} className={`gf-optimizer-tr${settings.selected ? ' gf-row-selected' : ''}`}>
                                                <td className="gf-optimizer-td gf-td-check">
                                                    <input
                                                        type="checkbox"
                                                        className="gf-checkbox"
                                                        checked={!!settings.selected}
                                                        onChange={() => toggleCandidateSelected(c.searchTermKey)}
                                                    />
                                                </td>
                                                <td className="gf-optimizer-td gf-term-cell">{c.searchTerm}</td>
                                                <td className="gf-optimizer-td gf-target-cell">
                                                    {c.contexts?.[0]?.campaignName
                                                        ? <span className="gf-target-badge">{c.contexts[0].campaignName}</span>
                                                        : <span className="gf-muted-dash">—</span>}
                                                </td>
                                                <td className="gf-optimizer-td">{c.impressions > 0 ? c.impressions.toLocaleString() : '—'}</td>
                                                <td className="gf-optimizer-td">{c.clicks > 0 ? c.clicks.toLocaleString() : '—'}</td>
                                                <td className="gf-optimizer-td">{c.orders > 0 ? c.orders : '—'}</td>
                                                <td className="gf-optimizer-td">{c.sales > 0 ? `$${c.sales.toFixed(2)}` : '—'}</td>
                                                <td className="gf-optimizer-td">{c.spend > 0 ? `$${c.spend.toFixed(2)}` : '—'}</td>
                                                <td className="gf-optimizer-td">
                                                    {c.acos > 0
                                                        ? <span className={`gf-acos-badge ${c.acos > 50 ? 'bad' : c.acos > 30 ? 'warn' : 'good'}`}>{c.acos.toFixed(1)}%</span>
                                                        : <span className="gf-muted-dash">—</span>}
                                                </td>
                                                <td className="gf-optimizer-td">{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : '—'}</td>
                                                <td className="gf-optimizer-td">{c.cvr > 0 ? `${c.cvr.toFixed(1)}%` : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                    {candidatesPageRows.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="gf-optimizer-td gf-empty-cell">
                                                No candidates found matching filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="gf-pagination-row">
                            <span className="text-muted">
                                {filteredCandidates.length === 0 ? 'No results' : (
                                    `Showing ${candidatesStart + 1}–${Math.min(candidatesStart + candidatesPageSize, filteredCandidates.length)} of ${filteredCandidates.length}`
                                )}
                            </span>
                            <div className="gf-pagination-controls">
                                <button
                                    type="button" className="gf-page-btn"
                                    disabled={candidatesPage <= 1}
                                    onClick={() => setCandidatesPage(p => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-muted">Page {candidatesPage} / {candidatesTotalPages}</span>
                                <button
                                    type="button" className="gf-page-btn"
                                    disabled={candidatesPage >= candidatesTotalPages}
                                    onClick={() => setCandidatesPage(p => Math.min(candidatesTotalPages, p + 1))}
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Step 3: Select Ad Groups ── */}
            {hasResults && (
                <div className="gf-section-card gf-step-card">
                    <div className="gf-step-label">Step 3: Select Ad Groups</div>
                    <p className="text-muted gf-step-desc">
                        Select ad groups to apply {candidates.length} graduation candidate{candidates.length !== 1 ? 's' : ''} to.
                        Choose match types for each ad group.
                    </p>

                    <div className="gf-adgroup-toolbar">
                        <div className="gf-adgroup-search-wrap">
                            <Search size={14} />
                            <input
                                type="text"
                                placeholder="Search campaigns, ad groups, ASINs, or portfolios..."
                                value={adGroupSearch}
                                onChange={e => { setAdGroupSearch(e.target.value); setAdGroupPage(1); }}
                            />
                        </div>
                        <div className="gf-adgroup-count text-muted">
                            Ad Groups Context ({adGroupRows.length})
                        </div>
                        <button
                            type="button"
                            className="gf-generate-bulk-btn"
                            onClick={handleGenerateClick}
                            disabled={candidatesSelectedCount === 0}
                        >
                            <Download size={16} />
                            Generate Bulk Operations File
                        </button>
                    </div>

                    <div className="gf-optimizer-table-container gf-adgroup-table-outer">
                        <table className="gf-optimizer-table gf-adgroup-table">
                            <thead>
                                <tr>
                                    <th className="gf-optimizer-th">
                                        <div className="gf-th-inner">
                                            <span>Campaign Name</span>
                                            <button className={`gf-filter-trigger ${filterConfigs.ag_campaignName ? 'active' : ''}`} onClick={() => setActiveFilterCol(activeFilterCol === 'ag_campaignName' ? null : 'ag_campaignName')}>
                                                <Filter size={12} />
                                            </button>
                                            {activeFilterCol === 'ag_campaignName' && (
                                                <div className="gf-filter-popover">
                                                    <input 
                                                        autoFocus
                                                        placeholder="Filter campaign..." 
                                                        value={filterConfigs.ag_campaignName || ''} 
                                                        onChange={e => {
                                                            setFilterConfigs(prev => ({...prev, ag_campaignName: e.target.value}));
                                                            setAdGroupPage(1);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                    <th className="gf-optimizer-th">
                                        <div className="gf-th-inner">
                                            <span>Ad Group Name</span>
                                            <button className={`gf-filter-trigger ${filterConfigs.ag_adGroupName ? 'active' : ''}`} onClick={() => setActiveFilterCol(activeFilterCol === 'ag_adGroupName' ? null : 'ag_adGroupName')}>
                                                <Filter size={12} />
                                            </button>
                                            {activeFilterCol === 'ag_adGroupName' && (
                                                <div className="gf-filter-popover">
                                                    <input 
                                                        autoFocus
                                                        placeholder="Filter ad group..." 
                                                        value={filterConfigs.ag_adGroupName || ''} 
                                                        onChange={e => {
                                                            setFilterConfigs(prev => ({...prev, ag_adGroupName: e.target.value}));
                                                            setAdGroupPage(1);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                    <th className="gf-optimizer-th">
                                        <div className="gf-th-inner">
                                            <span>Portfolio</span>
                                            <button className={`gf-filter-trigger ${filterConfigs.ag_portfolio ? 'active' : ''}`} onClick={() => setActiveFilterCol(activeFilterCol === 'ag_portfolio' ? null : 'ag_portfolio')}>
                                                <Filter size={12} />
                                            </button>
                                            {activeFilterCol === 'ag_portfolio' && (
                                                <div className="gf-filter-popover">
                                                    <input 
                                                        autoFocus
                                                        placeholder="Filter portfolio..." 
                                                        value={filterConfigs.ag_portfolio || ''} 
                                                        onChange={e => {
                                                            setFilterConfigs(prev => ({...prev, ag_portfolio: e.target.value}));
                                                            setAdGroupPage(1);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                    <th className="gf-optimizer-th">
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                            <span>Match Types</span>
                                            <div style={{display: 'flex', gap: '4px', fontSize: '10px'}}>
                                                <label><input type="checkbox" onChange={e => selectAllAdGroupMatchTypes('broad', e.target.checked)} /> Broad</label>
                                                <label><input type="checkbox" onChange={e => selectAllAdGroupMatchTypes('phrase', e.target.checked)} /> Phrase</label>
                                                <label><input type="checkbox" onChange={e => selectAllAdGroupMatchTypes('exact', e.target.checked)} /> Exact</label>
                                            </div>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {adGroupPageRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="gf-optimizer-td gf-empty-cell">
                                            No ad groups found.
                                        </td>
                                    </tr>
                                ) : (
                                    adGroupPageRows.map(row => {
                                        const settings = adGroupSettings[row.contextKey] || { matchTypes: {} };
                                        return (
                                            <tr key={row.contextKey} className="gf-optimizer-tr">
                                                <td className="gf-optimizer-td gf-campaign-cell" title={row.campaignName}>
                                                    <div className="gf-truncate-cell">{row.campaignName || '—'}</div>
                                                </td>
                                                <td className="gf-optimizer-td gf-adgroup-cell" title={row.adGroupName}>
                                                    <div className="gf-truncate-cell">{row.adGroupName || '—'}</div>
                                                </td>
                                                <td className="gf-optimizer-td">
                                                    <span className="gf-portfolio-text">{row.portfolio || '—'}</span>
                                                </td>
                                                <td className="gf-optimizer-td">
                                                    <div className="gf-match-toggle-row">
                                                        {[['broad', 'Broad'], ['phrase', 'Phrase'], ['exact', 'Exact']].map(([typeKey, label]) => (
                                                            <button
                                                                key={typeKey}
                                                                type="button"
                                                                className={`gf-match-toggle ${settings.matchTypes?.[typeKey] ? 'active' : ''}`}
                                                                onClick={() => toggleAdGroupMatchType(row.contextKey, typeKey)}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="gf-pagination-row">
                        <span className="text-muted">
                            {filteredAdGroupRows.length === 0 ? 'No results' : (
                                `Showing ${adGroupStart + 1}–${Math.min(adGroupStart + adGroupPageSize, filteredAdGroupRows.length)} of ${filteredAdGroupRows.length}`
                            )}
                        </span>
                        <div className="gf-pagination-controls">
                            <button
                                type="button" className="gf-page-btn"
                                disabled={adGroupPage <= 1}
                                onClick={() => setAdGroupPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-muted">Page {adGroupPage} / {adGroupTotalPages}</span>
                            <button
                                type="button" className="gf-page-btn"
                                disabled={adGroupPage >= adGroupTotalPages}
                                onClick={() => setAdGroupPage(p => Math.min(adGroupTotalPages, p + 1))}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom generate button */}
                    <div className="gf-bottom-generate">
                        <button
                            type="button"
                            className="gf-generate-bulk-btn-lg"
                            onClick={handleGenerateClick}
                            disabled={candidatesSelectedCount === 0}
                        >
                            <Download size={18} />
                            Generate Bulk Operations File
                        </button>
                        {candidatesSelectedCount > 0 && (
                            <p className="text-muted gf-generate-note">
                                Will create graduated keywords for {candidatesSelectedCount} selected search term(s).
                            </p>
                        )}
                    </div>
                </div>
            )}

            <ConsultationCard />

            <RegistrationModal
                isOpen={showRegModal}
                onClose={() => { setShowRegModal(false); pendingActionRef.current = null; }}
                onSuccess={handleRegSuccess}
                toolSlug="graduation-finder"
            />
        </section>
    );
};

export default GraduationFinder;
