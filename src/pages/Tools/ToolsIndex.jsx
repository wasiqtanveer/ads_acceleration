import React from 'react';
import { Rocket } from 'lucide-react';

const ToolsIndex = () => {
    return (
        <div className="container section text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Rocket size={64} color="var(--color-primary)" style={{ marginBottom: '2rem' }} />
            <h1 style={{ marginBottom: '1rem' }}>AI Tools Dashboard</h1>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto 2rem' }}>
                This section is reserved for the scalable tools area. Here you will be able to access the AI Listing Image Generator, Competitor Analysis, and Automated PPC scripts.
            </p>
            <button className="btn btn-primary">Coming Soon</button>
        </div>
    );
};

export default ToolsIndex;
