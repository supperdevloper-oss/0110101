import React from 'react';
import { Link } from 'react-router-dom';
import { FAQList, SectionHeading } from './SiteChrome.jsx';
import DeferredImage from './DeferredImage.jsx';

export function FeatureRow({ title, description, image, reverse = false, actionHref }) {
  return <section className={`feature-row ${reverse ? 'reverse' : ''}`}>
    <div className="feature-copy"><h3>{title}</h3><p>{description}</p>{actionHref && <Link to={actionHref} className="text-link">Try it now <span>→</span></Link>}</div>
    {image && <div className="feature-image"><DeferredImage src={image} alt={title} /></div>}
  </section>;
}

export function ToolContentSections({ faqs = [], sections = [] }) {
  return <>
    {sections.length > 0 && <section className="tool-content-section section-wrap">
      {sections.map((section, index) => <FeatureRow key={`${section.title}-${index}`} {...section} reverse={index % 2 === 1} />)}
    </section>}
    <FAQList items={faqs} />
  </>;
}

export function HowToUse({ title = 'How to Use', steps = [], image }) {
  return <section className="how-to-section section-wrap">
    <SectionHeading title={title} />
    <div className="how-to-body">
      {image && <DeferredImage src={image} alt={title} />}
      <ol className="steps-list">{steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
    </div>
  </section>;
}
