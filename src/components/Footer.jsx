import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <img src="/LT.png" alt="L&T Logo" className="footer-logo" />
          <span className="footer-brand-text">L&T Technology Services</span>
        </div>
        <div className="footer-info">
          <span>L&T - CORe v1.0.0</span>
          <span className="footer-divider">|</span>
          <span>Component Obsolescence & Resilience Engine</span>
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} Larsen & Toubro Limited. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
