import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CustomCursor from './components/layout/CustomCursor';
import Home from './pages/Home/Home';
import ToolsIndex from './pages/Tools/ToolsIndex';
import Login from './pages/Auth/Login';
import Pricing from './pages/Home/Pricing';

// Dummy imports for other links
const Signup = () => <div className="container section text-center" style={{ minHeight: '50vh', paddingTop: '10vh' }}><h1>Sign Up</h1><p style={{ color: 'var(--color-primary)' }}>Coming Soon</p></div>;

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <CustomCursor />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tools" element={<ToolsIndex />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/faq" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
