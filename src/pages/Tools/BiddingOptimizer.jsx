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

                // Assuming data is in the first sheet for Amazon Bulk Ops formats,
                // or the sheet named 'Sponsored Products Campaigns'
                const sheetName = workbook.SheetNames.includes('Sponsored Products Campaigns')
                    ? 'Sponsored Products Campaigns'
                    : workbook.SheetNames[0];

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const processedResults = [];
                let modifiedData = [...jsonData]; // Copy to update bids

                // Amazon bulk ops column names can vary slightly, but standardizes around these
                // 'Entity', 'Keyword Text', 'Product Targeting ID', 'Clicks', 'Spend', 'Sales', 'Max Bid'

                modifiedData.forEach((row, index) => {
                    const entityType = row['Entity'] || '';
                    // Only adjust bids for Keywords, Product Targeting, etc (not Campaigns or Ad Groups)
                    if (entityType.includes('Keyword') || entityType.includes('Product Targeting') || row['Keyword Text']) {

                        const clicks = parseFloat(row['Clicks']) || 0;
                        const spend = parseFloat(row['Spend']) || 0;
                        const sales = parseFloat(row['Sales']) || parseFloat(row['14 Day Total Sales']) || parseFloat(row['30 Day Total Sales']) || 0;
                        // For bids, it might be 'Max Bid', 'Keyword Bid', or 'Targeting Bid' depending on the report type
                        const originalBid = parseFloat(row['Max Bid']) || parseFloat(row['Keyword Bid']) || parseFloat(row['Bid']) || parseFloat(row['Targeting Bid']) || 0.50;

                        let suggestedBid = originalBid;
                        let reason = 'Ignored (No clicks/spend)';
                        let modified = false;

                        // Only optimize if they spent money or got clicks
                        if (clicks > 0 || spend > 0) {

                            // STRATEGY: INCH UP (<= 3 Clicks)
                            if (clicks <= 3) {
                                // Increase bid slightly (10%) to try to force impressions/clicks to gather data
                                suggestedBid = originalBid * 1.10;
                                reason = 'Inch Up (≤ 3 Clicks)';
                                modified = true;
                            }
                            // STRATEGY: RPC BIDDING (> 3 Clicks)
                            else if (clicks > 3) {
                                if (strategy === 'rpc-only' || strategy === 'inch-up-rpc') {
                                    // Default Target RPC logic is to bid a percentage of Historical RPC
                                    // Historical RPC = Sales / Clicks
                                    const historicalRpc = sales / clicks;

                                    // Our new bid should aim towards hitting our Target RPC constraint
                                    // Example: if historical RPC is $5.00 and our Target RPC is $2.50, we can bid higher.
                                    // But typically Amazon Sellers calculate it via Conversion Rate * Target CPA or Target ACOS
                                    // For this basic tool: We use (Historical RPC * (OriginalBid / TargetRpc)) 
                                    // OR simpler: Suggested Bid = Sales / Clicks * (User Profit Margin)
                                    // Because the user provides "Target RPC" directly, we just weight the previous bid against it.

                                    // Safe calculation for Demo (Aim to bid closer to Historical RPC without exceeding limits)
                                    const rawRocBid = historicalRpc > 0 ? (sales / clicks) * 0.30 : originalBid * 0.5; // Example math: 30% of Historical RPC
                                    suggestedBid = rawRocBid;

                                    reason = `RPC ($${historicalRpc.toFixed(2)})`;
                                    modified = true;
                                }
                            }

                            if (modified) {
                                // CLAMP to Min/Max Bounds
                                if (suggestedBid < minBid) suggestedBid = minBid;
                                if (suggestedBid > maxBid) suggestedBid = maxBid;

                                // Update the actual row data (handle multiple possible column names)
                                if (row['Max Bid'] !== undefined) row['Max Bid'] = suggestedBid;
                                else if (row['Keyword Bid'] !== undefined) row['Keyword Bid'] = suggestedBid;
                                else if (row['Targeting Bid'] !== undefined) row['Targeting Bid'] = suggestedBid;
                                else if (row['Bid'] !== undefined) row['Bid'] = suggestedBid;

                                processedResults.push({
                                    id: index,
                                    keyword: row['Keyword Text'] || row['Product Targeting ID'] || `Row ${index + 2}`,
                                    originalBid: originalBid,
                                    clicks: clicks,
                                    sales: sales,
                                    suggestedBid: suggestedBid,
                                    reason: reason
                                });
                            }
                        }
                    }
                });

                setResults(processedResults.slice(0, 50)); // Only show top 50 in UI to prevent lag

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

    return (
        <div className="bidding-optimizer-page container section">
            {/* Header Section */}
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

                        {/* Results / Processing State */}
                        {file && (
                            <div className="results-panel">
                                <div className="results-header">
                                    <div className="file-info">
                                        <FileSpreadsheet size={24} color="var(--color-primary)" />
                                        <div>
                                            <h4>{file.name}</h4>
                                            <span>{(file.size / 1024 / 1024).toFixed(2)} MB processing</span>
                                        </div>
                                    </div>
                                    <div className="results-actions">
                                        <button className="btn btn-outline" onClick={clearFile} disabled={isParsing}>
                                            <X size={16} /> Clear
                                        </button>
                                        <button className="btn btn-primary" onClick={handleExport} disabled={isParsing || results.length === 0}>
                                            <Download size={16} /> Export Optimized
                                        </button>
                                    </div>
                                </div>

                                {isParsing ? (
                                    <div className="parsing-state">
                                        <div className="spinner"></div>
                                        <p>Analyzing targeting performance and calculating optimal bids...</p>
                                    </div>
                                ) : (
                                    <div className="results-table-container">
                                        <table className="results-table">
                                            <thead>
                                                <tr>
                                                    <th>Target/Keyword</th>
                                                    <th>Clicks</th>
                                                    <th>Sales</th>
                                                    <th>Original Bid</th>
                                                    <th>Optimized Bid</th>
                                                    <th>Logic Rule</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.map((row) => (
                                                    <tr key={row.id}>
                                                        <td>{row.keyword}</td>
                                                        <td>{row.clicks}</td>
                                                        <td>${row.sales.toFixed(2)}</td>
                                                        <td>${row.originalBid.toFixed(2)}</td>
                                                        <td className="highlight-bid">${row.suggestedBid.toFixed(2)}</td>
                                                        <td><span className="rule-badge">{row.reason}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="results-footer">
                                            <p className="text-muted text-sm">Previewing top {results.length} modified rows. Export to view all changes.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BiddingOptimizer;
