import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, AtSign, Check, Copy, Image as ImageIcon, Languages, Layers, LoaderCircle, Mail, Palette, Pencil, ScanEye, Sparkles, Upload, Video } from 'lucide-react';
import { FAQList, PageHeading, SectionHeading } from '../components/SiteChrome.jsx';
import { homeFaqs, homeToolCards, imagePacks, inspirationExamples, inspirations, pricingPlans, promptPack, tools, tutorials } from '../data.js';
import { copyText, postJson } from '../lib/api.js';

const cdn = 'https://img.imageprompt.org';

function ToolCard({ tool, variant = '' }) {
  const icon = tool.icon === 'image' ? <ImageIcon size={25} />
    : tool.icon === 'layers' ? <Layers size={25} />
      : tool.icon === 'scan' ? <ScanEye size={25} />
        : tool.icon === 'palette' ? <Palette size={25} />
          : tool.icon === 'video' ? <Video size={25} />
            : tool.icon === 'translate' ? <Languages size={25} />
              : tool.icon === 'edit' ? <Pencil size={25} />
                : <Sparkles size={25} />;
  return <Link to={tool.href} className={`tool-card ${variant}`}>
    <span className="tool-card-icon">{icon}</span>
    <h3>{tool.title}</h3>
    <p>{tool.description}</p>
    {variant === 'large' && <span className="tool-card-arrow"><ArrowRight size={17} /></span>}
  </Link>;
}

function InspirationCard({ item }) {
  return <Link to={`/inspiration/${item.category}/${item.slug}`} className="inspiration-card">
    <img src={item.image} alt={item.title} loading="lazy" />
    <span>{item.title}</span>
  </Link>;
}

export function HomePage() {
  return <main className="home-page">
    <section className="home-hero">
      <div className="hero-inner">
        <h1>Create Better AI Art<br />with <span>Image Prompt</span></h1>
        <p>Inspire ideas, Enhance image prompt, Create masterpieces</p>
        <div className="hero-actions"><Link to="/image-to-prompt" className="button button-primary">Try it now !</Link><Link to="/tutorials" className="button button-outline">Tutorials</Link></div>
        <div className="home-feature-cards">{homeToolCards.map((tool) => <ToolCard key={tool.title} tool={tool} />)}</div>
        <div className="related-links"><span>You may be interested in:</span><Link to="/tutorials/what-is-an-image-prompt">What is an Image Prompt?</Link><Link to="/tutorials/how-to-write-effective-image-prompt">How to Write Effective Image Prompt?</Link></div>
      </div>
    </section>
    <section className="home-tools-section section-wrap">
      <SectionHeading title="AI Powered Image Prompt Tools" subtitle="A complete suite of AI tools covering every aspect of your image creation journey" />
      <div className="home-tools-grid">{tools.filter((item) => !['Edit with AI', 'Translate'].includes(item.title)).map((tool) => <ToolCard key={tool.title} tool={tool} variant="large" />)}</div>
    </section>
    <section className="home-inspiration-section section-wrap">
      <div className="section-title-row"><SectionHeading title="Inspiration from Image Prompt" subtitle="Explore a world of visual inspiration with our AI-generated images" /><Link to="/inspiration" className="text-link">EXPLORE MORE <ArrowRight size={15} /></Link></div>
      <div className="inspiration-grid home-inspiration-grid">{inspirations.slice(0, 9).map((item) => <InspirationCard key={item.slug} item={item} />)}</div>
    </section>
    <section className="reviews-section">
      <div className="section-wrap"><SectionHeading title="What Our Users Say" subtitle="Every Review Comes from a Real User" />
        <div className="review-names-grid">{['RaiO.', 'Natali', 'Gonzalo', 'Dude Love', 'Rispic', 'M Ali', 'Jamilah', 'Sameera', 'Selina'].map((name, index) => <article className="review-name-card" key={name}><span className="review-avatar">{name.charAt(0)}</span><strong>{name}</strong>{[2,5,6].includes(index) && <span className="translated-label">TranslatedOriginal Text</span>}</article>)}</div>
      </div>
    </section>
    <FAQList items={homeFaqs} />
  </main>;
}

export function ToolsIndexPage() {
  const groups = [
    ['Image to Text', tools.slice(0, 3)],
    ['Text to Prompt', tools.slice(3, 6)],
    ['Image Generation', tools.slice(6, 8)],
    ['Video Prompt', tools.slice(8, 11)],
  ];
  return <main><PageHeading title="AI Image Prompt Tools" subtitle="All the AI image generation tools you need in one place. Create, enhance, and generate images with our comprehensive toolset." />
    <div className="tools-index section-wrap">{groups.map(([group, groupTools]) => <section className="tools-index-group" key={group}><h2>{group}</h2><div className="tools-index-grid">{groupTools.map((tool) => <ToolCard key={`${tool.title}-${tool.href}`} tool={tool} variant="large" />)}</div></section>)}</div>
  </main>;
}

export function InspirationPage() {
  const { category: routeCategory } = useParams();
  const categories = [
    { label: 'Animation & Illustration', slug: 'animation-illustration' },
    { label: 'Sci-Fi & Fantasy', slug: 'sci-fi-fantasy' },
    { label: 'Perspective', slug: 'perspective' },
    { label: 'Traditional & Cultural', slug: 'traditional-cultural' },
    { label: 'Modern & Abstract', slug: 'modern-abstract' },
    { label: 'Historical & Art Movement', slug: 'historical-art-movement' },
  ];
  const grouped = categories.map((category) => ({ ...category, items: inspirations.filter((item) => item.category === category.slug) })).filter((group) => group.items.length);
  const visibleGroups = routeCategory ? grouped.filter((group) => group.slug === routeCategory) : grouped;
  const heading = routeCategory ? (categories.find((item) => item.slug === routeCategory)?.label || 'Inspiration') : 'Unleash Your AI Image Prompt Inspiration';
  return <main><PageHeading title={heading} subtitle="Explore our diverse collection of image prompts to fuel your AI art creations" />
    <div className="inspiration-page section-wrap">{visibleGroups.map((group) => <section className="inspiration-group" key={group.slug}><div className="section-title-row"><h2>{group.label}</h2>{!routeCategory && <Link to={`/inspiration/${group.slug}`} className="text-link">More <span>›</span></Link>}</div><div className="inspiration-grid">{group.items.map((item) => <InspirationCard key={item.slug} item={item} />)}</div></section>)}</div>
  </main>;
}

function ArtExampleCard({ item }) {
  return <Link to={`/inspiration/image/${item.id}`} className="art-example-card"><img src={item.image} alt={item.subject} loading="lazy" /></Link>;
}

export function InspirationDetailPage() {
  const { category, slug } = useParams();
  const item = inspirations.find((entry) => entry.category === category && entry.slug === slug) || inspirations.find((entry) => entry.slug === slug);
  const [copied, setCopied] = useState(false);
  if (!item) return <NotFoundPage />;
  const copy = async () => { try { await copyText(item.prompt); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* permission state is left to the browser */ } };
  const examples = inspirationExamples.filter((entry) => entry.style === item.slug);
  return <main><div className="inspiration-detail section-wrap"><PageHeading compact title={item.title} /><div className="prompt-detail-card"><img src={item.image} alt={item.title} /><div className="prompt-detail-copy"><h2>Image Prompt:</h2><p>{item.prompt}</p><div className="detail-actions"><Link className="button button-primary" to={`/ai-image-generator?tag=${item.slug}`}>GENERATE</Link><button className="button button-outline" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'COPIED' : 'COPY'}</button></div></div></div>
    {examples.length > 0 && <section className="art-examples-section"><div className="section-title-row"><h2>{examples.length}Arts</h2></div><div className="art-examples-grid">{examples.map((example) => <ArtExampleCard key={example.id} item={example} />)}</div></section>}
    <hr /><div className="section-title-row"><h2>Explore More {categoryLabel(item.category)}</h2><Link className="text-link" to={`/inspiration/${item.category}`}>EXPLORE MORE</Link></div><div className="inspiration-grid">{inspirations.filter((entry) => entry.category === item.category && entry.slug !== item.slug).slice(0, 4).map((entry) => <InspirationCard key={entry.slug} item={entry} />)}</div></div></main>;
}

export function InspirationImagePage() {
  const { id } = useParams();
  const item = inspirationExamples.find((entry) => entry.id === id);
  const [copied, setCopied] = useState(false);
  if (!item) return <NotFoundPage />;
  const style = inspirations.find((entry) => entry.slug === item.style);
  const siblings = inspirationExamples.filter((entry) => entry.style === item.style && entry.id !== item.id);
  const copy = async () => { try { await copyText(item.prompt); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* browser clipboard permission is required */ } };
  return <main><div className="individual-art-page section-wrap"><h1 className="visually-hidden">{item.subject}</h1><div className="individual-art-main"><img className="individual-art-image" src={item.image} alt={item.subject} /><section className="individual-art-copy"><h2>Image Prompt</h2><p>{item.prompt}</p><div className="detail-actions"><Link className="button button-primary" to={`/ai-image-generator?imageId=${item.id}`}>GENERATE</Link><button className="button button-outline" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'COPIED' : 'COPY'}</button></div></section></div><div className="individual-art-meta"><div className="individual-art-category"><h2>{categoryLabel(item.category)}</h2>{style && <Link to={`/inspiration/${item.category}/${style.slug}`}>{style.title}</Link>}</div><div><h2>Model</h2><strong>{item.model}</strong></div><div><h2>Image size</h2><strong>{item.size}</strong></div></div>
    <section className="art-examples-section"><div className="section-title-row"><h2>Explore More of {style?.title}</h2>{style && <Link to={`/inspiration/${item.category}/${style.slug}`} className="text-link">SEE ALL</Link>}</div><div className="art-examples-grid">{siblings.map((example) => <ArtExampleCard key={example.id} item={example} />)}</div></section>
    <section className="other-styles-section"><div className="section-title-row"><h2>Other {categoryLabel(item.category)}</h2><Link to={`/inspiration/${item.category}`} className="text-link">EXPLORE MORE</Link></div><div className="inspiration-grid">{inspirations.filter((entry) => entry.category === item.category && entry.slug !== item.style).slice(0, 4).map((entry) => <InspirationCard key={entry.slug} item={entry} />)}</div></section></div></main>;
}

function categoryLabel(slug) {
  if (slug === 'animation-illustration') return 'Animation & Illustration';
  if (slug === 'sci-fi-fantasy') return 'Sci-Fi & Fantasy';
  if (slug === 'traditional-cultural') return 'Traditional & Cultural';
  if (slug === 'modern-abstract') return 'Modern & Abstract';
  if (slug === 'historical-art-movement') return 'Historical & Art Movement';
  if (slug === 'perspective') return 'Perspective';
  return slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function TutorialsPage() {
  return <main><PageHeading title="Image Prompt Tutorials" subtitle="Learn how to make AI draw anything you imagine" />
    <div className="tutorial-list section-wrap">{tutorials.map((article) => <Link to={`/tutorials/${article.slug}`} className="tutorial-card" key={article.slug}>
      <img src={article.image} alt={article.title} loading="lazy" /><div className="tutorial-card-body"><span className="tutorial-tag">#Tutorial</span><h2>{article.title}</h2><p>{article.excerpt}</p><div className="tutorial-meta"><img src={`${cdn}/ad_ic_img_2024-09-20_1726843272014_9942.webp`} alt="Eric White" /><span>Eric White</span><time>{article.date}</time></div></div>
    </Link>)}</div>
  </main>;
}

const articleBodies = {
  'how-to-write-effective-image-prompt': [
    { heading: 'Key Principles of Writing Effective Image Prompt', paragraphs: ['In the world of AI-generated imagery, your image prompt is the paintbrush. Learning how to craft effective image prompt is crucial for bringing your visual ideas to life. We still want to control the AI-generated images to fit our desire.', 'AI image generators work by understanding the relationship between text and images. The more descriptive and detailed your image prompt, the better the AI can match your desired result. A vague image prompt often leads to an unexpected or generic result.', 'Bad Image Prompt: “A cat”', 'Good Image Prompt: “A sleek Siamese cat with blue eyes, sitting on a windowsill, bathed in warm sunlight.”'] },
    { heading: 'Put the Main Subject First', paragraphs: ['Most AI models give more weight to words at the beginning of the image prompt. Place your main subject or most important elements first to help the AI generate images that match your intent.', 'When describing complex scenes, use commas to separate different elements while keeping the most important content at the front.'] },
    { heading: 'Use English image prompt for Best Results', paragraphs: ['Most AI image-generation models are primarily trained on English language datasets. Using English prompts often yields more accurate and consistent results. The built-in translator can help craft prompts in English.'] },
    { heading: 'Common Image Prompt Formats and Best Practices', paragraphs: ['A fundamental structure follows: Subject + Action or State + Context or Setting. You can also add style modifiers, composition, perspective, colors, lighting, textures, material, and emotional tone.', 'Crafting effective AI image prompts combines creativity with technical understanding. Be descriptive, prioritize the main subject, use clear formats, and experiment.'] },
  ],
  'how-ai-image-generators-work': [
    { heading: 'What happens when you give an AI an image prompt?', paragraphs: ['Generative AI models have studied large collections of images and learned to create pictures from descriptions. They read the prompt, collect important elements such as objects and colors, create an image, and refine its details.', 'Some popular image-generation tools include Flux, Midjourney, DALL-E, and Stable Diffusion.'] },
    { heading: 'Disadvantages of AI Image Generators', paragraphs: ['AI tools are powerful but not perfect. They mix patterns from training data and may add inconsistencies or struggle with abstract ideas. Prompt engineering can help guide the result and offer more control.'] },
  ],
  'what-is-an-image-prompt': [
    { heading: 'What is an Image Prompt?', paragraphs: ['An image prompt is a set of words that describe the picture you want the AI to create. It is like an order form for an AI artist.', 'For example: “A steampunk airship landing at a giant treehouse library. Panoramic view. The brass airship descends towards a massive tree with multiple wooden platforms and rooms forming the library. Golden sunset light bathes the scene.”'] },
    { heading: 'The Magic of Image Prompts', paragraphs: ['You use words to describe an image, and the AI interprets the prompt to create an image. The more details you provide, the more guidance the model has.'] },
    { heading: 'What Makes a Better Image Prompt?', paragraphs: ['A more specific prompt provides clearer guidance. If you do not specify details, the model fills in the blanks. The more you describe, the more control you have over the result.'] },
  ],
  'how-to-find-higher-resolution-versions-of-an-image': [
    { heading: '4 Easy Ways to Find High-Resolution Images', paragraphs: ['Use search filters, reverse image search, stock image libraries, and social media platforms to find higher-resolution versions of images. Check the licensing terms before using any image.'] },
    { heading: 'Generate High-Resolution Photos on Your Own', paragraphs: ['ImagePrompt.org describes a two-step Image-to-Prompt-to-Image process: extract a detailed prompt from a reference image, then use the AI Image Generator to create a new image.'] },
  ],
};

export function TutorialDetailPage() {
  const { slug } = useParams();
  const article = tutorials.find((item) => item.slug === slug);
  const sections = articleBodies[slug];
  if (!article) return <NotFoundPage />;
  return <main><article className="tutorial-detail section-wrap"><Link to="/tutorials" className="back-link">← Back to Tutorials</Link><h1>{article.title}</h1><div className="article-author"><img src={`${cdn}/ad_ic_img_2024-09-20_1726843272014_9942.webp`} alt="Eric White" /><span>Eric White</span><time>{article.date}</time><span className="tutorial-tag">#Tutorial</span></div><img className="article-cover" src={article.image} alt={article.title} />
    {sections ? sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>) : <section><p>{article.excerpt}</p><p>This tutorial introduces the topic and links it to ImagePrompt.org’s prompt tools.</p><Link className="button button-outline" to="/image-prompt-generator">Try Image Prompt Generator</Link></section>}
    <div className="article-related"><h2>Explore Image Prompt Tools</h2><Link to="/image-to-prompt">Image to Prompt</Link><Link to="/image-prompt-generator">Image Prompt Generator</Link><Link to="/ai-image-generator">AI Image Generator</Link></div></article></main>;
}

export function PricingPage() {
  const [error, setError] = useState('');
  const [loadingProduct, setLoadingProduct] = useState('');
  const productIds = {
    'Standard Monthly': 'standard_monthly', 'Pro Monthly': 'pro_monthly', 'Ultimate Monthly': 'ultimate_monthly', 'Ultimate Annual': 'ultimate_annual',
  };
  const checkout = async (product, id) => {
    if (!product) { window.location.href = '/auth/login'; return; }
    setLoadingProduct(id); setError('');
    try { const data = await postJson('/api/checkout', { product }); window.location.href = data.url; }
    catch (e) { setError(e.message); setLoadingProduct(''); }
  };
  return <main><PageHeading title="Pricing" subtitle="Choose the plan that suits your needs. Cancel anytime." />
    <section className="pricing-section section-wrap">
      <div className="plans-grid">{pricingPlans.map((plan) => <article className={`plan-card ${plan.popular ? 'popular' : ''}`} key={plan.name}>{plan.popular && <span className="popular-badge">Most Popular</span>}<h2>{plan.name}</h2><div className="plan-price"><strong>{plan.price}</strong><span>{plan.period}</span></div>{plan.caption && <p className="plan-caption">{plan.caption}</p>}<p className="plan-credit-line">{plan.credits}</p><button className={`button ${plan.popular ? 'button-primary' : 'button-outline'}`} disabled={loadingProduct === plan.name} onClick={() => checkout(productIds[plan.name], plan.name)}>{loadingProduct === plan.name ? <LoaderCircle className="spin" size={16} /> : plan.action}</button><ul>{plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul></article>)}</div>
      {error && <p className="form-error pricing-error" role="alert">{error}</p>}
      <div className="credit-explainer"><h2>Two credit types, two different purposes</h2><p>Prompt Credits and Image Generation Credits are separate balances and cannot be used interchangeably.</p><div className="credit-types"><article><span className="credit-icon"><Sparkles size={22} /></span><h3>Prompt Credits</h3><p>Used when AI analyzes an image or video and returns text, such as a prompt or description.</p><small>Used by Image to Prompt · AI Image Describer · Video to Prompt</small></article><article><span className="credit-icon"><ImageIcon size={22} /></span><h3>Image Generation Credits</h3><p>Used when AI creates a new image from your prompt.</p><small>Used by AI Image Generator</small></article></div></div>
      <div className="packs-section" id="credits"><div className="section-title-row"><div><h2>Image Generation Credits Pack</h2><p>Includes Image Generation Credits only. One-time payment.</p></div></div><div className="plans-grid pack-grid">{imagePacks.map((pack) => <article className="plan-card pack-card" key={pack.name}><h3>{pack.name}</h3><div className="pack-prices"><strong>{pack.price}</strong><span>{pack.subscriberPrice}<small> for subscribers</small></span></div><p className="pack-credits">{pack.credits} <small>Image Generation Credits</small></p><button className="button button-outline" onClick={() => checkout(pack.name.includes('Standard') ? 'image_pack_standard' : pack.name.includes('Pro') ? 'image_pack_pro' : 'image_pack_max', pack.name)}>One-Time Purchase</button><ul>{pack.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul></article>)}</div><article className="prompt-pack-note"><div><h3>{promptPack.name}</h3><p>{promptPack.credits} · valid for {promptPack.validity}. A one-time pack; unused credits expire when the pack expires.</p></div><button className="button button-outline" onClick={() => checkout('prompt_pack', 'prompt_pack')}>Purchase</button></article></div>
      <p className="pricing-contact">For any inquiries or assistance, feel free to contact <a href="mailto:eric@imageprompt.org">eric@imageprompt.org</a>.</p>
    </section>
    <FAQList items={[
      { q: 'There are too many options, which plan should I choose?', a: 'Choose a subscription if you use prompt tools regularly. For occasional extra Prompt Credits without monthly renewal, choose a Prompt Credits Power Pack. If you only want to generate images, choose an Image Generation Credits Pack.' },
      { q: 'How many Prompt Credits are included with each plan?', a: 'Free users receive 5 daily Prompt Credits. Standard includes 300 monthly Prompt Credits, Pro includes 600 monthly Prompt Credits, and Ultimate includes unlimited Prompt Credits during the subscription period.' },
      { q: 'What should I do when I run out of Prompt Credits?', a: 'Wait for daily credits to reset, upgrade your subscription, or buy a Prompt Credits Power Pack.' },
      { q: 'Where can I see my subscription and credit balances?', a: 'Open the My Subscription page from your avatar menu to see subscription status, Prompt Credits, Image Generation Credits, and their renewal or expiration dates.' },
      { q: 'How can I cancel my subscription?', a: 'Open My Subscription, choose Manage next to the current subscription, then use the cancel option. Cancellation takes effect at the end of the current billing period.' },
      { q: 'What is a Prompt Credits Power Pack?', a: 'A one-time purchase that adds 50 Prompt Credits valid for 72 hours.' },
      { q: 'How long will Image Generation Credits last?', a: 'Credits from a subscription last for the subscription period. One-time pack credits last for 1 month from purchase. Unused credits do not carry over after expiration.' },
      { q: 'Can I request a refund?', a: 'See our Refund Policy for eligibility and the refund process.' },
    ]} />
  </main>;
}

export function ContactPage() {
  const [type, setType] = useState('Feature Request');
  const [details, setDetails] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setMessage('');
    if (!details.trim()) { setMessage('Please enter feedback details.'); return; }
    const form = new FormData(); form.append('type', type); form.append('details', details);
    files.slice(0, 3).forEach((file) => form.append('screenshots', file));
    setBusy(true);
    try {
      const response = await fetch('/api/feedback', { method: 'POST', body: form, credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
      setMessage('Thank you for your feedback.'); setDetails(''); setFiles([]);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <main><PageHeading title="Contact Us" subtitle="Have questions? We'd love to hear from you. Get in touch with us through the following channels." />
    <div className="contact-layout section-wrap"><form className="contact-card" id="feedback" onSubmit={submit}><h2>Send Feedback</h2><p>We value your feedback. Let us know what you think or report an issue.</p><label className="select-control"><span>Feedback Type</span><select value={type} onChange={(e) => setType(e.target.value)}>{['Feature Request', 'Bug Report', 'Billing Issue', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label><p className="helper-text">Select the category that best fits your feedback.</p><label className="field-label">Details<textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={5000} /></label><div className="file-upload-line"><div><strong>Screenshots (Optional)</strong><p>Upload up to 3 screenshots to help us understand the issue.</p></div><label className="button button-outline"><Upload size={15} /> Upload<input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))} /></label></div>{files.length > 0 && <div className="selected-files">{files.map((file, index) => <span key={`${file.name}-${index}`}>{file.name}<button type="button" onClick={() => setFiles(files.filter((_, i) => i !== index))}>×</button></span>)}</div>}{message && <p className={message.startsWith('Thank') ? 'form-success' : 'form-error'} role="status">{message}</p>}<button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : 'Submit Feedback'}</button></form>
      <aside className="contact-side"><a className="contact-info-card" href="mailto:eric@imageprompt.org"><span className="contact-icon"><Mail size={22} /></span><strong>Email Us</strong><span>eric@imageprompt.org</span></a><a className="contact-info-card" href="https://x.com/EricWhite591" target="_blank" rel="noreferrer"><span className="contact-icon"><AtSign size={22} /></span><strong>Follow us on X</strong><span>@EricWhite591</span></a></aside></div>
  </main>;
}

export function AboutPage() {
  return <main><PageHeading title="About Us" subtitle="Empowering Everyone to Create with AI" /><section className="about-content section-wrap"><div className="about-block"><h2>Our Story</h2><p>We started ImagePrompt.org because we saw how AI art creation was becoming increasingly powerful, yet remained challenging for many to master. We believe everyone deserves the opportunity to express their creativity through AI, regardless of their technical background or language skills.</p></div><div className="about-values"><article><h2>Our Mission</h2><p>To make AI art creation more intuitive and accessible to everyone, breaking down technical barriers and language limitations.</p></article><article><h2>Our Values</h2><p>We believe in simplicity, creativity, and inclusivity. Every feature we build aims to bring these values to life.</p></article></div><section className="about-contact"><h2>Get in Touch</h2><p>Have questions or want to explore collaboration opportunities? We welcome partnerships in technical integration, content creation, and more.</p><Link className="button button-primary" to="/contact-us">Contact Us</Link></section></section></main>;
}

export function ApiPage() {
  return <main><PageHeading title="API Access" subtitle="We are currently testing our API services. Join our testing program to integrate powerful image AI capabilities into your applications or workflows." /><section className="api-content section-wrap"><h2>Available APIs</h2><div className="api-card-grid"><article><span className="api-card-icon"><ImageIcon size={22} /></span><h3>Image to Prompt</h3><p>Generate detailed, descriptive image prompts from images. This API provides the same functionality as our Image to Prompt web interface.</p><Link to="/image-to-prompt" className="text-link">Image to Prompt →</Link></article><article><span className="api-card-icon"><Sparkles size={22} /></span><h3>Magic Enhance</h3><p>Enhance your image prompt from simple text to a detailed image prompt. This API provides the same functionality as our Image Prompt Generator web interface.</p><Link to="/image-prompt-generator" className="text-link">Image Prompt Generator →</Link></article></div><div className="api-join"><h2>How to Join</h2><p>To participate in our API testing program, please email us at <a href="mailto:eric@imageprompt.org">eric@imageprompt.org</a> with the following information:</p><ul><li>Your registered email address</li><li>Your use case scenario</li><li>Expected daily API calls</li><li>Expected calls per minute</li></ul><h3>Important Notes</h3><ul><li>API usage is not included in subscription plans and requires separate payment</li><li>Subscribers receive free API calls for testing based on subscription tier</li></ul></div></section></main>;
}

export function AffiliatePage() {
  return <main><PageHeading title="Affiliate Program" subtitle="Join our affiliate program and earn a 30% recurring commission for the first year!" /><section className="affiliate-content section-wrap"><div className="affiliate-cards"><article><h2>Why Join Our Program</h2><ul><li>Earn 30% commission on subscription payments, including renewals and upgrades, for the first year</li><li>Dedicated affiliate support</li><li>Real-time performance tracking</li><li>Monthly payments via PayPal (NET-15)</li></ul></article><article><h2>Who Can Join</h2><p>Our affiliate program is perfect for:</p><ul><li>Content creators</li><li>Bloggers and writers</li><li>AI and tech enthusiasts</li><li>Digital marketers</li><li>Educators and course creators</li></ul></article></div><div className="affiliate-apply"><h2>Apply Now</h2><p>Ready to join? Send us an email with your details, including how you plan to promote ImagePrompt.org. We'll review your application and get back to you soon.</p><a className="button button-primary" href="mailto:eric@imageprompt.org?subject=Affiliate%20Program">Apply: eric@imageprompt.org</a></div></section><FAQList items={[
    { q: 'How can I join the affiliate program?', a: 'Send an email to eric@imageprompt.org with your details and planned promotion strategy. The team will review your application and guide you through the next steps.' },
    { q: 'What is the commission structure?', a: 'Earn a 30% commission on subscription payments from referred users for their first year, including initial payments, renewals, and upgrades.' },
    { q: 'How and when will I get paid?', a: 'Commissions are paid monthly via PayPal on a NET-15 schedule.' },
  ]} /></main>;
}

const privacyText = [
  ['1. Information We Collect', [
    ['1.1 Personal Data', 'We collect your name to personalize your experience and communicate with you; your email address to send order information and updates; and payment information to process orders securely. We do not store payment information on our servers; payments are processed by third-party payment processors.'],
    ['1.2 Non-Personal Data', 'We may use web cookies and similar technologies to collect non-personal information such as your IP address, browser type, device information, and browsing patterns to enhance your experience, analyze trends, and improve services.'],
    ['1.3 Cookies and Tracking Technologies', 'Session cookies maintain session and authentication state. Persistent cookies help remember preferences and login information. Cookies support authentication and security, maintaining a login session, remembering preferences, and analyzing website usage. You can control cookie settings through your browser; disabling certain cookies may limit some features.'],
    ['Analytics and Third-Party Services', 'We use Google Analytics, a web analytics service provided by Google, Inc. Google Analytics uses cookies to analyze website usage. Google may use information to evaluate website use, compile activity reports, and provide related services. You can opt out using Google Analytics’ opt-out browser add-on.'],
  ]],
  ['2. Purpose of Data Collection', ['We collect and use personal data for order processing, including processing orders, sending confirmations, providing customer support, and keeping you updated about order status.']],
  ['3. Data Sharing', ['We do not share personal data with third parties except as required for order processing, such as sharing information with payment processors. We do not sell, trade, or rent personal information.']],
  ["4. Children's Privacy", ['Image Prompt is not intended for children under 13. We do not knowingly collect personal information from children. Parents or guardians may contact us if they believe their child has provided personal information.']],
  ['5. Updates to the Privacy Policy', ['We may update this policy to reflect changes in our practices or for operational, legal, or regulatory reasons. Updates will be posted here; significant changes may be communicated by email.']],
  ['6. Contact Information', ['For questions, concerns, or requests, contact EchoFlow, LLC at eric@imageprompt.org. For other inquiries, visit Contact Us. By using Image Prompt, you consent to this policy.']],
];
const termsText = [
  ['1. Description of Image Prompt', ['Image Prompt is a platform offering tools and services to help users generate high-quality images and image prompts.']],
  ['2. Ownership and Usage Rights', ['All rights to the Website and related services are owned by Image Prompt. Generated images and prompts may be downloaded and used for lawful purposes. Users must have the necessary intellectual-property rights for uploaded materials. Services may only be used through the provided website interface; unauthorized scraping, automated access, or undocumented API calls are prohibited.']],
  ['3. User Data and Privacy', ['We collect user data, including name, email, and payment information, as necessary to provide services. Data is handled in accordance with the Privacy Policy.']],
  ['4. Non-Personal Data Collection', ['We use web cookies to collect non-personal data to improve services and the user experience.']],
  ['5. Disclaimer', ['We strive to ensure availability and stability but are not liable for interruptions or failures or for direct or indirect losses resulting from use of the Website and services.']],
  ['6. Governing Law and Dispute Resolution', ['These Terms are governed by the laws of Delaware, United States. Disputes are resolved through binding arbitration under American Arbitration Association rules in Delaware.']],
  ['7. Age Restrictions', ['Users must be at least 13 years old. Users under 18 must have parental consent.']],
  ['8. Service Termination', ['We may terminate or suspend access at our discretion, without prior notice, for violations or other reasons.']],
  ['9. Indemnification', ['You agree to indemnify and hold harmless EchoFlow, LLC and its officers, directors, employees, and agents from claims, damages, losses, liabilities, costs, and expenses arising from use of the services or violation of these Terms.']],
  ['10. Account Security', ['You are responsible for maintaining the confidentiality of your login information and for activities under your account.']],
  ['11. Subscription and Billing', ['Subscriptions renew at the end of each billing cycle until canceled. The billing cycle begins on the purchase date. Price changes take effect at the start of a future billing cycle following notice. Subscription fees are generally non-refundable unless otherwise required by law; see the Refund Policy.']],
  ['12. Cancellation Policy', ['Cancel through your account dashboard or email eric@imageprompt.org. Email cancellation requests are processed manually; send requests at least 3 business days before renewal. Email cancellations take effect only when written confirmation is received.']],
  ['13. Updates to the Terms', ['Terms may be updated to reflect changes in services or legal requirements. Continued use after changes constitutes acceptance. For questions, contact eric@imageprompt.org.']],
];
const refundText = [
  ['1. General Policy', ['Image Prompt offers digital goods and services that are irrevocable once provided. We generally do not offer refunds once a service has been used or credits consumed, with the specific exceptions below.']],
  ['2. Refund Eligibility', ['A refund may be requested within 7 days of the initial purchase if the request is submitted within that period and the service, credits, or features have not been used. Refunds are not granted for used services or credits, renewal charges after failure to cancel, requests made after 7 days, or partial unused time in a billing cycle. In rare partially used cases, a discretionary partial refund may be considered based on resources consumed; this is not guaranteed.']],
  ['3. Refund Process', ['Email eric@imageprompt.org with the email address used for purchase, order number, and reason. Filing a bank dispute before contacting support may delay or invalidate a refund request.']],
  ['4. Processing Time', ['Requests are typically reviewed within 5–7 business days. Approved refunds go to the original payment method; banks may need additional time to post the credit.']],
  ['5. Special Circumstances', ['For unauthorized charges, contact support immediately. If technical issues prevent service use, contact support first; refunds for technical issues are granted only if the issue cannot be resolved within a reasonable timeframe.']],
  ['6. Policy Updates', ['We reserve the right to modify this policy at any time. Changes are effective when posted.']],
];

export function LegalPage({ kind }) {
  const config = {
    privacy: { title: 'Privacy Policy', updated: 'Last Updated: December 22, 2024', intro: 'Thank you for visiting Image Prompt (“we,” “us,” or “our”), a service provided by EchoFlow, LLC. This Privacy Policy outlines how we collect, use, and protect your personal and non-personal information when you use our website. By accessing or using the Website, you agree to this Privacy Policy.', sections: privacyText },
    terms: { title: 'Terms and conditions', updated: 'Last Updated: Jan 08, 2026', intro: 'These Terms of Service govern your use of the Image Prompt website and services. By using our Website and services, you agree to these Terms.', sections: termsText },
    refund: { title: 'Refund Policy', updated: 'Last Updated: Jan 08, 2026', intro: 'This Refund Policy outlines the terms and conditions for refunds at Image Prompt. By making a purchase on our website, you agree to the following refund terms.', sections: refundText },
  }[kind];
  return <main><div className="legal-content section-wrap"><PageHeading compact title={config.title} /><p className="legal-updated">{config.updated}</p><p>{config.intro}</p>{config.sections.map(([heading, blocks]) => <section key={heading}><h2>{heading}</h2>{blocks.map((block, index) => Array.isArray(block) ? <div key={index}><h3>{block[0]}</h3><p>{block[1]}</p></div> : <p key={index}>{block}</p>)}</section>)}</div></main>;
}

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(searchParams.get('error') ? 'Google sign-in could not be completed. Check the server OAuth configuration and try again.' : '');
  return <main className="auth-page"><section className="auth-card"><Link to="/" className="auth-brand"><span className="brand-mark"><ImageIcon size={25} /></span><strong>ImagePrompt.org</strong></Link><div className="auth-icon"><ImageIcon size={28} /></div><h1>Welcome</h1><p>Please continue by logging in.</p>{error && <p className="form-error" role="alert">{error}</p>}<a className="google-button" href="/api/oauth/google"><span className="google-g">G</span> Continue with Google</a><p className="auth-legal">By continuing, you agree to our <Link to="/legal/terms">Terms and conditions</Link> and <Link to="/legal/privacy-policy">Privacy Policy</Link>.</p></section></main>;
}

export function AccountPage({ user }) {
  if (!user) return <main className="account-page section-wrap"><div className="registered-note"><strong>Please log in to view your subscription.</strong><Link to="/auth/login" className="button button-primary">Login</Link></div></main>;
  return <main className="account-page section-wrap"><PageHeading compact title="My Subscription" subtitle={`Signed in as ${user.email}`} /><div className="account-dashboard"><section><h2>Subscription</h2><p>Your current subscription details are provided by the account billing service.</p><p className="helper-text">The billing and credit-ledger service is not configured for this reconstruction, so balances are not displayed as if they were live.</p><Link to="/pricing" className="button button-outline">View Pricing</Link></section><section><h2>Prompt Credits</h2><strong className="account-unavailable">—</strong><p>Balance unavailable</p></section><section><h2>Image Generation Credits</h2><strong className="account-unavailable">—</strong><p>Balance unavailable</p></section></div><button className="button button-quiet" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/'; }}>Log out</button></main>;
}

export function NotFoundPage() {
  return <main className="not-found section-wrap"><span>404</span><h1>Page not found</h1><Link className="button button-primary" to="/">Go to homepage</Link></main>;
}
