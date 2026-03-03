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
