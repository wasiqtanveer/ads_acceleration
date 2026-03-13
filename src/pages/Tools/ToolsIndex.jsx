import React from 'react';
import { Rocket, Calculator, Image as ImageIcon, LineChart, Target, Search, ListFilter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ToolsIndex.css';

const toolsList = [
    {
        id: 'campaign-builder',
        title: 'Campaign Builder',
        description: 'Auto-generate bulk upload files for Amazon Sponsored Products campaigns.',
        icon: <Target size={32} color="white" />,
        path: '/tools/campaign-builder',
        badge: 'New',
        isReady: true
    },
    {
        id: 'bidding-optimizer',
        title: 'Bidding Optimizer',
        description: 'Auto-adjust keyword bids using smart Inch Up and RPC targeting to maximize PPC profitability.',
        icon: <Calculator size={32} color="white" />,
        path: '/tools/bidding-optimizer',
        badge: 'New',
        isReady: false
    },
    {
        id: 'ngram-analyzer',
        title: 'N-Gram Analyzer',
        description: 'Discover hidden word patterns in your search terms that drive spend, sales, and wasted ad budget.',
        icon: <Search size={32} color="white" />,
        path: '/tools/ngram-analyzer',
        badge: 'New',
        isReady: true
    },
    {
        id: 'missing-opportunity-generator',
        title: 'Missing Opportunity Sheet Generator',
        description: 'Find converting search terms not yet targeted as keywords and export both opportunity and Amazon bulk sheets.',
        icon: <ListFilter size={32} color="white" />,
        path: '/tools/missing-opportunity-generator',
        badge: 'New',
        isReady: false
    },
    {
        id: 'ai-listing',
        title: 'AI Listing Generator',
        description: 'Generate stunning, conversion-optimized Amazon product images instantly using AI.',
        icon: <ImageIcon size={32} color="white" />,
        path: '#',
        badge: null,
        isReady: false
    },
    {
        id: 'competitor-analysis',
        title: 'Competitor Tracker',
        description: 'Monitor competitor pricing, reviews, and rank changes to stay one step ahead.',
        icon: <LineChart size={32} color="white" />,
        path: '#',
        badge: null,
        isReady: false
    }
];

const ToolsIndex = () => {
    const navigate = useNavigate();

    return (
        <section className="tools-dashboard container section">
            <div className="tools-header text-center">
                <Rocket size={48} color="var(--color-primary)" className="tools-header-icon" />
                <h1>Seller AI Tools</h1>
                <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    Access our suite of proprietary tools designed specifically to give Amazon sellers an unfair competitive advantage.
                </p>
            </div>

            <div className="tools-grid">
                {toolsList.map((tool) => (
                    <div className={`tool-card ${!tool.isReady ? 'disabled' : ''}`} key={tool.id}>
                        {tool.badge && <span className="tool-badge">{tool.badge}</span>}
                        <div className="tool-icon-wrapper">
                            {tool.icon}
                        </div>
                        <h3>{tool.title}</h3>
                        <p className="text-muted">{tool.description}</p>

                        <button
                            className={`btn ${tool.isReady ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => tool.isReady && navigate(tool.path)}
                            disabled={!tool.isReady}
                        >
                            {tool.isReady ? 'Open Tool' : 'Coming Soon'}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ToolsIndex;
