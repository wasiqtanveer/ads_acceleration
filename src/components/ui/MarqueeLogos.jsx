import React from 'react';
import './MarqueeLogos.css';

const MarqueeLogos = () => {
    const brands = ["ECOHOME", "VITA SUPPS", "TECHGEAR PRO", "AURA BEAUTY", "URBAN FIT", "NATURE'S WAY"];
    const repeatCount = 4; // Duplicate to fill width

    return (
        <div className="marquee-logos-container">
            <p className="marquee-logos-label">TRUSTED BY TOP SELLERS</p>
            <div className="marquee-logos-track-wrap">
                <div className="marquee-logos-track">
                    {[...Array(repeatCount)].map((_, i) => (
                        <React.Fragment key={i}>
                            {brands.map((brand, j) => (
                                <div key={`${i}-${j}`} className="marquee-logo-card">
                                    {brand}
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MarqueeLogos;
