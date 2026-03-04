import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Mail, User, ArrowRight, CheckCircle, ShieldCheck, AlertCircle, X } from 'lucide-react';
import useLeadForm from './useLeadForm';
import './LeadCapturePage.css';

// ─── Tool Content Registry ────────────────────────────────────────────────────
// Add new tools here. Each slug maps to the content shown on the page.
const TOOL_REGISTRY = {
    'free-tool': {
        badge: '🚀 Free Access — Limited Time',
        headline: (
            <>
                Stop Guessing. Start <span className="highlight-yellow">Winning</span> on Amazon.
            </>
        ),
        subText:
            'Our AI-powered Competitor Analysis Tool reveals exactly what your top competitors are doing right — keywords, visual themes, and pricing gaps — so you can outrank them, not chase them.',
        ctaLabel: 'Get Free Access',
        toolUrl: '', // Leave empty to show "No free tool available yet"
        successMessage: "You're in! Your private access link is on its way to your inbox.",
    },
};

const DEFAULT_TOOL = TOOL_REGISTRY['free-tool'];

// ─── Animations ──────────────────────────────────────────────────────────────
const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeIn' } },
};

const successVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut', delay: 0.1 } },
};

// ─── Component ────────────────────────────────────────────────────────────────
const LeadCapturePage = () => {
    const { toolSlug } = useParams();
    const tool = TOOL_REGISTRY[toolSlug] || DEFAULT_TOOL;

    // Form hook states
    const {
        firstName, setFirstName,
        lastName, setLastName,
        email, setEmail,
        acceptedTerms, setAcceptedTerms,
        status, errorMessage, handleSubmit, reset
    } = useLeadForm(toolSlug);

    // Local state for Terms & Conditions Modal
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    const isLoading = status === 'loading';
    const isSuccess = status === 'success';

    return (
        <div className="lead-page">
            {/* Minimal Header — logo only */}
            <header className="lead-header">
                <Link to="/" className="lead-logo">
                    <Rocket className="lead-logo-icon" size={24} />
                    <span>Ads <span className="lead-logo-highlight">Acceleration</span></span>
                </Link>
            </header>

            {/* Main content */}
            <main className="lead-main">
                <AnimatePresence mode="wait">
                    {!isSuccess ? (
                        /* ── FORM STATE ── */
                        <motion.div
                            key="form"
                            className="lead-card"
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            {/* Badge */}
                            <div className="lead-badge">
                                {tool.badge}
                            </div>

                            {/* Headline */}
                            <h1 className="lead-headline">
                                {tool.headline}
                            </h1>

                            {/* Supporting copy */}
                            <p className="lead-sub">{tool.subText}</p>

                            {/* Email Form */}
                            <form className="lead-form" onSubmit={handleSubmit} noValidate>

                                {/* Name Row */}
                                <div className="lead-name-row">
                                    <div className="lead-input-wrapper">
                                        <User className="lead-input-icon" size={18} />
                                        <input
                                            type="text"
                                            className={`lead-input ${errorMessage && !firstName.trim() ? 'error' : ''}`}
                                            placeholder="First Name"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="lead-input-wrapper">
                                        <User className="lead-input-icon" size={18} />
                                        <input
                                            type="text"
                                            className={`lead-input ${errorMessage && !lastName.trim() ? 'error' : ''}`}
                                            placeholder="Last Name"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                {/* Email Row */}
                                <div className="lead-input-wrapper">
                                    <Mail className="lead-input-icon" size={18} />
                                    <input
                                        type="email"
                                        className={`lead-input ${errorMessage && email.includes('@') === false ? 'error' : ''}`}
                                        placeholder="Enter your work email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                        aria-label="Email address"
                                        autoComplete="email"
                                    />
                                </div>

                                {/* Terms Checkbox */}
                                <div className="lead-checkbox-wrapper">
                                    <label className="lead-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                            disabled={isLoading}
                                        />
                                        <span className="lead-checkbox-custom"></span>
                                        I accept the <button type="button" className="lead-terms-link" onClick={() => setIsTermsOpen(true)}>Terms and Conditions</button>
                                    </label>
                                </div>

                                {/* Inline error */}
                                {errorMessage && (
                                    <motion.div
                                        className="lead-error"
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <AlertCircle size={14} />
                                        {errorMessage}
                                    </motion.div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    className="lead-submit-btn"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="lead-spinner" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            {tool.ctaLabel}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Trust signal */}
                            <div className="lead-trust">
                                <ShieldCheck size={14} />
                                No spam. Unsubscribe anytime.
                            </div>
                        </motion.div>
                    ) : (
                        /* ── SUCCESS STATE ── */
                        <motion.div
                            key="success"
                            className="lead-card"
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <motion.div
                                className="lead-success"
                                variants={successVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {/* Success icon */}
                                <div className="success-icon-ring">
                                    <CheckCircle size={40} />
                                </div>

                                <h2>You're all set! 🎉</h2>

                                <p>{tool.successMessage}</p>

                                {/* Primary CTA — goto the tool */}
                                {tool.toolUrl ? (
                                    <a href={tool.toolUrl} target="_blank" rel="noopener noreferrer" className="lead-success-btn">
                                        Go to the Tool <ArrowRight size={16} />
                                    </a>
                                ) : (
                                    <div className="lead-success-btn disabled">
                                        No free tool available yet
                                    </div>
                                )}

                                {/* Secondary — let them go back and re-enter email */}
                                <button className="lead-success-back" onClick={reset}>
                                    Use a different email
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Minimal Footer */}
            <footer className="lead-footer">
                © {new Date().getFullYear()} Ads Acceleration. All rights reserved.
            </footer>
            {/* Terms and Conditions Modal */}
            <AnimatePresence>
                {isTermsOpen && (
                    <motion.div
                        className="lead-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsTermsOpen(false)}
                    >
                        <motion.div
                            className="lead-modal-content"
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()} // Prevent clicking inside from closing
                        >
                            <button className="lead-modal-close" onClick={() => setIsTermsOpen(false)}>
                                <X size={24} />
                            </button>
                            <h2>Terms and Conditions</h2>
                            <div className="lead-modal-scroll">
                                <p><strong>1. Acceptance of Terms</strong><br />
                                    By accessing our tools, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.</p>

                                <p><strong>2. Use License</strong><br />
                                    Permission is granted to temporarily download one copy of the materials (information or software) on Ads Acceleration's website for personal, non-commercial transitory viewing only.</p>

                                <p><strong>3. Disclaimer</strong><br />
                                    The materials on Ads Acceleration's website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability.</p>

                                <p><strong>4. Limitations</strong><br />
                                    In no event shall Ads Acceleration or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Ads Acceleration's website.</p>

                                <p><strong>5. Privacy Data</strong><br />
                                    By submitting your email address and name, you agree that we may contact you regarding our services and products. We will never sell your data to third parties. You may unsubscribe at any time.</p>
                            </div>
                            <div className="lead-modal-footer">
                                <button className="btn btn-primary" onClick={() => {
                                    setAcceptedTerms(true);
                                    setIsTermsOpen(false);
                                }}>I Accept</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LeadCapturePage;
