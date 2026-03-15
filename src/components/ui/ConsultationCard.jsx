import React from 'react';
import { Calendar, Linkedin, Rocket, Clock, ArrowRight } from 'lucide-react';
import FarhanImage from '../../assets/images/farhan.png';
import './ConsultationCard.css';

const ConsultationCard = () => {
    return (
        <div className="consultation-card-wrapper">
            <div className="consultation-grid">
                
                {/* Left Column: Text & CTA */}
                <div className="consultation-left">
                    <div className="consultation-brand">
                        <Rocket size={18} className="brand-icon" />
                        <span className="brand-name">Ads Acceleration</span>
                    </div>

                    <div className="consultation-badge">Free Strategy Call</div>

                    <h2 className="consultation-heading">
                        Scaling Amazon Ads for<br/>
                        <span className="consultation-heading-accent">Million-Dollar Brands</span>
                    </h2>

                    <p className="consultation-subtext">
                        Rule-Based Automation, Profit & Organic Ranking — Supporting 8-Figure Brands with an In-House PPC Team.
                    </p>

                    <div className="consultation-details">
                        <div className="consultation-detail-item">
                            <Calendar size={20} className="detail-icon" />
                            <div>
                                <strong>Consultation</strong>
                                <span>1-on-1 Strategy</span>
                            </div>
                        </div>
                        <div className="consultation-detail-item">
                            <Clock size={20} className="detail-icon" />
                            <div>
                                <strong>Online Call</strong>
                                <span>30 Minutes</span>
                            </div>
                        </div>
                    </div>

                    <div className="consultation-actions">
                        {/* Replace this Calendly link with your actual Calendly URL later */}
                        <a
                            href="https://calendly.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                        >
                            <Calendar size={17} />
                            Schedule a Call
                        </a>
                        <a
                            href="https://www.linkedin.com/in/miuhammadfarhanwaqarbutt/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline"
                        >
                            <Linkedin size={17} />
                            Connect on LinkedIn
                        </a>
                    </div>
                </div>

                {/* Right Column: Image & Name */}
                <div className="consultation-right">
                    <div className="consultation-image-container">
                        {/* Placeholder for future image */}
                        <div className="consultation-image-placeholder">
                            {FarhanImage && <img src={FarhanImage} alt="Farhan Waqar" />}
                        </div>

                        
                        {/* The floating Name Card */}
                        <div className="consultation-name-card">
                            <strong>Farhan Waqar</strong>
                            <span>Founder of Ads Acceleration - Helping Sellers with Ads Management</span>
                        </div>

                        {/* Arrow button overlapping the right edge */}
                        <a 
                            href="https://calendly.com/m-farhanwaqar/30min" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="consultation-arrow-btn"
                        >
                            <span className="consultation-arrow-text">Let's discuss</span>
                            <ArrowRight size={20} className="consultation-arrow-icon" />
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ConsultationCard;
