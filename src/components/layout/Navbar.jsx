import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Rocket, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { isDarkMode, toggleTheme } = useTheme();

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
                    <Link to="/" className="nav-link" onClick={handleHomeClick}>Home</Link>
                    <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="nav-link">About</a>
                    <Link to="/tools" className="nav-link nav-link-highlight">Tools</Link>
                    <a href="#testimonials" onClick={(e) => scrollToSection(e, 'testimonials')} className="nav-link">Testimonials</a>
                    <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="nav-link">FAQ</a>
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
                    <Link to="/" className="mobile-link" onClick={handleHomeClick}>Home</Link>
                    <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="mobile-link">About</a>
                    <Link to="/tools" className="mobile-link nav-link-highlight-mobile" onClick={() => setIsOpen(false)}>Tools</Link>
                    <a href="#testimonials" onClick={(e) => scrollToSection(e, 'testimonials')} className="mobile-link">Testimonials</a>
                    <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="mobile-link">FAQ</a>
                    <Link to="/login" className="mobile-link" onClick={() => setIsOpen(false)}>Log In</Link>
                    <Link to="/signup" className="mobile-link" onClick={() => setIsOpen(false)}>Sign Up</Link>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
