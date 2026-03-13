import React from 'react';
import { Calendar, Linkedin, Sparkles } from 'lucide-react';
import './ConsultationCard.css';

const ConsultationCard = () => {
    return (
        <div className="consultation-card-wrapper">

            {/* Top label bar */}
            <div className="consultation-card-topbar">
                <Sparkles size={14} className="topbar-icon" />
                <span>Are you a Brand Founder or Seller?</span>
                <span className="topbar-badge">Free Strategy Call</span>
            </div>

            {/* Main body */}
            <div className="consultation-card-content">
                <h2 className="consultation-heading">
                    Fix your broken PPC with a{' '}
                    <span className="consultation-heading-accent">free strategy call</span>
                </h2>

                <p className="consultation-subtext">
                    Your in-house Amazon PPC team is one call away. Get a personalised audit and actionable recommendations — no strings attached.
                </p>

                {/* Decorative divider */}
                <div className="consultation-divider">
                    <span />
                    <span />
                    <span />
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
                        Connect with Farhan Waqar
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ConsultationCard;
