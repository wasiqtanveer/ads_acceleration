import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Quote, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Testimonials.css';

import imgR1 from '../../assets/R1.webp';
import imgr2 from '../../assets/r2.webp';
import imgr3 from '../../assets/r3.webp';
import imgr7 from '../../assets/r7.webp';
import imgr51 from '../../assets/r51.webp';
import imgL1 from '../../assets/L1.webp';
import imgl2 from '../../assets/l2.webp';

const Testimonials = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFlipping, setIsFlipping] = useState(false);
    const containerRef = useRef(null);
    const flipTimeoutRef = useRef(null);

    // Reset flip state when changing slides
    useEffect(() => {
        setIsFlipped(false);
        setIsFlipping(false);
    }, [currentIndex]);

    useEffect(() => {
        return () => {
            if (flipTimeoutRef.current) {
                clearTimeout(flipTimeoutRef.current);
            }
        };
    }, []);

    const handleCardFlip = () => {
        setIsFlipping(true);
        setIsFlipped((prev) => !prev);

        if (flipTimeoutRef.current) {
            clearTimeout(flipTimeoutRef.current);
        }

        flipTimeoutRef.current = setTimeout(() => {
            setIsFlipping(false);
        }, 620);
    };

    const testimonials = [
        {
            name: "Sarah Jenkins",
            company: "EcoHome Goods",
            image: "https://i.pravatar.cc/150?img=47",
            quote: "Before Ads Acceleration, our ACoS was bleeding us dry at 45%. Within two months of them taking over and using their AI listing tools, our ACoS dropped to 18% and our organic rank for our main keyword went from page 3 to spot #2.",
            proof: imgR1
        },
        {
            name: "Marcus Thorne",
            company: "TechGear Pro",
            image: "https://i.pravatar.cc/150?img=11",
            quote: "The visual assets their AI generated for our product listings were unbelievable. It saved us thousands in photography fees, and our conversion rate literally doubled overnight. Best agency decision we've made.",
            proof: imgr2
        },
        {
            name: "Emily Chen",
            company: "VitaSupplements",
            image: "https://i.pravatar.cc/150?img=5",
            quote: "I was skeptical about moving away from our old agency, but the custom competitor insights Ads Acceleration provided exactly pinpointed why we were losing market share. We are now the #1 Best Seller in our subcategory.",
            proof: imgr3
        },
        {
            name: "David Ross",
            company: "Apex Outfitter",
            image: "https://i.pravatar.cc/150?img=15",
            quote: "Unbelievable ROI within the first 30 days! Their targeted PPC campaigns helped us lower our TACOS while scaling revenue by 300%. The team really knows the Amazon algorithm inside out.",
            proof: imgr7
        },
        {
            name: "Amanda Vega",
            company: "Lumiere Beauty",
            image: "https://i.pravatar.cc/150?img=32",
            quote: "We struggled to get visibility until we partnered with them. Not only did they fix our backend keywords, they practically took over our ad strategy and delivered mind-blowing growth. Highly recommend!",
            proof: imgr51
        },
        {
            name: "James L.",
            company: "ProFit Essentials",
            image: "https://i.pravatar.cc/150?img=60",
            quote: "Hands down the best investment for our brand. The transparency, the daily metric updates, and their relentless drive to drop our ACoS were exactly what we needed to dominate up seasonal sales.",
            proof: imgL1
        },
        {
            name: "Sophia Martinez",
            company: "Urban Pet Store",
            image: "https://i.pravatar.cc/150?img=43",
            quote: "Our margins have never been better. They identified wasted ad spend on day one. By month 3 we hit 7-figures in revenue while our ad spend stayed relatively flat. A true game changer.",
            proof: imgl2
        }
    ];

    const nextSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
        );
    };

    const prevSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
        );
    };

    const fadeUp = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    // Auto-play logic
    useEffect(() => {
        if (!isHovered) {
            const timer = setInterval(() => {
                nextSlide();
            }, 6000); // 6 seconds
            return () => clearInterval(timer);
        }
    }, [isHovered, currentIndex]);

    // Mouse Spotlight & 3D Tilt Tracker per Card
    const handleMouseMove = (e) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();

        // Spotlight coordinates
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 3D Tilt perspective math (max 5 degree tilt)
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // Pushing the right side (x > centerX) rotates positively on Y axis
        const tiltX = ((x - centerX) / centerX) * 5;
        // Pushing the bottom side (y > centerY) rotates negatively on X axis
        const tiltY = ((centerY - y) / centerY) * 5;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        card.style.setProperty('--tilt-x', `${tiltX}deg`);
        card.style.setProperty('--tilt-y', `${tiltY}deg`);
    };

    const handleMouseLeaveCard = (e) => {
        // Snap back to zero when mouse leaves card
        const card = e.currentTarget;
        card.style.setProperty('--tilt-x', `0deg`);
        card.style.setProperty('--tilt-y', `0deg`);
    };

    return (
        <section className="testimonials section" id="testimonials">
            {/* Ambient Background Marquee - Multi-track chaotic texture */}
            <div className="testimonials-bg-marquee">
                {/* Track 1: Fast, Left, Massive */}
                <div className="testimonials-bg-track track-1">
                    {[1, 2, 3].map((set) => (
                        <div key={set} className="testimonials-bg-content size-lg">
                            <span>BRAVO</span><span className="dot">•</span>
                            <span>SATISFIED</span><span className="dot">•</span>
                            <span>OUTSTANDING</span><span className="dot">•</span>
                        </div>
                    ))}
                </div>

                {/* Track 2: Slow, Right, Medium */}
                <div className="testimonials-bg-track track-2 reverse">
                    {[1, 2, 3].map((set) => (
                        <div key={set} className="testimonials-bg-content size-md">
                            <span>EXCEPTIONAL</span><span className="dot">•</span>
                            <span>GAME CHANGER</span><span className="dot">•</span>
                            <span>IMPRESSIVE</span><span className="dot">•</span>
                        </div>
                    ))}
                </div>

                {/* Track 3: Medium, Left, Small */}
                <div className="testimonials-bg-track track-3">
                    {[1, 2, 3].map((set) => (
                        <div key={set} className="testimonials-bg-content size-sm">
                            <span>ABSOLUTE MAGIC</span><span className="dot">•</span>
                            <span>FIVE STARS</span><span className="dot">•</span>
                            <span>HIGHLY RECOMMEND</span><span className="dot">•</span>
                            <span>INCREDIBLE ROI</span><span className="dot">•</span>
                        </div>
                    ))}
                </div>

                {/* Track 4: Very Slow, Right, Massive Hollow */}
                <div className="testimonials-bg-track track-4 reverse">
                    {[1, 2, 3].map((set) => (
                        <div key={set} className="testimonials-bg-content size-xl hollow">
                            <span>PROVEN</span><span className="dot">•</span>
                            <span>TRUSTED</span><span className="dot">•</span>
                            <span>RESULTS</span><span className="dot">•</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="container">
                <motion.div
                    className="testimonials-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeUp}
                >
                    <h2 className="section-title">Trusted by Top Sellers</h2>
                    <p className="section-subtitle">Don't just take our word for it. See what our clients have achieved.</p>
                </motion.div>

                <motion.div
                    className="carousel-container"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeUp}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <button className="carousel-btn prev" onClick={prevSlide}>
                        <ChevronLeft size={24} />
                    </button>

                    <div className="carousel-track-wrapper">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="carousel-slide"
                            >
                                <div
                                    className={`testimonial-card card-glass ${isFlipped ? 'is-flipped' : ''} ${isFlipping ? 'is-flipping' : ''}`}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeaveCard}
                                    onClick={handleCardFlip}
                                >
                                    <div className="card-face front-face">
                                        <div className="hover-flip-trigger">
                                            <RefreshCw size={18} className="flip-icon" />
                                            <span>Click to view proof</span>
                                        </div>
                                        <Quote className="quote-icon" size={40} />
                                        <p className="testimonial-text">"{testimonials[currentIndex].quote}"</p>
                                        <div className="testimonial-author">
                                            <img src={testimonials[currentIndex].image} alt={testimonials[currentIndex].name} className="author-img" />
                                            <div className="author-info">
                                                <h4 className="author-name">{testimonials[currentIndex].name}</h4>
                                                <span className="author-company">{testimonials[currentIndex].company}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-face back-face">
                                        <div className="hover-flip-trigger">
                                            <RefreshCw size={18} className="flip-icon" />
                                            <span>Click to go back</span>
                                        </div>
                                        <div className="proof-image-container">
                                            <img src={testimonials[currentIndex].proof} alt="Client Proof" className="proof-image" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <button className="carousel-btn next" onClick={nextSlide}>
                        <ChevronRight size={24} />
                    </button>
                </motion.div>

                <div className="carousel-dots">
                    {testimonials.map((_, index) => (
                        <button
                            key={index}
                            className={`dot ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(index)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
