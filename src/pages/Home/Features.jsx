import React from 'react';
import { Target, Zap, BarChart, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import './Features.css';

const Features = () => {
    const problems = [
        { text: "Expensive agencies charging $2k+ per month with slow turnarounds.", icon: <ShieldAlert className="problem-icon text-danger" /> },
        { text: "Generic listing images that don't highlight unique benefits.", icon: <ShieldAlert className="problem-icon text-danger" /> },
        { text: "No insights into what actually converts in your category.", icon: <ShieldAlert className="problem-icon text-danger" /> }
    ];

    const solutions = [
        {
            title: "Competitor Analysis driven by AI",
            description: "Our proprietary AI analyzes your top competitors using Keepa data to identify winning visual themes and keywords.",
            icon: <Target className="solution-icon text-primary" />
        },
        {
            title: "Smart Generation & Automation",
            description: "Create images optimized for your product category, not generic templates. Automate PPC bids 24/7.",
            icon: <Zap className="solution-icon text-primary" />
        },
        {
            title: "Instant Results Dashboard",
            description: "Chat with your Amazon data. Get a complete set of 7 listing images or 6 A+ modules in under 5 minutes.",
            icon: <BarChart className="solution-icon text-primary" />
        }
    ];

    const fadeUp = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
    };

    return (
        <section className="features section" id="features">
            <div className="container">
                <motion.div
                    className="features-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeUp}
                >
                    <h2 className="section-title">The Pain of Selling on Amazon</h2>
                    <p className="section-subtitle">We know what's holding your business back. Here is how we fix it.</p>
                </motion.div>

                <div className="features-grid">
                    {/* Problem Side */}
                    <motion.div
                        className="problem-box card-glass problem-glow"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeUp}
                    >
                        <h3 className="box-title text-danger">The Problem</h3>
                        <ul className="problem-list">
                            {problems.map((prob, idx) => (
                                <li key={idx} className="problem-item">
                                    {prob.icon}
                                    <span>{prob.text}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Solution Side */}
                    <motion.div
                        className="solution-wrapper"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                    >
                        {solutions.map((sol, idx) => (
                            <motion.div key={idx} className="solution-card" variants={fadeUp}>
                                <div className="solution-icon-wrap">{sol.icon}</div>
                                <div>
                                    <h4 className="solution-card-title">{sol.title}</h4>
                                    <p className="solution-card-desc">{sol.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Features;
