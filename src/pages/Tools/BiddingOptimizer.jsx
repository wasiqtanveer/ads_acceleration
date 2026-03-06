import React, { useState } from 'react';
import { Upload, ChevronDown, Download, AlertCircle, Settings, X, FileSpreadsheet } from 'lucide-react';
import './BiddingOptimizer.css';
import * as XLSX from 'xlsx';

const BiddingOptimizer = () => {
    // Strategy Settings State
    const [strategy, setStrategy] = useState('inch-up-rpc');
    const [adType, setAdType] = useState('sponsored-products');
    const [targetRpc, setTargetRpc] = useState(2.50);
    const [minBid, setMinBid] = useState(0.25);
    const [maxBid, setMaxBid] = useState(5.00);

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

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        if (!uploadedFile.name.endsWith('.xlsx')) {
            setError('Please upload a valid Excel (.xlsx) file.');
            return;
        }

        setError('');
        setFile(uploadedFile);
        parseExcelInfo(uploadedFile);
    };

    // Maintain the modified workbook data in memory for exporting later
    const [workbookData, setWorkbookData] = useState(null);

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

                        const historicalRpc = clicks > 0 ? sales / clicks : 0;

                        if (clicks <= 3) {
                            reason = `Inch Up: ${clicks} clicks - Data collection phase`;
                            ruleCategory = 'Inch Up';
                            suggestedBid = originalBid * 1.10;
                            modified = true;
                        } else {
                            if (historicalRpc > 0) {
                                const ratio = targetRpc / historicalRpc;
                                suggestedBid = originalBid * ratio;
                                reason = `RPC Bidding: Current RPC $${historicalRpc.toFixed(2)} -> Target RPC $${targetRpc.toFixed(2)}`;
                                ruleCategory = 'RPC Bidding';
                            } else {
                                suggestedBid = originalBid * 1.05;
                                reason = `RPC Bidding: Current RPC $0.00 -> Target RPC $${targetRpc.toFixed(2)}`;
                                ruleCategory = 'RPC Bidding';
                            }
                            modified = true;
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
        if (!workbookData) return;

        try {
            // Convert our modified JSON array back to a worksheet
            const newWorksheet = XLSX.utils.json_to_sheet(workbookData.modifiedJson);

            // Replace the old sheet with the new one in the workbook
            workbookData.originalWorkbook.Sheets[workbookData.sheetName] = newWorksheet;

            // Generate Excel file and trigger download
            const fileName = `Optimized_${file.name}`;
            XLSX.writeFile(workbookData.originalWorkbook, fileName);

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
                                    <li><strong>Smart Bidding:</strong> Uses "Inch Up" & RPC methodology.</li>
                                    <li><strong>Performance-Based:</strong> Adjusts with custom thresholds.</li>
                                    <li><strong>Constraints:</strong> Target RPC & Min/Max limits.</li>
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
                                    <label className={`radio-pill ${strategy === 'inch-up-rpc' ? 'active' : ''}`}>
                                        <input type="radio" value="inch-up-rpc" checked={strategy === 'inch-up-rpc'} onChange={(e) => setStrategy(e.target.value)} />
                                        Inch Up + RPC Bidding
                                    </label>
                                    <label className={`radio-pill ${strategy === 'rpc-only' ? 'active' : ''}`}>
                                        <input type="radio" value="rpc-only" checked={strategy === 'rpc-only'} onChange={(e) => setStrategy(e.target.value)} />
                                        Strict RPC Bidding
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Target Revenue Per Click (RPC)</label>
                                <div className="input-with-symbol">
                                    <span className="symbol">$</span>
                                    <input
                                        type="number"
                                        min="0.10"
                                        step="0.10"
                                        value={targetRpc}
                                        onChange={(e) => setTargetRpc(parseFloat(e.target.value))}
                                        placeholder="2.50"
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

            {/* FULL WIDTH RESULTS */}
            {file && (
                <div className="w-full" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
                    <div className="pop-card mt-8">
                        <div className="pop-card-header">
                            <div className="pop-step-number">3</div>
                            <h3 className="text-base tracking-wide">Optimization Results</h3>
                        </div>

                        <div className="pop-card-body p-4 bg-white dark:bg-[var(--color-bg-dark)]">
                            <div className="mb-4">
                                <div className="flex gap-4 items-center flex-wrap">
                                    <div className="flex-1 min-w-[200px]">
                                        <input
                                            id="search-results"
                                            placeholder="Type to search globally across all fields..."
                                            className="pop-input w-full text-sm"
                                            type="text"
                                            value={globalSearch}
                                            onChange={(e) => setGlobalSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative inline-block">
                                        <button onClick={handleExport} disabled={isParsing || processedData.length === 0} className="pop-export-btn inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-white/10 hover:shadow-lg hover:shadow-black/20 focus:ring-[#5171ff] text-sm bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg whitespace-nowrap">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download w-4 h-4 mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                                            Export Optimized Bulksheet ({processedData.length})
                                        </button>
                                    </div>
                                    <button onClick={clearFile} disabled={isParsing} className="pop-clear-btn inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-gray-300 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg whitespace-nowrap dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600">
                                        <X size={16} className="mr-2" /> Clear All
                                    </button>
                                </div>
                            </div>

                            <div className="pop-table-container relative overflow-x-auto shadow-md sm:rounded-lg border border-gray-200 dark:border-gray-700" style={{ maxHeight: '600px' }}>
                                {isParsing ? (
                                    <div className="parsing-state p-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="spinner mx-auto mb-4"></div>
                                        <p>Analyzing targeting performance and calculating optimal bids...</p>
                                    </div>
                                ) : (
                                    <table className="pop-table w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10 shadow-sm leading-normal">
                                            <tr>
                                                {columns.map(col => (
                                                    <th key={col.key} className="pop-th relative group px-4 py-3 bg-[#f8fafc] text-gray-700 font-semibold text-left tracking-wide border-b border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap shadow-sm select-none">
                                                        <div className="flex items-center justify-between space-x-2 cursor-pointer" onClick={() => handleSort(col.key)}>
                                                            <span>{col.label}</span>
                                                            {/* Sort Icons */}
                                                            <div className="flex flex-col ml-1 text-gray-300 dark:text-gray-600 opacity-50 group-hover:opacity-100 transition-opacity">
                                                                <svg width="12" height="12" className={`-mb-1 ${sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'text-[#5171ff] dark:text-[#5171ff]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                                                                <svg width="12" height="12" className={`${sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'text-[#5171ff] dark:text-[#5171ff]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                            </div>
                                                        </div>

                                                        {/* Filter Toggle Button */}
                                                        {['campaign', 'adGroup', 'ruleCategory', 'keyword'].includes(col.key) && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleFilterDropdown(col.key); }}
                                                                className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 ${filterConfigs[col.key] ? 'text-white bg-[#5171ff] shadow-md hover:bg-blue-600 ring-2 ring-white ring-offset-1' : 'text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 border border-gray-200 shadow-sm'}`}
                                                            >
                                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                                                            </button>
                                                        )}

                                                        {/* Filter Dropdown */}
                                                        {activeFilterDropdown === col.key && (
                                                            <div className="absolute top-full left-0 mt-1 min-w-[200px] w-max bg-white border border-gray-200 rounded shadow-lg z-50 dark:bg-gray-800 dark:border-gray-600" onClick={e => e.stopPropagation()}>
                                                                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="text"
                                                                            className="w-full px-2 py-1 text-xs border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                                            placeholder="Search..."
                                                                            value={filterSearchQuery}
                                                                            onChange={e => setFilterSearchQuery(e.target.value)}
                                                                        />
                                                                        <button
                                                                            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200 whitespace-nowrap"
                                                                            onClick={() => selectAllFilter(col.key, getUniqueValues(col.key).filter(v => String(v).toLowerCase().includes(filterSearchQuery.toLowerCase())))}
                                                                        >All</button>
                                                                    </div>
                                                                </div>
                                                                <div className="max-h-40 overflow-y-auto p-1 space-y-1">
                                                                    {getUniqueValues(col.key)
                                                                        .filter(v => String(v).toLowerCase().includes(filterSearchQuery.toLowerCase()))
                                                                        .map((val, idx) => (
                                                                            <label key={idx} className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="w-3 h-3 text-blue-600 rounded"
                                                                                    checked={tempSelections.includes(val)}
                                                                                    onChange={() => toggleFilterSelection(val)}
                                                                                />
                                                                                <span className="text-xs truncate" title={val}>{val}</span>
                                                                            </label>
                                                                        ))}
                                                                </div>
                                                                <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
                                                                    <button className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => applyFilter(col.key)}>Apply</button>
                                                                    <button className="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700" onClick={() => clearFilter(col.key)}>Clear</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedData.map((row) => (
                                                <tr key={row.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                                                    {columns.map(col => {
                                                        const val = row[col.key];

                                                        // Special formatting overrides
                                                        if (col.key === 'ruleCategory') {
                                                            return <td key={col.key} className="pop-td"><span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-900">{val}</span></td>;
                                                        }
                                                        if (col.key === 'reason') {
                                                            return <td key={col.key} className="pop-td text-xs text-gray-500 italic dark:text-gray-400">{val}</td>;
                                                        }
                                                        if (col.key === 'suggestedBid') {
                                                            return <td key={col.key} className="pop-td font-bold text-green-600 dark:text-green-400">${val.toFixed(2)}</td>;
                                                        }
                                                        if (col.key === 'changePct') {
                                                            return (
                                                                <td key={col.key} className="pop-td">
                                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${val > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'}`}>
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
                                                            <td key={col.key} className="pop-td font-medium text-gray-900 dark:text-gray-200" title={val}>
                                                                <div className={`${['keyword', 'campaign', 'adGroup'].includes(col.key) ? 'truncate max-w-[200px]' : ''}`}>
                                                                    {col.prefix}{displayVal}{col.suffix}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                            {paginatedData.length === 0 && !isParsing && (
                                                <tr>
                                                    <td colSpan={columns.length} className="text-center py-8 text-gray-500">No optimized rows found matching priorities/filters.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Pagination Controls */}
                            {!isParsing && processedData.length > 0 && (
                                <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 border-t pt-5 pb-2 px-2 dark:border-gray-700">
                                    <div className="flex items-center gap-2 font-medium">
                                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 font-medium text-sm rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:shadow disabled:hover:shadow-sm dark:bg-[var(--color-bg-dark)] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex space-x-1.5">
                                            {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                                                // Simple windowing logic
                                                let p = currentPage - 2 + idx;
                                                if (currentPage <= 3) p = idx + 1;
                                                else if (currentPage >= totalPages - 2) p = totalPages - 4 + idx;

                                                if (p > 0 && p <= totalPages) {
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => setCurrentPage(p)}
                                                            className={`w-9 h-9 flex items-center justify-center font-semibold text-sm rounded-lg border shadow-sm transition-all ${currentPage === p ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow dark:bg-[var(--color-bg-dark)] dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800'}`}
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
                                            className="px-4 py-2 font-medium text-sm rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:shadow disabled:hover:shadow-sm dark:bg-[var(--color-bg-dark)] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
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
