import React from 'react';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section footer-brand">
          <div className="footer-logo-container">
            <div className="logo-badge footer-logo-badge" aria-hidden="true">
              <img src="/LT.png" alt="L&T Logo" className="footer-logo" />
            </div>
            <div className="footer-brand-text">
              <h4>L&T-CORe</h4>
              <p className="footer-tagline">Component Obsolescence & Resilience Engine</p>
            </div>
          </div>
          <p className="footer-description">
            An intelligent system that automates FFF analysis to prevent costly line-down situations 
            and redesigns by managing End-of-Life component risks.
          </p>
        </div>
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#dashboard">Dashboard</a></li>
            <li><a href="#analysis">Analysis</a></li>
            <li><a href="#reports">Reports</a></li>
            <li><a href="#history">History</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li><a href="#help">Help Center</a></li>
            <li><a href="#docs">Documentation</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>About</h4>
          <p>Version 1.0.0</p>
          <p>Powered by AI & Cross-API Integration</p>
          <p className="footer-about-text">
            Component Obsolescence: Managing EOL part risks<br/>
            Resilience: Automated FFF analysis for supply chain resilience<br/>
            Engine: AI-powered intelligent processing system
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {currentYear} L&T-CORe. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
