# Amazon Agency Project Context

This document contains the source code and configuration for the Amazon Agency React application.

## File: package.json
```json
{
  "name": "amazon-agency",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "deploy": "gh-pages -d dist"
  },
  "dependencies": {
    "framer-motion": "^12.34.5",
    "lucide-react": "^0.576.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.13.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "gh-pages": "^6.3.0",
    "globals": "^16.5.0",
    "vite": "^7.3.1"
  }
}

```

## File: src\App.css
```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

## File: src\App.jsx
```javascript
import React from 'react';
import { HashRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CustomCursor from './components/layout/CustomCursor';
import Home from './pages/Home/Home';
import ToolsIndex from './pages/Tools/ToolsIndex';
import BiddingOptimizer from './pages/Tools/BiddingOptimizer';
import Login from './pages/Auth/Login';
import Pricing from './pages/Home/Pricing';
import LeadCapturePage from './pages/Lead/LeadCapturePage';

// Dummy imports for other links
const Signup = () => <div className="container section text-center" style={{ minHeight: '50vh', paddingTop: '10vh' }}><h1>Sign Up</h1><p style={{ color: 'var(--color-primary)' }}>Coming Soon</p></div>;

/**
 * MainLayout — Wraps the main website pages with Navbar + Footer.
 * Standalone pages (like lead capture) are placed OUTSIDE this layout
 * so they render without navigation chrome.
 */
const MainLayout = () => (
  <>
    <Navbar />
    <main>
      <Outlet />
    </main>
    <Footer />
  </>
);

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <CustomCursor />
        <Routes>
          {/* ── Main site pages (with Navbar + Footer) ── */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/tools" element={<ToolsIndex />} />
            <Route path="/tools/bidding-optimizer" element={<BiddingOptimizer />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/faq" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* ── Standalone pages (NO Navbar/Footer) ── */}
          {/* Access via: /#/lead/free-tool  */}
          {/* Add new lead magnets by registering new slugs in LeadCapturePage's TOOL_REGISTRY */}
          <Route path="/lead/:toolSlug" element={<LeadCapturePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

```

## File: src\components\layout\CustomCursor.css
```css
/* Hide default cursor only when the custom cursor is active */
body.custom-cursor-active,
body.custom-cursor-active a,
body.custom-cursor-active button {
    cursor: none !important;
}

.custom-cursor {
    position: fixed;
    top: 0;
    left: 0;
    width: 12px;
    height: 12px;
    background-color: var(--color-primary);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 99999;
    transition: width 0.3s ease, height 0.3s ease, background-color 0.3s ease, border-radius 0.3s ease, mix-blend-mode 0.3s ease;
    will-change: transform, width, height;
}

.custom-cursor.hover {
    width: 45px;
    height: 45px;
    background-color: rgba(255, 204, 0, 0.2);
    border: 2px solid var(--color-primary);
    /* Optional: use mix-blend-mode for a cool inversion effect on text */
    mix-blend-mode: difference;
}
```

## File: src\components\layout\CustomCursor.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './CustomCursor.css';

const CustomCursor = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const location = useLocation();

    // Only active on the root landing page
    const isLandingPage = location.pathname === '/';

    useEffect(() => {
        if (!isLandingPage) {
            document.body.classList.remove('custom-cursor-active');
            return;
        }

        document.body.classList.add('custom-cursor-active');

        const updatePosition = (e) => {
            setPosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseOver = (e) => {
            const target = e.target;
            // Check if hovering over a clickable element
            if (
                target.tagName.toLowerCase() === 'button' ||
                target.tagName.toLowerCase() === 'a' ||
                target.closest('button') ||
                target.closest('a') ||
                target.classList.contains('clickable')
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', updatePosition);
        window.addEventListener('mouseover', handleMouseOver);

        return () => {
            window.removeEventListener('mousemove', updatePosition);
            window.removeEventListener('mouseover', handleMouseOver);
            document.body.classList.remove('custom-cursor-active');
        };
    }, [isLandingPage]);

    if (!isLandingPage) return null;

    return (
        <div
            className={`custom-cursor ${isHovering ? 'hover' : ''}`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        />
    );
};

export default CustomCursor;

```

## File: src\components\layout\Footer.css
```css
/* Footer.css */
.footer {
    background-color: var(--color-bg-card);
    border-top: 1px solid var(--color-border);
    padding-top: 4rem;
}

.footer-container {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 4rem;
    margin-bottom: 3rem;
}

.footer-brand .footer-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 1rem;
}

.footer-description {
    color: var(--color-text-muted);
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
    max-width: 300px;
}

.social-links {
    display: flex;
    gap: 1rem;
}

.social-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: var(--color-bg-dark);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    transition: var(--transition);
}

.social-icon:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
}

.footer-links-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
}

.footer-column h3 {
    font-size: 1rem;
    margin-bottom: 1.5rem;
    color: var(--color-text);
}

.footer-link {
    display: block;
    color: var(--color-text-muted);
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
    transition: var(--transition);
}

.footer-link:hover {
    color: var(--color-text);
    transform: translateX(2px);
}

.footer-bottom {
    border-top: 1px solid var(--color-border);
    padding: 1.5rem 0;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.85rem;
}

@media (max-width: 900px) {
    .footer-container {
        grid-template-columns: 1fr;
        gap: 2rem;
    }
}

@media (max-width: 600px) {
    .footer-links-grid {
        grid-template-columns: 1fr;
    }
}
```

## File: src\components\layout\Footer.jsx
```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Twitter, Linkedin, Instagram, Facebook } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container footer-container">
                <div className="footer-brand">
                    <Link to="/" className="footer-logo">
                        <Rocket className="logo-icon" size={24} />
                        <span>Ads <span className="logo-highlight">Acceleration</span></span>
                    </Link>
                    <p className="footer-description">
                        Automate your Amazon PPC to drive organic sales and maximize profits. The ultimate AI-powered growth partner.
                    </p>
                    <div className="social-links">
                        <a href="#" className="social-icon"><Twitter size={20} /></a>
                        <a href="#" className="social-icon"><Linkedin size={20} /></a>
                        <a href="#" className="social-icon"><Instagram size={20} /></a>
                        <a href="#" className="social-icon"><Facebook size={20} /></a>
                    </div>
                </div>

                <div className="footer-links-grid">
                    <div className="footer-column">
                        <h3>Products</h3>
                        <Link to="/tools" className="footer-link">AI Image Generator</Link>
                        <Link to="/tools" className="footer-link">PPC Optimizer</Link>
                        <Link to="/tools" className="footer-link">Listing Builder</Link>
                        <Link to="/pricing" className="footer-link">Pricing</Link>
                    </div>
                    <div className="footer-column">
                        <h3>Company</h3>
                        <Link to="/about" className="footer-link">About Us</Link>
                        <Link to="/contact" className="footer-link">Contact</Link>
                        <Link to="/blog" className="footer-link">Blog</Link>
                        <Link to="/careers" className="footer-link">Careers</Link>
                    </div>
                    <div className="footer-column">
                        <h3>Legal</h3>
                        <Link to="/privacy" className="footer-link">Privacy Policy</Link>
                        <Link to="/terms" className="footer-link">Terms of Service</Link>
                        <Link to="/refund" className="footer-link">Refund Policy</Link>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <div className="container">
                    <p>&copy; {new Date().getFullYear()} AdsCrafted Pro. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

```

## File: src\components\layout\Navbar.css
```css
.navbar {
    position: sticky;
    top: 0;
    z-index: 1000;
    background-color: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--color-border);
    padding: 1rem 0;
    transition: background-color 0.4s ease;
}

body.light-mode .navbar {
    background-color: rgba(248, 249, 250, 0.95);
}

.navbar-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.navbar-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.5px;
}

.logo-icon {
    color: var(--color-primary);
}

.logo-highlight {
    color: var(--color-primary);
}

.navbar-menu {
    display: flex;
    gap: 2rem;
    align-items: center;
    /* Ensure alignment with the new divider */
}

.nav-divider {
    height: 24px;
    width: 2px;
    background-color: var(--color-border);
    margin: 0 0.5rem;
}

.nav-link {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text-muted);
    transition: var(--transition);
    position: relative;
    padding: 0.5rem 0;
    /* Add padding to accommodate indicator */
}

.nav-link:hover {
    color: var(--color-text);
}

/* ScrollSpy Active State */
.nav-link.active {
    color: var(--color-primary);
    font-weight: 700;
}

body.light-mode .nav-link.active {
    color: var(--color-brand-red, #E50914);
}

/* Framer Motion Sliding Indicator */
.nav-indicator {
    position: absolute;
    bottom: -4px;
    left: 0;
    right: 0;
    height: 3px;
    background-color: var(--color-primary);
    border-radius: 50px;
    box-shadow: 0 0 8px rgba(255, 204, 0, 0.5);
}

body.light-mode .nav-indicator {
    background-color: var(--color-brand-red, #E50914);
    box-shadow: 0 0 8px rgba(229, 9, 20, 0.5);
}

/* Animated Glowing Premium Link */
.nav-link-premium {
    background: linear-gradient(270deg, #FFCC00, #E50914, #FFA000, #FFCC00);
    background-size: 300% 300%;
    color: #000 !important;
    padding: 0.45rem 1.25rem;
    border-radius: 50px;
    font-weight: 700;
    box-shadow: 0 0 15px rgba(255, 204, 0, 0.4);
    animation: gradientGlow 4s ease infinite;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.nav-link-premium:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 0 25px rgba(255, 204, 0, 0.6);
}

@keyframes gradientGlow {
    0% {
        background-position: 0% 50%;
        box-shadow: 0 0 15px rgba(255, 204, 0, 0.3);
    }

    50% {
        background-position: 100% 50%;
        box-shadow: 0 0 25px rgba(229, 9, 20, 0.4);
    }

    100% {
        background-position: 0% 50%;
        box-shadow: 0 0 15px rgba(255, 204, 0, 0.3);
    }
}

.navbar-auth {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.theme-toggle {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 50%;
    transition: var(--transition);
}

.theme-toggle:hover {
    color: var(--color-text);
    background-color: rgba(128, 128, 128, 0.1);
}

.mobile-toggle {
    display: none;
    background: none;
    border: none;
    color: var(--color-text);
    cursor: pointer;
}

.mobile-menu {
    display: none;
    flex-direction: column;
    padding: 1rem 1.5rem;
    background-color: var(--color-bg-dark);
    border-bottom: 1px solid var(--color-border);
}

.mobile-link {
    padding: 1.25rem 0;
    border-bottom: 1px solid var(--color-border);
    font-weight: 500;
    font-size: 1.1rem;
    transition: color 0.3s ease;
}

.mobile-link.active {
    color: var(--color-primary);
    font-weight: 700;
}

.mobile-link:last-child {
    border-bottom: none;
}

.mobile-divider {
    height: 1px;
    width: 100%;
    background-color: var(--color-border);
    margin: 1rem 0;
}

.nav-link-premium-mobile {
    display: inline-block;
    align-self: flex-start;
    background: linear-gradient(270deg, #FFCC00, #E50914, #FFA000, #FFCC00);
    background-size: 300% 300%;
    color: #000 !important;
    padding: 0.5rem 1.5rem;
    border-radius: 50px;
    font-weight: 700;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    animation: gradientGlow 4s ease infinite;
    text-align: center;
    border: none;
}

@media (max-width: 900px) {

    .navbar-menu,
    .navbar-auth {
        display: none;
    }

    .mobile-toggle {
        display: block;
    }

    .mobile-menu {
        display: flex;
    }
}
```

## File: src\components\layout\Navbar.jsx
```javascript
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

```

## File: src\components\ui\CountUpAnimation.jsx
```javascript
import React, { useEffect, useState } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';

// Quick utility reusable component for counting numbers up when scrolled into view
const CountUpAnimation = ({ targetNumber, duration = 2, prefix = "", suffix = "" }) => {
    const [count, setCount] = useState(0);
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    useEffect(() => {
        if (isInView) {
            let start = 0;
            const end = parseInt(targetNumber, 10);
            if (start === end) return;

            const incrementTime = (duration * 1000) / end;

            // If the number is huge (100M+), we don't want to calculate 1 by 1 slowly.
            // We use a smooth requestAnimationFrame approach instead of setInterval for performance.
            let startTime;
            const step = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

                // easeOutQuart
                const easeOut = 1 - Math.pow(1 - progress, 4);

                setCount(Math.floor(easeOut * end));
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    setCount(end); // force exact end
                }
            };
            window.requestAnimationFrame(step);
        }
    }, [isInView, targetNumber, duration]);

    return (
        <span ref={ref}>
            {prefix}{count}{suffix}
        </span>
    );
};

export default CountUpAnimation;

```

## File: src\components\ui\MarqueeLogos.css
```css
.marquee-logos-container {
    width: 100%;
    padding: 3rem 0;
    overflow: hidden;
    position: relative;
    background: var(--color-bg-dark);
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
}

.marquee-logos-label {
    text-align: center;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--color-text-muted);
    margin-bottom: 2rem;
}

.marquee-logos-track-wrap {
    width: 100%;
    overflow: hidden;
    position: relative;
    /* Add subtle fade masks to edges */
    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}

.marquee-logos-track {
    display: flex;
    gap: 3rem;
    padding-left: 3rem;
    /* Match gap */
    width: max-content;
    animation: scrollLogos 40s linear infinite;
}

.marquee-logo-card {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text-muted);
    opacity: 0.5;
    transition: opacity 0.3s ease, color 0.3s ease;
    white-space: nowrap;
    letter-spacing: 1px;
}

.marquee-logo-card:hover {
    opacity: 1;
    color: var(--color-text);
    cursor: pointer;
}

@keyframes scrollLogos {
    from {
        transform: translateX(0);
    }

    to {
        transform: translateX(-50%);
    }
}

@media (max-width: 768px) {
    .marquee-logos-track {
        animation-duration: 60s;
        /* Slower on mobile */
    }
}
```

## File: src\components\ui\MarqueeLogos.jsx
```javascript
import React from 'react';
import './MarqueeLogos.css';

const MarqueeLogos = () => {
    const brands = ["ECOHOME", "VITA SUPPS", "TECHGEAR PRO", "AURA BEAUTY", "URBAN FIT", "NATURE'S WAY"];
    const repeatCount = 4; // Duplicate to fill width

    return (
        <div className="marquee-logos-container">
            <p className="marquee-logos-label">TRUSTED BY TOP SELLERS</p>
            <div className="marquee-logos-track-wrap">
                <div className="marquee-logos-track">
                    {[...Array(repeatCount)].map((_, i) => (
                        <React.Fragment key={i}>
                            {brands.map((brand, j) => (
                                <div key={`${i}-${j}`} className="marquee-logo-card">
                                    {brand}
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MarqueeLogos;

```

## File: src\components\ui\MarqueeText.css
```css
.marquee-text-container {
    width: 100%;
    overflow: hidden;
    background-color: var(--color-brand-yellow, #FFCC00);
    color: #000;
    padding: 1.5rem 0;
    white-space: nowrap;
    position: relative;
    display: flex;
    align-items: center;
    transform: rotate(-2deg);
    margin: 4rem 0;
    box-shadow: 0 10px 30px rgba(255, 204, 0, 0.15);
    z-index: 5;
}

.marquee-text-track {
    display: flex;
    animation: scrollText 30s linear infinite;
}

.marquee-text-item {
    font-size: 2.5rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    padding-right: 2rem;
}

.marquee-dot {
    margin-left: 2rem;
    color: rgba(0, 0, 0, 0.4);
}

@keyframes scrollText {
    0% {
        transform: translateX(0);
    }

    100% {
        transform: translateX(-50%);
    }

    /* Scrolls exactly half the duplicated content */
}

/* Light mode overrides for text marquee */
body.light-mode .marquee-text-container {
    background-color: var(--color-brand-red, #E50914);
    color: #FFFFFF;
    box-shadow: 0 10px 30px rgba(229, 9, 20, 0.3);
}

@media (max-width: 768px) {
    .marquee-text-track {
        animation-duration: 60s;
        /* Slows down the marquee on mobile */
    }

    .marquee-text-item {
        font-size: 1.5rem;
        /* Ensure it fits nicely on mobile */
    }
}
```

## File: src\components\ui\MarqueeText.jsx
```javascript
import React from 'react';
import './MarqueeText.css';

const MarqueeText = ({ text }) => {
    // Array to duplicate text enough times to ensure seamless looping
    const repeatCount = 10;

    return (
        <div className="marquee-text-container">
            <div className="marquee-text-track">
                {[...Array(repeatCount)].map((_, i) => (
                    <span key={i} className="marquee-text-item">
                        {text} <span className="marquee-dot">•</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default MarqueeText;

```

## File: src\context\ThemeContext.jsx
```javascript
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Default to Light Mode
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Toggle theme function
    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    // Apply theme to body and html (for global scrollbar targeting)
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.remove('light-mode');
            document.documentElement.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.documentElement.classList.add('light-mode');
        }
    }, [isDarkMode]);

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

```

## File: src\index.css
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  /* Brand Colors */
  --color-primary: #FFCC00;
  /* Amazon-style Yellow */
  --color-primary-hover: #E6B800;
  --color-accent: #E50914;
  /* Deep Red for urgent CTA / Alerts */
  --color-bg-dark: #0A0A0A;
  /* Pure Blackish */
  --color-bg-card: #141414;
  /* Slightly lighter for cards */
  --color-bg-light: #F5F5F5;
  --color-text: #FFFFFF;
  --color-text-muted: #A0A0A0;
  --color-border: #2A2A2A;

  /* Typography */
  --font-family: 'Inter', sans-serif;

  /* Utils */
  --transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  --border-radius: 8px;
  --border-radius-lg: 16px;
}

/* Light Mode Overrides */
html.light-mode,
body.light-mode {
  --color-bg-dark: #FFFFFF;
  /* Pure white default background */
  --color-bg-card: #F9F9FB;
  /* Very light grey for cards/sections */
  --color-bg-light: #F0F2F5;
  --color-text: #1A1A1A;
  /* Very dark gray for readability */
  --color-text-muted: #555555;
  --color-border: #E5E7EB;
  /* Softer border for light mode */

  /* Retain brand colors */
  --color-primary: #E50914;
  /* Red becomes primary action color in Light Mode */
  --color-primary-hover: #CC0812;
  --color-accent: #FFCC00;
  /* Yellow becomes the secondary accent */

  /* Create dedicated variables for gradients that shouldn't flip */
  --color-brand-red: #E50914;
  --color-brand-yellow: #FFCC00;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: 80px;
  /* Offset for fixed navbar */
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary) var(--color-bg-dark);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  background-color: var(--color-bg-dark);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  position: relative;
  transition: background-color 0.4s ease, color 0.4s ease;
  overflow-x: hidden;
}

/* Constantly moving ambient background */
body::after {
  content: "";
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  /* Dark mode default - very faint red/yellow accents */
  background:
    radial-gradient(circle at 30% 70%, rgba(229, 9, 20, 0.03) 0%, transparent 40%),
    radial-gradient(circle at 70% 30%, rgba(255, 204, 0, 0.03) 0%, transparent 40%);
  z-index: -1;
  pointer-events: none;
  animation: bgDrift 30s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
}

body.light-mode::after {
  /* Light mode - Make background much more vibrant and noticeable without ruining text */
  background:
    radial-gradient(circle at 10% 80%, rgba(229, 9, 20, 0.15) 0%, transparent 60%),
    radial-gradient(circle at 90% 20%, rgba(255, 204, 0, 0.15) 0%, transparent 60%),
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4) 0%, transparent 100%);
  background-color: #F8F9FA;
  /* Slightly off-white base to let gradients pop more */
}

@keyframes bgDrift {
  0% {
    transform: translate(0, 0) scale(1);
  }

  50% {
    transform: translate(-2%, 2%) scale(1.05);
  }

  100% {
    transform: translate(2%, -2%) scale(1);
  }
}

a {
  color: inherit;
  text-decoration: none;
}

/* Global Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 1.8rem;
  border-radius: 50px;
  /* Pill shape standard */
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  /* Magnetic feel */
  cursor: pointer;
  border: none;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn:active {
  transform: scale(0.95);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  color: #000;
  box-shadow: 0 4px 15px rgba(255, 204, 0, 0.3);
}

.btn-primary:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 10px 25px rgba(255, 204, 0, 0.5);
  filter: brightness(1.1);
}

/* Make text white on red button in light mode */
body.light-mode .btn-primary {
  color: #FFF;
  box-shadow: 0 4px 15px rgba(229, 9, 20, 0.3);
}

body.light-mode .btn-primary:hover {
  box-shadow: 0 10px 25px rgba(229, 9, 20, 0.4);
}

::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #0A0A0A;
  border-left: 1px solid var(--color-border);
}

::-webkit-scrollbar-thumb {
  background: #FFCC00;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #E6B800;
}

html.light-mode::-webkit-scrollbar-track {
  background: #FFFFFF !important;
}

html.light-mode::-webkit-scrollbar-thumb {
  background: #E50914 !important;
}

html.light-mode::-webkit-scrollbar-thumb:hover {
  background: #CC0812 !important;
}

.btn-outline {
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-outline:hover {
  background-color: var(--color-bg-card);
  border-color: var(--color-text-muted);
}

/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Headings */
h1,
h2,
h3,
h4 {
  font-weight: 700;
  line-height: 1.2;
}

h1 {
  font-size: 3.5rem;
}

h2 {
  font-size: 2.5rem;
}

h3 {
  font-size: 1.75rem;
}

@media (max-width: 768px) {
  h1 {
    font-size: 2.5rem;
  }

  h2 {
    font-size: 2rem;
  }
}

.section {
  padding: 5rem 0;
  border-bottom: 1px solid var(--color-border);
  position: relative;
  overflow: hidden;
}

/* Give all sections a live glowing orb similar to Hero */
.section::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle, rgba(255, 204, 0, 0.04) 0%, transparent 60%);
  z-index: 0;
  pointer-events: none;
  animation: sectionPulse 15s ease-in-out infinite alternate;
}

body.light-mode .section::before {
  background: radial-gradient(circle, rgba(229, 9, 20, 0.12) 0%, transparent 65%);
}

@keyframes sectionPulse {
  0% {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0.8;
  }

  100% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
}

/* Distinguish alternating sections */
section:nth-of-type(even) {
  background-color: rgba(255, 255, 255, 0.015);
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

/* In Light Mode, even sections get a very subtle tint to separate from pure white */
body.light-mode section:nth-of-type(even) {
  background-color: var(--color-bg-card);
}
```

## File: src\main.jsx
```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

```

## File: src\pages\Auth\Login.jsx
```javascript
import React from 'react';
import { Link } from 'react-router-dom';

const Login = () => {
    return (
        <div className="container section text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div className="card-glass" style={{ padding: '3rem', maxWidth: '400px', width: '100%' }}>
                <h2 style={{ marginBottom: '2rem' }}>Welcome Back</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    <input type="email" placeholder="Email Address" className="form-input" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'white', width: '100%' }} />
                    <input type="password" placeholder="Password" className="form-input" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'white', width: '100%' }} />
                </div>
                <button className="btn btn-primary w-100" style={{ width: '100%', marginBottom: '1rem' }}>Log In</button>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Don't have an account? <Link to="/signup" style={{ color: 'var(--color-primary)' }}>Sign Up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;

```

## File: src\pages\Home\FAQ.css
```css
/* FAQ.css */
.faq {
    background-color: var(--color-bg-dark);
    padding-bottom: 8rem;
}

.faq-header {
    margin-bottom: 4rem;
    text-align: center;
}

.faq-list {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.faq-item {
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    overflow: hidden;
    transition: border-color var(--transition);
}

.faq-item:hover {
    border-color: rgba(255, 255, 255, 0.2);
}

.faq-item.open {
    border-color: var(--color-primary);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.faq-question {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: none;
    border: none;
    color: var(--color-text);
    font-size: 1.15rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
}

.faq-icon {
    flex-shrink: 0;
    transition: transform 0.3s;
}

.faq-answer-container {
    overflow: hidden;
}

.faq-answer {
    padding: 0 2rem 1.5rem;
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1.7;
}

@media (max-width: 768px) {
    .faq-question {
        padding: 1.25rem 1.5rem;
        font-size: 1rem;
    }

    .faq-answer {
        padding: 0 1.5rem 1.25rem;
    }
}
```

## File: src\pages\Home\FAQ.jsx
```javascript
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

```

## File: src\pages\Home\Features.css
```css
/* Features.css - Premium Split Screen */
.features {
    background-color: var(--color-bg-dark);
    position: relative;
    overflow: hidden;
}

.features-header {
    margin-bottom: 5rem;
    position: relative;
    z-index: 2;
    text-align: center;
}

.section-title {
    margin-bottom: 1rem;
}

.section-subtitle {
    color: var(--color-text-muted);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
}

/* Split Screen Layout */
.split-screen-container {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 2rem;
    position: relative;
    z-index: 2;
}

.split-side {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    border-radius: var(--border-radius-lg);
    padding: 3rem;
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border);
    overflow: hidden;
}

/* Ambient Backglows */
.pain-side::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 150px;
    background: radial-gradient(ellipse at top center, rgba(229, 9, 20, 0.15), transparent 70%);
    pointer-events: none;
}

.solution-side::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 150px;
    background: radial-gradient(ellipse at top center, rgba(255, 204, 0, 0.15), transparent 70%);
    pointer-events: none;
}

/* Light Mode Overrides for Ambient Backglows */
body.light-mode .pain-side::before {
    background: radial-gradient(ellipse at top center, rgba(229, 9, 20, 0.08), transparent 70%);
}

body.light-mode .solution-side::before {
    background: radial-gradient(ellipse at top center, rgba(255, 204, 0, 0.12), transparent 70%);
}

.side-header {
    margin-bottom: 3rem;
    text-align: center;
}

.side-title {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    font-weight: 800;
}

.side-desc {
    color: var(--color-text-muted);
    font-size: 1rem;
}

/* Center Divider */
.split-divider {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 5rem;
}

.divider-line {
    width: 2px;
    height: 400px;
    background: linear-gradient(to bottom, transparent, var(--color-border), var(--color-border), transparent);
}

/* Premium Item Cards */
.split-cards-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
}

.premium-card {
    display: flex;
    align-items: flex-start;
    gap: 1.2rem;
    padding: 1.5rem;
    border-radius: var(--border-radius);
    background-color: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
    transition: var(--transition);
    flex: 1;
}

body.light-mode .premium-card {
    background-color: #FFFFFF;
    border: 1px solid var(--color-border);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.08);
    /* More pop out */
    transform: translateY(-2px);
}

.pain-card:hover {
    background-color: rgba(229, 9, 20, 0.05);
    border-color: rgba(229, 9, 20, 0.2);
    transform: translateX(-5px);
}

.solution-card:hover {
    background-color: rgba(255, 204, 0, 0.05);
    border-color: rgba(255, 204, 0, 0.4);
    transform: translateX(5px);
    box-shadow: 0 10px 30px rgba(255, 204, 0, 0.1);
}

/* Fix Light Mode Hover Conflicts */
body.light-mode .pain-card:hover {
    background-color: #FFF;
    border-color: #E50914;
    box-shadow: 0 15px 35px rgba(229, 9, 20, 0.08);
}

body.light-mode .solution-card:hover {
    background-color: #FFF;
    border-color: #FFCC00;
    box-shadow: 0 15px 35px rgba(255, 204, 0, 0.12);
}

.card-icon-wrap {
    padding: 1rem;
    border-radius: 12px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pain-icon-wrap {
    background-color: rgba(229, 9, 20, 0.1);
}

.solution-icon-wrap {
    background-color: rgba(255, 204, 0, 0.1);
}

.card-title {
    font-size: 1.1rem;
    color: var(--color-text);
    margin-bottom: 0.4rem;
    font-weight: 700;
}

.card-text {
    font-size: 0.95rem;
    color: var(--color-text-muted);
    /* Fixes light mode contrast */
    line-height: 1.5;
}

.text-danger {
    color: #E50914 !important;
    /* Force true red regardless of theme context */
}

.text-primary {
    color: #FFCC00 !important;
    /* Force true yellow regardless of theme context */
}


/* Responsive */
@media (max-width: 992px) {
    .split-screen-container {
        flex-direction: column;
    }

    .split-divider {
        flex-direction: row;
        width: 100%;
        padding-top: 0;
        margin: 2rem 0;
    }

    .divider-line {
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, transparent, var(--color-border), transparent);
    }
}

@media (max-width: 768px) {
    .split-side {
        padding: 2rem 1.5rem;
    }
}
```

## File: src\pages\Home\Features.jsx
```javascript
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

```

## File: src\pages\Home\Hero.css
```css
/* Hero.css */
.hero {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 6rem 0 3rem;
    /* Reduced from 8rem 0 4rem */
}

/* Redixo style intense radial gradient behind the text */
.hero::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80vw;
    height: 80vh;
    background: radial-gradient(circle, rgba(255, 204, 0, 0.08) 0%, transparent 60%);
    z-index: 1;
    pointer-events: none;
}

.hero-container {
    position: relative;
    z-index: 10;
}

.hero-content-centered {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.hero-badge-wrap {
    margin-bottom: 2rem;
}

.hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1.25rem;
    background-color: rgba(128, 128, 128, 0.1);
    border: 1px solid var(--color-border);
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.badge-pulse {
    width: 8px;
    height: 8px;
    background-color: #00C853;
    /* Active green */
    border-radius: 50%;
    box-shadow: 0 0 10px #00C853;
    animation: pulseGreen 2s infinite;
}

@keyframes pulseGreen {
    0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(0, 200, 83, 0.7);
    }

    70% {
        transform: scale(1);
        box-shadow: 0 0 0 6px rgba(0, 200, 83, 0);
    }

    100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(0, 200, 83, 0);
    }
}

/* Redixo Typography Style */
.hero-title-massive {
    font-size: 5.5rem;
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1.05;
    margin-bottom: 2rem;
    color: var(--color-text);
}

.text-italic-serif {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-style: italic;
    font-weight: 400;
    color: var(--color-primary);
}

.hero-subtitle-large {
    font-size: 1.35rem;
    color: var(--color-text-muted);
    margin-bottom: 3.5rem;
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
}

.hero-cta-centered {
    margin-bottom: 5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.btn-pill {
    border-radius: 50px !important;
    padding: 1.2rem 2.5rem !important;
    font-size: 1.15rem !important;
}

.cta-subtext {
    font-size: 0.9rem;
    color: var(--color-text-muted);
}

.hero-stats-row {
    display: flex;
    justify-content: center;
    gap: 4rem;
    width: 100%;
    border-top: 1px solid var(--color-border);
    padding-top: 3rem;
}

.stat-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
}

.stat-number {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.5rem;
    color: var(--color-text);
    letter-spacing: -1px;
}

.stat-label {
    font-size: 1rem;
    color: var(--color-text-muted);
}

/* Adjustments for Nest Hub Max / Standard Laptops (Displays <= 850px height) */
@media (max-height: 850px) {
    .hero-title-massive {
        font-size: 3.8rem;
        margin-bottom: 1.25rem;
    }

    .hero-subtitle-large {
        font-size: 1.15rem;
        margin-bottom: 2.5rem;
    }

    .hero-cta-centered {
        margin-bottom: 3.5rem;
    }

    .hero-stats-row {
        padding-top: 2rem;
    }

    .stat-number {
        font-size: 2.5rem;
    }
}

@media (max-width: 1024px) {
    .hero-title-massive {
        font-size: 4rem;
    }
}

@media (max-width: 768px) {
    .hero-title-massive {
        font-size: 3rem;
    }

    .hero-subtitle-large {
        font-size: 1.1rem;
    }

    .hero-stats-row {
        flex-direction: column;
        gap: 2rem;
        align-items: center;
    }

    .stat-block {
        align-items: center;
        text-align: center;
    }
}
```

## File: src\pages\Home\Hero.jsx
```javascript
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
                    <motion.div variants={itemVariants} className="hero-badge-wrap">
                        <div className="hero-badge">
                            <span className="badge-pulse"></span>
                            The Standard in E-Commerce Growth
                        </div>
                    </motion.div>

                    {/* Redixo-style typography: Mix of Sans and Italic Serif */}
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

                </motion.div>
            </div>
        </section>
    );
};

export default Hero;

```

## File: src\pages\Home\Home.jsx
```javascript
import React from 'react';
import Hero from './Hero';
import Features from './Features';
import Testimonials from './Testimonials';
import FAQ from './FAQ';
import MarqueeLogos from '../../components/ui/MarqueeLogos';
import MarqueeText from '../../components/ui/MarqueeText';

const Home = () => {
    return (
        <div className="home-page">
            <Hero />
            <MarqueeLogos />
            <Features />
            <MarqueeText text="SCALE YOUR BRAND • AI POWERED • DOMINATE AMAZON" />
            <Testimonials />
            <FAQ />
        </div>
    );
};

export default Home;

```

## File: src\pages\Home\Pricing.css
```css
/* Pricing.css */
.pricing {
    background-color: var(--color-bg-dark);
}

.pricing-header {
    margin-bottom: 4rem;
    text-align: center;
}

.pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    align-items: stretch;
}

.pricing-card {
    position: relative;
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-lg);
    display: flex;
    flex-direction: column;
    transition: var(--transition);
    padding: 2.5rem;
}

.pricing-card:hover {
    transform: translateY(-5px);
    border-color: rgba(255, 255, 255, 0.2);
}

.pricing-card.popular {
    border-color: var(--color-primary);
    box-shadow: 0 10px 30px rgba(255, 204, 0, 0.1);
    background: linear-gradient(180deg, rgba(255, 204, 0, 0.05) 0%, var(--color-bg-card) 100%);
}

.popular-badge {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--color-primary);
    color: #000;
    padding: 0.25rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.pricing-card-header {
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 1.5rem;
    margin-bottom: 1.5rem;
}

.plan-name {
    font-size: 1.4rem;
    margin-bottom: 0.5rem;
}

.plan-desc {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
    min-height: 45px;
}

.plan-price-wrap {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
}

.plan-price {
    font-size: 3rem;
    font-weight: 800;
    letter-spacing: -1px;
}

.plan-period {
    color: var(--color-text-muted);
    font-size: 1rem;
}

.pricing-card-body {
    flex-grow: 1;
    margin-bottom: 2rem;
}

.plan-features {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    color: var(--color-text);
}

.feature-item.disabled {
    color: var(--color-text-muted);
}

.feature-icon {
    flex-shrink: 0;
}

.feature-icon.check {
    color: var(--color-primary);
}

.feature-icon.x {
    color: var(--color-border);
}

.w-100 {
    width: 100%;
}

@media (max-width: 900px) {
    .pricing-grid {
        grid-template-columns: 1fr;
        max-width: 450px;
        margin: 0 auto;
    }
}
```

## File: src\pages\Home\Pricing.jsx
```javascript
import React from 'react';
import { Check, X } from 'lucide-react';
import './Pricing.css';

const Pricing = () => {
    const plans = [
        {
            name: "Pay As You Go",
            price: "$0",
            description: "Perfect for testing the waters and generating single images.",
            features: [
                { text: "7 AI Listing Images", included: true },
                { text: "Basic Competitor Analysis", included: true },
                { text: "Standard Support", included: true },
                { text: "Automated PPC Management", included: false },
                { text: "Unlimited AI Generation", included: false }
            ],
            ctaText: "Get Started Free",
            isPopular: false
        },
        {
            name: "Pro",
            price: "$99",
            period: "/month",
            description: "Everything you need to scale your Amazon business to the next level.",
            features: [
                { text: "Unlimited AI Images & A+", included: true },
                { text: "Deep Keepa Competitor Insights", included: true },
                { text: "Automated PPC Management up to $10k/mo", included: true },
                { text: "Priority 24/7 Support", included: true },
                { text: "Dedicated Account Manager", included: false }
            ],
            ctaText: "Start Pro Trial",
            isPopular: true
        },
        {
            name: "Team (Agency)",
            price: "$299",
            period: "/month",
            description: "Built for agencies managing multiple client accounts and large catalogs.",
            features: [
                { text: "Everything in Pro", included: true },
                { text: "Unlimited PPC Management", included: true },
                { text: "API Access & Webhooks", included: true },
                { text: "Dedicated Account Manager", included: true },
                { text: "White-label Client Dashboard", included: true }
            ],
            ctaText: "Contact Sales",
            isPopular: false
        }
    ];

    return (
        <section className="pricing section" id="pricing">
            <div className="container">
                <div className="pricing-header text-center">
                    <h2 className="section-title">Transparent, Scalable Pricing</h2>
                    <p className="section-subtitle">Lock in your price forever. No hidden fees. Cancel anytime.</p>
                </div>

                <div className="pricing-grid">
                    {plans.map((plan, index) => (
                        <div key={index} className={`pricing-card ${plan.isPopular ? 'popular' : ''}`}>
                            {plan.isPopular && <div className="popular-badge">Most Popular</div>}

                            <div className="pricing-card-header">
                                <h3 className="plan-name">{plan.name}</h3>
                                <p className="plan-desc">{plan.description}</p>
                                <div className="plan-price-wrap">
                                    <span className="plan-price">{plan.price}</span>
                                    {plan.period && <span className="plan-period">{plan.period}</span>}
                                </div>
                            </div>

                            <div className="pricing-card-body">
                                <ul className="plan-features">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className={`feature-item ${!feature.included ? 'disabled' : ''}`}>
                                            {feature.included ? (
                                                <Check size={18} className="feature-icon check" />
                                            ) : (
                                                <X size={18} className="feature-icon x" />
                                            )}
                                            <span>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pricing-card-footer">
                                <button className={`btn w-100 ${plan.isPopular ? 'btn-primary' : 'btn-outline'}`}>
                                    {plan.ctaText}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;

```

## File: src\pages\Home\Testimonials.css
```css
/* Testimonials.css */
.testimonials {
    background-color: var(--color-bg-dark);
    position: relative;
    overflow: hidden;
}

/* Subtle background accent */
.testimonials::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(255, 204, 0, 0.03) 0%, transparent 70%);
    z-index: 0;
    pointer-events: none;
}

/* Ambient Background Marquee */
.testimonials-bg-marquee {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1.5rem;
    transform: rotate(-3deg) scale(1.2);
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
    user-select: none;
    opacity: 0.03;
    /* Very faint so it acts as texture */
}

/* Higher opacity for Light Mode */
body.light-mode .testimonials-bg-marquee {
    opacity: 0.04;
    color: var(--color-primary);
    /* Red tint in light mode */
}

.testimonials-bg-track {
    display: flex;
    width: max-content;
    will-change: transform;
}

/* Track speeds */
.track-1 {
    animation: testScrollLeft 35s linear infinite;
}

.track-2 {
    animation: testScrollRight 50s linear infinite;
}

.track-3 {
    animation: testScrollLeft 25s linear infinite;
}

.track-4 {
    animation: testScrollRight 70s linear infinite;
}

.testimonials-bg-content {
    display: flex;
    align-items: center;
    white-space: nowrap;
    text-transform: uppercase;
    font-weight: 900;
    letter-spacing: -2px;
}

/* Size Variations */
.size-xl {
    font-size: 14rem;
    opacity: 0.4;
    line-height: 0.8;
}

.size-lg {
    font-size: 8rem;
    opacity: 0.8;
}

.size-md {
    font-size: 5rem;
    opacity: 1;
    letter-spacing: 2px;
}

.size-sm {
    font-size: 3rem;
    opacity: 0.6;
    letter-spacing: 4px;
}

/* Hollow Text Effect */
.hollow {
    color: transparent !important;
    -webkit-text-stroke: 2px var(--color-text);
}

body.light-mode .hollow {
    -webkit-text-stroke: 2px var(--color-primary);
}

.testimonials-bg-content .dot {
    margin: 0 3rem;
    color: var(--color-primary);
}

/* Specific dot sizing based on track size to prevent weird spacing */
.size-xl .dot {
    font-size: 6rem;
    margin: 0 4rem;
}

.size-lg .dot {
    font-size: 4rem;
    margin: 0 3rem;
}

.size-md .dot {
    font-size: 2.5rem;
    margin: 0 2rem;
}

.size-sm .dot {
    font-size: 1.5rem;
    margin: 0 1.5rem;
}

@keyframes testScrollLeft {
    0% {
        transform: translateX(0);
    }

    100% {
        transform: translateX(-33.333%);
    }

    /* Translates 1/3 since triplicated */
}

@keyframes testScrollRight {
    0% {
        transform: translateX(-33.333%);
    }

    100% {
        transform: translateX(0);
    }
}

.testimonials-header {
    margin-bottom: 4rem;
    position: relative;
    z-index: 1;
}

.carousel-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    position: relative;
    z-index: 1;
    max-width: 900px;
    margin: 0 auto;
}

.carousel-btn {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: var(--transition);
    flex-shrink: 0;
    z-index: 2;
}

.carousel-btn:hover {
    background: var(--color-primary);
    color: #000;
    border-color: var(--color-primary);
    transform: scale(1.05);
}

.carousel-track-wrapper {
    overflow: hidden;
    width: 100%;
    border-radius: var(--border-radius-lg);
}

.carousel-track {
    display: flex;
    transition: transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.carousel-slide {
    min-width: 100%;
    padding: 1rem;
}

.testimonial-card {
    padding: 4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: 100%;
    position: relative;
    overflow: hidden;
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border);

    /* 3D Physics base */
    transform-style: preserve-3d;
    transform: perspective(1000px) rotateY(var(--tilt-x, 0deg)) rotateX(var(--tilt-y, 0deg));
    transition: transform 0.1s ease-out, box-shadow 0.3s ease, border-color 0.3s ease;
}

/* Ambient "Breathing Core" state when NOT hovered */
.testimonial-card:not(:hover) {
    animation: ambientGlow 4s infinite alternate ease-in-out;
    transition: transform 0.5s ease-out;
    /* Smooth snap back to 0deg tilt */
}

@keyframes ambientGlow {
    0% {
        box-shadow: 0 0 0 rgba(255, 204, 0, 0);
        border-color: var(--color-border);
    }

    100% {
        box-shadow: 0 0 25px rgba(255, 204, 0, 0.05);
        border-color: rgba(255, 204, 0, 0.2);
    }
}

/* Mouse Spotlight Effect */
.testimonial-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at var(--mouse-x, -500px) var(--mouse-y, -500px),
            rgba(255, 204, 0, 0.15),
            transparent 40%);
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 1;
    pointer-events: none;
}

.testimonial-card:hover::before {
    opacity: 1;
}

/* Ensure content stays above the spotlight layer */
.testimonial-card>* {
    position: relative;
    z-index: 2;
}

.quote-icon {
    color: var(--color-primary);
    opacity: 0.3;
    margin-bottom: 1.5rem;
}

.testimonial-text {
    font-size: 1.25rem;
    line-height: 1.8;
    color: var(--color-text);
    margin-bottom: 2.5rem;
    font-weight: 500;
    font-style: italic;
}

.testimonial-author {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.author-img {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--color-primary);
}

.author-info {
    text-align: left;
}

.author-name {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 0.2rem;
}

.author-company {
    color: var(--color-text-muted);
    font-size: 0.9rem;
}

.carousel-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 2rem;
    position: relative;
    z-index: 1;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: var(--color-border);
    border: none;
    cursor: pointer;
    transition: var(--transition);
}

.dot.active {
    background-color: var(--color-primary);
    transform: scale(1.2);
}

@media (max-width: 768px) {
    .carousel-container {
        gap: 0.5rem;
    }

    .carousel-btn {
        width: 40px;
        height: 40px;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
    }

    .carousel-btn.prev {
        left: -10px;
    }

    .carousel-btn.next {
        right: -10px;
    }

    .carousel-btn:hover {
        transform: translateY(-50%) scale(1.05);
    }

    .testimonial-card {
        padding: 2.5rem 1.5rem;
    }

    .testimonial-text {
        font-size: 1.1rem;
    }
}

/* =====================
   Light Mode Overrides 
   ===================== */
body.light-mode .testimonial-card {
    background: linear-gradient(135deg, rgba(229, 9, 20, 0.10) 0%, rgba(229, 9, 20, 0.22) 100%);
    border-color: rgba(229, 9, 20, 0.3);
}

/* Light mode hover spotlight: distinct white glow instead of yellow */
body.light-mode .testimonial-card::before {
    background: radial-gradient(circle at var(--mouse-x, -500px) var(--mouse-y, -500px),
            rgba(255, 255, 255, 1),
            rgba(255, 255, 255, 0) 50%);
}

/* Light mode ambient glow: pulse red instead of yellow */
body.light-mode .testimonial-card:not(:hover) {
    animation: ambientGlowLightRed 4s infinite alternate ease-in-out;
}

@keyframes ambientGlowLightRed {
    0% {
        box-shadow: 0 0 0 rgba(229, 9, 20, 0);
        border-color: rgba(229, 9, 20, 0.3);
    }

    100% {
        box-shadow: 0 15px 35px rgba(229, 9, 20, 0.4);
        border-color: rgba(229, 9, 20, 0.8);
    }
}
```

## File: src\pages\Home\Testimonials.jsx
```javascript
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

```

## File: src\pages\Lead\LeadCapturePage.css
```css
/* LeadCapturePage.css
   Scoped styles for the standalone lead capture page.
   Uses existing brand CSS variables for consistency. */

.lead-page {
    min-height: 100vh;
    background-color: var(--color-bg-dark);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
}

/* Ambient background matching the main site */
.lead-page::before {
    content: "";
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    /* Dark mode default - very faint red/yellow accents */
    background:
        radial-gradient(circle at 30% 70%, rgba(229, 9, 20, 0.03) 0%, transparent 40%),
        radial-gradient(circle at 70% 30%, rgba(255, 204, 0, 0.03) 0%, transparent 40%);
    z-index: 0;
    pointer-events: none;
    animation: leadBgFloat 30s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
}

body.light-mode .lead-page::before {
    /* Light mode - Make background much more vibrant and noticeable without ruining text */
    background:
        radial-gradient(circle at 10% 80%, rgba(229, 9, 20, 0.20) 0%, transparent 60%),
        radial-gradient(circle at 90% 20%, rgba(255, 204, 0, 0.25) 0%, transparent 60%),
        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
}

@keyframes leadBgFloat {
    0% {
        transform: translate(0, 0) scale(1);
    }

    50% {
        transform: translate(-2%, 2%) scale(1.05);
    }

    100% {
        transform: translate(2%, -2%) scale(1);
    }
}

/* =====================
   Minimal Header
   ===================== */
.lead-header {
    padding: 1.5rem 2rem;
    display: flex;
    align-items: center;
    position: relative;
    z-index: 10;
    border-bottom: 1px solid var(--color-border);
}

.lead-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--color-text);
    text-decoration: none;
    letter-spacing: -0.5px;
    transition: opacity 0.3s ease;
}

.lead-logo:hover {
    opacity: 0.8;
}

.lead-logo-icon {
    color: var(--color-primary);
}

.lead-logo-highlight {
    color: var(--color-primary);
}

/* =====================
   Main Content
   ===================== */
.lead-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4rem 1.5rem;
    position: relative;
    z-index: 1;
}

.lead-card {
    width: 100%;
    max-width: 560px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-lg);
    padding: 3.5rem;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* Premium top glow accent */
.lead-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
}

/* =====================
   Hero Content
   ===================== */
.lead-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(255, 204, 0, 0.1);
    border: 1px solid rgba(255, 204, 0, 0.3);
    color: var(--color-primary);
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding: 0.4rem 1rem;
    border-radius: 50px;
    margin-bottom: 1.5rem;
}

.lead-headline {
    font-size: 2.1rem;
    font-weight: 800;
    line-height: 1.2;
    color: var(--color-text);
    margin-bottom: 1rem;
    letter-spacing: -0.5px;
}

.lead-headline .highlight-yellow {
    color: var(--color-primary);
}

.lead-headline .highlight-red {
    color: var(--color-accent);
}

.lead-sub {
    color: var(--color-text-muted);
    font-size: 1.05rem;
    line-height: 1.7;
    margin-bottom: 2.5rem;
}

.lead-bullets {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-align: left;
}

.lead-bullets li {
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    color: var(--color-text-muted);
}

.lead-bullets li svg {
    color: var(--color-primary);
    flex-shrink: 0;
    margin-top: 0.2rem;
}

/* =====================
   Form
   ===================== */
.lead-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* Name Row Grid */
.lead-name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

@media (max-width: 480px) {
    .lead-name-row {
        grid-template-columns: 1fr;
    }
}

.lead-input-wrapper {
    position: relative;
}

.lead-input-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
    pointer-events: none;
}

.lead-input {
    width: 100%;
    padding: 1rem 1rem 1rem 3rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1.5px solid var(--color-border);
    border-radius: var(--border-radius);
    color: var(--color-text);
    font-size: 1rem;
    font-family: var(--font-family);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    outline: none;
}

.lead-input::placeholder {
    color: var(--color-text-muted);
}

.lead-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(255, 204, 0, 0.1);
}

.lead-input.error {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1);
}

.lead-error {
    color: var(--color-accent);
    font-size: 0.88rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: -0.3rem;
}

.lead-submit-btn {
    width: 100%;
    padding: 1rem;
    background: #e50914;
    /* Requested solid brand red */
    color: #FFF;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 700;
    font-family: var(--font-family);
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.8rem;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(229, 9, 20, 0.3);
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.lead-submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(229, 9, 20, 0.45);
    filter: brightness(1.1);
}

.lead-submit-btn:active:not(:disabled) {
    transform: scale(0.98);
}

.lead-submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background: var(--color-text-muted);
    box-shadow: none;
}

.lead-divider {
    display: flex;
    align-items: center;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    margin: 1rem 0;
}

.lead-divider::before,
.lead-divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid var(--color-border);
}

.lead-divider::before {
    margin-right: .5em;
}

.lead-divider::after {
    margin-left: .5em;
}

.lead-call-btn {
    width: 100%;
    padding: 1.1rem;
    background: linear-gradient(-45deg, #FFD700, #e50914, #FFA500, #FF4500);
    background-size: 400% 400%;
    color: #FFF;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1.1rem;
    font-weight: 800;
    font-family: var(--font-family);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.8rem;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 20px rgba(229, 9, 20, 0.4);
    animation: lead-vibrate 3s infinite, lead-glow 2s infinite alternate, lead-gradient-move 6s ease infinite;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.lead-call-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(120deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent);
    transition: all 0.5s;
    animation: lead-shimmer 3s infinite;
}

.lead-call-btn:hover {
    transform: translateY(-5px) scale(1.03);
    box-shadow: 0 15px 40px rgba(229, 9, 20, 0.7);
    filter: brightness(1.2);
}

.lead-call-btn svg {
    animation: lead-wiggle 0.8s infinite ease-in-out;
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
}

@keyframes lead-gradient-move {
    0% {
        background-position: 0% 50%;
    }

    50% {
        background-position: 100% 50%;
    }

    100% {
        background-position: 0% 50%;
    }
}

@keyframes lead-shimmer {
    0% {
        left: -100%;
    }

    20%,
    100% {
        left: 100%;
    }
}

@keyframes lead-vibrate {

    0%,
    100% {
        transform: scale(1);
    }

    10%,
    30% {
        transform: scale(1.02) rotate(1.5deg);
    }

    20%,
    40% {
        transform: scale(1.02) rotate(-1.5deg);
    }

    50% {
        transform: scale(1);
    }
}

@keyframes lead-glow {
    from {
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.4), 0 0 10px rgba(229, 9, 20, 0.3);
    }

    to {
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 20px rgba(229, 9, 20, 0.6);
    }
}

@keyframes lead-wiggle {

    0%,
    100% {
        transform: rotate(0deg) scale(1.1);
    }

    25% {
        transform: rotate(-20deg) scale(1.3);
    }

    75% {
        transform: rotate(20deg) scale(1.3);
    }
}

/* Checkbox Styles */
.lead-checkbox-wrapper {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
}

.lead-checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    cursor: pointer;
    line-height: 1.4;
    user-select: none;
}

.lead-checkbox-label input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
}

.lead-checkbox-custom {
    position: relative;
    top: 2px;
    height: 18px;
    width: 18px;
    min-width: 18px;
    background-color: rgba(255, 255, 255, 0.04);
    border: 1.5px solid var(--color-border);
    border-radius: 4px;
    transition: all 0.2s ease;
}

.lead-checkbox-label:hover input~.lead-checkbox-custom {
    border-color: var(--color-primary);
}

.lead-checkbox-label input:checked~.lead-checkbox-custom {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
}

.lead-checkbox-custom:after {
    content: "";
    position: absolute;
    display: none;
    left: 5px;
    top: 2px;
    width: 4px;
    height: 8px;
    border: solid #000;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.lead-checkbox-label input:checked~.lead-checkbox-custom:after {
    display: block;
}

.lead-terms-link {
    background: none;
    border: none;
    color: var(--color-primary);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
    font-family: inherit;
    transition: opacity 0.2s ease;
}

.lead-terms-link:hover {
    opacity: 0.8;
}

/* Loading spinner */
.lead-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(0, 0, 0, 0.3);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* =====================
   Trust Signal
   ===================== */
.lead-trust {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    margin-top: 1rem;
}

/* =====================
   Success State
   ===================== */
.lead-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.5rem;
    padding: 1rem 0;
}

.success-icon-ring {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255, 204, 0, 0.1);
    border: 2px solid rgba(255, 204, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
}

.lead-success h2 {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--color-text);
}

.lead-success p {
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1.6;
    max-width: 380px;
}

.lead-success-btn {
    padding: 0.9rem 2rem;
    background: linear-gradient(135deg, var(--color-primary), #FFA000);
    color: #FFF;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 700;
    font-family: var(--font-family);
    text-transform: uppercase;
    letter-spacing: 1px;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 20px rgba(255, 204, 0, 0.3);
    text-decoration: none;
}

.lead-success-btn.disabled {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-muted);
    box-shadow: none;
    cursor: not-allowed;
    pointer-events: none;
}

.lead-success-btn:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(255, 204, 0, 0.45);
}

.lead-success-back {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 0.88rem;
    cursor: pointer;
    font-family: var(--font-family);
    transition: color 0.2s ease;
    text-decoration: underline;
}

.lead-success-back:hover {
    color: var(--color-text);
}

/* =====================
   Footer
   ===================== */
.lead-footer {
    padding: 1.5rem 2rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.8rem;
    z-index: 1;
    position: relative;
    border-top: 1px solid var(--color-border);
}

/* =====================
   Modal
   ===================== */
.lead-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
}

.lead-modal-content {
    background: var(--color-bg-dark);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-lg);
    width: 100%;
    max-width: 600px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.lead-modal-close {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color 0.2s ease;
}

.lead-modal-close:hover {
    color: var(--color-text);
}

.lead-modal-content h2 {
    padding: 2rem 2rem 1rem;
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0;
    border-bottom: 1px solid var(--color-border);
}

.lead-modal-scroll {
    padding: 1.5rem 2rem;
    overflow-y: auto;
    flex: 1;
    color: var(--color-text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
}

.lead-modal-scroll p {
    margin-bottom: 1.25rem;
}

.lead-modal-scroll p:last-child {
    margin-bottom: 0;
}

.lead-modal-scroll strong {
    color: var(--color-text);
}

.lead-modal-footer {
    padding: 1.5rem 2rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
}

/* =====================
   Responsive
   ===================== */
@media (max-width: 600px) {
    .lead-card {
        padding: 2.5rem 1.5rem;
        border-radius: var(--border-radius);
    }

    .lead-headline {
        font-size: 1.7rem;
    }
}
```

## File: src\pages\Lead\LeadCapturePage.jsx
```javascript
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Mail, User, ArrowRight, CheckCircle, ShieldCheck, AlertCircle, X, PhoneCall } from 'lucide-react';
import useLeadForm from './useLeadForm';
import './LeadCapturePage.css';

// ─── Tool Content Registry ────────────────────────────────────────────────────
// Add new tools here. Each slug maps to the content shown on the page.
const TOOL_REGISTRY = {
    'free-tool': {
        badge: '🚀 Free Access — Limited Time',
        headline: (
            <>
                FIXING AMAZON ADS FOR <span className="highlight-yellow">MILLION $$</span> BRANDS via AUTOMATION
            </>
        ),
        subText: (
            <ul className="lead-bullets">
                <li><CheckCircle size={16} /> With Our In-House PPC Experts – Profit & Organic Ranks</li>
                <li><CheckCircle size={16} /> Automation + Strategy = Results in 120 Days</li>
                <li><CheckCircle size={16} /> Stop Wasting Ad Spend, Start Scaling Smarter</li>
                <li><CheckCircle size={16} /> From Broken Campaigns to Millions in Sales</li>
            </ul>
        ),
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
                            <div className="lead-sub">{tool.subText}</div>

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

                                <div className="lead-divider">OR</div>

                                <a
                                    href="https://calendly.com/m-farhanwaqar/30min"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="lead-call-btn"
                                >
                                    <PhoneCall size={18} />
                                    Schedule a Call
                                </a>
                            </form>

                            {/* Trust signal */}
                            <div className="lead-trust">
                                <ShieldCheck size={14} />
                                No spam. Unsubscribe anytime.
                            </div>
                        </motion.div>
                    ) : (
                        /* ── SUCCESS / RETURN STATE ── */
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

```

## File: src\pages\Lead\useLeadForm.js
```js
import { useState } from 'react';

// A simple tool to check if the email actually looks like an email (e.g., has an @ and a .)
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * useLeadForm hook - The brains behind the Email Capture form.
 * 
 * WHAT DOES THIS DO?
 * This file handles all the logic: typing the email, checking if it's valid, 
 * sending it, and keeping track of whether we are 'loading' or 'successful'.
 * 
 * WHERE DO THE EMAILS GO RIGHT NOW?
 * Nowhere yet! Right now, this uses a "Mock API" (fake sender). When you click submit, 
 * it just waits 1.5 seconds to simulate a real loading bar, and then pretends it succeeded.
 * This is perfect for testing the design.
 * 
 * HOW DO I CONNECT IT TO MY REAL EMAIL SERVICE (Mailchimp, ConvertKit, etc.)?
 * 1. Find the "mockSubmit" function below.
 * 2. Delete it.
 * 3. Replace it with a "fetch" request to your backend or service. (See example below)
 */
const useLeadForm = (toolSlug = 'free-tool') => {
    // 1. Keep track of what the user is typing into the input boxes
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    // Checkbox for Terms and Conditions
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // 2. Keep track of what the button should be doing:
    // 'idle' = waiting for click
    // 'loading' = spinning wheel
    // 'success' = show the checkmark page
    // 'exists' = show the return visitor page
    // 'error' = show an error message
    const [status, setStatus] = useState('idle');
    const [visitCount, setVisitCount] = useState(1);

    // 3. Keep track of error messages to show the user
    const [errorMessage, setErrorMessage] = useState('');

    // =========================================================================
    // 🛑 THIS IS THE PART YOU WILL CHANGE WHEN YOU GO LIVE 🛑
    // =========================================================================

    // THE REAL SENDER:
    // Sends the data directly to Google Apps Script. 
    // We use a POST request with 'no-cors' to completely bypass Google's strict redirect policies.
    const submitToGoogleSheets = async (firstName, lastName, email) => {
        const scriptUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwpHgIPoWm3dt84iAQJ2qHnas47XyT-IYn_CWtnUdoDevihRUA7mInP7eF31R8UFnEq/exec';

        try {
            await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors', // Bypasses the redirect CORS errors entirely
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    tool_requested: toolSlug
                })
            });

            // Because of no-cors, we get an opaque response back (we can't read the JSON).
            // As long as the fetch didn't throw a network error, we assume it reached the endpoint.
            return { status: 'success' };
        } catch (error) {
            console.error("Error submitting to Google Sheets:", error);
            throw error;
        }
    };
    // =========================================================================

    // This is the function that runs the moment the user clicks the "Submit" button
    const handleSubmit = async (e) => {
        e.preventDefault(); // Stops the page from refreshing automatically
        setErrorMessage(''); // Clear out any old errors

        // Check 1: Did they fill out their name?
        if (!firstName.trim()) {
            setErrorMessage('Please enter your first name.');
            return;
        }
        if (!lastName.trim()) {
            setErrorMessage('Please enter your last name.');
            return;
        }

        // Check 2: Did they leave the email box completely empty?
        if (!email.trim()) {
            setErrorMessage('Please enter your email address.');
            return;
        }

        // Check 3: Is it missing an @ symbol or a .com?
        if (!isValidEmail(email)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        // Check 4: Did they accept the terms?
        if (!acceptedTerms) {
            setErrorMessage('You must accept the terms and conditions.');
            return;
        }

        // If it passes both checks, start the spinning loading wheel
        setStatus('loading');

        try {
            // ---> SEND THE LEAD DATA TO GOOGLE SHEETS <---
            const result = await submitToGoogleSheets(firstName, lastName, email);

            if (result.status === 'success') {
                setStatus('success');
            } else {
                throw new Error('Submission failed.');
            }
        } catch {
            // If the internet cut out or the server broke
            setStatus('error');
            setErrorMessage('Something went wrong. Please try again.');
        }
    };

    // This gets called if they click "Use a different email" on the success screen
    const reset = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setAcceptedTerms(false);
        setStatus('idle');
        setErrorMessage('');
    };

    // Give all these states/functions back to the React component so it can use them
    return {
        firstName, setFirstName,
        lastName, setLastName,
        email, setEmail,
        acceptedTerms, setAcceptedTerms,
        status, visitCount, errorMessage, handleSubmit, reset
    };
};

export default useLeadForm;


```

## File: src\pages\Tools\BiddingOptimizer.css
```css
/* Layout Container */
.bidding-optimizer-page {
    padding-top: 120px;
    min-height: 80vh;
}

.optimizer-header {
    margin-bottom: 4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.optimizer-header h1 {
    margin: 0;
}

.optimizer-icon-ring {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    border-radius: 50%;
    background: rgba(229, 9, 20, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.optimizer-icon-ring::after {
    content: '';
    position: absolute;
    inset: -5px;
    border: 2px solid rgba(229, 9, 20, 0.2);
    border-radius: 50%;
    animation: rotatePulse 4s linear infinite;
}

@keyframes rotatePulse {
    0% {
        transform: scale(1) rotate(0deg);
        opacity: 0.8;
    }

    50% {
        transform: scale(1.1) rotate(180deg);
        opacity: 0.3;
    }

    100% {
        transform: scale(1) rotate(360deg);
        opacity: 0.8;
    }
}

/* Hover Instruction Cards */
.instruction-cards {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.instruction-card {
    width: 380px;
    height: 220px;
    perspective: 1000px;
    position: relative;
    cursor: pointer;
}

.instruction-card .card-front,
.instruction-card .card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
    border-radius: 16px;
    border: 1px solid var(--color-border);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: var(--color-bg-dark);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.instruction-card .card-front {
    transform: rotateY(0deg);
}

.instruction-card .card-back {
    transform: rotateY(180deg);
    background: var(--color-bg-light);
    border-color: rgba(229, 9, 20, 0.2);
    align-items: flex-start;
    padding: 2rem;
}

body.light-mode .instruction-card .card-back {
    background: linear-gradient(135deg, #f8f9fa, #ffffff);
}

.instruction-card:hover .card-front {
    transform: rotateY(-180deg);
}

.instruction-card:hover .card-back {
    transform: rotateY(0deg);
}

.card-front h3 {
    margin: 0 0 1rem 0;
    font-size: 1.4rem;
    font-family: var(--font-heading);
    color: var(--color-text);
}

.bounce-icon {
    color: var(--color-primary);
    animation: bounce 2s infinite;
}

@keyframes bounce {

    0%,
    20%,
    50%,
    80%,
    100% {
        transform: translateY(0);
    }

    40% {
        transform: translateY(-10px);
    }

    60% {
        transform: translateY(-5px);
    }
}

.card-back ul,
.card-back ol {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.95rem;
    color: var(--color-text-muted);
    text-align: left;
    line-height: 1.6;
}

.card-back li {
    margin-bottom: 0.35rem;
}

.card-back strong {
    color: var(--color-text);
}

/* Centered Stacked Layout */
.optimizer-card-container {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

/* Step Cards */
.optimizer-step-card {
    background: var(--color-bg-dark);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.step-header {
    background: rgba(229, 9, 20, 0.05);
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    border-bottom: 1px solid var(--color-border);
}

.step-number {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--color-primary), #bb0710);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
    font-family: var(--font-heading);
    box-shadow: 0 5px 15px rgba(229, 9, 20, 0.4);
    flex-shrink: 0;
}

.step-header h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    color: var(--color-text);
}

.step-header p {
    margin: 0;
    font-size: 0.95rem;
}

/* Step 1 Settings - Horizontally Stacked Grid */
.settings-grid {
    padding: 2.5rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    align-items: end;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.form-group label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.group-full-width {
    grid-column: 1 / -1;
}

/* Radio Pill Selectors */
.radio-pill-group {
    display: grid;
    gap: 0.75rem;
    background: rgba(0, 0, 0, 0.05);
    padding: 0.5rem;
    border-radius: 12px;
}

body.dark-mode .radio-pill-group {
    background: rgba(255, 255, 255, 0.03);
}

.radio-pill-group.triple {
    grid-template-columns: repeat(3, 1fr);
}

.radio-pill-group.double {
    grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 650px) {

    .radio-pill-group.triple,
    .radio-pill-group.double {
        grid-template-columns: 1fr;
    }
}

.radio-pill {
    position: relative;
    padding: 1rem;
    text-align: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color 0.3s ease, font-weight 0.3s ease;
    z-index: 1;
    overflow: hidden;
}

.radio-pill::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--color-primary);
    border-radius: 8px;
    z-index: -1;
    opacity: 0;
    transform: scale(0.95);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.radio-pill input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.radio-pill:hover:not(.active) {
    color: var(--color-text);
    background: rgba(229, 9, 20, 0.05);
}

.radio-pill.active {
    color: white;
    font-weight: 600;
}

.radio-pill.active::before {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 4px 15px rgba(229, 9, 20, 0.3);
}

.input-with-symbol {
    position: relative;
    display: flex;
    align-items: center;
}

.input-with-symbol .symbol {
    position: absolute;
    left: 1.25rem;
    color: var(--color-text-muted);
    font-weight: 500;
}

.input-with-symbol input {
    width: 100%;
    background: var(--color-bg-dark);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    padding: 1rem 1rem 1rem 2.5rem;
    border-radius: 12px;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
}

.input-with-symbol input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1);
}

/* Step 2 Upload Zone */
.step-content {
    padding: 2.5rem;
}

.upload-zone {
    position: relative;
    border: 2px dashed var(--color-border);
    border-radius: 20px;
    background: var(--color-bg-dark);
    transition: all 0.3s ease;
    text-align: center;
    overflow: hidden;
}

.upload-zone:hover {
    border-color: var(--color-primary);
    background: rgba(229, 9, 20, 0.02);
}

.upload-zone input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 10;
}

.upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 2rem;
    pointer-events: none;
}

.upload-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--color-bg-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    color: var(--color-primary);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.upload-content h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
}

.upload-content p {
    color: var(--color-text-muted);
    margin-bottom: 1rem;
}

.file-hint {
    background: var(--color-bg-light);
    padding: 0.5rem 1rem;
    border-radius: 100px;
    font-size: 0.85rem;
    color: var(--color-text-muted);
}

/* Error Banner */
.error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(229, 9, 20, 0.1);
    color: #ff4d4d;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    border: 1px solid rgba(229, 9, 20, 0.2);
}

/* Results Panel */
.results-panel {
    background: var(--color-bg-light);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.results-header {
    background: var(--color-bg-dark);
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border);
}

.file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.file-info h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
}

.file-info span {
    font-size: 0.85rem;
    color: var(--color-text-muted);
}

.results-actions {
    display: flex;
    gap: 1rem;
}

.results-actions button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.25rem;
    font-size: 0.9rem;
}

/* Loading State */
.parsing-state {
    padding: 6rem 2rem;
    text-align: center;
    color: var(--color-text-muted);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(229, 9, 20, 0.2);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Custom Table Pop Replacement styles */
.pop-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    margin-top: 2rem;
    overflow: hidden;
    border: 1px solid var(--color-border);
}

body.dark-mode .pop-card {
    background: var(--color-bg-dark);
}

.pop-card-header {
    display: flex;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
}

.pop-card-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.pop-step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    margin-right: 0.75rem;
}

.pop-card-body {
    padding: 1.5rem;
}

/* Helper flex wrapper for the search bar */
.pop-card-body .flex.gap-4 {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
}

.pop-card-body .flex-1 {
    flex: 1;
    min-width: 200px;
}

.pop-input {
    width: 100%;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: transparent;
    color: var(--color-text);
    transition: all 0.2s;
}

.pop-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(81, 113, 255, 0.2);
}

.pop-export-btn,
.pop-clear-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.pop-export-btn {
    background: #16a34a;
    color: white;
}

.pop-export-btn:hover:not(:disabled) {
    background: #15803d;
}

.pop-export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pop-clear-btn {
    background: #e5e7eb;
    color: #374151;
}

.pop-clear-btn:hover:not(:disabled) {
    background: #d1d5db;
}

body.dark-mode .pop-clear-btn {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
}

body.dark-mode .pop-clear-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
}

/* Table styles */
.pop-table-container {
    max-height: 600px;
    overflow-y: auto;
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-card);
}

.pop-table {
    width: 100%;
    text-align: left;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.875rem;
}

.pop-table thead {
    background: #f9fafb;
    position: sticky;
    top: 0;
    z-index: 10;
}

body.dark-mode .pop-table thead {
    background: #1f2937;
}

.pop-th {
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
    background: inherit;
}

.pop-table tbody tr {
    background: transparent;
    transition: background 0.15s;
}

.pop-table tbody tr:hover {
    background: rgba(0, 0, 0, 0.02);
}

body.dark-mode .pop-table tbody tr:hover {
    background: rgba(255, 255, 255, 0.03);
}

.pop-td {
    padding: 0.75rem 1rem;
    white-space: nowrap;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
}

.pop-table tbody tr:last-child .pop-td {
    border-bottom: none;
}

.pop-td .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Badge highlights simulating Tailwind utilities */
.pop-table .bg-blue-100 {
    background: #dbeafe;
    color: #1e3a8a;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
}

body.dark-mode .pop-table .dark\:bg-blue-200 {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
}

.pop-table .bg-red-100 {
    background: #fee2e2;
    color: #991b1b;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
}

body.dark-mode .pop-table .dark\:bg-red-900 {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
}

.pop-table .bg-green-100 {
    background: #dcfce3;
    color: #166534;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
}

body.dark-mode .pop-table .dark\:bg-green-900 {
    background: rgba(34, 197, 94, 0.2);
    color: #86efac;
}

/* Text colors */
.pop-td.text-green-600,
td .text-green-600 {
    color: #16a34a !important;
    font-weight: 700;
}

body.dark-mode .pop-td.dark\:text-green-400,
body.dark-mode td .dark\:text-green-400 {
    color: #4ade80 !important;
    font-weight: 700;
}
```

## File: src\pages\Tools\BiddingOptimizer.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { Upload, ChevronDown, Download, AlertCircle, Settings, X, FileSpreadsheet } from 'lucide-react';
import './BiddingOptimizer.css';
import * as XLSX from 'xlsx';

const BiddingOptimizer = () => {
    // Strategy Settings State
    const [strategy, setStrategy] = useState('inch-up-rpc');
    const [adType, setAdType] = useState('sponsored-products');
    const [targetRpc, setTargetRpc] = useState(2.50);
    const [minBid, setMinBid] = useState(0.25);
    const [maxBid, setMaxBid] = useState(5.00);

    // File State
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [results, setResults] = useState([]);

    // Datatable State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filterConfigs, setFilterConfigs] = useState({}); // { filterKey: [checkedValues] }
    const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);
    const [filterSearchQuery, setFilterSearchQuery] = useState('');
    const [tempSelections, setTempSelections] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [globalSearch, setGlobalSearch] = useState('');
    const itemsPerPage = 100;

    // UI State
    const [error, setError] = useState('');

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        if (!uploadedFile.name.endsWith('.xlsx')) {
            setError('Please upload a valid Excel (.xlsx) file.');
            return;
        }

        setError('');
        setFile(uploadedFile);
    };

    // Maintain the modified workbook data in memory for exporting later
    const [workbookData, setWorkbookData] = useState(null);

    // Re-parse when file or settings change
    useEffect(() => {
        if (file) {
            parseExcelInfo(file);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, adType, strategy, targetRpc, minBid, maxBid]);

    const parseExcelInfo = (uploadedFile) => {
        setIsParsing(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Log all available sheets in the file for debugging
                console.log('=== AVAILABLE SHEETS IN WORKBOOK ===', workbook.SheetNames);

                // Map adType UI value to the expected Amazon Bulk Ops sheet/tab name
                const sheetNameMap = {
                    'sponsored-products': [
                        'Sponsored Products Campaigns',
                        'SP Campaigns',
                        'Sponsored Products',
                    ],
                    'sponsored-brands': [
                        'Sponsored Brands Campaigns',
                        'SB Campaigns',
                        'Sponsored Brands',
                    ],
                    'sponsored-display': [
                        'Sponsored Display Campaigns',
                        'SD Campaigns',
                        'Sponsored Display',
                    ],
                };

                const preferredNames = sheetNameMap[adType] || [];
                const availableSheets = workbook.SheetNames;

                // Try to find matching sheet (case-insensitive)
                let sheetName = null;
                for (const preferred of preferredNames) {
                    const match = availableSheets.find(
                        s => s.toLowerCase().trim() === preferred.toLowerCase().trim()
                    );
                    if (match) { sheetName = match; break; }
                }

                // If no match found, fall back to sheet[0]
                if (!sheetName) {
                    sheetName = availableSheets[0];
                    console.warn(`No matching sheet found for adType "${adType}". Using first sheet: "${sheetName}"`);
                } else {
                    console.log(`Using sheet: "${sheetName}" for adType: "${adType}"`);
                }

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const processedResults = [];
                let modifiedData = [...jsonData]; // Copy to update bids

                // DEBUG: Log actual column headers from the Excel file
                if (modifiedData.length > 0) {
                    console.log('=== EXCEL COLUMN HEADERS ===');
                    console.log(JSON.stringify(Object.keys(modifiedData[0]), null, 2));
                    console.log('=== ROW COUNT ===', modifiedData.length);
                }

                // Amazon bulk ops column names can vary slightly
                // Helper: get value from row trying multiple possible column names (case-insensitive)
                const getVal = (row, ...keys) => {
                    const rowKeys = Object.keys(row);
                    for (const key of keys) {
                        // Try exact match first
                        if (row[key] !== undefined && row[key] !== '') return row[key];
                        // Try case-insensitive match
                        const lower = key.toLowerCase();
                        const match = rowKeys.find(k => k.toLowerCase() === lower);
                        if (match && row[match] !== undefined && row[match] !== '') return row[match];
                    }
                    return null;
                };

                let debugLoggedFirst = false;

                modifiedData.forEach((row, index) => {
                    const entity = getVal(row, 'Entity', 'Record Type') || '';
                    const entityLower = entity.toLowerCase();

                    // Only process Keyword and Product Targeting rows
                    if (entityLower === 'keyword' || entityLower === 'product targeting') {

                        // Read values using exact header names from the file
                        const campaign = getVal(row,
                            'Campaign name (Informational only)',
                            'Campaign Name (Informational only)',
                            'Campaign name',
                            'Campaign Name',
                            'Campaign'
                        ) || '';

                        const adGroup = getVal(row,
                            'Ad group name (Informational only)',
                            'Ad Group Name (Informational only)',
                            'Ad group name',
                            'Ad Group Name',
                            'Ad Group'
                        ) || '';

                        const target = getVal(row,
                            'Keyword text',
                            'Keyword Text',
                            'Product targeting expression',
                            'Product Targeting Expression',
                            'Targeting Expression',
                            'Targeting',
                            'Product Targeting ID'
                        ) || `Row ${index + 2}`;

                        const matchType = getVal(row, 'Match type', 'Match Type') || '';

                        const clicks = parseFloat(getVal(row, 'Clicks') || 0);
                        const spend = parseFloat(getVal(row, 'Spend') || 0);
                        const sales = parseFloat(getVal(row, 'Sales', '14 Day Total Sales', '30 Day Total Sales') || 0);
                        const impressions = parseInt(getVal(row, 'Impressions') || 0);
                        const orders = parseInt(getVal(row, 'Orders', '14 Day Total Orders', '30 Day Total Orders') || 0);
                        const units = parseInt(getVal(row, 'Units', '14 Day Total Units (#)', '30 Day Total Units (#)', '7 Day Total Units (#)') || 0);
                        const originalBid = parseFloat(getVal(row, 'Bid', 'Max Bid', 'Keyword Bid', 'Targeting Bid') || 0.50);

                        // DEBUG: Log first keyword/targeting row to verify column reading
                        if (!debugLoggedFirst) {
                            debugLoggedFirst = true;
                            console.log('=== FIRST KEYWORD/TARGETING ROW DEBUG ===');
                            console.log('Index:', index);
                            console.log('Entity:', entity);
                            console.log('Target:', target);
                            console.log('Campaign:', campaign);
                            console.log('Ad Group:', adGroup);
                            console.log('Match Type:', matchType);
                            console.log('Bid:', originalBid);
                            console.log('Clicks:', clicks, '| Spend:', spend, '| Sales:', sales);
                            console.log('Raw row keys:', Object.keys(row).join(', '));
                            console.log('Raw Campaign name (Info):', row['Campaign name (Informational only)']);
                            console.log('Raw Ad group name (Info):', row['Ad group name (Informational only)']);
                            console.log('Raw Keyword text:', row['Keyword text']);
                            console.log('Raw Product targeting expression:', row['Product targeting expression']);
                            console.log('Raw Bid:', row['Bid']);
                        }

                        let suggestedBid = originalBid;
                        let reason = 'Ignored (No clicks/spend)';
                        let ruleCategory = 'No Action';
                        let modified = false;

                        const historicalRpc = clicks > 0 ? sales / clicks : 0;

                        if (strategy === 'inch-up-rpc' && clicks <= 3) {
                            reason = `Inch Up: ${clicks} clicks - Data collection phase`;
                            ruleCategory = 'Inch Up';
                            suggestedBid = originalBid * 1.10;
                            modified = true;
                        } else {
                            if (historicalRpc > 0) {
                                const ratio = targetRpc / historicalRpc;
                                suggestedBid = originalBid * ratio;
                                reason = `RPC Bidding: Current RPC $${historicalRpc.toFixed(2)} -> Target RPC $${targetRpc.toFixed(2)}`;
                                ruleCategory = 'RPC Bidding';
                            } else {
                                suggestedBid = originalBid * 1.05;
                                reason = `RPC Bidding: Current RPC $0.00 -> Target RPC $${targetRpc.toFixed(2)}`;
                                ruleCategory = 'RPC Bidding';
                            }
                            modified = true;
                        }

                        if (modified) {
                            // CLAMP to Min/Max Bounds
                            suggestedBid = Math.round(Math.max(minBid, Math.min(maxBid, suggestedBid)) * 100) / 100;

                            // Update bid in the original data for export
                            const bidKeys = ['Bid', 'Max Bid', 'Keyword Bid', 'Targeting Bid'];
                            const rowKeys = Object.keys(row);
                            let bidUpdated = false;
                            for (const bk of bidKeys) {
                                const matchKey = rowKeys.find(k => k.toLowerCase() === bk.toLowerCase());
                                if (matchKey) {
                                    row[matchKey] = suggestedBid;
                                    bidUpdated = true;
                                    break;
                                }
                            }
                            if (!bidUpdated) row['Bid'] = suggestedBid;

                            // Calculate display metrics
                            const acos = sales > 0 ? (spend / sales) * 100 : 0;
                            const roas = spend > 0 ? sales / spend : 0;
                            const cpc = clicks > 0 ? spend / clicks : 0;
                            const rpc = clicks > 0 ? sales / clicks : 0;
                            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                            const cr = clicks > 0 ? (orders / clicks) * 100 : 0;
                            const changePct = originalBid > 0 ? ((suggestedBid - originalBid) / originalBid) * 100 : 0;

                            processedResults.push({
                                id: index,
                                keyword: target,
                                campaign: campaign || 'Unknown Campaign',
                                adGroup: adGroup || 'Unknown Ad Group',
                                originalBid,
                                suggestedBid,
                                changePct,
                                clicks,
                                impressions,
                                spend,
                                sales,
                                orders,
                                units,
                                acos,
                                roas,
                                cpc,
                                rpc,
                                ctr,
                                cr,
                                reason,
                                ruleCategory
                            });
                        }
                    }
                });

                const totalSales = processedResults.reduce((sum, item) => sum + item.sales, 0);
                const totalSpend = processedResults.reduce((sum, item) => sum + item.spend, 0);

                processedResults.forEach(item => {
                    item.salesPercent = totalSales > 0 ? (item.sales / totalSales) * 100 : 0;
                    item.spendPercent = totalSpend > 0 ? (item.spend / totalSpend) * 100 : 0;
                });

                setResults(processedResults); // Display all, pagination handles slicing ui

                // Store updated data
                setWorkbookData({
                    originalWorkbook: workbook,
                    sheetName: sheetName,
                    modifiedJson: modifiedData
                });

                setError(processedResults.length === 0 ? 'No Keyword/Targeting rows found with actionable clicks/spend.' : '');
                setIsParsing(false);

            } catch (err) {
                console.error(err);
                setError('Failed to parse Excel file. Ensure it is a valid Amazon Ads Bulk Operations file.');
                setIsParsing(false);
            }
        };

        reader.onerror = () => {
            setError('Error reading file.');
            setIsParsing(false);
        };

        reader.readAsArrayBuffer(uploadedFile);
    };

    const clearFile = () => {
        setFile(null);
        setResults([]);
        setError('');
        setWorkbookData(null);
    };

    const handleExport = () => {
        if (!workbookData || results.length === 0) return;

        try {
            // Create a new array of objects for the export containing ONLY modified rows
            const exportData = results.map(item => {
                const row = workbookData.modifiedJson[item.id];

                // Clone the row so we don't mutate the original in memory
                const exportRow = { ...row };

                // Set Operation to Update
                exportRow['Operation'] = 'Update';

                // Ensure Bid is appropriately set to the suggested bid
                const bidKeys = ['Bid', 'Max Bid', 'Keyword Bid', 'Targeting Bid'];
                const rowKeys = Object.keys(exportRow);
                let bidUpdated = false;
                for (const bk of bidKeys) {
                    const matchKey = rowKeys.find(k => k.toLowerCase() === bk.toLowerCase());
                    if (matchKey) {
                        exportRow[matchKey] = item.suggestedBid;
                        bidUpdated = true;
                        break;
                    }
                }
                if (!bidUpdated) exportRow['Bid'] = item.suggestedBid;

                // Append custom tracking columns
                exportRow['Condition'] = item.reason;
                exportRow['Bid Type'] = item.ruleCategory;
                exportRow['Old Bid'] = item.originalBid;
                exportRow['Bid Adjust'] = item.changePct;
                exportRow['Min Bid'] = minBid;
                exportRow['Max Bid'] = maxBid;

                return exportRow;
            });

            // Convert our export data back to a new worksheet
            const newWorksheet = XLSX.utils.json_to_sheet(exportData);

            // Create a new workbook with just the optimized sheet
            const newWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, workbookData.sheetName);

            // Generate Excel file and trigger download
            const fileName = `Optimized_${file.name}`;
            XLSX.writeFile(newWorkbook, fileName);

        } catch (err) {
            console.error(err);
            setError('Failed to generate export file.');
        }
    };

    // --- DATATABLE LOGIC ---
    const columns = [
        { label: 'Target', key: 'keyword' },
        { label: 'Campaign Name', key: 'campaign' },
        { label: 'Ad Group', key: 'adGroup' },
        { label: 'Strategy', key: 'ruleCategory' },
        { label: 'Condition', key: 'reason' },
        { label: 'Bid', key: 'originalBid', isNumeric: true, prefix: '$' },
        { label: 'New Bid', key: 'suggestedBid', isNumeric: true, prefix: '$' },
        { label: 'Change', key: 'changePct', isNumeric: true, suffix: '%' },
        { label: 'Sales', key: 'sales', isNumeric: true, prefix: '$' },
        { label: 'Spend', key: 'spend', isNumeric: true, prefix: '$' },
        { label: 'Impressions', key: 'impressions', isNumeric: true },
        { label: 'Clicks', key: 'clicks', isNumeric: true },
        { label: 'Orders', key: 'orders', isNumeric: true },
        { label: 'Units', key: 'units', isNumeric: true },
        { label: 'ACOS (%)', key: 'acos', isNumeric: true, suffix: '%' },
        { label: 'ROAS', key: 'roas', isNumeric: true },
        { label: 'CPC', key: 'cpc', isNumeric: true, prefix: '$' },
        { label: 'RPC', key: 'rpc', isNumeric: true, prefix: '$' },
        { label: 'CTR (%)', key: 'ctr', isNumeric: true, suffix: '%' },
        { label: 'CR (%)', key: 'cr', isNumeric: true, suffix: '%' },
        { label: 'Sales %', key: 'salesPercent', isNumeric: true, suffix: '%' },
        { label: 'Spend %', key: 'spendPercent', isNumeric: true, suffix: '%' }
    ];

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleFilterDropdown = (key) => {
        if (activeFilterDropdown === key) {
            setActiveFilterDropdown(null);
        } else {
            setActiveFilterDropdown(key);
            setTempSelections(filterConfigs[key] || []);
            setFilterSearchQuery('');
        }
    };

    const toggleFilterSelection = (value) => {
        setTempSelections(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    };

    const selectAllFilter = (key, filteredOptions) => {
        if (tempSelections.length === filteredOptions.length) {
            setTempSelections([]); // Deselect all
        } else {
            setTempSelections(filteredOptions); // Select all
        }
    };

    const applyFilter = (key) => {
        setFilterConfigs(prev => ({
            ...prev,
            [key]: tempSelections
        }));
        setActiveFilterDropdown(null);
        setCurrentPage(1);
    };

    const clearFilter = (key) => {
        setFilterConfigs(prev => {
            const newConfigs = { ...prev };
            delete newConfigs[key];
            return newConfigs;
        });
        setActiveFilterDropdown(null);
        setCurrentPage(1);
    };

    const getUniqueValues = (key) => {
        const unique = [...new Set(results.map(item => item[key]))];
        unique.sort((a, b) => {
            if (typeof a === 'number') return a - b;
            return String(a).localeCompare(String(b));
        });
        return unique;
    };

    // Filter and Sort Data
    let processedData = [...results];

    // 1. Global Search
    if (globalSearch) {
        const lowerSearch = globalSearch.toLowerCase();
        processedData = processedData.filter(row =>
            Object.values(row).some(val =>
                String(val).toLowerCase().includes(lowerSearch)
            )
        );
    }

    // 2. Column Filters
    Object.keys(filterConfigs).forEach(key => {
        const selectedValues = filterConfigs[key];
        if (selectedValues && selectedValues.length > 0) {
            processedData = processedData.filter(row => selectedValues.includes(row[key]));
        }
    });

    // 3. Sorting
    if (sortConfig.key) {
        processedData.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // 4. Pagination
    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
    const paginatedData = processedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="bidding-optimizer-page section">
            {/* Header Section */}
            <div className="container">
                <div className="optimizer-header text-center">
                    <div className="optimizer-icon-ring">
                        <FileSpreadsheet size={40} color="var(--color-primary)" />
                    </div>
                    <h1>Amazon Bidding Optimizer</h1>
                    <p className="text-muted mx-auto" style={{ maxWidth: '800px', margin: '1rem auto 2.5rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
                        Automatically adjust your keyword and product targeting bids based on hard performance data.
                    </p>

                    {/* Instruction Cards (Hover Reveal) */}
                    <div className="instruction-cards">
                        <div className="instruction-card">
                            <div className="card-front">
                                <h3>What this tool does</h3>
                                <ChevronDown className="bounce-icon" />
                            </div>
                            <div className="card-back">
                                <ul>
                                    <li><strong>Smart Bidding:</strong> Uses "Inch Up" & RPC methodology.</li>
                                    <li><strong>Performance-Based:</strong> Adjusts with custom thresholds.</li>
                                    <li><strong>Constraints:</strong> Target RPC & Min/Max limits.</li>
                                    <li><strong>Real-time Output:</strong> Calculates changes instantly.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="instruction-card">
                            <div className="card-front">
                                <h3>How to use</h3>
                                <ChevronDown className="bounce-icon" />
                            </div>
                            <div className="card-back">
                                <ol>
                                    <li>Download Operations file from Amazon.</li>
                                    <li>Select Ad Type & Strategy below.</li>
                                    <li>Upload the Excel file to the dropzone.</li>
                                    <li>Review the optimization results table.</li>
                                    <li>Download the newly optimized file.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="optimizer-card-container">
                    {/* STEP 1: SETTINGS */}
                    <div className="optimizer-step-card">
                        <div className="step-header">
                            <div className="step-number">1</div>
                            <div>
                                <h2>Optimization Strategy</h2>
                                <p className="text-muted">Configure the rules for how the AI adjusts your bids</p>
                            </div>
                        </div>

                        <div className="settings-grid">
                            <div className="form-group group-full-width">
                                <label>Select Ad Type</label>
                                <div className="radio-pill-group triple">
                                    <label className={`radio-pill ${adType === 'sponsored-products' ? 'active' : ''}`}>
                                        <input type="radio" value="sponsored-products" checked={adType === 'sponsored-products'} onChange={(e) => setAdType(e.target.value)} />
                                        Sponsored Products
                                    </label>
                                    <label className={`radio-pill ${adType === 'sponsored-brands' ? 'active' : ''}`}>
                                        <input type="radio" value="sponsored-brands" checked={adType === 'sponsored-brands'} onChange={(e) => setAdType(e.target.value)} />
                                        Sponsored Brands
                                    </label>
                                    <label className={`radio-pill ${adType === 'sponsored-display' ? 'active' : ''}`}>
                                        <input type="radio" value="sponsored-display" checked={adType === 'sponsored-display'} onChange={(e) => setAdType(e.target.value)} />
                                        Sponsored Display
                                    </label>
                                </div>
                            </div>

                            <div className="form-group group-full-width">
                                <label>Bidding Strategy</label>
                                <div className="radio-pill-group double">
                                    <label className={`radio-pill ${strategy === 'inch-up-rpc' ? 'active' : ''}`}>
                                        <input type="radio" value="inch-up-rpc" checked={strategy === 'inch-up-rpc'} onChange={(e) => setStrategy(e.target.value)} />
                                        Inch Up + RPC Bidding
                                    </label>
                                    <label className={`radio-pill ${strategy === 'rpc-only' ? 'active' : ''}`}>
                                        <input type="radio" value="rpc-only" checked={strategy === 'rpc-only'} onChange={(e) => setStrategy(e.target.value)} />
                                        Strict RPC Bidding
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Target Revenue Per Click (RPC)</label>
                                <div className="input-with-symbol">
                                    <span className="symbol">$</span>
                                    <input
                                        type="number"
                                        min="0.10"
                                        step="0.10"
                                        value={targetRpc}
                                        onChange={(e) => setTargetRpc(parseFloat(e.target.value))}
                                        placeholder="2.50"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Min Bid Limit</label>
                                <div className="input-with-symbol">
                                    <span className="symbol">$</span>
                                    <input
                                        type="number"
                                        min="0.05"
                                        step="0.05"
                                        value={minBid}
                                        onChange={(e) => setMinBid(parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Max Bid Limit</label>
                                <div className="input-with-symbol">
                                    <span className="symbol">$</span>
                                    <input
                                        type="number"
                                        min="0.50"
                                        step="0.10"
                                        value={maxBid}
                                        onChange={(e) => setMaxBid(parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: UPLOAD & RESULTS */}
                    <div className="optimizer-step-card">
                        <div className="step-header">
                            <div className="step-number">2</div>
                            <div>
                                <h2>Process Data</h2>
                                <p className="text-muted">Upload your bulk operations file to generate the optimized output</p>
                            </div>
                        </div>

                        <div className="step-content">
                            {/* Upload Zone */}
                            {!file && (
                                <div className="upload-zone">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        id="file-upload"
                                        onChange={handleFileUpload}
                                    />
                                    <label htmlFor="file-upload" className="upload-content">
                                        <div className="upload-icon">
                                            <Upload size={32} />
                                        </div>
                                        <h3>Upload Bulk Operations File</h3>
                                        <p>Drag and drop your Amazon Ads Excel file here, or click to browse.</p>
                                        <span className="file-hint">Supported formats: .xlsx from Amazon Ads Console</span>
                                    </label>
                                </div>
                            )}

                            {error && (
                                <div className="error-banner">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Results / Processing State placed OUTSIDE the main container to allow full width */}
                        </div>
                    </div>
                </div> {/* End of .optimizer-card-container */}
            </div> {/* End of .container */}

            {/* FULL WIDTH RESULTS */}
            {file && (
                <div className="w-full" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
                    <div className="pop-card mt-8">
                        <div className="pop-card-header">
                            <div className="pop-step-number">3</div>
                            <h3 className="text-base tracking-wide">Optimization Results</h3>
                        </div>

                        <div className="pop-card-body p-4 bg-white dark:bg-[var(--color-bg-dark)]">
                            <div className="mb-4">
                                <div className="flex gap-4 items-center flex-wrap">
                                    <div className="flex-1 min-w-[200px]">
                                        <input
                                            id="search-results"
                                            placeholder="Type to search globally across all fields..."
                                            className="pop-input w-full text-sm"
                                            type="text"
                                            value={globalSearch}
                                            onChange={(e) => setGlobalSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative inline-block">
                                        <button onClick={handleExport} disabled={isParsing || processedData.length === 0} className="pop-export-btn inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-white/10 hover:shadow-lg hover:shadow-black/20 focus:ring-[#5171ff] text-sm bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg whitespace-nowrap">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download w-4 h-4 mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                                            Export Optimized Bulksheet ({processedData.length})
                                        </button>
                                    </div>
                                    <button onClick={clearFile} disabled={isParsing} className="pop-clear-btn inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-gray-300 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg whitespace-nowrap dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600">
                                        <X size={16} className="mr-2" /> Clear All
                                    </button>
                                </div>
                            </div>

                            <div className="pop-table-container relative overflow-x-auto shadow-md sm:rounded-lg border border-gray-200 dark:border-gray-700" style={{ maxHeight: '600px' }}>
                                {isParsing ? (
                                    <div className="parsing-state p-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="spinner mx-auto mb-4"></div>
                                        <p>Analyzing targeting performance and calculating optimal bids...</p>
                                    </div>
                                ) : (
                                    <table className="pop-table w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10 shadow-sm leading-normal">
                                            <tr>
                                                {columns.map(col => (
                                                    <th key={col.key} className="pop-th relative group px-4 py-3 bg-[#f8fafc] text-gray-700 font-semibold text-left tracking-wide border-b border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap shadow-sm select-none">
                                                        <div className="flex items-center justify-between space-x-2 cursor-pointer" onClick={() => handleSort(col.key)}>
                                                            <span>{col.label}</span>
                                                            {/* Sort Icons */}
                                                            <div className="flex flex-col ml-1 text-gray-300 dark:text-gray-600 opacity-50 group-hover:opacity-100 transition-opacity">
                                                                <svg width="12" height="12" className={`-mb-1 ${sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'text-[#5171ff] dark:text-[#5171ff]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                                                                <svg width="12" height="12" className={`${sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'text-[#5171ff] dark:text-[#5171ff]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                            </div>
                                                        </div>

                                                        {/* Filter Toggle Button */}
                                                        {['campaign', 'adGroup', 'ruleCategory', 'keyword'].includes(col.key) && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleFilterDropdown(col.key); }}
                                                                className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 ${filterConfigs[col.key] ? 'text-white bg-[#5171ff] shadow-md hover:bg-blue-600 ring-2 ring-white ring-offset-1' : 'text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 border border-gray-200 shadow-sm'}`}
                                                            >
                                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                                                            </button>
                                                        )}

                                                        {/* Filter Dropdown */}
                                                        {activeFilterDropdown === col.key && (
                                                            <div className="absolute top-full left-0 mt-1 min-w-[200px] w-max bg-white border border-gray-200 rounded shadow-lg z-50 dark:bg-gray-800 dark:border-gray-600" onClick={e => e.stopPropagation()}>
                                                                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="text"
                                                                            className="w-full px-2 py-1 text-xs border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                                            placeholder="Search..."
                                                                            value={filterSearchQuery}
                                                                            onChange={e => setFilterSearchQuery(e.target.value)}
                                                                        />
                                                                        <button
                                                                            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-200 whitespace-nowrap"
                                                                            onClick={() => selectAllFilter(col.key, getUniqueValues(col.key).filter(v => String(v).toLowerCase().includes(filterSearchQuery.toLowerCase())))}
                                                                        >All</button>
                                                                    </div>
                                                                </div>
                                                                <div className="max-h-40 overflow-y-auto p-1 space-y-1">
                                                                    {getUniqueValues(col.key)
                                                                        .filter(v => String(v).toLowerCase().includes(filterSearchQuery.toLowerCase()))
                                                                        .map((val, idx) => (
                                                                            <label key={idx} className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="w-3 h-3 text-blue-600 rounded"
                                                                                    checked={tempSelections.includes(val)}
                                                                                    onChange={() => toggleFilterSelection(val)}
                                                                                />
                                                                                <span className="text-xs truncate" title={val}>{val}</span>
                                                                            </label>
                                                                        ))}
                                                                </div>
                                                                <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
                                                                    <button className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => applyFilter(col.key)}>Apply</button>
                                                                    <button className="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700" onClick={() => clearFilter(col.key)}>Clear</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedData.map((row) => (
                                                <tr key={row.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                                                    {columns.map(col => {
                                                        const val = row[col.key];

                                                        // Special formatting overrides
                                                        if (col.key === 'ruleCategory') {
                                                            return <td key={col.key} className="pop-td"><span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-900">{val}</span></td>;
                                                        }
                                                        if (col.key === 'reason') {
                                                            return <td key={col.key} className="pop-td text-xs text-gray-500 italic dark:text-gray-400">{val}</td>;
                                                        }
                                                        if (col.key === 'suggestedBid') {
                                                            return <td key={col.key} className="pop-td font-bold text-green-600 dark:text-green-400">${val.toFixed(2)}</td>;
                                                        }
                                                        if (col.key === 'changePct') {
                                                            return (
                                                                <td key={col.key} className="pop-td">
                                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${val > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : val < 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                                        {val > 0 ? '+' : ''}{val.toFixed(1)}%
                                                                    </span>
                                                                </td>
                                                            );
                                                        }

                                                        // Default rendering
                                                        let displayVal = val;

                                                        if (col.isNumeric && val != null) {
                                                            if (['impressions', 'clicks', 'orders', 'units'].includes(col.key)) {
                                                                displayVal = val.toLocaleString(undefined, { maximumFractionDigits: 0 });
                                                            } else if (['sales', 'spend'].includes(col.key)) {
                                                                displayVal = val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                                                            } else if (['changePct', 'acos', 'ctr', 'cr', 'salesPercent', 'spendPercent'].includes(col.key)) {
                                                                displayVal = val.toFixed(1);
                                                            } else {
                                                                displayVal = val.toFixed(2);
                                                            }
                                                        }

                                                        return (
                                                            <td key={col.key} className="pop-td font-medium text-gray-900 dark:text-gray-200" title={val}>
                                                                <div className={`${['keyword', 'campaign', 'adGroup'].includes(col.key) ? 'truncate max-w-[200px]' : ''}`}>
                                                                    {col.prefix}{displayVal}{col.suffix}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                            {paginatedData.length === 0 && !isParsing && (
                                                <tr>
                                                    <td colSpan={columns.length} className="text-center py-8 text-gray-500">No optimized rows found matching priorities/filters.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Pagination Controls */}
                            {!isParsing && processedData.length > 0 && (
                                <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 border-t pt-5 pb-2 px-2 dark:border-gray-700">
                                    <div className="flex items-center gap-2 font-medium">
                                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 font-medium text-sm rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:shadow disabled:hover:shadow-sm dark:bg-[var(--color-bg-dark)] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex space-x-1.5">
                                            {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                                                // Simple windowing logic
                                                let p = currentPage - 2 + idx;
                                                if (currentPage <= 3) p = idx + 1;
                                                else if (currentPage >= totalPages - 2) p = totalPages - 4 + idx;

                                                if (p > 0 && p <= totalPages) {
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => setCurrentPage(p)}
                                                            className={`w-9 h-9 flex items-center justify-center font-semibold text-sm rounded-lg border shadow-sm transition-all ${currentPage === p ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow dark:bg-[var(--color-bg-dark)] dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800'}`}
                                                        >
                                                            {p}
                                                        </button>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 font-medium text-sm rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:shadow disabled:hover:shadow-sm dark:bg-[var(--color-bg-dark)] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BiddingOptimizer;

```

## File: src\pages\Tools\ToolsIndex.css
```css
.tools-dashboard {
    min-height: 80vh;
    padding-top: 120px;
    /* Accounts for fixed navbar */
}

.tools-header {
    margin-bottom: 4rem;
}

.tools-header-icon {
    margin-bottom: 1rem;
    filter: drop-shadow(0 0 20px rgba(229, 9, 20, 0.4));
}

.tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.tool-card {
    background: var(--color-bg-dark);
    border: 1px solid var(--color-border);
    border-radius: 24px;
    padding: 2.5rem;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    isolation: isolate;
    overflow: hidden;
}

/* Hover glow effect */
.tool-card::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(229, 9, 20, 0.05), transparent 40%);
    opacity: 0;
    transition: opacity 0.5s ease;
    z-index: -1;
}

.tool-card:hover {
    transform: translateY(-5px);
    border-color: rgba(229, 9, 20, 0.3);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

body.light-mode .tool-card:hover {
    box-shadow: 0 20px 40px rgba(229, 9, 20, 0.08);
}

.tool-card:hover::before {
    opacity: 1;
}

/* Coming Soon State */
.tool-card.disabled {
    opacity: 0.7;
}

.tool-card.disabled:hover {
    transform: none;
    border-color: var(--color-border);
    box-shadow: none;
}

.tool-card.disabled:hover::before {
    opacity: 0;
}

.tool-badge {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: var(--color-primary);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 0 15px rgba(229, 9, 20, 0.4);
}

/* Icon container */
.tool-icon-wrapper {
    background: linear-gradient(135deg, var(--color-primary), #bb0710);
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    box-shadow: 0 10px 20px rgba(229, 9, 20, 0.3);
}

.tool-card h3 {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
    font-family: var(--font-heading);
    color: var(--color-text);
}

.tool-card p {
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 2rem;
    flex-grow: 1;
}

.tool-card button {
    width: 100%;
    margin-top: auto;
    font-weight: 600;
}
```

## File: src\pages\Tools\ToolsIndex.jsx
```javascript
import React from 'react';
import { Rocket, Calculator, Image as ImageIcon, LineChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ToolsIndex.css';

const toolsList = [
    {
        id: 'bidding-optimizer',
        title: 'Bidding Optimizer',
        description: 'Auto-adjust keyword bids using smart Inch Up and RPC targeting to maximize PPC profitability.',
        icon: <Calculator size={32} color="white" />,
        path: '/tools/bidding-optimizer',
        badge: 'New',
        isReady: true
    },
    {
        id: 'ai-listing',
        title: 'AI Listing Generator',
        description: 'Generate stunning, conversion-optimized Amazon product images instantly using AI.',
        icon: <ImageIcon size={32} color="white" />,
        path: '#',
        badge: null,
        isReady: false
    },
    {
        id: 'competitor-analysis',
        title: 'Competitor Tracker',
        description: 'Monitor competitor pricing, reviews, and rank changes to stay one step ahead.',
        icon: <LineChart size={32} color="white" />,
        path: '#',
        badge: null,
        isReady: false
    }
];

const ToolsIndex = () => {
    const navigate = useNavigate();

    return (
        <section className="tools-dashboard container section">
            <div className="tools-header text-center">
                <Rocket size={48} color="var(--color-primary)" className="tools-header-icon" />
                <h1>Seller AI Tools</h1>
                <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    Access our suite of proprietary tools designed specifically to give Amazon sellers an unfair competitive advantage.
                </p>
            </div>

            <div className="tools-grid">
                {toolsList.map((tool) => (
                    <div className={`tool-card ${!tool.isReady ? 'disabled' : ''}`} key={tool.id}>
                        {tool.badge && <span className="tool-badge">{tool.badge}</span>}
                        <div className="tool-icon-wrapper">
                            {tool.icon}
                        </div>
                        <h3>{tool.title}</h3>
                        <p className="text-muted">{tool.description}</p>

                        <button
                            className={`btn ${tool.isReady ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => tool.isReady && navigate(tool.path)}
                            disabled={!tool.isReady}
                        >
                            {tool.isReady ? 'Open Tool' : 'Coming Soon'}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ToolsIndex;

```

