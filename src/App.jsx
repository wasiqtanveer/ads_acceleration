import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CustomCursor from './components/layout/CustomCursor';
import Home from './pages/Home/Home';
import ToolsIndex from './pages/Tools/ToolsIndex';
import BiddingOptimizer from './pages/Tools/BiddingOptimizer';
import CampaignBuilder from './pages/Tools/CampaignBuilder';
import NgramAnalyzer from './pages/Tools/NgramAnalyzer';
import MissingOpportunityGenerator from './pages/Tools/MissingOpportunityGenerator';
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
            <Route path="/tools/campaign-builder" element={<CampaignBuilder />} />
            <Route path="/tools/ngram-analyzer" element={<NgramAnalyzer />} />
            <Route path="/tools/missing-opportunity-generator" element={<MissingOpportunityGenerator />} />
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
