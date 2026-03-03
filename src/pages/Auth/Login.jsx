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
