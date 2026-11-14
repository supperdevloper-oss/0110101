import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SiteLayout } from './components/SiteChrome.jsx';
import {
  AboutPage, AccountPage, AffiliatePage, ApiPage, ContactPage, HomePage, InspirationDetailPage,
  InspirationImagePage, InspirationPage, LegalPage, LoginPage, NotFoundPage, PricingPage,
  ToolsIndexPage, TutorialDetailPage, TutorialsPage,
} from './pages/ContentPages.jsx';
// Keep the large tool workspace out of the initial home-page JavaScript.
const lazyToolPage = (name) => lazy(() => import('./pages/ToolPages.jsx').then((pages) => ({ default: pages[name] })));
const AIImageGeneratorTool = lazyToolPage('AIImageGeneratorTool');
const BatchImagePromptTool = lazyToolPage('BatchImagePromptTool');
const ImageDescriberTool = lazyToolPage('ImageDescriberTool');
const ImagePromptTool = lazyToolPage('ImagePromptTool');
const ImageToImageTool = lazyToolPage('ImageToImageTool');
const ImageToVideoPromptTool = lazyToolPage('ImageToVideoPromptTool');
const MagicEnhanceTool = lazyToolPage('MagicEnhanceTool');
const VideoPromptGeneratorTool = lazyToolPage('VideoPromptGeneratorTool');
const VideoToPromptTool = lazyToolPage('VideoToPromptTool');

function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.hash]);
  return null;
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('site-theme') || 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('site-language') || 'English');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    localStorage.setItem('site-theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const isArabic = language === 'العربية';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    localStorage.setItem('site-language', language);
  }, [language]);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => { if (active) setUser(data.user || null); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);

  return <SiteLayout theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} user={user}>
    <RouteEffects />
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tools" element={<ToolsIndexPage />} />
        <Route path="/image-to-prompt" element={<ImagePromptTool user={user} />} />
        <Route path="/batch-image-to-prompt" element={<BatchImagePromptTool user={user} />} />
        <Route path="/image-prompt-generator" element={<MagicEnhanceTool />} />
        <Route path="/describe-image" element={<ImageDescriberTool user={user} />} />
        <Route path="/batch-ai-image-describer" element={<ImageDescriberTool batch user={user} />} />
        <Route path="/ai-image-generator" element={<AIImageGeneratorTool />} />
        <Route path="/image-to-image" element={<ImageToImageTool />} />
        <Route path="/video-prompt-generator" element={<VideoPromptGeneratorTool />} />
        <Route path="/image-to-video-prompt" element={<ImageToVideoPromptTool />} />
        <Route path="/video-to-prompt" element={<VideoToPromptTool />} />
        <Route path="/inspiration" element={<InspirationPage />} />
        <Route path="/inspiration/image/:id" element={<InspirationImagePage />} />
        <Route path="/inspiration/:category/:slug" element={<InspirationDetailPage />} />
        <Route path="/inspiration/:category" element={<InspirationPage />} />
        <Route path="/tutorials" element={<TutorialsPage />} />
        <Route path="/tutorials/:slug" element={<TutorialDetailPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact-us" element={<ContactPage />} />
        <Route path="/about-us" element={<AboutPage />} />
        <Route path="/developer/api" element={<ApiPage />} />
        <Route path="/affiliate-program" element={<AffiliatePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/account/subscription" element={<AccountPage user={authReady ? user : null} />} />
        <Route path="/legal/privacy-policy" element={<LegalPage kind="privacy" />} />
        <Route path="/legal/terms" element={<LegalPage kind="terms" />} />
        <Route path="/legal/refund-policy" element={<LegalPage kind="refund" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </SiteLayout>;
}
