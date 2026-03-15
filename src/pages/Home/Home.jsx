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
            {/* <MarqueeLogos />
            <Features />
            <MarqueeText text="SCALE YOUR BRAND • AI POWERED • DOMINATE AMAZON" /> */}
            <Testimonials />
            {/* <FAQ /> */}
        </div>
    );
};

export default Home;
