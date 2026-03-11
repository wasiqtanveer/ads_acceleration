import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, User, ArrowRight, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import useRegistration from '../../context/useRegistration';
import './RegistrationModal.css';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit:   { opacity: 0, transition: { duration: 0.2 } },
};

const cardVariants = {
    hidden:  { opacity: 0, scale: 0.9, y: 40 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
    exit:    { opacity: 0, scale: 0.94, y: 20, transition: { duration: 0.22, ease: 'easeIn' } },
};

const fieldVariants = {
    hidden:  { opacity: 0, y: 12 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.3, ease: 'easeOut' } }),
};

const termsCardVariants = {
    hidden:  { opacity: 0, scale: 0.96, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    exit:    { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18 } },
};

/**
 * RegistrationModal
 *
 * Props:
 *   isOpen    — boolean, controls visibility
 *   onClose   — called when user dismisses without registering
 *   onSuccess — called after successful registration
 *   toolSlug  — passed to Google Sheets so you know which tool triggered it
 */
const RegistrationModal = ({ isOpen, onClose, onSuccess, toolSlug = 'tool-popup' }) => {
    const { markRegistered } = useRegistration();

    const [firstName, setFirstName]       = useState('');
    const [lastName, setLastName]         = useState('');
    const [email, setEmail]               = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading]       = useState(false);
    const [isTermsOpen, setIsTermsOpen]   = useState(false);

    const reset = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setAcceptedTerms(false);
        setErrorMessage('');
        setIsLoading(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!firstName.trim()) { setErrorMessage('Please enter your first name.'); return; }
        if (!lastName.trim())  { setErrorMessage('Please enter your last name.');  return; }
        if (!email.trim())     { setErrorMessage('Please enter your email address.'); return; }
        if (!isValidEmail(email)) { setErrorMessage('Please enter a valid email address.'); return; }
        if (!acceptedTerms)    { setErrorMessage('You must accept the Terms and Conditions.'); return; }

        setIsLoading(true);
        try {
            await markRegistered(firstName.trim(), lastName.trim(), email.trim(), toolSlug);
            reset();
            onSuccess(); // close modal + run the action
        } catch {
            setIsLoading(false);
            setErrorMessage('Something went wrong. Please try again.');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="reg-modal-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={handleClose}
                >
                    <motion.div
                        className="reg-modal-card"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close */}
                        <button className="reg-modal-close" onClick={handleClose} aria-label="Close">
                            <X size={20} />
                        </button>

                        {/* Icon */}
                        <div className="reg-modal-icon-ring">
                            <Lock size={24} />
                        </div>

                        {/* Headlines */}
                        <h2 className="reg-modal-headline">Get Free Access</h2>
                        <p className="reg-modal-sub">
                            Enter your details to unlock this tool — free, forever.
                        </p>

                        {/* Form */}
                        <form className="reg-modal-form" onSubmit={handleSubmit} noValidate>

                            {/* Name row */}
                            <motion.div className="reg-name-row"
                                custom={0} variants={fieldVariants} initial="hidden" animate="visible">
                                <div className="reg-input-wrapper">
                                    <User className="reg-input-icon" size={16} />
                                    <input
                                        type="text"
                                        className={`reg-input ${errorMessage && !firstName.trim() ? 'error' : ''}`}
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={isLoading}
                                        autoFocus
                                    />
                                </div>
                                <div className="reg-input-wrapper">
                                    <User className="reg-input-icon" size={16} />
                                    <input
                                        type="text"
                                        className={`reg-input ${errorMessage && !lastName.trim() ? 'error' : ''}`}
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </motion.div>

                            {/* Email */}
                            <motion.div className="reg-input-wrapper"
                                custom={1} variants={fieldVariants} initial="hidden" animate="visible">
                                <Mail className="reg-input-icon" size={16} />
                                <input
                                    type="email"
                                    className={`reg-input ${errorMessage && !isValidEmail(email) ? 'error' : ''}`}
                                    placeholder="Work email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="email"
                                />
                            </motion.div>

                            {/* Terms checkbox */}
                            <motion.div className="reg-checkbox-wrapper"
                                custom={2} variants={fieldVariants} initial="hidden" animate="visible">
                                <label className="reg-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        disabled={isLoading}
                                    />
                                    <span className="reg-checkbox-custom" />
                                    I accept the{' '}
                                    <button
                                        type="button"
                                        className="reg-terms-link"
                                        onClick={() => setIsTermsOpen(true)}
                                    >
                                        Terms and Conditions
                                    </button>
                                </label>
                            </motion.div>

                            {/* Error */}
                            <AnimatePresence>
                                {errorMessage && (
                                    <motion.div
                                        className="reg-modal-error"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                    >
                                        <AlertCircle size={14} />
                                        {errorMessage}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit */}
                            <button type="submit" className="reg-submit-btn" disabled={isLoading}>
                                {isLoading ? (
                                    <><span className="reg-spinner" /> Submitting...</>
                                ) : (
                                    <>Get Free Access <ArrowRight size={17} /></>
                                )}
                            </button>
                        </form>

                        {/* Trust */}
                        <div className="reg-modal-trust">
                            <ShieldCheck size={13} />
                            No spam. Unsubscribe anytime.
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Terms & Conditions sub-modal */}
            {isTermsOpen && (
                <motion.div
                    className="reg-terms-modal-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={() => setIsTermsOpen(false)}
                >
                    <motion.div
                        className="reg-terms-modal-content"
                        variants={termsCardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="reg-terms-modal-close" onClick={() => setIsTermsOpen(false)} aria-label="Close Terms">
                            <X size={20} />
                        </button>
                        <h2>Terms and Conditions</h2>
                        <div className="reg-terms-modal-scroll">
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
                        <div className="reg-terms-modal-footer">
                            <button className="btn btn-primary" onClick={() => {
                                setAcceptedTerms(true);
                                setIsTermsOpen(false);
                            }}>I Accept</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RegistrationModal;
