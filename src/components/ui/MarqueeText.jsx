import React from 'react';
import './MarqueeText.css';

const MarqueeText = ({ text }) => {
    // Array to duplicate text enough times to ensure seamless looping
    const repeatCount = 10;

    return (
        <div className="marquee-text-container">
            <div className="marquee-text-track">
                {[...Array(repeatCount)].map((_, i) => (
                    <span key={i} className="marquee-text-item">
                        {text} <span className="marquee-dot">•</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default MarqueeText;
