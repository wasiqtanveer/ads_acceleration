import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight } from 'lucide-react';
import CountUpAnimation from '../../components/ui/CountUpAnimation';
import './Hero.css';

const Hero = () => {
    // Framer Motion variants for staggered text reveal
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.25, 1, 0.5, 1] }
        }
    };

    return (
        <section className="hero">

            <div className="container hero-container text-center">
                <motion.div
                    className="hero-content-centered"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* 
                    <motion.div variants={itemVariants} className="hero-badge-wrap">
                        <div className="hero-badge">
                            <span className="badge-pulse"></span>
                            The Standard in E-Commerce Growth
                        </div>
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="hero-title-massive">
                        Scale your brand with <br />
                        <span className="text-italic-serif">Ads Acceleration</span>
                    </motion.h1>

                    <motion.p variants={itemVariants} className="hero-subtitle-large">
                        We architect high-converting funnels, deploy AI-driven listing optimizations, and manage multi-million dollar ad spend. Built for elite Amazon sellers.
                    </motion.p>

                    <motion.div variants={itemVariants} className="hero-cta-centered">
                        <Link to="/pricing" className="btn btn-primary btn-pill btn-lg">
                            Start Free Trial <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                        </Link>
                        <p className="cta-subtext">No credit card required. Cancel anytime.</p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="hero-stats-row">
                        <div className="stat-block">
                            <span className="stat-number">
                                <CountUpAnimation targetNumber="14" suffix="+" duration={2.5} />
                            </span>
                            <span className="stat-label">Years Experience</span>
                        </div>
                        <div className="stat-block">
                            <span className="stat-number">
                                <CountUpAnimation targetNumber="100" prefix="$" suffix="M+" duration={2.5} />
                            </span>
                            <span className="stat-label">Ad Spend Managed</span>
                        </div>
                        <div className="stat-block">
                            <span className="stat-number">
                                <CountUpAnimation targetNumber="250" suffix="+" duration={2.5} />
                            </span>
                            <span className="stat-label">Brands Scaled</span>
                        </div>
                    </motion.div>
                    */}
                    
                    <motion.h1 variants={itemVariants} className="hero-title-massive" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
                        <span className="text-italic-serif">Coming Soon...</span>
                    </motion.h1>

                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
