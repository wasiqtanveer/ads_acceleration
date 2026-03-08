import React, { useState, useEffect } from 'react';
import { Upload, ChevronDown, Download, AlertCircle, Settings, X, FileSpreadsheet, TrendingUp, TrendingDown, Eye, DollarSign } from 'lucide-react';
import './BiddingOptimizer.css';
import * as XLSX from 'xlsx';

const BiddingOptimizer = () => {
    // Strategy Settings State
    const [strategy, setStrategy] = useState('inch-up-acos');
    const [adType, setAdType] = useState('sponsored-products');
    const [targetAcos, setTargetAcos] = useState(30);
    const [minBid, setMinBid] = useState(0.25);
    const [maxBid, setMaxBid] = useState(5.00);

    // ACOS Range Filter State
    const [minAcos, setMinAcos] = useState('');
    const [maxAcos, setMaxAcos] = useState('');

    // File State
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [results, setResults] = useState([]);

    // Datatable State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filterConfigs, setFilterConfigs] = useState({}); // { filterKey: [checkedValues] }
    const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);
    const [filterSearchQuery, setFilterSearchQuery] = useState('');
    const [tempSelections, setTempSelections] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [globalSearch, setGlobalSearch] = useState('');
    const itemsPerPage = 100;

    // UI State
    const [error, setError] = useState('');
    const [showImpactModal, setShowImpactModal] = useState(false);

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        if (!uploadedFile.name.endsWith('.xlsx')) {
            setError('Please upload a valid Excel (.xlsx) file.');
            return;
        }

        setError('');
        setFile(uploadedFile);
    };

    // Maintain the modified workbook data in memory for exporting later
    const [workbookData, setWorkbookData] = useState(null);

    // Re-parse when file or settings change
    useEffect(() => {
        if (file) {
            parseExcelInfo(file);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, adType, strategy, targetAcos, minBid, maxBid]);

    const parseExcelInfo = (uploadedFile) => {
        setIsParsing(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Log all available sheets in the file for debugging
                console.log('=== AVAILABLE SHEETS IN WORKBOOK ===', workbook.SheetNames);

                // Map adType UI value to the expected Amazon Bulk Ops sheet/tab name
                const sheetNameMap = {
                    'sponsored-products': [
                        'Sponsored Products Campaigns',
                        'SP Campaigns',
                        'Sponsored Products',
                    ],
                    'sponsored-brands': [
                        'Sponsored Brands Campaigns',
                        'SB Campaigns',
                        'Sponsored Brands',
                    ],
                    'sponsored-display': [
                        'Sponsored Display Campaigns',
                        'SD Campaigns',
                        'Sponsored Display',
                    ],
                };

                const preferredNames = sheetNameMap[adType] || [];
                const availableSheets = workbook.SheetNames;

                // Try to find matching sheet (case-insensitive)
                let sheetName = null;
                for (const preferred of preferredNames) {
                    const match = availableSheets.find(
                        s => s.toLowerCase().trim() === preferred.toLowerCase().trim()
                    );
                    if (match) { sheetName = match; break; }
                }

                // If no match found, fall back to sheet[0]
                if (!sheetName) {
                    sheetName = availableSheets[0];
                    console.warn(`No matching sheet found for adType "${adType}". Using first sheet: "${sheetName}"`);
                } else {
                    console.log(`Using sheet: "${sheetName}" for adType: "${adType}"`);
                }

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const processedResults = [];
                let modifiedData = [...jsonData]; // Copy to update bids

                // DEBUG: Log actual column headers from the Excel file
                if (modifiedData.length > 0) {
                    console.log('=== EXCEL COLUMN HEADERS ===');
                    console.log(JSON.stringify(Object.keys(modifiedData[0]), null, 2));
                    console.log('=== ROW COUNT ===', modifiedData.length);
                }

                // Amazon bulk ops column names can vary slightly
                // Helper: get value from row trying multiple possible column names (case-insensitive)
                const getVal = (row, ...keys) => {
                    const rowKeys = Object.keys(row);
                    for (const key of keys) {
                        // Try exact match first
                        if (row[key] !== undefined && row[key] !== '') return row[key];
                        // Try case-insensitive match
                        const lower = key.toLowerCase();
                        const match = rowKeys.find(k => k.toLowerCase() === lower);
                        if (match && row[match] !== undefined && row[match] !== '') return row[match];
                    }
                    return null;
                };

                let debugLoggedFirst = false;

                modifiedData.forEach((row, index) => {
                    const entity = getVal(row, 'Entity', 'Record Type') || '';
                    const entityLower = entity.toLowerCase();

                    // Only process Keyword and Product Targeting rows
                    if (entityLower === 'keyword' || entityLower === 'product targeting') {

                        // Read values using exact header names from the file
                        const campaign = getVal(row,
                            'Campaign name (Informational only)',
                            'Campaign Name (Informational only)',
                            'Campaign name',
                            'Campaign Name',
                            'Campaign'
                        ) || '';

                        const adGroup = getVal(row,
                            'Ad group name (Informational only)',
                            'Ad Group Name (Informational only)',
                            'Ad group name',
                            'Ad Group Name',
                            'Ad Group'
                        ) || '';

                        const target = getVal(row,
                            'Keyword text',
                            'Keyword Text',
                            'Product targeting expression',
                            'Product Targeting Expression',
                            'Targeting Expression',
                            'Targeting',
                            'Product Targeting ID'
                        ) || `Row ${index + 2}`;

                        const matchType = getVal(row, 'Match type', 'Match Type') || '';

                        const clicks = parseFloat(getVal(row, 'Clicks') || 0);
                        const spend = parseFloat(getVal(row, 'Spend') || 0);
                        const sales = parseFloat(getVal(row, 'Sales', '14 Day Total Sales', '30 Day Total Sales') || 0);
                        const impressions = parseInt(getVal(row, 'Impressions') || 0);
                        const orders = parseInt(getVal(row, 'Orders', '14 Day Total Orders', '30 Day Total Orders') || 0);
                        const units = parseInt(getVal(row, 'Units', '14 Day Total Units (#)', '30 Day Total Units (#)', '7 Day Total Units (#)') || 0);
                        const originalBid = parseFloat(getVal(row, 'Bid', 'Max Bid', 'Keyword Bid', 'Targeting Bid') || 0.50);

                        // DEBUG: Log first keyword/targeting row to verify column reading
                        if (!debugLoggedFirst) {
                            debugLoggedFirst = true;
                            console.log('=== FIRST KEYWORD/TARGETING ROW DEBUG ===');
                            console.log('Index:', index);
                            console.log('Entity:', entity);
                            console.log('Target:', target);
                            console.log('Campaign:', campaign);
                            console.log('Ad Group:', adGroup);
                            console.log('Match Type:', matchType);
                            console.log('Bid:', originalBid);
                            console.log('Clicks:', clicks, '| Spend:', spend, '| Sales:', sales);
                            console.log('Raw row keys:', Object.keys(row).join(', '));
                            console.log('Raw Campaign name (Info):', row['Campaign name (Informational only)']);
                            console.log('Raw Ad group name (Info):', row['Ad group name (Informational only)']);
                            console.log('Raw Keyword text:', row['Keyword text']);
                            console.log('Raw Product targeting expression:', row['Product targeting expression']);
                            console.log('Raw Bid:', row['Bid']);
                        }

                        let suggestedBid = originalBid;
                        let reason = 'Ignored (No clicks/spend)';
                        let ruleCategory = 'No Action';
                        let modified = false;

                        // ACoS-based bidding calculations
                        const currentAcos = sales > 0 ? (spend / sales) * 100 : 0;
                        const cr = clicks > 0 ? (orders / clicks) : 0;
                        const avgOrderValue = orders > 0 ? sales / orders : 0;

                        if (strategy === 'inch-up-acos' && clicks <= 3) {
                            if (clicks === 0) {
                                reason = `Inch Up: 0 clicks - Data collection phase (flat +$0.10)`;
                                suggestedBid = originalBid + 0.10;
                            } else {
                                reason = `Inch Up: ${clicks} clicks - Data collection phase (+10%)`;
                                suggestedBid = originalBid * 1.10;
                            }
                            ruleCategory = 'Inch Up';
                            modified = true;
                        } else {
                            // Target ACoS model: Max CPC = RPC × Target ACoS
                            const rpc = avgOrderValue * cr;
                            const targetAcosDecimal = targetAcos / 100;
                            const maxAllowedCpc = rpc * targetAcosDecimal;

                            if (rpc > 0 && maxAllowedCpc > 0) {
                                suggestedBid = maxAllowedCpc;
                                reason = `ACoS Bidding: Current ACoS ${currentAcos.toFixed(1)}% → Target ACoS ${targetAcos}% | Max CPC $${maxAllowedCpc.toFixed(2)}`;
                                ruleCategory = 'ACoS Bidding';
                            } else {
                                suggestedBid = originalBid * 1.05;
                                reason = `ACoS Bidding: No sales data → slight increase toward Target ACoS ${targetAcos}%`;
                                ruleCategory = 'ACoS Bidding';
                            }
                            modified = true;
                        }

                        // ── GUARDRAILS ──
                        if (modified) {
                            const reasons = [];

                            // 1. ACoS Guardrail: force ≥20% decrease when ACoS > 50%
                            if (currentAcos > 50 && sales > 0) {
                                const maxBidAfterGuardrail = originalBid * 0.80;
                                if (suggestedBid > maxBidAfterGuardrail) {
                                    suggestedBid = maxBidAfterGuardrail;
                                }
                                reasons.push(`ACoS ${currentAcos.toFixed(1)}%>50% → forced ≥20% decrease`);
                                ruleCategory = 'ACoS Guardrail';
                            }

                            // 2. High-ACoS Increase Freeze: if ACoS > Target, never increase bid
                            if (currentAcos > targetAcos && sales > 0 && suggestedBid > originalBid) {
                                suggestedBid = originalBid;
                                reasons.push(`ACoS ${currentAcos.toFixed(1)}%>${targetAcos}% → increase frozen`);
                                ruleCategory = 'Increase Frozen';
                            }

                            // 3. Bid Volatility Cap: max +20% increase per cycle
                            const maxIncreaseBid = originalBid * 1.20;
                            if (suggestedBid > maxIncreaseBid) {
                                suggestedBid = maxIncreaseBid;
                                reasons.push(`Capped at +20% max increase`);
                            }

                            if (reasons.length > 0) {
                                reason += ' | ' + reasons.join(' | ');
                            }
                        }

                        if (modified) {
                            // CLAMP to Min/Max Bounds
                            suggestedBid = Math.round(Math.max(minBid, Math.min(maxBid, suggestedBid)) * 100) / 100;

                            // Update bid in the original data for export
                            const bidKeys = ['Bid', 'Max Bid', 'Keyword Bid', 'Targeting Bid'];
                            const rowKeys = Object.keys(row);
                            let bidUpdated = false;
                            for (const bk of bidKeys) {
                                const matchKey = rowKeys.find(k => k.toLowerCase() === bk.toLowerCase());
                                if (matchKey) {
                                    row[matchKey] = suggestedBid;
                                    bidUpdated = true;
                                    break;
                                }
                            }
                            if (!bidUpdated) row['Bid'] = suggestedBid;

                            // Calculate display metrics
                            const acos = sales > 0 ? (spend / sales) * 100 : 0;
                            const roas = spend > 0 ? sales / spend : 0;
                            const cpc = clicks > 0 ? spend / clicks : 0;
                            const rpc = clicks > 0 ? sales / clicks : 0;
                            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                            const cr = clicks > 0 ? (orders / clicks) * 100 : 0;
                            const changePct = originalBid > 0 ? ((suggestedBid - originalBid) / originalBid) * 100 : 0;

                            processedResults.push({
                                id: index,
                                keyword: target,
                                campaign: campaign || 'Unknown Campaign',
                                adGroup: adGroup || 'Unknown Ad Group',
                                originalBid,
                                suggestedBid,
                                changePct,
                                clicks,
                                impressions,
                                spend,
                                sales,
                                orders,
                                units,
                                acos,
                                roas,
                                cpc,
                                rpc,
                                ctr,
                                cr,
                                reason,
                                ruleCategory
                            });
                        }
                    }
                });

                const totalSales = processedResults.reduce((sum, item) => sum + item.sales, 0);
                const totalSpend = processedResults.reduce((sum, item) => sum + item.spend, 0);

                processedResults.forEach(item => {
                    item.salesPercent = totalSales > 0 ? (item.sales / totalSales) * 100 : 0;
                    item.spendPercent = totalSpend > 0 ? (item.spend / totalSpend) * 100 : 0;
                });

                setResults(processedResults); // Display all, pagination handles slicing ui

                // Store updated data
                setWorkbookData({
                    originalWorkbook: workbook,
                    sheetName: sheetName,
                    modifiedJson: modifiedData
                });

                setError(processedResults.length === 0 ? 'No Keyword/Targeting rows found with actionable clicks/spend.' : '');
                setIsParsing(false);

            } catch (err) {
                console.error(err);
                setError('Failed to parse Excel file. Ensure it is a valid Amazon Ads Bulk Operations file.');
                setIsParsing(false);
            }
        };

        reader.onerror = () => {
            setError('Error reading file.');
            setIsParsing(false);
        };

        reader.readAsArrayBuffer(uploadedFile);
    };

    const clearFile = () => {
        setFile(null);
        setResults([]);
        setError('');
        setWorkbookData(null);
    };

    const handleExport = () => {
        if (!workbookData || processedData.length === 0) return;

        try {
            // Create a new array of objects for the export containing ONLY filtered/modified rows
            const exportData = processedData.map(item => {
                const row = workbookData.modifiedJson[item.id];

                // Clone the row so we don't mutate the original in memory
                const exportRow = { ...row };

                // Set Operation to Update
                exportRow['Operation'] = 'Update';

                // Ensure Bid is appropriately set to the suggested bid
                const bidKeys = ['Bid', 'Max Bid', 'Keyword Bid', 'Targeting Bid'];
                const rowKeys = Object.keys(exportRow);
                let bidUpdated = false;
                for (const bk of bidKeys) {
                    const matchKey = rowKeys.find(k => k.toLowerCase() === bk.toLowerCase());
                    if (matchKey) {
                        exportRow[matchKey] = item.suggestedBid;
                        bidUpdated = true;
                        break;
                    }
                }
                if (!bidUpdated) exportRow['Bid'] = item.suggestedBid;

                // Append custom tracking columns
                exportRow['Condition'] = item.reason;
                exportRow['Bid Type'] = item.ruleCategory;
                exportRow['Old Bid'] = item.originalBid;
                exportRow['Bid Adjust'] = item.changePct;
                exportRow['Min Bid'] = minBid;
                exportRow['Max Bid'] = maxBid;

                return exportRow;
            });

            // Convert our export data back to a new worksheet
            const newWorksheet = XLSX.utils.json_to_sheet(exportData);

            // Create a new workbook with just the optimized sheet
            const newWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, workbookData.sheetName);

            // Generate Excel file and trigger download
            const fileName = `Optimized_${file.name}`;
            XLSX.writeFile(newWorkbook, fileName);

        } catch (err) {
            console.error(err);
            setError('Failed to generate export file.');
        }
    };

    // --- DATATABLE LOGIC ---
    const columns = [
        { label: 'Target', key: 'keyword' },
        { label: 'Campaign Name', key: 'campaign' },
        { label: 'Ad Group', key: 'adGroup' },
        { label: 'Strategy', key: 'ruleCategory' },
        { label: 'Condition', key: 'reason' },
        { label: 'Bid', key: 'originalBid', isNumeric: true, prefix: '$' },
        { label: 'New Bid', key: 'suggestedBid', isNumeric: true, prefix: '$' },
        { label: 'Change', key: 'changePct', isNumeric: true, suffix: '%' },
        { label: 'Sales', key: 'sales', isNumeric: true, prefix: '$' },
        { label: 'Spend', key: 'spend', isNumeric: true, prefix: '$' },
        { label: 'Impressions', key: 'impressions', isNumeric: true },
        { label: 'Clicks', key: 'clicks', isNumeric: true },
        { label: 'Orders', key: 'orders', isNumeric: true },
        { label: 'Units', key: 'units', isNumeric: true },
        { label: 'ACOS (%)', key: 'acos', isNumeric: true, suffix: '%' },
        { label: 'ROAS', key: 'roas', isNumeric: true },
        { label: 'CPC', key: 'cpc', isNumeric: true, prefix: '$' },
        { label: 'RPC', key: 'rpc', isNumeric: true, prefix: '$' },
        { label: 'CTR (%)', key: 'ctr', isNumeric: true, suffix: '%' },
        { label: 'CR (%)', key: 'cr', isNumeric: true, suffix: '%' },
        { label: 'Sales %', key: 'salesPercent', isNumeric: true, suffix: '%' },
        { label: 'Spend %', key: 'spendPercent', isNumeric: true, suffix: '%' }
    ];

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleFilterDropdown = (key) => {
        if (activeFilterDropdown === key) {
            setActiveFilterDropdown(null);
        } else {
            setActiveFilterDropdown(key);
            setTempSelections(filterConfigs[key] || []);
            setFilterSearchQuery('');
        }
    };

    const toggleFilterSelection = (value) => {
        setTempSelections(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    };

    const selectAllFilter = (key, filteredOptions) => {
        if (tempSelections.length === filteredOptions.length) {
            setTempSelections([]); // Deselect all
        } else {
            setTempSelections(filteredOptions); // Select all
        }
    };

    const applyFilter = (key) => {
        setFilterConfigs(prev => ({
            ...prev,
            [key]: tempSelections
        }));
        setActiveFilterDropdown(null);
        setCurrentPage(1);
    };

    const clearFilter = (key) => {
        setFilterConfigs(prev => {
            const newConfigs = { ...prev };
            delete newConfigs[key];
            return newConfigs;
        });
        setActiveFilterDropdown(null);
        setCurrentPage(1);
    };

    const getUniqueValues = (key) => {
        const unique = [...new Set(results.map(item => item[key]))];
        unique.sort((a, b) => {
            if (typeof a === 'number') return a - b;
            return String(a).localeCompare(String(b));
        });
        return unique;
    };

    // Filter and Sort Data
    let processedData = [...results];

    // 1. Global Search
    if (globalSearch) {
        const lowerSearch = globalSearch.toLowerCase();
        processedData = processedData.filter(row =>
            Object.values(row).some(val =>
                String(val).toLowerCase().includes(lowerSearch)
            )
        );
    }

    // 1b. ACOS Range Filter — open-ended support
    const parsedMinAcos = parseFloat(minAcos);
    const parsedMaxAcos = parseFloat(maxAcos);
    const hasMin = !isNaN(parsedMinAcos);
    const hasMax = !isNaN(parsedMaxAcos);
    if (hasMin || hasMax) {
        const effectiveMin = hasMin ? parsedMinAcos : 0;
        const effectiveMax = hasMax ? parsedMaxAcos : Infinity;
        processedData = processedData.filter(row =>
            row.acos < effectiveMin || row.acos > effectiveMax
        );
    }

    // 2. Column Filters
    Object.keys(filterConfigs).forEach(key => {
        const selectedValues = filterConfigs[key];
        if (selectedValues && selectedValues.length > 0) {
            processedData = processedData.filter(row => selectedValues.includes(row[key]));
        }
    });

    // 3. Sorting
    if (sortConfig.key) {
        processedData.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // 4. Pagination
    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
    const paginatedData = processedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // ── IMPACT ESTIMATION ENGINE ──
    // For every keyword where the bid is being reduced, estimate new spend
    const impactStats = (() => {
        const reduced = processedData.filter(row => row.suggestedBid < row.originalBid);
        const totalCurrentSpend = reduced.reduce((sum, r) => sum + r.spend, 0);
        const totalProjectedSpend = reduced.reduce((sum, r) => {
            if (r.originalBid === 0) return sum;
            return sum + r.spend * (r.suggestedBid / r.originalBid);
        }, 0);
        const totalSavings = totalCurrentSpend - totalProjectedSpend;
        return {
            count: reduced.length,
            totalCurrentSpend,
            totalProjectedSpend,
            totalSavings,
        };
    })();

    return (
        <div className="bidding-optimizer-page section">
            {/* Header Section */}
            <div className="container">
                <div className="optimizer-header text-center">
                    <div className="optimizer-icon-ring">
                        <FileSpreadsheet size={40} color="var(--color-primary)" />
                    </div>
                    <h1>Amazon Bidding Optimizer</h1>
                    <p className="text-muted mx-auto" style={{ maxWidth: '800px', margin: '1rem auto 2.5rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
                        Automatically adjust your keyword and product targeting bids based on hard performance data.
                    </p>

                    {/* Instruction Cards (Hover Reveal) */}
                    <div className="instruction-cards">
                        <div className="instruction-card">
                            <div className="card-front">
                                <h3>What this tool does</h3>
                                <ChevronDown className="bounce-icon" />
                            </div>
                            <div className="card-back">
                                <ul>
                                    <li><strong>Smart Bidding:</strong> Uses "Inch Up" & Target ACoS methodology.</li>
                                    <li><strong>Performance-Based:</strong> Adjusts bids based on ACoS profitability.</li>
                                    <li><strong>Constraints:</strong> Target ACoS & Min/Max bid limits.</li>
                                    <li><strong>Real-time Output:</strong> Calculates changes instantly.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="instruction-card">
                            <div className="card-front">
                                <h3>How to use</h3>
                                <ChevronDown className="bounce-icon" />
                            </div>
                            <div className="card-back">
                                <ol>
                                    <li>Download Operations file from Amazon.</li>
                                    <li>Select Ad Type & Strategy below.</li>
                                    <li>Upload the Excel file to the dropzone.</li>
                                    <li>Review the optimization results table.</li>
                                    <li>Download the newly optimized file.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="optimizer-card-container">
                    {/* STEP 1: SETTINGS */}
                    <div className="optimizer-step-card">
                        <div className="step-header">
                            <div className="step-number">1</div>
                            <div>
                                <h2>Optimization Strategy</h2>
                                <p className="text-muted">Configure the rules for how the AI adjusts your bids</p>
                            </div>
                        </div>

                        <div className="settings-grid">
                            <div className="form-group group-full-width">
                                <label>Select Ad Type</label>
                                <div className="radio-pill-group triple">
                                    <label className={`radio-pill ${adType === 'sponsored-products' ? 'active' : ''}`}>
                                        <input type="radio" value="sponsored-products" checked={adType === 'sponsored-products'} onChange={(e) => setAdType(e.target.value)} />
                                        Sponsored Products
                                    </label>
                                    <label className={`radio-pill ${adType === 'sponsored-brands' ? 'active' : ''}`}>
                                        <input type="radio" value="sponsored-brands" checked={adType === 'sponsored-brands'} onChange={(e) => setAdType(e.target.value)} />
                                        Sponsored Brands
                                    </label>
                                    <label className={`radio-pill ${adType === 'sponsored-display' ? 'active' : ''}`}>
                                        <input type="radio" value="sponsored-display" checked={adType === 'sponsored-display'} onChange={(e) => setAdType(e.target.value)} />
                                        Sponsored Display
                                    </label>
                                </div>
                            </div>

                            <div className="form-group group-full-width">
                                <label>Bidding Strategy</label>
                                <div className="radio-pill-group double">
                                    <label className={`radio-pill ${strategy === 'inch-up-acos' ? 'active' : ''}`}>
                                        <input type="radio" value="inch-up-acos" checked={strategy === 'inch-up-acos'} onChange={(e) => setStrategy(e.target.value)} />
                                        Inch Up + ACoS Bidding
                                    </label>
                                    <label className={`radio-pill ${strategy === 'acos-only' ? 'active' : ''}`}>
                                        <input type="radio" value="acos-only" checked={strategy === 'acos-only'} onChange={(e) => setStrategy(e.target.value)} />
                                        Strict ACoS Bidding
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Target ACoS (%)</label>
                                <div className="input-with-symbol">
                                    <span className="symbol">%</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={targetAcos}
                                        onChange={(e) => setTargetAcos(parseFloat(e.target.value))}
                                        placeholder="30"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Min Bid Limit</label>
                                <div className="input-with-symbol">
                                    <span className="symbol">$</span>
                                    <input
                                        type="number"
                                        min="0.05"
                                        step="0.05"
                                        value={minBid}
                                        onChange={(e) => setMinBid(parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Max Bid Limit</label>
                                <div className="input-with-symbol">
                                    <span className="symbol">$</span>
                                    <input
                                        type="number"
                                        min="0.50"
                                        step="0.10"
                                        value={maxBid}
                                        onChange={(e) => setMaxBid(parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Min ACOS Threshold</label>
                                <div className="input-with-symbol">
                                    <span className="symbol">%</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={minAcos}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (maxAcos !== '' && val !== '' && parseFloat(val) > parseFloat(maxAcos)) return;
                                            setMinAcos(val);
                                        }}
                                        placeholder="e.g. 20"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Max ACOS Threshold</label>
                                <div className="input-with-symbol">
                                    <span className="symbol">%</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={maxAcos}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (minAcos !== '' && val !== '' && parseFloat(val) < parseFloat(minAcos)) return;
                                            setMaxAcos(val);
                                        }}
                                        placeholder="e.g. 30"
                                    />
                                </div>
                            </div>

                            {minAcos !== '' && maxAcos !== '' && (
                                <div className="form-group group-full-width">
                                    <div className="acos-filter-hint">
                                        <AlertCircle size={14} />
                                        <span>Showing results with ACOS below {minAcos}% or above {maxAcos}% (excluding {minAcos}%–{maxAcos}% range)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STEP 2: UPLOAD & RESULTS */}
                    <div className="optimizer-step-card">
                        <div className="step-header">
                            <div className="step-number">2</div>
                            <div>
                                <h2>Process Data</h2>
                                <p className="text-muted">Upload your bulk operations file to generate the optimized output</p>
                            </div>
                        </div>

                        <div className="step-content">
                            {/* Upload Zone */}
                            {!file && (
                                <div className="upload-zone">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        id="file-upload"
                                        onChange={handleFileUpload}
                                    />
                                    <label htmlFor="file-upload" className="upload-content">
                                        <div className="upload-icon">
                                            <Upload size={32} />
                                        </div>
                                        <h3>Upload Bulk Operations File</h3>
                                        <p>Drag and drop your Amazon Ads Excel file here, or click to browse.</p>
                                        <span className="file-hint">Supported formats: .xlsx from Amazon Ads Console</span>
                                    </label>
                                </div>
                            )}

                            {error && (
                                <div className="error-banner">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Results / Processing State placed OUTSIDE the main container to allow full width */}
                        </div>
                    </div>
                </div> {/* End of .optimizer-card-container */}
            </div> {/* End of .container */}

            {/* IMPACT PREVIEW MODAL */}
            {showImpactModal && (
                <div className="impact-modal-overlay" onClick={() => setShowImpactModal(false)}>
                    <div className="impact-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="impact-modal-close" onClick={() => setShowImpactModal(false)}>
                            <X size={20} />
                        </button>
                        <div className="impact-modal-header">
                            <div className="impact-modal-icon">
                                <DollarSign size={28} />
                            </div>
                            <h2>Estimated Spend Impact</h2>
                            <p className="text-muted">
                                {maxAcos !== '' ? `Keywords with ACOS > ${maxAcos}%` : minAcos !== '' ? `Keywords with ACOS < ${minAcos}%` : 'All keywords with bid reductions'}
                                {' — '}{impactStats.count} keyword{impactStats.count !== 1 ? 's' : ''} affected
                            </p>
                        </div>
                        <div className="impact-stats-grid">
                            <div className="impact-stat-card">
                                <span className="impact-stat-label">Original Spend</span>
                                <span className="impact-stat-value">${impactStats.totalCurrentSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="impact-stat-card">
                                <span className="impact-stat-label">Estimated New Spend</span>
                                <span className="impact-stat-value projected">${impactStats.totalProjectedSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="impact-stat-card savings">
                                <span className="impact-stat-label">Total Estimated Savings</span>
                                <span className="impact-stat-value savings-value">${impactStats.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <p className="impact-disclaimer">
                            This change is estimated to reduce your spend by <strong>${impactStats.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> on high-ACOS keywords. Actual results depend on auction dynamics.
                        </p>
                        <div className="impact-modal-actions">
                            <button className="impact-confirm-btn" onClick={() => { setShowImpactModal(false); handleExport(); }}>
                                <Download size={16} />
                                Confirm &amp; Export
                            </button>
                            <button className="impact-cancel-btn" onClick={() => setShowImpactModal(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL WIDTH RESULTS */}
            {file && (
                <div style={{ padding: '0 5%', marginTop: '2rem' }}>
                    <div className="optimizer-results-card">
                        <div className="optimizer-results-header">
                            <div className="step-number mini">3</div>
                            <h3 className="tracking-wide">Optimization Results</h3>
                        </div>

                        <div className="optimizer-results-body">
                            <div className="optimizer-toolbar">
                                <div className="optimizer-search-wrap">
                                    <input
                                        id="search-results"
                                        placeholder="Type to search globally across all fields..."
                                        className="optimizer-search-input"
                                        type="text"
                                        value={globalSearch}
                                        onChange={(e) => setGlobalSearch(e.target.value)}
                                    />
                                </div>
                                {impactStats.count > 0 && (
                                    <button
                                        className="preview-impact-btn"
                                        onClick={() => setShowImpactModal(true)}
                                    >
                                        <Eye size={18} />
                                        Preview Impact ({impactStats.count})
                                    </button>
                                )}
                                <button onClick={handleExport} disabled={isParsing || processedData.length === 0} className="export-btn">
                                    <Download size={18} />
                                    Export Optimized Bulksheet ({processedData.length})
                                </button>
                                <button onClick={clearFile} disabled={isParsing} className="clear-btn">
                                    <X size={16} /> Clear All
                                </button>
                            </div>

                            <div className="optimizer-table-container">
                                {isParsing ? (
                                    <div className="parsing-state">
                                        <div className="spinner mx-auto mb-4"></div>
                                        <p>Analyzing targeting performance and calculating optimal bids...</p>
                                    </div>
                                ) : (
                                    <table className="optimizer-table">
                                        <thead>
                                            <tr>
                                                {columns.map(col => (
                                                    <th key={col.key} className="optimizer-th">
                                                        <div className="th-content" onClick={() => handleSort(col.key)}>
                                                            <span>{col.label}</span>
                                                            {/* Sort Icons */}
                                                            <div className="sort-icons">
                                                                <svg width="12" height="12" className={`sort-icon asc ${sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'active' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                                                                <svg width="12" height="12" className={`sort-icon desc ${sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'active' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                            </div>
                                                        </div>

                                                        {/* Filter Toggle Button */}
                                                        {['campaign', 'adGroup', 'ruleCategory', 'keyword'].includes(col.key) && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleFilterDropdown(col.key); }}
                                                                className={`filter-toggle-btn ${filterConfigs[col.key] ? 'is-active' : ''}`}
                                                            >
                                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                                                            </button>
                                                        )}

                                                        {/* Filter Dropdown */}
                                                        {activeFilterDropdown === col.key && (
                                                            <div className="filter-dropdown-menu" onClick={e => e.stopPropagation()}>
                                                                <div className="filter-dropdown-header">
                                                                    <div className="filter-search-row">
                                                                        <input
                                                                            type="text"
                                                                            className="filter-search-input"
                                                                            placeholder="Search..."
                                                                            value={filterSearchQuery}
                                                                            onChange={e => setFilterSearchQuery(e.target.value)}
                                                                        />
                                                                        <button
                                                                            className="filter-all-btn"
                                                                            onClick={() => selectAllFilter(col.key, getUniqueValues(col.key).filter(v => String(v).toLowerCase().includes(filterSearchQuery.toLowerCase())))}
                                                                        >All</button>
                                                                    </div>
                                                                </div>
                                                                <div className="filter-dropdown-list">
                                                                    {getUniqueValues(col.key)
                                                                        .filter(v => String(v).toLowerCase().includes(filterSearchQuery.toLowerCase()))
                                                                        .map((val, idx) => (
                                                                            <label key={idx} className="filter-option">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="filter-checkbox"
                                                                                    checked={tempSelections.includes(val)}
                                                                                    onChange={() => toggleFilterSelection(val)}
                                                                                />
                                                                                <span className="filter-option-text" title={val}>{val}</span>
                                                                            </label>
                                                                        ))}
                                                                </div>
                                                                <div className="filter-dropdown-footer">
                                                                    <button className="filter-action-btn apply" onClick={() => applyFilter(col.key)}>Apply</button>
                                                                    <button className="filter-action-btn clear" onClick={() => clearFilter(col.key)}>Clear</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedData.map((row) => (
                                                <tr key={row.id} className="optimizer-tr">
                                                    {columns.map(col => {
                                                        const val = row[col.key];

                                                        // Special formatting overrides
                                                        if (col.key === 'ruleCategory') {
                                                            return <td key={col.key} className="optimizer-td"><span className="strategy-badge">{val}</span></td>;
                                                        }
                                                        if (col.key === 'reason') {
                                                            return <td key={col.key} className="optimizer-td reason-cell whitespace-nowrap">{val}</td>;
                                                        }
                                                        if (col.key === 'suggestedBid') {
                                                            return <td key={col.key} className="optimizer-td suggested-bid-cell">${val.toFixed(2)}</td>;
                                                        }
                                                        if (col.key === 'changePct') {
                                                            return (
                                                                <td key={col.key} className="optimizer-td">
                                                                    <span className={`badge-pct ${val > 0 ? 'positive' : val < 0 ? 'negative' : 'neutral'}`}>
                                                                        {val > 0 && <TrendingUp size={13} />}
                                                                        {val < 0 && <TrendingDown size={13} />}
                                                                        {val > 0 ? '+' : ''}{val.toFixed(1)}%
                                                                    </span>
                                                                </td>
                                                            );
                                                        }

                                                        // Default rendering
                                                        let displayVal = val;

                                                        if (col.isNumeric && val != null) {
                                                            if (['impressions', 'clicks', 'orders', 'units'].includes(col.key)) {
                                                                displayVal = val.toLocaleString(undefined, { maximumFractionDigits: 0 });
                                                            } else if (['sales', 'spend'].includes(col.key)) {
                                                                displayVal = val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                                                            } else if (['changePct', 'acos', 'ctr', 'cr', 'salesPercent', 'spendPercent'].includes(col.key)) {
                                                                displayVal = val.toFixed(1);
                                                            } else {
                                                                displayVal = val.toFixed(2);
                                                            }
                                                        }

                                                        return (
                                                            <td key={col.key} className="optimizer-td" title={val}>
                                                                <div className={`${['keyword', 'campaign', 'adGroup'].includes(col.key) ? 'truncate-md' : ''}`}>
                                                                    {col.prefix}{displayVal}{col.suffix}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                            {paginatedData.length === 0 && !isParsing && (
                                                <tr>
                                                    <td colSpan={columns.length} className="optimizer-td" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No optimized rows found matching priorities/filters.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Pagination Controls */}
                            {!isParsing && processedData.length > 0 && (
                                <div className="optimizer-pagination">
                                    <div className="pagination-info">
                                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
                                    </div>
                                    <div className="pagination-controls">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="pagination-btn"
                                        >
                                            Previous
                                        </button>
                                        <div className="page-numbers">
                                            {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                                                let p = currentPage - 2 + idx;
                                                if (currentPage <= 3) p = idx + 1;
                                                else if (currentPage >= totalPages - 2) p = totalPages - 4 + idx;

                                                if (p > 0 && p <= totalPages) {
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => setCurrentPage(p)}
                                                            className={`page-num ${currentPage === p ? 'active' : ''}`}
                                                        >
                                                            {p}
                                                        </button>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="pagination-btn"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BiddingOptimizer;
