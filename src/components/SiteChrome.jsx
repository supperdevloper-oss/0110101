import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Languages, Menu, Moon, Sun, X, MessageSquare, Image as ImageIcon, Sparkles } from 'lucide-react';
import { languages, tools } from '../data.js';

function Brand() {
  return <Link className="brand" to="/" aria-label="ImagePrompt.org home">
    <span className="brand-mark"><ImageIcon size={23} strokeWidth={2.6} /><Sparkles className="brand-sparkle" size={10} fill="currentColor" /></span>
    <span>ImagePrompt.org</span>
  </Link>;
}

export function PromoRibbon() {
  const [visible, setVisible] = useState(() => localStorage.getItem('dismiss-video-ribbon') !== '1');
  if (!visible) return null;
  return <div className="promo-ribbon">
    <div className="promo-inner">
      <span className="promo-new"><Sparkles size={12} /> NEW</span>
      <span className="promo-copy">Found a video you want to remix in your own way? Turn it into a detailed, ready-to-use prompt.</span>
      <Link to="/video-to-prompt" className="promo-cta">Try Video to Prompt <span aria-hidden="true">→</span></Link>
      <button className="promo-close icon-button" aria-label="Close announcement" onClick={() => { localStorage.setItem('dismiss-video-ribbon', '1'); setVisible(false); }}><X size={17} /></button>
    </div>
  </div>;
}

export function SiteHeader({ theme, setTheme, language, setLanguage, user }) {
  const location = useLocation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toolPaths = ['/tools', '/image-to-prompt', '/batch-image-to-prompt', '/image-prompt-generator', '/describe-image', '/batch-ai-image-describer', '/ai-image-generator', '/image-to-image', '/video-prompt-generator', '/image-to-video-prompt', '/video-to-prompt'];
  useEffect(() => { setToolsOpen(false); setMobileOpen(false); setLanguageOpen(false); }, [location.pathname]);

  return <header className="site-header">
    <div className="header-inner">
      <Brand />
      <button className="mobile-menu-button icon-button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen((value) => !value)}>
        {mobileOpen ? <X size={23} /> : <Menu size={23} />}
      </button>
      <nav className={`main-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Home</NavLink>
        <NavLink to="/inspiration" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Inspiration</NavLink>
        <NavLink to="/tutorials" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Tutorials</NavLink>
        <div className="nav-dropdown-wrap">
          <button className={`nav-link nav-dropdown-trigger ${toolsOpen ? 'active' : ''}`} aria-expanded={toolsOpen} onClick={() => setToolsOpen((value) => !value)}>Tools <ChevronDown size={14} /></button>
          {toolsOpen && <div className="tools-dropdown">
            <div className="dropdown-label">Image to Text</div>
            {tools.slice(0, 3).map((tool) => <Link key={tool.title} to={tool.href} className="dropdown-link">{tool.title}</Link>)}
            <div className="dropdown-label">Text to Prompt</div>
            {tools.slice(3, 6).map((tool) => <Link key={tool.title} to={tool.href} className="dropdown-link">{tool.title}</Link>)}
            <div className="dropdown-label">Image & Video Generation</div>
            {tools.slice(6).map((tool) => <Link key={tool.title} to={tool.href} className="dropdown-link">{tool.title}</Link>)}
            <Link to="/tools" className="dropdown-all">Explore all tools <span>→</span></Link>
          </div>}
        </div>
        <NavLink to="/pricing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Pricing</NavLink>
        <div className="mobile-actions">
          <Link to="/contact-us" className="mobile-feedback"><MessageSquare size={15} /> Feedback</Link>
          <Link to="/auth/login" className="mobile-login">{user ? user.name || 'My Account' : 'Login'}</Link>
        </div>
      </nav>
      <div className="header-actions">
        {toolPaths.includes(location.pathname) && <Link to="/contact-us#feedback" className="header-feedback"><MessageSquare size={15} /> Feedback</Link>}
        <button className="icon-button" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="language-wrap">
          <button className="icon-button language-button" aria-label="Choose language" aria-expanded={languageOpen} onClick={() => setLanguageOpen((value) => !value)}><Languages size={18} /></button>
          {languageOpen && <div className="language-dropdown">
            <div className="dropdown-label">Language</div>
            {languages.map((item) => <button key={item} className={`language-option ${language === item ? 'selected' : ''}`} onClick={() => { setLanguage(item); localStorage.setItem('site-language', item); setLanguageOpen(false); }}>{item}</button>)}
          </div>}
        </div>
        <Link to={user ? '/account/subscription' : '/auth/login'} className="login-link">{user ? (user.name?.split(' ')[0] || 'Account') : 'Login'}</Link>
      </div>
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <h2 className="visually-hidden">Site information</h2>
    <div className="footer-inner">
      <div className="footer-brand-col">
        <Brand />
        <p>Inspire ideas, Enhance image prompt, Create masterpieces.</p>
      </div>
      <div className="footer-col"><h3>Tools</h3>
        <Link to="/image-to-prompt">Image to Prompt</Link><Link to="/batch-image-to-prompt">Batch Image to Prompt</Link><Link to="/describe-image">AI Image Describer</Link><Link to="/image-prompt-generator">Image Prompt Generator</Link><Link to="/ai-image-generator">AI Image Generator</Link><Link to="/image-to-image">Image to Image Generator</Link><Link to="/video-prompt-generator">Video Prompt Generator</Link><Link to="/image-to-video-prompt">Image to Video Prompt</Link><Link to="/video-to-prompt">Video to Prompt</Link>
      </div>
      <div className="footer-col"><h3>Support</h3><Link to="/contact-us">Contact Us</Link><Link to="/about-us">About Us</Link><Link to="/developer/api">API</Link><Link to="/affiliate-program">Affiliate Program</Link><Link to="/tutorials">Tutorials</Link><Link to="/inspiration">Inspiration</Link></div>
      <div className="footer-col"><h3>Legal</h3><Link to="/legal/privacy-policy">Privacy policy</Link><Link to="/legal/terms">Terms and conditions</Link><Link to="/legal/refund-policy">Refund policy</Link></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} ImagePrompt.org</span><span>English · Español · Français · Deutsch · Português · العربية · Русский · Italiano · 日本語 · 한국어</span></div>
  </footer>;
}

export function SiteLayout({ children, theme, setTheme, language, setLanguage, user }) {
  return <div className={`app-shell theme-${theme}`}>
    <PromoRibbon />
    <SiteHeader theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} user={user} />
    {children}
    <SiteFooter />
  </div>;
}

export function Breadcrumbs({ items = [] }) {
  return <div className="breadcrumbs"><Link to="/">Home</Link><span>›</span>{items.map((item, index) => <React.Fragment key={`${item.label}-${index}`}>{item.href ? <Link to={item.href}>{item.label}</Link> : <span className="breadcrumb-current">{item.label}</span>}{index < items.length - 1 && <span>›</span>}</React.Fragment>)}</div>;
}

export function PageHeading({ title, subtitle, crumbs = [], compact = false }) {
  return <div className={`page-heading ${compact ? 'compact' : ''}`}>
    {crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
    <h1>{title}</h1>
    {subtitle && <p>{subtitle}</p>}
  </div>;
}

export function SectionHeading({ title, subtitle }) {
  return <div className="section-heading"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>;
}

export function FAQList({ items = [], title = 'Frequently asked questions', subtitle = 'Do you have any questions? We have got you covered.' }) {
  const [open, setOpen] = useState(-1);
  if (!items.length) return null;
  return <section className="faq-section section-wrap">
    <SectionHeading title={title} subtitle={subtitle} />
    <div className="faq-list">
      {items.map((item, index) => <div className={`faq-item ${open === index ? 'open' : ''}`} key={item.q}>
        <button className="faq-question" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}><span>{item.q}</span><ChevronDown size={18} /></button>
        {open === index && <div className="faq-answer"><p>{item.a}</p></div>}
      </div>)}
    </div>
  </section>;
}
