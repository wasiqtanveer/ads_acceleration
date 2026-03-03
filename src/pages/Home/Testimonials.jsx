import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Testimonials.css';

const Testimonials = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef(null);

    const testimonials = [
        {
            name: "Sarah Jenkins",
            company: "EcoHome Goods",
            image: "https://i.pravatar.cc/150?img=47",
            quote: "Before Ads Acceleration, our ACoS was bleeding us dry at 45%. Within two months of them taking over and using their AI listing tools, our ACoS dropped to 18% and our organic rank for our main keyword went from page 3 to spot #2."
        },
        {
            name: "Marcus Thorne",
            company: "TechGear Pro",
            image: "https://i.pravatar.cc/150?img=11",
            quote: "The visual assets their AI generated for our product listings were unbelievable. It saved us thousands in photography fees, and our conversion rate literally doubled overnight. Best agency decision we've made."
        },
        {
            name: "Emily Chen",
            company: "VitaSupplements",
            image: "https://i.pravatar.cc/150?img=5",
            quote: "I was skeptical about moving away from our old agency, but the custom competitor insights Ads Acceleration provided exactly pinpointed why we were losing market share. We are now the #1 Best Seller in our subcategory."
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
                                    className="testimonial-card card-glass"
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeaveCard}
                                >
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
