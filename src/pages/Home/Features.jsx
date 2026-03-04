import React from 'react';
import { Target, Zap, BarChart, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import './Features.css';

const Features = () => {
    const problems = [
        { title: "Expensive Agencies", text: "Charging $2k+ per month with slow turnarounds and zero transparency.", icon: <ShieldAlert size={24} className="text-danger" /> },
        { title: "Generic Listings", text: "Basic stock images that fail to highlight unique benefits or stop the scroll.", icon: <ShieldAlert size={24} className="text-danger" /> },
        { title: "Blind Strategy", text: "No actionable insights into what actually converts in your specific category.", icon: <ShieldAlert size={24} className="text-danger" /> }
    ];

    const solutions = [
        { title: "AI Competitor Analysis", text: "Proprietary AI analyzes Keepa data to identify winning visual themes.", icon: <Target size={24} className="text-primary" /> },
        { title: "Smart Generation", text: "Create highly-optimized images targeting your exact demographic.", icon: <Zap size={24} className="text-primary" /> },
        { title: "Instant Dashboards", text: "Get a complete set of 7 listing images in under 5 minutes.", icon: <BarChart size={24} className="text-primary" /> }
    ];

    const fadeLeft = {
        hidden: { opacity: 0, x: -50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const fadeRight = {
        hidden: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
    };

    const itemFade = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <section className="features section" id="features">
            <div className="container">
                <div className="features-header">
                    <motion.h2
                        className="section-title"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        The Evolution of Amazon Growth
                    </motion.h2>
                    <motion.p
                        className="section-subtitle"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        We know what's holding your business back. Stop playing by the old rules.
                    </motion.p>
                </div>

                <div className="split-screen-container">

                    {/* The Old Way (Left Side) */}
                    <motion.div
                        className="split-side pain-side"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeLeft}
                    >
                        <div className="side-header">
                            <h3 className="side-title text-danger">The Old Way</h3>
                            <p className="side-desc">Slow, expensive, and completely reactive.</p>
                        </div>

                        <motion.div className="split-cards-wrapper" variants={staggerContainer}>
                            {problems.map((prob, idx) => (
                                <motion.div key={idx} className="premium-card pain-card" variants={itemFade}>
                                    <div className="card-icon-wrap pain-icon-wrap">{prob.icon}</div>
                                    <div className="card-content">
                                        <h4 className="card-title">{prob.title}</h4>
                                        <p className="card-text">{prob.text}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* The Divider Element */}
                    <div className="split-divider">
                        <div className="divider-line"></div>
                    </div>

                    {/* Ads Acceleration (Right Side) */}
                    <motion.div
                        className="split-side solution-side"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeRight}
                    >
                        <div className="side-header">
                            <h3 className="side-title text-primary">Ads Acceleration</h3>
                            <p className="side-desc">Data-driven, AI-powered, and ruthlessly efficient.</p>
                        </div>

                        <motion.div className="split-cards-wrapper" variants={staggerContainer}>
                            {solutions.map((sol, idx) => (
                                <motion.div key={idx} className="premium-card solution-card" variants={itemFade}>
                                    <div className="card-icon-wrap solution-icon-wrap">{sol.icon}</div>
                                    <div className="card-content">
                                        <h4 className="card-title">{sol.title}</h4>
                                        <p className="card-text">{sol.text}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default Features;
