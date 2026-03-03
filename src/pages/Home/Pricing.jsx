import React from 'react';
import { Check, X } from 'lucide-react';
import './Pricing.css';

const Pricing = () => {
    const plans = [
        {
            name: "Pay As You Go",
            price: "$0",
            description: "Perfect for testing the waters and generating single images.",
            features: [
                { text: "7 AI Listing Images", included: true },
                { text: "Basic Competitor Analysis", included: true },
                { text: "Standard Support", included: true },
                { text: "Automated PPC Management", included: false },
                { text: "Unlimited AI Generation", included: false }
            ],
            ctaText: "Get Started Free",
            isPopular: false
        },
        {
            name: "Pro",
            price: "$99",
            period: "/month",
            description: "Everything you need to scale your Amazon business to the next level.",
            features: [
                { text: "Unlimited AI Images & A+", included: true },
                { text: "Deep Keepa Competitor Insights", included: true },
                { text: "Automated PPC Management up to $10k/mo", included: true },
                { text: "Priority 24/7 Support", included: true },
                { text: "Dedicated Account Manager", included: false }
            ],
            ctaText: "Start Pro Trial",
            isPopular: true
        },
        {
            name: "Team (Agency)",
            price: "$299",
            period: "/month",
            description: "Built for agencies managing multiple client accounts and large catalogs.",
            features: [
                { text: "Everything in Pro", included: true },
                { text: "Unlimited PPC Management", included: true },
                { text: "API Access & Webhooks", included: true },
                { text: "Dedicated Account Manager", included: true },
                { text: "White-label Client Dashboard", included: true }
            ],
            ctaText: "Contact Sales",
            isPopular: false
        }
    ];

    return (
        <section className="pricing section" id="pricing">
            <div className="container">
                <div className="pricing-header text-center">
                    <h2 className="section-title">Transparent, Scalable Pricing</h2>
                    <p className="section-subtitle">Lock in your price forever. No hidden fees. Cancel anytime.</p>
                </div>

                <div className="pricing-grid">
                    {plans.map((plan, index) => (
                        <div key={index} className={`pricing-card ${plan.isPopular ? 'popular' : ''}`}>
                            {plan.isPopular && <div className="popular-badge">Most Popular</div>}

                            <div className="pricing-card-header">
                                <h3 className="plan-name">{plan.name}</h3>
                                <p className="plan-desc">{plan.description}</p>
                                <div className="plan-price-wrap">
                                    <span className="plan-price">{plan.price}</span>
                                    {plan.period && <span className="plan-period">{plan.period}</span>}
                                </div>
                            </div>

                            <div className="pricing-card-body">
                                <ul className="plan-features">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className={`feature-item ${!feature.included ? 'disabled' : ''}`}>
                                            {feature.included ? (
                                                <Check size={18} className="feature-icon check" />
                                            ) : (
                                                <X size={18} className="feature-icon x" />
                                            )}
                                            <span>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pricing-card-footer">
                                <button className={`btn w-100 ${plan.isPopular ? 'btn-primary' : 'btn-outline'}`}>
                                    {plan.ctaText}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
