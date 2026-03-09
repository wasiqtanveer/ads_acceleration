import React, { useState, useEffect } from 'react';
import {
    ChevronDown,
    Target,
    HelpCircle,
    Download,
    AlertCircle,
    PlusCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import './BiddingOptimizer.css'; // Inheriting structural layout
import './CampaignBuilder.css'; // Tool-specific additions

// Reusable tooltip component for consistent help icons
const HelpTip = ({ text }) => (
    <span className="cb-help-icon">
        <HelpCircle size={14} />
        <span className="cb-tooltip">{text}</span>
    </span>
);

// Predefined constants to map UI selections to Amazon formats
const CAMPAIGN_TYPES = [
    { id: 'Single Keyword', label: 'Single Keyword', matchType: 'Exact' },
    { id: 'Exact Match', label: 'Exact Match', matchType: 'Exact' },
    { id: 'Phrase Match', label: 'Phrase Match', matchType: 'Phrase' },
    { id: 'Broad Match', label: 'Broad Match', matchType: 'Broad' },
    { id: 'Broad-BMM', label: 'Broad-BMM', matchType: 'Broad' },
    { id: 'Auto Match', label: 'Auto Match', matchType: 'Auto' },
    { id: 'Product Match', label: 'Product Match', matchType: 'Targeting' },
    { id: 'Brand Match', label: 'Brand Match', matchType: 'Phrase' }
];

const BIDDING_STRATEGIES = [
    { id: 'Dynamic bids - down only', label: 'Dynamic bids - down only' },
    { id: 'Dynamic bids - up and down', label: 'Dynamic bids - up and down' },
    { id: 'Fixed bids', label: 'Fixed bids' }
];

const DEFAULT_CONFIG = {
    keywords: '',
    budget: '10.00',
    startingBid: '1.00',
    topOfSearch: '0',
    restOfSearch: '0',
    productPages: '0',
    biddingStrategy: 'Dynamic bids - down only',
    negativeExact: '',
    negativePhrase: '',
    autoTargetTypes: ['Close Match', 'Loose Match', 'Substitutes', 'Complements']
};

// ─── Amazon Sponsored Products Bulk Upload Helpers ────────────────────────────

const AMAZON_COLUMNS = [
    'Product', 'Entity', 'Operation', 'Campaign Id', 'Ad Group Id',
    'Portfolio Id', 'Ad Id', 'Keyword Id', 'Product Targeting Id',
    'Campaign Name', 'Ad Group Name', 'Start Date', 'End Date',
    'Targeting Type', 'State', 'Daily Budget', 'SKU', 'ASIN',
    'Ad Group Default Bid', 'Bid', 'Keyword Text', 'Match Type',
    'Bidding Strategy', 'Placement', 'Percentage'
];

const AUTO_TARGET_MAP = {
    'Close Match': 'queryHighRelMatches',
    'Loose Match': 'queryBroadRelMatches',
    'Substitutes': 'asinSubstituteRelated',
    'Complements': 'asinAccessoryRelated'
};

// Broader types should negate keywords from all tighter types when isolation is on
const ISOLATION_TIGHTER = {
    'Phrase Match':  ['Exact Match', 'Single Keyword'],
    'Brand Match':   ['Exact Match', 'Single Keyword'],
    'Broad Match':   ['Exact Match', 'Single Keyword', 'Phrase Match', 'Brand Match'],
    'Broad-BMM':     ['Exact Match', 'Single Keyword', 'Phrase Match', 'Brand Match'],
    'Auto Match':    ['Exact Match', 'Single Keyword', 'Phrase Match', 'Brand Match', 'Broad Match', 'Broad-BMM'],
};

const fmtDate = (d) => d.replace(/-/g, '');
const toBMM = (kw) => kw.trim().split(/\s+/).map(w => `+${w}`).join(' ');
const splitLines = (txt) => (txt || '').split('\n').map(s => s.trim()).filter(Boolean);

const mkRow = (data) => {
    const r = {};
    AMAZON_COLUMNS.forEach(c => { r[c] = ''; });
    return Object.assign(r, data);
};

const downloadBulk = (rows, filename) => {
    const ws = XLSX.utils.json_to_sheet(rows, { header: AMAZON_COLUMNS });
    ws['!cols'] = AMAZON_COLUMNS.map(h => ({ wch: Math.max(h.length + 2, 16) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sponsored Products');
    XLSX.writeFile(wb, filename);
};

// Shared builder: campaign + placements + ad group + product ad
const buildCampaignCore = (name, date, targeting, budget, strategy, bid, agName, sku, placements) => {
    const rows = [];
    rows.push(mkRow({
        Product: 'Sponsored Products', Entity: 'Campaign', Operation: 'Create',
        'Campaign Name': name, 'Start Date': date,
        'Targeting Type': targeting, State: 'enabled',
        'Daily Budget': budget, 'Bidding Strategy': strategy,
    }));
    [['Placement Top', placements.top],
     ['Placement Product Page', placements.product],
     ['Placement Rest Of Search', placements.rest]
    ].forEach(([p, v]) => {
        if (parseFloat(v) > 0) {
            rows.push(mkRow({
                Product: 'Sponsored Products', Entity: 'Bidding Adjustment', Operation: 'Create',
                'Campaign Name': name, Placement: p, Percentage: v,
            }));
        }
    });
    rows.push(mkRow({
        Product: 'Sponsored Products', Entity: 'Ad Group', Operation: 'Create',
        'Campaign Name': name, 'Ad Group Name': agName,
        'Ad Group Default Bid': bid, State: 'enabled',
    }));
    rows.push(mkRow({
        Product: 'Sponsored Products', Entity: 'Product Ad', Operation: 'Create',
        'Campaign Name': name, 'Ad Group Name': agName,
        SKU: sku, State: 'enabled',
    }));
    return rows;
};

const addNegatives = (rows, name, agName, negExact, negPhrase) => {
    negExact.forEach(nk => {
        rows.push(mkRow({
            Product: 'Sponsored Products', Entity: 'Negative Keyword', Operation: 'Create',
            'Campaign Name': name, 'Ad Group Name': agName,
            'Keyword Text': nk, 'Match Type': 'negativeExact', State: 'enabled',
        }));
    });
    negPhrase.forEach(nk => {
        rows.push(mkRow({
            Product: 'Sponsored Products', Entity: 'Negative Keyword', Operation: 'Create',
            'Campaign Name': name, 'Ad Group Name': agName,
            'Keyword Text': nk, 'Match Type': 'negativePhrase', State: 'enabled',
        }));
    });
};

const CampaignBuilder = () => {
    // ─── Mode State ─────────────────────────────────────────────────────────────
    const [mode, setMode] = useState('standard'); // 'standard' or 'rank'

    // ─── Standard Campaign State ─────────────────────────────────────────────────
    const [standardDetails, setStandardDetails] = useState({
        adType: 'Sponsored Products',
        startDate: new Date().toISOString().split('T')[0],
        campaignNameTemplate: '[SKU] - SP - [BID RANGE] [MATCH TYPE]'
    });
    const [productSkus, setProductSkus] = useState('');
    const [bidRanges, setBidRanges] = useState(['Exact Bid Range']);
    const [searchIsolation, setSearchIsolation] = useState('Isolate');

    const [selectedTypes, setSelectedTypes] = useState([
        'Exact Match', 'Phrase Match', 'Broad Match', 'Auto Match' // Default selection
    ]);
    const [configs, setConfigs] = useState({});
    const [activeTab, setActiveTab] = useState(selectedTypes[0] || '');

    // ─── Rank Campaign State ───────────────────────────────────────────────────
    const [rankDetails, setRankDetails] = useState({
        campaignNameTemplate: '[SKU] - [SP - KW.] - [KEYWORD GROUP] - [MATCH TYPE]',
        productSku: ''
    });

    const [rankKeywordGroups, setRankKeywordGroups] = useState([]);
    const [rankEntryMode, setRankEntryMode] = useState('manual');
    const [rankBulkData, setRankBulkData] = useState('');
    const [currentRankGroup, setCurrentRankGroup] = useState({
        groupName: '',
        keywords: '',
        budget: '10.00',
        startingBid: '1.00',
        topOfSearch: '0',
        restOfSearch: '0',
        productPages: '0',
        biddingStrategy: 'Dynamic bids - down only',
        negativeExact: '',
        negativePhrase: ''
    });


    // Initialize configs when selected types change (Standard Mode)
    useEffect(() => {
        setConfigs(prev => {
            const newConfigs = {};
            selectedTypes.forEach(type => {
                newConfigs[type] = prev[type] || { ...DEFAULT_CONFIG };
            });
            return newConfigs;
        });

        if (!selectedTypes.includes(activeTab) && selectedTypes.length > 0) {
            setActiveTab(selectedTypes[0]);
        }
    }, [selectedTypes]);

    // Helpers
    const toggleCampaignType = (id) => {
        setSelectedTypes(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const toggleBidRange = (range) => {
        setBidRanges(prev =>
            prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
        );
    };

    const toggleAutoTargetType = (type, targetType) => {
        setConfigs(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                autoTargetTypes: (prev[type].autoTargetTypes || []).includes(targetType)
                    ? prev[type].autoTargetTypes.filter(t => t !== targetType)
                    : [...(prev[type].autoTargetTypes || []), targetType]
            }
        }));
    };

    const updateConfig = (type, field, value) => {
        setConfigs(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }));
    };

    // ─── Standard Campaign Generation ─────────────────────────────────────────
    const handleGenerateStandard = () => {
        const skusList = productSkus.split(/[,\n]/).map(s => s.trim()).filter(s => s);
        if (!skusList.length || !selectedTypes.length) return;

        const rows = [];
        const date = fmtDate(standardDetails.startDate);

        // Gather keywords per type for search isolation
        const kwsByType = {};
        selectedTypes.forEach(t => {
            kwsByType[t] = configs[t] ? splitLines(configs[t].keywords) : [];
        });

        skusList.forEach(sku => {
            selectedTypes.forEach(typeId => {
                const typeInfo = CAMPAIGN_TYPES.find(t => t.id === typeId);
                const cfg = configs[typeId];
                if (!typeInfo || !cfg) return;

                const isAuto    = typeId === 'Auto Match';
                const isProduct = typeId === 'Product Match';
                const isBMM     = typeId === 'Broad-BMM';
                const isSingle  = typeId === 'Single Keyword';

                const keywords  = splitLines(cfg.keywords);
                if (!isAuto && keywords.length === 0) return;

                const negExact  = splitLines(cfg.negativeExact);
                const negPhrase = splitLines(cfg.negativePhrase);

                // Single Keyword → one campaign per keyword; others → one campaign for all
                const sets = isSingle
                    ? keywords.map(kw => ({ kws: [kw], tag: kw }))
                    : [{ kws: keywords, tag: null }];

                sets.forEach(({ kws, tag }) => {
                    let name = standardDetails.campaignNameTemplate
                        .replace(/\[SKU\]/gi, sku)
                        .replace(/\[MATCH TYPE\]/gi, typeId)
                        .replace(/\[BID RANGE\]/gi, bidRanges.join(' & '));
                    if (tag) name += ` - ${tag}`;

                    const agName = name + ' - Ad Group';
                    const placements = { top: cfg.topOfSearch, product: cfg.productPages, rest: cfg.restOfSearch };

                    // Core rows: campaign, placements, ad group, product ad
                    rows.push(...buildCampaignCore(
                        name, date, isAuto ? 'Auto' : 'Manual',
                        cfg.budget, cfg.biddingStrategy, cfg.startingBid,
                        agName, sku, placements
                    ));

                    // Keywords / Targets
                    if (isAuto) {
                        const allAT = ['Close Match', 'Loose Match', 'Substitutes', 'Complements'];
                        const enabled = cfg.autoTargetTypes || allAT;
                        allAT.forEach(at => {
                            rows.push(mkRow({
                                Product: 'Sponsored Products', Entity: 'Product Targeting', Operation: 'Create',
                                'Campaign Name': name, 'Ad Group Name': agName,
                                State: enabled.includes(at) ? 'enabled' : 'paused',
                                'Keyword Text': AUTO_TARGET_MAP[at], Bid: cfg.startingBid,
                            }));
                        });
                    } else if (isProduct) {
                        kws.forEach(asin => {
                            rows.push(mkRow({
                                Product: 'Sponsored Products', Entity: 'Product Targeting', Operation: 'Create',
                                'Campaign Name': name, 'Ad Group Name': agName,
                                'Keyword Text': `asin="${asin}"`, Bid: cfg.startingBid, State: 'enabled',
                            }));
                        });
                    } else {
                        const mt = isBMM ? 'broad' : typeInfo.matchType.toLowerCase();
                        kws.forEach(kw => {
                            rows.push(mkRow({
                                Product: 'Sponsored Products', Entity: 'Keyword', Operation: 'Create',
                                'Campaign Name': name, 'Ad Group Name': agName,
                                'Keyword Text': isBMM ? toBMM(kw) : kw,
                                'Match Type': mt, Bid: cfg.startingBid, State: 'enabled',
                            }));
                        });
                    }

                    // User-defined negatives
                    addNegatives(rows, name, agName, negExact, negPhrase);

                    // Search isolation: negate keywords from tighter match types
                    if (searchIsolation === 'Isolate' && ISOLATION_TIGHTER[typeId]) {
                        const already = new Set([...negExact, ...negPhrase]);
                        ISOLATION_TIGHTER[typeId].forEach(tighterType => {
                            if (!selectedTypes.includes(tighterType)) return;
                            (kwsByType[tighterType] || []).forEach(kw => {
                                if (already.has(kw)) return;
                                already.add(kw);
                                rows.push(mkRow({
                                    Product: 'Sponsored Products',
                                    Entity: 'Campaign Negative Keyword', Operation: 'Create',
                                    'Campaign Name': name,
                                    'Keyword Text': kw, 'Match Type': 'negativeExact', State: 'enabled',
                                }));
                            });
                        });
                    }
                });
            });
        });

        if (rows.length === 0) {
            alert('Nothing to generate — make sure keywords are entered for your selected campaign types.');
            return;
        }
        downloadBulk(rows, `Standard_Campaigns_${fmtDate(standardDetails.startDate)}.xlsx`);
    };

    // ─── Rank Campaign Generation ────────────────────────────────────────────
    const handleGenerateRank = () => {
        const sku = rankDetails.productSku.trim();
        if (!sku || !rankKeywordGroups.length) return;

        const rows = [];
        const date = fmtDate(new Date().toISOString().split('T')[0]);

        rankKeywordGroups.forEach(group => {
            const keywords  = splitLines(group.keywords);
            const negExact  = splitLines(group.negativeExact);
            const negPhrase = splitLines(group.negativePhrase);

            keywords.forEach(keyword => {
                // Two campaigns per keyword: Exact match + Broad-BMM
                [
                    { label: 'Exact', mt: 'exact', text: keyword },
                    { label: 'Broad', mt: 'broad', text: toBMM(keyword) }
                ].forEach(({ label, mt, text }) => {
                    let name = rankDetails.campaignNameTemplate
                        .replace(/\[SKU\]/gi, sku)
                        .replace(/\[KEYWORD GROUP\]/gi, group.groupName.toUpperCase())
                        .replace(/\[MATCH TYPE\]/gi, label)
                        .replace(/\[SP - KW\.\]/gi, 'SP - KW.');

                    const agName = name + ' - Ad Group';
                    const placements = { top: group.topOfSearch, product: group.productPages, rest: group.restOfSearch };

                    rows.push(...buildCampaignCore(
                        name, date, 'Manual',
                        group.budget, group.biddingStrategy, group.startingBid,
                        agName, sku, placements
                    ));

                    // Single keyword row
                    rows.push(mkRow({
                        Product: 'Sponsored Products', Entity: 'Keyword', Operation: 'Create',
                        'Campaign Name': name, 'Ad Group Name': agName,
                        'Keyword Text': text, 'Match Type': mt,
                        Bid: group.startingBid, State: 'enabled',
                    }));

                    // User-defined negatives
                    addNegatives(rows, name, agName, negExact, negPhrase);

                    // Isolation: broad campaign negates the exact keyword
                    if (mt === 'broad') {
                        rows.push(mkRow({
                            Product: 'Sponsored Products',
                            Entity: 'Campaign Negative Keyword', Operation: 'Create',
                            'Campaign Name': name,
                            'Keyword Text': keyword, 'Match Type': 'negativeExact', State: 'enabled',
                        }));
                    }
                });
            });
        });

        if (rows.length === 0) {
            alert('Nothing to generate — add keyword groups first.');
            return;
        }
        downloadBulk(rows, `Rank_Campaigns_${sku}_${date}.xlsx`);
    };

    // ─── RENDERERS ─────────────────────────────────────────────────────────────

    const renderStandardCampaign = () => {
        const skusList = productSkus.split(/[,\n]/).map(s => s.trim()).filter(s => s);
        const canGenerate = skusList.length > 0 && selectedTypes.length > 0;

        return (
            <>
                {/* STEP 1: Campaign Details */}
                <div className="optimizer-step-card">
                    <div className="step-header">
                        <div className="step-number">1</div>
                        <div>
                            <h2>Campaign Details</h2>
                            <p className="text-muted">Set up the standard structure and naming</p>
                        </div>
                    </div>
                    <div className="settings-grid cb-card1-grid">
                        <div className="form-group">
                            <label>Ad Type <HelpTip text="The advertising format for your campaigns. Sponsored Products target individual product listings in search results." /></label>
                            <select
                                className="cb-select"
                                value={standardDetails.adType}
                                onChange={e => setStandardDetails({ ...standardDetails, adType: e.target.value })}
                            >
                                <option value="Sponsored Products">Sponsored Products</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Start Date <HelpTip text="The date your campaigns will begin running. Campaigns will start accruing spend from this date." /></label>
                            <input
                                type="date"
                                className="cb-input"
                                value={standardDetails.startDate}
                                onChange={e => setStandardDetails({ ...standardDetails, startDate: e.target.value })}
                            />
                        </div>

                        <div className="form-group group-full-width">
                            <label>Campaign Name Structure <HelpTip text="Define how campaign names are auto-generated. Use placeholders like [SKU], [BID RANGE], and [MATCH TYPE] — they get replaced for each campaign." /></label>
                            <input
                                type="text"
                                className="cb-input"
                                placeholder="[SKU] - SP - [BID RANGE] [MATCH TYPE]"
                                value={standardDetails.campaignNameTemplate}
                                onChange={e => setStandardDetails({ ...standardDetails, campaignNameTemplate: e.target.value })}
                            />
                            <div className="cb-format-hint">
                                Use placeholders: [SKU], [BID RANGE], [MATCH TYPE]
                            </div>
                        </div>
                    </div>
                </div>

                {/* STEP 2: Product SKUs */}
                <div className="optimizer-step-card">
                    <div className="step-header">
                        <div className="step-number">2</div>
                        <div>
                            <h2>Product SKUs</h2>
                            <p className="text-muted">Enter the products to advertise ({skusList.length} total)</p>
                        </div>
                    </div>
                    <div className="settings-grid">
                        <div className="form-group group-full-width">
                            <label>SKUs <HelpTip text="Enter your Amazon product SKUs (Stock Keeping Units). These are the unique identifiers for your products. They will be used to create product ads in your campaigns. You can enter multiple SKUs separated by commas or new lines." /></label>
                            <textarea
                                className="cb-textarea"
                                placeholder={`Enter SKUs, use commas or line breaks to separate\nSKU-001  SKU-002  SKU-003`}
                                value={productSkus}
                                onChange={e => setProductSkus(e.target.value)}
                            />
                            <div className="cb-format-hint">Enter one SKU per line or separate with commas.</div>
                        </div>
                    </div>
                </div>

                {/* STEP 3: Bids & Targeting Settings */}
                <div className="optimizer-step-card">
                    <div className="step-header">
                        <div className="step-number">3</div>
                        <div>
                            <h2>Bids & Targeting Settings</h2>
                            <p className="text-muted">Global logic for isolating targets</p>
                        </div>
                    </div>
                    <div className="settings-grid">
                        <div className="form-group">
                            <label>Bid Ranges <HelpTip text="Select which match type limits to enforce. Exact Bid Range caps CPC for exact match keywords; Phrase/Broad caps CPC for broader match types." /></label>
                            <div className="radio-pill-group double">
                                <label className={`radio-pill ${bidRanges.includes('Exact Bid Range') ? 'active' : ''}`}>
                                    <input type="checkbox" checked={bidRanges.includes('Exact Bid Range')} onChange={() => toggleBidRange('Exact Bid Range')} />
                                    Exact Bid Range
                                </label>
                                <label className={`radio-pill ${bidRanges.includes('Phrase/Broad Bid Range') ? 'active' : ''}`}>
                                    <input type="checkbox" checked={bidRanges.includes('Phrase/Broad Bid Range')} onChange={() => toggleBidRange('Phrase/Broad Bid Range')} />
                                    Phrase/Broad Bid Range
                                </label>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Search Term Isolation <HelpTip text="Controls whether negative targets are pushed to broader match types. 'Isolate' ensures each match type only triggers for its intended keywords." /></label>
                            <div className="radio-pill-group double">
                                <label className={`radio-pill ${searchIsolation === 'Isolate' ? 'active' : ''}`}>
                                    <input type="radio" value="Isolate" checked={searchIsolation === 'Isolate'} onChange={() => setSearchIsolation('Isolate')} />
                                    Isolate
                                </label>
                                <label className={`radio-pill ${searchIsolation === 'Not Isolated' ? 'active' : ''}`}>
                                    <input type="radio" value="Not Isolated" checked={searchIsolation === 'Not Isolated'} onChange={() => setSearchIsolation('Not Isolated')} />
                                    Not Isolated
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STEP 4: Campaign Types */}
                <div className="optimizer-step-card">
                    <div className="step-header">
                        <div className="step-number">4</div>
                        <div>
                            <h2>Campaign Types</h2>
                            <p className="text-muted">Select all campaigns you want to generate</p>
                        </div>
                    </div>
                    <div className="settings-grid">
                        <div className="form-group group-full-width">
                            <div className="radio-pill-group double cb-campaign-type-grid">
                                {CAMPAIGN_TYPES.map(type => (
                                    <label key={type.id} className={`radio-pill ${selectedTypes.includes(type.id) ? 'active' : ''}`}>
                                        <input
                                            type="checkbox"
                                            onChange={() => toggleCampaignType(type.id)}
                                            checked={selectedTypes.includes(type.id)}
                                        />
                                        {type.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* STEP 5: Configure Campaign Types */}
                {selectedTypes.length > 0 && (
                    <div className="optimizer-step-card">
                        <div className="step-header">
                            <div className="step-number">5</div>
                            <div>
                                <h2>Configure Campaign Types</h2>
                                <p className="text-muted">Set budgets, bids and keywords for each match type</p>
                            </div>
                        </div>
                        <div className="settings-grid cb-block">
                            {/* Type chips — sync from Card 4 selection */}
                            <div className="cb-type-chips">
                                {selectedTypes.map(type => (
                                    <div
                                        key={type}
                                        className={`cb-type-chip ${activeTab === type ? 'active' : ''}`}
                                        onClick={() => setActiveTab(type)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={e => e.key === 'Enter' && setActiveTab(type)}
                                    >
                                        <span className="cb-chip-label">{type}</span>
                                        <span
                                            className="cb-chip-remove"
                                            title="Remove"
                                            onClick={e => { e.stopPropagation(); toggleCampaignType(type); }}
                                        >×</span>
                                    </div>
                                ))}
                            </div>


                            {activeTab && configs[activeTab] && (
                                <div className="cb-tab-content" key={activeTab}>

                                    {activeTab === 'Auto Match' ? (
                                        <div className="form-group group-full-width cb-mb-2">
                                            <label>Auto Targeting Types <HelpTip text="Select which automatic targeting strategies Amazon should use. Close Match targets shoppers searching for similar products. Loose Match casts a wider net. Substitutes targets replacement products. Complements targets accessories or add-ons." /></label>
                                            <div className="cb-auto-targeting-grid">
                                                {['Close Match', 'Loose Match', 'Substitutes', 'Complements'].map(targetType => (
                                                    <label
                                                        key={targetType}
                                                        className={`radio-pill ${(configs[activeTab].autoTargetTypes || []).includes(targetType) ? 'active' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={(configs[activeTab].autoTargetTypes || []).includes(targetType)}
                                                            onChange={() => toggleAutoTargetType(activeTab, targetType)}
                                                        />
                                                        {targetType}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="form-group group-full-width cb-mb-2">
                                            <label>
                                                {activeTab === 'Product Match' ? 'Product Targets (ASINs)'
                                                    : activeTab === 'Brand Match' ? 'Brand Keywords'
                                                    : 'Keywords'}
                                                {' '}<HelpTip text={
                                                    activeTab === 'Product Match'
                                                        ? 'Enter competitor or complementary product ASINs to target. One ASIN per line (e.g., B01N5IB20Q). Your ads will appear on these product detail pages.'
                                                        : activeTab === 'Brand Match'
                                                            ? 'Enter brand name keywords to target. These are search terms shoppers use when looking for specific brands. One per line.'
                                                            : 'Enter the keywords you want to target for this match type. One keyword per line. These are the search terms shoppers will use.'
                                                } />
                                            </label>
                                            <textarea
                                                className="cb-textarea"
                                                placeholder={
                                                    activeTab === 'Product Match'
                                                        ? 'Enter ASINs, one per line\nExample: B01N5IB20Q'
                                                        : activeTab === 'Brand Match'
                                                            ? 'Enter brand keywords, one per line\nExample: Nike running shoes'
                                                            : "Enter keywords, one per line\nExample: wireless headphones"
                                                }
                                                value={configs[activeTab].keywords}
                                                onChange={e => updateConfig(activeTab, 'keywords', e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <div className="cb-two-col-grid">
                                        <div className="form-group">
                                            <label>Budget ($) <HelpTip text="Daily budget for this campaign type. Amazon may exceed this by up to 25% on high-traffic days but averages out over the month." /></label>
                                            <input
                                                className="cb-input"
                                                type="number"
                                                step="0.01"
                                                min="1"
                                                value={configs[activeTab].budget}
                                                onChange={e => updateConfig(activeTab, 'budget', e.target.value)}
                                                placeholder="10.00"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Starting Bid ($) <HelpTip text="The default cost-per-click bid for keywords in this campaign. Amazon will use this as the baseline for auction placement." /></label>
                                            <input
                                                className="cb-input"
                                                type="number"
                                                step="0.01"
                                                min="0.02"
                                                value={configs[activeTab].startingBid}
                                                onChange={e => updateConfig(activeTab, 'startingBid', e.target.value)}
                                                placeholder="1.00"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group group-full-width cb-mb-2">
                                        <label>Placement Modifiers <HelpTip text="Increase bids by a percentage for specific placements. Higher values boost visibility in those placements but increase CPC." /></label>
                                        <div className="cb-three-col-grid">
                                            <div>
                                                <div className="cb-sub-label">Top of Search %</div>
                                                <input
                                                    className="cb-input"
                                                    type="number"
                                                    min="0"
                                                    max="900"
                                                    value={configs[activeTab].topOfSearch}
                                                    onChange={e => updateConfig(activeTab, 'topOfSearch', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <div className="cb-sub-label">Rest of Search %</div>
                                                <input
                                                    className="cb-input"
                                                    type="number"
                                                    min="0"
                                                    max="900"
                                                    value={configs[activeTab].restOfSearch}
                                                    onChange={e => updateConfig(activeTab, 'restOfSearch', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <div className="cb-sub-label">Product Pages %</div>
                                                <input
                                                    className="cb-input"
                                                    type="number"
                                                    min="0"
                                                    max="900"
                                                    value={configs[activeTab].productPages}
                                                    onChange={e => updateConfig(activeTab, 'productPages', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group group-full-width cb-mb-2">
                                        <label>Bidding Strategy <HelpTip text="'Down only' reduces bids for unlikely conversions. 'Up and down' adjusts bids in both directions. 'Fixed' keeps your bid constant." /></label>
                                        <select
                                            className="cb-select"
                                            value={configs[activeTab].biddingStrategy}
                                            onChange={e => updateConfig(activeTab, 'biddingStrategy', e.target.value)}
                                        >
                                            {BIDDING_STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="form-group group-full-width">
                                        <label>Negative Targets <HelpTip text="Keywords to exclude from triggering your ads. Negative Exact blocks that exact term; Negative Phrase blocks any search containing the phrase." /></label>
                                        <div className="cb-two-col-grid">
                                            <div>
                                                <div className="cb-sub-label">Negative Exact</div>
                                                <textarea
                                                    className="cb-textarea cb-textarea-sm"
                                                    placeholder="One per line"
                                                    value={configs[activeTab].negativeExact}
                                                    onChange={e => updateConfig(activeTab, 'negativeExact', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <div className="cb-sub-label">Negative Phrase</div>
                                                <textarea
                                                    className="cb-textarea cb-textarea-sm"
                                                    placeholder="One per line"
                                                    value={configs[activeTab].negativePhrase}
                                                    onChange={e => updateConfig(activeTab, 'negativePhrase', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 6: Generate Campaigns (Standard) */}
                <div className="optimizer-step-card">
                    <div className="step-header">
                        <div className="step-number step-number--green">6</div>
                        <div>
                            <h2>Generate Campaigns</h2>
                            <p className="text-muted">{canGenerate ? 'Ready — click to generate your bulk upload file.' : 'Complete requirements below to unlock.'}</p>
                        </div>
                    </div>
                    <div className="settings-grid cb-block cb-pb-3">
                        {!canGenerate && (
                            <div className="cb-requirements-block">
                                <div className="cb-req-header">
                                    <AlertCircle size={15} />
                                    <span>Action Required to Generate Campaigns</span>
                                </div>
                                <ul className="cb-req-list">
                                    <li className={skusList.length > 0 ? 'cb-req-done' : ''}>
                                        <span className="cb-req-check">{skusList.length > 0 ? '✓' : '○'}</span>
                                        Add at least one SKU
                                    </li>
                                    <li className={selectedTypes.length > 0 ? 'cb-req-done' : ''}>
                                        <span className="cb-req-check">{selectedTypes.length > 0 ? '✓' : '○'}</span>
                                        Select at least one campaign type
                                    </li>
                                </ul>
                            </div>
                        )}
                        <button
                            className={`generate-btn${!canGenerate ? ' cb-generate-locked' : ''}`}
                            onClick={handleGenerateStandard}
                            disabled={!canGenerate}
                        >
                            <Download size={24} />
                            Generate Standard Campaigns
                        </button>
                    </div>
                </div>
            </>
        );
    };

    const renderRankCampaign = () => {
        const canAddGroup = currentRankGroup.groupName.trim().length > 0 && currentRankGroup.keywords.trim().length > 0;
        const canGenerateRank = rankDetails.productSku.trim().length > 0 && rankKeywordGroups.length > 0;

        return (
            <>
                {/* STEP 1: Campaign Structure (Rank) */}
                <div className="optimizer-step-card">
                    <div className="step-header">
                        <div className="step-number">1</div>
                        <div>
                            <h2>Campaign Structure</h2>
                        </div>
                    </div>
                    <div className="settings-grid">
                        <div className="form-group group-full-width">
                            <label>Campaign Name Template <HelpTip text="Template for naming rank campaigns. Use placeholders like [SKU], [KEYWORD GROUP], and [MATCH TYPE] to auto-generate names." /></label>
                            <input
                                type="text"
                                className="cb-input"
                                value={rankDetails.campaignNameTemplate}
                                onChange={e => setRankDetails({ ...rankDetails, campaignNameTemplate: e.target.value })}
                            />
                        </div>
                        <div className="form-group group-full-width">
                            <label>Product SKU <HelpTip text="The ASIN or SKU of the product you want to rank. All keyword groups will target this single product." /></label>
                            <input
                                type="text"
                                className="cb-input"
                                placeholder="B001XYZ987"
                                value={rankDetails.productSku}
                                onChange={e => setRankDetails({ ...rankDetails, productSku: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* STEP 2: Keyword Groups (Rank) */}
                <div className="optimizer-step-card">
                    <div className="step-header">
                        <div className="step-number">2</div>
                        <div>
                            <h2>Keyword Groups</h2>
                            <p className="text-muted">{rankKeywordGroups.length} group{rankKeywordGroups.length !== 1 ? 's' : ''} added</p>
                        </div>
                    </div>
                    <div className="settings-grid cb-block">
                        {/* Entry mode tabs */}
                        <div className="cb-entry-mode-tabs">
                            <button
                                className={`cb-entry-mode-tab${rankEntryMode === 'manual' ? ' active' : ''}`}
                                onClick={() => setRankEntryMode('manual')}
                            >
                                Manual Entry
                            </button>
                            <button
                                className={`cb-entry-mode-tab${rankEntryMode === 'bulk' ? ' active' : ''}`}
                                onClick={() => setRankEntryMode('bulk')}
                            >
                                Bulk Import
                            </button>
                        </div>

                        {rankEntryMode === 'manual' ? (
                            <div className="cb-keyword-group-card">
                                <h3>Add New Keyword Group</h3>

                                <div className="form-group group-full-width cb-mb-1-5">
                                    <label>Group Name <HelpTip text="A descriptive label for this keyword group (e.g., 'DOG BONE'). Used in campaign naming templates." /></label>
                                    <input
                                        className="cb-input"
                                        placeholder="e.g. DOG BONE"
                                        value={currentRankGroup.groupName}
                                        onChange={e => setCurrentRankGroup({ ...currentRankGroup, groupName: e.target.value })}
                                    />
                                </div>

                                <div className="form-group group-full-width cb-mb-1-5">
                                    <label>Keywords <HelpTip text="Enter all target keywords for this ranking group, one per line. These keywords will be used across all generated match types." /></label>
                                    <textarea
                                        className="cb-textarea"
                                        placeholder="Enter keywords, one per line (Example: dog bone, natural dog bone...)"
                                        value={currentRankGroup.keywords}
                                        onChange={e => setCurrentRankGroup({ ...currentRankGroup, keywords: e.target.value })}
                                    />
                                </div>

                                <div className="cb-two-col-grid cb-mb-1-5">
                                    <div className="form-group">
                                        <label>Budget ($) <HelpTip text="Daily budget allocated to campaigns in this keyword group." /></label>
                                        <input
                                            className="cb-input"
                                            type="number"
                                            step="0.01"
                                            min="1"
                                            value={currentRankGroup.budget}
                                            onChange={e => setCurrentRankGroup({ ...currentRankGroup, budget: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Starting Bid ($) <HelpTip text="Initial CPC bid for all keywords in this group. Adjust based on keyword competitiveness." /></label>
                                        <input
                                            className="cb-input"
                                            type="number"
                                            step="0.01"
                                            min="0.02"
                                            value={currentRankGroup.startingBid}
                                            onChange={e => setCurrentRankGroup({ ...currentRankGroup, startingBid: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group group-full-width cb-mb-1-5">
                                    <label>Placement Modifiers <HelpTip text="Percentage increase to bids for specific ad placements. Use higher values for Top of Search to maximize ranking impact." /></label>
                                    <div className="cb-three-col-grid">
                                        <div>
                                            <div className="cb-sub-label">Top of Search %</div>
                                            <input
                                                className="cb-input"
                                                type="number"
                                                min="0"
                                                max="900"
                                                value={currentRankGroup.topOfSearch}
                                                onChange={e => setCurrentRankGroup({ ...currentRankGroup, topOfSearch: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <div className="cb-sub-label">Rest of Search %</div>
                                            <input
                                                className="cb-input"
                                                type="number"
                                                min="0"
                                                max="900"
                                                value={currentRankGroup.restOfSearch}
                                                onChange={e => setCurrentRankGroup({ ...currentRankGroup, restOfSearch: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <div className="cb-sub-label">Product Pages %</div>
                                            <input
                                                className="cb-input"
                                                type="number"
                                                min="0"
                                                max="900"
                                                value={currentRankGroup.productPages}
                                                onChange={e => setCurrentRankGroup({ ...currentRankGroup, productPages: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group group-full-width cb-mb-1-5">
                                    <label>Bidding Strategy <HelpTip text="Controls how Amazon adjusts your bids. For ranking, 'Fixed bids' or 'Up and down' are typically most effective." /></label>
                                    <select
                                        className="cb-select"
                                        value={currentRankGroup.biddingStrategy}
                                        onChange={e => setCurrentRankGroup({ ...currentRankGroup, biddingStrategy: e.target.value })}
                                    >
                                        {BIDDING_STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>

                                <div className="form-group group-full-width cb-mb-2">
                                    <label>Negative Targets <HelpTip text="Exclude irrelevant search terms to protect your budget. Add terms that are unrelated to your product." /></label>
                                    <div className="cb-two-col-grid">
                                        <div>
                                            <div className="cb-sub-label">Negative Exact</div>
                                            <textarea
                                                className="cb-textarea cb-textarea-xs"
                                                placeholder="One per line"
                                                value={currentRankGroup.negativeExact}
                                                onChange={e => setCurrentRankGroup({ ...currentRankGroup, negativeExact: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <div className="cb-sub-label">Negative Phrase</div>
                                            <textarea
                                                className="cb-textarea cb-textarea-xs"
                                                placeholder="One per line"
                                                value={currentRankGroup.negativePhrase}
                                                onChange={e => setCurrentRankGroup({ ...currentRankGroup, negativePhrase: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className={`cb-add-group-btn${!canAddGroup ? ' cb-generate-locked' : ''}`}
                                    disabled={!canAddGroup}
                                    onClick={() => {
                                        const { _editIndex, ...groupData } = currentRankGroup;
                                        if (_editIndex !== undefined) {
                                            setRankKeywordGroups(prev => {
                                                const next = [...prev];
                                                next.splice(_editIndex, 0, groupData);
                                                return next;
                                            });
                                        } else {
                                            setRankKeywordGroups(prev => [...prev, groupData]);
                                        }
                                        setCurrentRankGroup(prev => ({ ...prev, groupName: '', keywords: '', negativeExact: '', negativePhrase: '', _editIndex: undefined }));
                                    }}
                                >
                                    <PlusCircle size={18} />
                                    {currentRankGroup._editIndex !== undefined ? 'Save Keyword Group' : 'Add Keyword Group'}
                                </button>
                            </div>
                        ) : (
                            <div className="cb-keyword-group-card">
                                <h3>Bulk Import Keyword Groups</h3>

                                {/* Step-by-step instructions */}
                                <div className="cb-bulk-instructions">
                                    <div className="cb-bulk-instructions-title">How to format your data:</div>
                                    <ol className="cb-bulk-steps">
                                        <li>
                                            <span className="cb-bulk-step-num">1</span>
                                            <span>Each row = one keyword. Two columns separated by a <strong>Tab (\t)</strong> key.</span>
                                        </li>
                                        <li>
                                            <span className="cb-bulk-step-num">2</span>
                                            <span>Column 1 = <strong>Group Name</strong> &nbsp;|&nbsp; Column 2 = <strong>Keyword</strong></span>
                                        </li>
                                        <li>
                                            <span className="cb-bulk-step-num">3</span>
                                            <span>Repeat the same group name on multiple rows to add multiple keywords to one group.</span>
                                        </li>
                                    </ol>
                                    <div className="cb-bulk-format-example">
                                        <div className="cb-bulk-format-header">
                                            <span>Group Name</span>
                                            <span className="cb-bulk-separator">→ TAB →</span>
                                            <span>Keyword</span>
                                        </div>
                                        <div className="cb-bulk-format-row">
                                            <span>dog bone</span>
                                            <span className="cb-bulk-separator">⇥</span>
                                            <span>natural dog bone</span>
                                        </div>
                                        <div className="cb-bulk-format-row">
                                            <span>dog bone</span>
                                            <span className="cb-bulk-separator">⇥</span>
                                            <span>organic dog chew</span>
                                        </div>
                                        <div className="cb-bulk-format-row">
                                            <span>dog toy</span>
                                            <span className="cb-bulk-separator">⇥</span>
                                            <span>rubber dog toy</span>
                                        </div>
                                    </div>
                                    <div className="cb-bulk-tip">💡 Tip: Copy directly from a spreadsheet — tabs are preserved automatically.</div>
                                </div>

                                <div className="form-group group-full-width cb-mb-1">
                                    <label>Paste Data <HelpTip text="Each row must be: Group Name [TAB] Keyword. Use the same group name on multiple rows to group several keywords together. You can copy this directly from Excel or Google Sheets." /></label>
                                    <textarea
                                        className="cb-textarea cb-textarea-bulk"
                                        placeholder={'dog bone\tnatural dog bone\ndog bone\torganic dog chew\ndog toy\trubber dog toy'}
                                        value={rankBulkData}
                                        onChange={e => setRankBulkData(e.target.value)}
                                    />
                                </div>

                                {/* Live parse preview */}
                                {rankBulkData.trim() && (() => {
                                    const lines = rankBulkData.trim().split('\n').filter(l => l.trim());
                                    const validRows = lines.filter(l => l.includes('\t'));
                                    const invalidRows = lines.filter(l => !l.includes('\t'));
                                    const groups = {};
                                    validRows.forEach(line => {
                                        const [g, ...kParts] = line.split('\t');
                                        const key = g.trim();
                                        if (key) {
                                            groups[key] = (groups[key] || 0) + 1;
                                        }
                                    });
                                    const groupCount = Object.keys(groups).length;
                                    return (
                                        <div className="cb-bulk-preview">
                                            {groupCount > 0 && (
                                                <div className="cb-bulk-preview-ok">
                                                    ✓ Ready to import: <strong>{groupCount} group{groupCount !== 1 ? 's' : ''}</strong> ({validRows.length} keyword{validRows.length !== 1 ? 's' : ''})
                                                </div>
                                            )}
                                            {invalidRows.length > 0 && (
                                                <div className="cb-bulk-preview-warn">
                                                    ⚠ {invalidRows.length} row{invalidRows.length !== 1 ? 's' : ''} missing a Tab separator and will be skipped
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="cb-bulk-defaults-info cb-mt-1">
                                    <div className="cb-bulk-defaults-title">Default Settings for Imported Groups:</div>
                                    <ul className="cb-bulk-defaults-list">
                                        <li>- Budget: $10.00 per day</li>
                                        <li>- Starting Bid: $1.00</li>
                                        <li>- Top of Search Modifier: 100%</li>
                                        <li>- Bidding Strategy: Dynamic bids - down only</li>
                                    </ul>
                                    <div className="cb-bulk-defaults-note">You can edit these settings after import</div>
                                </div>

                                <button
                                    className={`cb-add-group-btn cb-mt-1-25${!rankBulkData.trim() ? ' cb-generate-locked' : ''}`}
                                    disabled={!rankBulkData.trim()}
                                    onClick={() => {
                                        const lines = rankBulkData.trim().split('\n').filter(l => l.trim());
                                        const groups = {};
                                        lines.forEach(line => {
                                            const [groupName, ...kwParts] = line.split('\t');
                                            const key = (groupName || '').trim();
                                            if (!key || !line.includes('\t')) return;
                                            if (!groups[key]) groups[key] = [];
                                            const kw = kwParts.join('\t').trim();
                                            if (kw) groups[key].push(kw);
                                        });
                                        const imported = Object.entries(groups).map(([groupName, kws]) => ({
                                            ...currentRankGroup,
                                            groupName,
                                            keywords: kws.join('\n'),
                                            topOfSearch: '100'
                                        }));
                                        setRankKeywordGroups(prev => {
                                            const merged = [...prev];
                                            imported.forEach(imp => {
                                                const existIdx = merged.findIndex(g => g.groupName === imp.groupName);
                                                if (existIdx >= 0) {
                                                    const existing = merged[existIdx];
                                                    const existingKws = existing.keywords.split('\n').map(k => k.trim()).filter(Boolean);
                                                    const newKws = imp.keywords.split('\n').map(k => k.trim()).filter(Boolean);
                                                    const allKws = [...new Set([...existingKws, ...newKws])];
                                                    merged[existIdx] = { ...existing, keywords: allKws.join('\n') };
                                                } else {
                                                    merged.push(imp);
                                                }
                                            });
                                            return merged;
                                        });
                                        setRankBulkData('');
                                    }}
                                >
                                    <PlusCircle size={18} />
                                    Import Keyword Groups
                                </button>
                            </div>
                        )}

                        {/* Added groups list */}
                        {rankKeywordGroups.length > 0 && (
                            <div className="cb-added-groups">
                                <div className="cb-added-groups-header">Added Keyword Groups ({rankKeywordGroups.length})</div>
                                {rankKeywordGroups.map((group, i) => {
                                    const kwCount = group.keywords.split('\n').map(k => k.trim()).filter(Boolean).length;
                                    return (
                                        <div key={i} className="cb-added-group-card">
                                            <div className="cb-added-group-top">
                                                <span className="cb-added-group-name">{group.groupName || '(unnamed)'}</span>
                                                <div className="cb-added-group-actions">
                                                    <button
                                                        className="cb-group-edit-btn"
                                                        onClick={() => {
                                                            setCurrentRankGroup({ ...group, _editIndex: i });
                                                            setRankKeywordGroups(prev => prev.filter((_, idx) => idx !== i));
                                                            setRankEntryMode('manual');
                                                        }}
                                                    >Edit</button>
                                                    <button
                                                        className="cb-group-delete-btn"
                                                        onClick={() => setRankKeywordGroups(prev => prev.filter((_, idx) => idx !== i))}
                                                        title="Delete"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="cb-added-group-meta">Keywords ({kwCount}):</div>
                                            <div className="cb-added-group-preview">
                                                {group.keywords.split('\n').map(k => k.trim()).filter(Boolean).slice(0, 3).join(', ')}{kwCount > 3 ? ` +${kwCount - 3} more` : ''}
                                            </div>
                                            <div className="cb-added-group-will-generate">
                                                Will generate: {kwCount} Single Keyword campaign{kwCount !== 1 ? 's' : ''} + {kwCount} Broad Modifier campaign{kwCount !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div className="optimizer-step-card">
                    <div className="step-header">
                        <div className="step-number step-number--green">3</div>
                        <div>
                            <h2>Generate Campaigns</h2>
                            <p className="text-muted">{canGenerateRank ? 'Ready — click to generate your bulk upload file.' : 'Complete requirements below to unlock.'}</p>
                        </div>
                    </div>
                    <div className="settings-grid cb-block cb-pb-3">
                        {!canGenerateRank && (
                            <div className="cb-requirements-block">
                                <div className="cb-req-header">
                                    <AlertCircle size={15} />
                                    <span>Required to generate campaigns:</span>
                                </div>
                                <ul className="cb-req-list">
                                    <li className={rankDetails.productSku.trim() ? 'cb-req-done' : ''}>
                                        <span className="cb-req-check">{rankDetails.productSku.trim() ? '✓' : '○'}</span>
                                        Add SKU
                                    </li>
                                    <li className={rankKeywordGroups.length > 0 ? 'cb-req-done' : ''}>
                                        <span className="cb-req-check">{rankKeywordGroups.length > 0 ? '✓' : '○'}</span>
                                        Add at least one keyword group
                                    </li>
                                </ul>
                            </div>
                        )}
                        <button
                            className={`generate-btn${!canGenerateRank ? ' cb-generate-locked' : ''}`}
                            onClick={handleGenerateRank}
                            disabled={!canGenerateRank}
                        >
                            <Download size={24} />
                            Generate Rank Campaigns
                        </button>
                        <p className="text-muted text-center cb-mt-1 cb-small">
                            Downloads an XLSX file ready for Amazon Seller Central
                        </p>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="bidding-optimizer-page campaign-builder-page section">
            <div className="container">
                {/* Header Section */}
                <div className="optimizer-header text-center">
                    <div className="optimizer-icon-ring">
                        <Target size={40} color="var(--color-primary)" />
                    </div>
                    <h1>Amazon Campaign Builder</h1>
                    <p className="text-muted mx-auto cb-subtitle">
                        Create Amazon PPC campaigns efficiently. Generate a bulk upload file for standard or aggressive ranking campaigns.
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
                                    <li><strong>Bulk Builder:</strong> Creates dozens of campaigns from a list of SKUs & keywords in one click.</li>
                                    <li><strong>Match Types:</strong> Generates Exact, Phrase, Broad, Auto, Product & Brand targeting campaigns.</li>
                                    <li><strong>Search Isolation:</strong> Automatically adds negative keywords to keep match types clean.</li>
                                    <li><strong>Amazon-Ready:</strong> Outputs an XLSX file formatted for Seller Central bulk upload.</li>
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
                                    <li>Choose <strong>Standard</strong> (multi-SKU) or <strong>Rank</strong> (single-SKU ranking) mode.</li>
                                    <li>Enter your product SKUs and target keywords.</li>
                                    <li>Select campaign types & configure bids per match type.</li>
                                    <li>Set placement modifiers & bidding strategy.</li>
                                    <li>Click <strong>Generate</strong> and download the bulk upload file.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="optimizer-card-container">

                    {/* ─── Mode Switcher ────────────────────────────────────────── */}
                    <div className="cb-mode-switcher">
                        <button
                            className={`cb-mode-btn ${mode === 'standard' ? 'active' : ''}`}
                            onClick={() => setMode('standard')}
                        >
                            <span className="cb-mode-icon"></span>
                            <span className="cb-mode-label">Standard Campaign</span>
                            <span className="cb-mode-desc">Multi-SKU, all match types</span>
                        </button>
                        <button
                            className={`cb-mode-btn ${mode === 'rank' ? 'active' : ''}`}
                            onClick={() => setMode('rank')}
                        >
                            <span className="cb-mode-icon">`</span>
                            <span className="cb-mode-label">Rank Campaign</span>
                            <span className="cb-mode-desc">Single-SKU, keyword groups</span>
                        </button>
                    </div>

                    <div key={mode} className="cb-tab-panel">
                        {mode === 'standard' ? renderStandardCampaign() : renderRankCampaign()}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CampaignBuilder;
