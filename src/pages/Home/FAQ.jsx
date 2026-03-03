import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './FAQ.css';

const FAQItem = ({ question, answer, isOpen, onClick }) => {
    return (
        <motion.div
            className={`faq-item ${isOpen ? 'open' : ''}`}
            initial={false}
            animate={{ backgroundColor: isOpen ? "rgba(255,255,255,0.05)" : "var(--color-bg-card)" }}
            transition={{ duration: 0.3 }}
        >
            <button className="faq-question" onClick={onClick}>
                <span>{question}</span>
                {isOpen ? <ChevronUp className="faq-icon text-primary" /> : <ChevronDown className="faq-icon" />}
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                        <div className="faq-answer-container">
                            <p className="faq-answer">{answer}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(0);

    const faqs = [
        {
            question: "How is this different from other Amazon agencies?",
            answer: "We don't just rely on human intuition. Our proprietary AI analyzes millions of data points across your competitors to find exactly what works. We combine this tech advantage with deep human expertise for unbeatable results."
        },
        {
            question: "How long until I see results?",
            answer: "While SEO takes time, our AI listing optimizations and PPC adjustments often show measurable improvements in Conversion Rate (CVR) and ACoS within the first 14-30 days."
        },
        {
            question: "Can I just use the AI tools without the agency service?",
            answer: "Yes! You can sign up for our Pro plan to access our AI Image Generator, Listing Builder, and Competitor Insights dashboard to manage everything yourself."
        },
        {
            question: "Are the listing images completely AI generated?",
            answer: "We use a hybrid approach. You upload basic photos of your product, and our AI places them into highly converting lifestyle scenes, adds professional infographics, and applies psychological conversion triggers based on top-competitor data."
        }
    ];

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    const containerHover = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
    };

    return (
        <section className="faq section" id="faq">
            <div className="container">
                <motion.div
                    className="faq-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeUp}
                >
                    <h2 className="section-title">Frequently Asked Questions</h2>
                    <p className="section-subtitle">Everything you need to know about Ads Acceleration.</p>
                </motion.div>

                <motion.div
                    className="faq-list"
                    variants={containerHover}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    {faqs.map((faq, index) => (
                        <motion.div key={index} variants={fadeUp}>
                            <FAQItem
                                question={faq.question}
                                answer={faq.answer}
                                isOpen={openIndex === index}
                                onClick={() => setOpenIndex(index === openIndex ? -1 : index)}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default FAQ;
