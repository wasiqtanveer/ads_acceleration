import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Rocket, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('home');
    const { isDarkMode, toggleTheme } = useTheme();
    const location = useLocation();

    // ScrollSpy Logic
    useEffect(() => {
        const handleScroll = () => {
            // If we are not on the homepage, default to highlighting home (since it's the main SPA)
            // Ideally, we'd only run this heavily if we are actually on '/'
            if (window.location.hash !== '#/' && window.location.hash !== '') {
                return;
            }

            const sections = ['home', 'features', 'testimonials', 'faq'];
            let current = '';

            // Get viewport values
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;

            for (let i = 0; i < sections.length; i++) {
                const sectionMap = sections[i] === 'home' ? 'hero' : sections[i]; // 'home' links to 'hero' in DOM
                const element = sectionMap === 'hero'
                    ? document.querySelector('.hero')
                    : document.getElementById(sectionMap);

                if (element) {
                    const offsetTop = element.offsetTop;
                    const offsetHeight = element.offsetHeight;

                    // The "active" zone is when the section is taking up the top/middle of the screen
                    // We offset by 100px to account for the sticky navbar
                    if (scrollY >= offsetTop - 150 && scrollY < offsetTop + offsetHeight - 150) {
                        current = sections[i];
                        break;
                    }
                }
            }

            // If scrolled to the absolute top, force 'home'
            if (scrollY < 50) {
                current = 'home';
            }

            if (current && current !== activeSection) {
                setActiveSection(current);
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Fire once on mount
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeSection]);

    const scrollToSection = (e, id) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsOpen(false);
    };

    const handleHomeClick = (e) => {
        // If already on the homepage according to hash routing, scroll up.
        // HashRouter URLs look like `/#/`
        if (window.location.hash === '#/' || window.location.hash === '') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setIsOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="container navbar-container">
                <Link to="/" className="navbar-logo">
                    <Rocket className="logo-icon" size={28} />
                    <span>Ads <span className="logo-highlight">Acceleration</span></span>
                </Link>

                {/* Desktop Menu */}
                <div className="navbar-menu">
                    <Link to="/" onClick={handleHomeClick} className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}>
                        <span>Home</span>
                        {activeSection === 'home' && <motion.div layoutId="nav-indicator" className="nav-indicator" />}
                    </Link>
                    <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}>
                        <span>About</span>
                        {activeSection === 'features' && <motion.div layoutId="nav-indicator" className="nav-indicator" />}
                    </a>
                    <a href="#testimonials" onClick={(e) => scrollToSection(e, 'testimonials')} className={`nav-link ${activeSection === 'testimonials' ? 'active' : ''}`}>
                        <span>Testimonials</span>
                        {activeSection === 'testimonials' && <motion.div layoutId="nav-indicator" className="nav-indicator" />}
                    </a>
                    <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className={`nav-link ${activeSection === 'faq' ? 'active' : ''}`}>
                        <span>FAQ</span>
                        {activeSection === 'faq' && <motion.div layoutId="nav-indicator" className="nav-indicator" />}
                    </a>
                    {/* Tools Links moved to the right side of the main menu, with premium glowing animation */}
                    <div className="nav-divider"></div>
                    <Link to="/tools" className="nav-link nav-link-premium">Tools</Link>
                </div>

                {/* Auth Buttons & Theme Toggle */}
                <div className="navbar-auth">
                    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <Link to="/login" className="nav-link auth-link">Log In</Link>
                    <Link to="/signup" className="btn btn-primary">Sign Up</Link>
                </div>

                {/* Mobile Toggle */}
                <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="mobile-menu">
                    <Link to="/" className={`mobile-link ${activeSection === 'home' ? 'active' : ''}`} onClick={handleHomeClick}>Home</Link>
                    <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className={`mobile-link ${activeSection === 'features' ? 'active' : ''}`}>About</a>
                    <a href="#testimonials" onClick={(e) => scrollToSection(e, 'testimonials')} className={`mobile-link ${activeSection === 'testimonials' ? 'active' : ''}`}>Testimonials</a>
                    <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className={`mobile-link ${activeSection === 'faq' ? 'active' : ''}`}>FAQ</a>
                    <Link to="/tools" className="mobile-link nav-link-premium-mobile" onClick={() => setIsOpen(false)}>Tools</Link>
                    <div className="mobile-divider"></div>
                    <Link to="/login" className="mobile-link" onClick={() => setIsOpen(false)}>Log In</Link>
                    <Link to="/signup" className="mobile-link" onClick={() => setIsOpen(false)}>Sign Up</Link>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
