import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, History, Image as ImageIcon, ImagePlus, Layers, LoaderCircle, Sparkles, X } from 'lucide-react';
import UploadArea from '../components/UploadArea.jsx';
import DeferredImage from '../components/DeferredImage.jsx';
import AnnotationModal from '../components/AnnotationModal.jsx';
import { ImageResult, TextResult } from '../components/ResultPanel.jsx';
import { FAQList, PageHeading } from '../components/SiteChrome.jsx';
import { HowToUse, ToolContentSections } from '../components/ToolSections.jsx';
import { describeOptions, homeToolCards, imagePromptModels, inspirationExamples, inspirations, languages, toolFaqs } from '../data.js';
import { fileToDataUrl, postJson, copyText } from '../lib/api.js';
import { getHistory, saveHistory } from '../lib/history.js';

const imgCdn = 'https://img.imageprompt.org';

function InlineError({ children }) {
  return children ? <p className="form-error" role="alert">{children}</p> : null;
}

function PrimaryButton({ children, loading, ...props }) {
  return <button className="button button-primary generate-button" disabled={loading || props.disabled} {...props}>
    {loading ? <><LoaderCircle className="spin" size={17} /> Generating...</> : children}
  </button>;
}

function ToolTitle({ title, subtitle, category = 'Tools', crumbTitle = title }) {
  return <PageHeading title={title} subtitle={subtitle} crumbs={[{ label: category, href: category === 'Tools' ? '/tools' : '/tutorials' }, { label: crumbTitle }]} />;
}

function useTextHistory(name) {
  const [history, setHistory] = useState(() => getHistory(name));
  const add = (entry) => {
    saveHistory(name, entry);
    setHistory(getHistory(name));
  };
  return [history, add, setHistory];
}

function HistoryButton({ entries, onSelect }) {
  const [open, setOpen] = useState(false);
  return <div className="history-wrap">
    <button className="button button-quiet" onClick={() => setOpen((value) => !value)}><History size={16} /> View History</button>
    {open && <div className="history-popover">
      <div className="history-popover-head"><strong>History</strong><button className="small-icon-button" onClick={() => setOpen(false)} aria-label="Close history"><X size={15} /></button></div>
      {entries.length ? entries.map((entry, index) => <button className="history-entry" key={`${entry.createdAt}-${index}`} onClick={() => { onSelect(entry); setOpen(false); }}><span>{entry.label || entry.result?.slice(0, 84) || 'Generated result'}</span><small>{new Date(entry.createdAt).toLocaleString()}</small></button>) : <p className="history-empty">No history yet.</p>}
    </div>}
  </div>;
}

function getImageValue(file) {
  return file?.remoteUrl ? Promise.resolve(file.remoteUrl) : fileToDataUrl(file);
}

function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { const duration = video.duration; URL.revokeObjectURL(url); resolve(duration); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the video. Try an MP4 or MOV file.')); };
    video.src = url;
  });
}

function useFilePreview(file) {
  const [preview, setPreview] = useState('');
  React.useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    if (file.remoteUrl) { setPreview(file.remoteUrl); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return preview;
}

function ShowcaseExamples({ type = 'image' }) {
  const [open, setOpen] = useState(false);
  const examples = type === 'describer' ? [
    `${imgCdn}/sys-ai-image-describer-showcase-right-04.webp`,
    `${imgCdn}/sys-ai-image-describer-showcase-right-05.webp`,
    `${imgCdn}/sys-ai-image-describer-showcase-right-06.webp`,
  ] : [4, 5, 6].map((num) => `${imgCdn}/sys-image-to-prompt-showcase-right-0${num}.webp`);
  return <div className="showcase-area">
    <button className="showcase-toggle" onClick={() => setOpen((value) => !value)}><Sparkles size={14} /> Showcase Examples</button>
    {open && <div className="showcase-grid">{examples.map((src) => <DeferredImage key={src} src={src} alt="Showcase example" />)}</div>}
  </div>;
}

export function ImagePromptTool({ user }) {
  const [files, setFiles] = useState([]);
  const [model, setModel] = useState(imagePromptModels[0]);
  const [language, setLanguage] = useState('English');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, addHistory] = useTextHistory('image-to-prompt');
  const [imagePreview, setImagePreview] = useState('');
  const localPreview = useFilePreview(files[0]);
  const changeFiles = (next) => { setFiles(next); setImagePreview(''); };

  const run = async () => {
    if (!files[0]) { setError('Upload an image before generating a prompt.'); return; }
    setLoading(true); setError('');
    try {
      const image = await getImageValue(files[0]);
      setImagePreview(image);
      const data = await postJson('/api/generate/prompt', { image, model, language, task: 'image-to-prompt' });
      setResult(data.result);
      addHistory({ label: files[0].name, result: data.result, model, language });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  const loadHistory = (item) => { setResult(item.result || ''); setModel(item.model || imagePromptModels[0]); setLanguage(item.language || 'English'); };

  return <main>
    <ToolTitle title="Free Image to Prompt Generator" subtitle="Convert Image to Prompt to generate your own image" crumbTitle="Image to Prompt" />
    <section className="tool-workspace section-wrap" id="generator-section">
      <div className="workspace-tip"><Layers size={15} /> Have many images? <Link to="/batch-image-to-prompt">Try Batch Image to Prompt <span aria-hidden="true">→</span></Link></div>
      <div className="image-input-grid">
        <div className="input-column">
          <UploadArea files={files} onFiles={changeFiles} maxFiles={1} maxSizeMb={4} allowPasteTab />
        </div>
        <div className="preview-column">
          <div className="preview-label">Image Preview</div>
          <div className={`image-preview-box ${imagePreview || files[0] ? 'has-image' : ''}`}>
            {localPreview || imagePreview ? <img src={localPreview || imagePreview} alt="Image preview" /> : <div className="preview-placeholder"><ImageIcon className="preview-image-icon" size={35} /><span>Your image will show here</span></div>}
          </div>
        </div>
      </div>
      <div className="workspace-controls">
        <div className="control-block"><label>Select AI Model</label>
          <div className="model-choice-grid">
            {imagePromptModels.map((item) => <button key={item} className={`model-choice ${model === item ? 'selected' : ''}`} onClick={() => setModel(item)}><span>{item}</span>{model === item && <Check size={16} />}</button>)}
          </div>
        </div>
        <div className="control-bottom-row">
          <label className="select-control"><span>Prompt Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((lang) => <option key={lang}>{lang}</option>)}</select></label>
          <ShowcaseExamples />
        </div>
        <InlineError>{error}</InlineError>
        <div className="tool-actions-row"><PrimaryButton loading={loading} onClick={run}>Generate Prompt</PrimaryButton><HistoryButton entries={history} onSelect={loadHistory} /></div>
        <div className="result-panel"><TextResult value={result} onChange={setResult} onRetry={run} placeholder="Your generated prompt will appear here." emptyTitle="Result" /></div>
      </div>
    </section>
    <section className="section-wrap showcase-accuracy"><h2>Highly Accurate Image to Prompt Generation</h2><p>Convert original images to prompts and regenerated with AI to see our prompt accuracy</p>
      <div className="accuracy-grid">{[1, 2, 3, 4].map((n) => <div className="accuracy-item" key={n}><div><span>Original</span><DeferredImage src={`${imgCdn}/sys-image-to-prompt-showcase-original-0${n}.webp`} alt="Original image" /></div><span className="vs">VS</span><div><span>Generated by {n === 3 ? 'ideogram-v2' : 'Flux 1.1 Pro'}</span><DeferredImage src={`${imgCdn}/sys-image-to-prompt-showcase-generated-0${n}.webp`} alt="AI-generated image" /></div></div>)}</div>
    </section>
    <ToolContentSections sections={[
      { title: 'Let AI Write the Prompt for You', description: 'Instantly derive comprehensive prompts from reference images. The AI analyzes complex visual details and aesthetics, ensuring precise descriptions that solve manual writing challenges.', image: `${imgCdn}/sys-img2prompt-showcase-effortless-image-to-prompt-01.webp`, actionHref: '/image-to-prompt#generator-section' },
      { title: 'Structured Prompt Customization', description: 'The AI deconstructs images into editable parameters like subject, lighting, and composition. Modify specific keywords to refine details or swap elements, ensuring precise regeneration that aligns with your exact creative vision.', image: `${imgCdn}/sys-img2prompt-showcase-structured-prompt-customization-02.webp`, actionHref: '/image-to-prompt#generator-section' },
    ]} />
    <HowToUse title="How to Use Image to Prompt Generator" image="https://imageprompt.org/_next/static/media/image-to-text-feature.92565c03.png" steps={['Upload or select an image you want to analyze', 'Click the “Generate Prompt” button', 'Wait a few seconds for the prompt to be generated', 'Copy the generated prompt or refine it further for your needs']} />
    <FAQList items={toolFaqs.image} />
  </main>;
}

export function BatchImagePromptTool({ user }) {
  const [files, setFiles] = useState([]);
  const [model, setModel] = useState(imagePromptModels[0]);
  const [language, setLanguage] = useState('English');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, addHistory] = useTextHistory('batch-image-to-prompt');
  const run = async () => {
    if (!user) { setError('Batch Image to Prompt is only available for registered users. Please log in to use it.'); return; }
    if (!files.length) { setError('Upload at least one image.'); return; }
    setLoading(true); setError(''); setResults([]);
    const output = [];
    let historySaved = false;
    const savePartialHistory = () => {
      if (!output.length || historySaved) return;
      historySaved = true;
      addHistory({ label: `${output.length} images`, result: JSON.stringify(output), model, language });
    };
    try {
      for (const file of files) {
        const image = await getImageValue(file);
        const response = await postJson('/api/generate/prompt', { image, model, language, task: 'image-to-prompt' });
        output.push({ name: file.name, result: response.result });
        setResults([...output]);
      }
      savePartialHistory();
    } catch (e) { savePartialHistory(); setError(e.message); }
    finally { setLoading(false); }
  };
  const copyAll = async () => {
    try { await copyText(results.map((item) => `${item.name}\n${item.result}`).join('\n\n')); setError('Copied all prompts.'); }
    catch (e) { setError(e.message); }
  };
  const downloadCsv = () => {
    const csv = ['Image,Prompt', ...results.map((row) => `"${row.name.replaceAll('"', '""')}","${row.result.replaceAll('"', '""')}"`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'image-prompts.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return <main>
    <ToolTitle title="Batch Image to Prompt" subtitle="Convert multiple images to detailed image prompts by one click" />
    <section className="tool-workspace section-wrap" id="generator-section">
      {!user && <div className="registered-note"><strong>Batch Image to Prompt feature is only available for registered users.</strong><span>Please try our <Link to="/image-to-prompt">Image to Prompt</Link> tool or <Link to="/auth/login">login</Link> to use.</span></div>}
      <div className="workspace-subheading"><h2>Upload Images</h2><p>Upload images or simply drag and drop them here</p></div>
      <UploadArea files={files} onFiles={setFiles} maxFiles={20} maxSizeMb={4} allowUrl={false} />
      <div className="batch-list"><h3>Image List</h3>{files.length ? <div className="batch-file-list">{files.map((file, i) => <div key={`${file.name}-${i}`}><span>{i + 1}. {file.name}</span><button onClick={() => setFiles(files.filter((_, index) => index !== i))} aria-label={`Remove ${file.name}`}><X size={15} /></button></div>)}</div> : <p>No image loaded yet</p>}</div>
      <div className="workspace-controls">
        <label className="select-control"><span>Select AI Model</span><select value={model} onChange={(e) => setModel(e.target.value)}>{imagePromptModels.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="select-control"><span>Prompt Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select></label>
        <p className="helper-text">Successful prompt generations use Prompt Credits. Do not close the page during generation as it cannot be resumed if interrupted.</p>
        <InlineError>{error}</InlineError>
        <div className="tool-actions-row"><PrimaryButton loading={loading} disabled={!user} onClick={run}>Generate Prompt</PrimaryButton><HistoryButton entries={history} onSelect={(item) => { try { setResults(JSON.parse(item.result)); setModel(item.model || imagePromptModels[0]); setLanguage(item.language || 'English'); } catch { setError('The saved batch history could not be read.'); } }} /></div>
      </div>
      {results.length > 0 && <div className="batch-results"><div className="result-heading"><strong>Results</strong><div className="result-actions"><button className="button button-quiet" onClick={copyAll}><Copy size={15} /> Copy All</button><button className="button button-quiet" onClick={downloadCsv}>Download CSV</button></div></div>{results.map((item, i) => <div className="batch-result-row" key={`${item.name}-${i}`}><strong>{item.name}</strong><textarea value={item.result} readOnly /></div>)}</div>}
    </section>
    <section className="section-wrap accuracy-plain"><h2>Highly Accurate Image to Prompt Generation</h2><p>Convert original images to prompts and regenerate them with AI to see our prompt accuracy.</p></section>
    <HowToUse title="How to Use Batch Image to Prompt" image="https://imageprompt.org/_next/static/media/image-to-text-feature.92565c03.png" steps={['Select multiple images you want to convert to prompts', 'Click the “Generate Prompt” button', 'Images will be converted one by one, and the prompts will be displayed in the result list', 'Copy all prompts or download the CSV file']} />
    <FAQList items={toolFaqs.batchImage} title="Batch Image to Prompt FAQ" subtitle="Answers to common questions about Batch Image to Prompt" />
  </main>;
}

export function MagicEnhanceTool() {
  const [action, setAction] = useState('enhance');
  const [prompt, setPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    if (!prompt.trim()) { setError('Enter your idea in the Prompt field.'); return; }
    setLoading(true); setError('');
    try {
      const data = await postJson('/api/generate/text', { prompt, action, instruction, targetLanguage });
      setResult(data.result);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  const actionLabel = action === 'enhance' ? 'Magic Enhance' : action === 'edit' ? 'Edit with AI' : 'Translate';
  return <main>
    <ToolTitle title="Free Image Prompt Generator" subtitle="Create detailed, descriptive image prompt from your idea" />
    <section className="text-tool-layout section-wrap" id="generator-section">
      <div className="text-workspace-card">
        <div className="text-workspace-heading"><h2>Prompt</h2><div className="mode-tabs" role="tablist">{[['enhance', 'Magic Enhance'], ['edit', 'Edit with AI'], ['translate', 'Translate']].map(([key, label]) => <button key={key} className={action === key ? 'active' : ''} onClick={() => setAction(key)} role="tab" aria-selected={action === key}>{label}</button>)}</div></div>
        <textarea className="large-prompt-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter your idea in simple text" maxLength={12000} />
        {action === 'edit' && <label className="field-label">Edit instruction<textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Describe how you want to edit the prompt" /></label>}
        {action === 'translate' && <label className="select-control"><span>Target language</span><select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select></label>}
        <InlineError>{error}</InlineError>
        <div className="tool-actions-row"><PrimaryButton loading={loading} onClick={run}>{actionLabel}</PrimaryButton></div>
      </div>
      <div className="text-workspace-card result-card"><TextResult value={result} onChange={setResult} onRetry={run} placeholder="Your image prompt will show here" emptyTitle="Result" /></div>
    </section>
    <div className="section-wrap feature-steps-grid">
      <FeatureInfo title="Magic Enhance" desc="Transform simple text into detailed, descriptive image prompt" image="https://imageprompt.org/_next/static/media/magic-enhance-feature.51646ad3.png" steps={['Enter your idea in simple text in Image Prompt Generator', 'Click the “Magic Enhance” button and wait a few seconds', 'Review the generated image prompt', 'Use your new image prompt or further edit it if needed']} />
      <FeatureInfo title="Edit with AI" desc="Refine and modify prompts using natural language instructions by AI" image="https://imageprompt.org/_next/static/media/edit-with-ai-feature.11bcd346.png" steps={['Enter the image prompt you want to edit', 'Click the “Edit with AI” button', 'Write down your edit instruction and wait for the result', 'Review and refine the edited image prompt']} />
      <FeatureInfo title="Translate" desc="Seamlessly translate image prompts between languages" image="https://imageprompt.org/_next/static/media/translate-feature.3d6e2b8a.png" steps={['Enter the image prompt you want to translate', 'Click the “Translate” button', 'Choose your preferred target language', 'Review the translated prompt']} />
    </div>
    <FAQList items={toolFaqs.generator} />
  </main>;
}

function FeatureInfo({ title, desc, image, steps }) {
  return <article className="feature-info"><DeferredImage src={image} alt={title} /><div><h3>{title}</h3><p>{desc}</p><ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol></div></article>;
}

export function ImageDescriberTool({ batch = false, user }) {
  const [files, setFiles] = useState([]);
  const [option, setOption] = useState(describeOptions[0]);
  const [question, setQuestion] = useState('');
  const [language, setLanguage] = useState('English');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, addHistory] = useTextHistory(batch ? 'batch-ai-image-describer' : 'describe-image');
  const preview = useFilePreview(files[0]);
  const title = batch ? 'Batch Image Describer' : 'AI Image Describer';
  const generate = async () => {
    if (batch && !user) { setError('Batch Image Describer is only available for registered users. Please log in to use it.'); return; }
    if (!files.length) { setError('Upload an image before generating a description.'); return; }
    if (option === 'Custom Question' && !question.trim()) { setError('Enter a question about the image first.'); return; }
    setLoading(true); setError('');
    try {
      if (batch) {
        const rows = [];
        let historySaved = false;
        const savePartialHistory = () => {
          if (!rows.length || historySaved) return;
          historySaved = true;
          addHistory({ label: `${rows.length} images`, result: rows.join('\n\n'), option, language });
        };
        try {
          for (const file of files) {
            const image = await getImageValue(file);
            const data = await postJson('/api/generate/prompt', { image, task: 'describe', question: option === 'Custom Question' ? question : option, language });
            rows.push(`${file.name}\n${data.result}`);
            setResult(rows.join('\n\n'));
          }
          savePartialHistory();
        } catch (e) { savePartialHistory(); throw e; }
      } else {
        const image = await getImageValue(files[0]);
        const data = await postJson('/api/generate/prompt', { image, task: 'describe', question: option === 'Custom Question' ? question : option, language });
        setResult(data.result); addHistory({ label: files[0].name, result: data.result, option, language });
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <main>
    <ToolTitle title={title} subtitle={batch ? 'Convert multiple images to detailed descriptions by one click' : 'The Best Tool to Describe Image to Text'} />
    <section className="tool-workspace section-wrap" id="generator-section">
      {batch && !user && <div className="registered-note"><strong>Batch Image Describer feature is only available for registered users.</strong><span>Please try our <Link to="/describe-image">AI Image Describer</Link> tool or <Link to="/auth/login">login</Link> to use.</span></div>}
      {!batch && <p className="workspace-tip">Let AI help you understand any image — get detailed descriptions, recognize objects, or ask your own questions. <Link to="/batch-ai-image-describer">Have many images? Try Batch Image Describer →</Link></p>}
      <div className={`image-input-grid ${batch ? 'batch-mode' : ''}`}>
        <div className="input-column"><UploadArea files={files} onFiles={setFiles} maxFiles={batch ? 20 : 1} maxSizeMb={4} allowUrl={!batch} allowPasteTab={!batch} /></div>
        {!batch && <div className="preview-column"><div className="preview-label">Image Preview</div><div className={`image-preview-box ${files.length ? 'has-image' : ''}`}>
          {preview ? <img src={preview} alt="Image preview" /> : <div className="preview-placeholder"><ImageIcon className="preview-image-icon" size={35} /><span>Your image will show here</span></div>}
        </div></div>}
      </div>
      {batch && <div className="batch-list"><h3>Image List</h3>{files.length ? <div className="batch-file-list">{files.map((file, index) => <div key={`${file.name}-${index}`}><span>{index + 1}. {file.name}</span><button onClick={() => setFiles(files.filter((_item, i) => i !== index))} aria-label={`Remove ${file.name}`}><X size={15} /></button></div>)}</div> : <p>No image loaded yet</p>}</div>}
      <div className="workspace-controls">
        <div className="control-block"><label>Image Description Options</label><div className="option-chip-grid">{describeOptions.map((item) => <button key={item} className={`option-chip ${option === item ? 'selected' : ''}`} onClick={() => setOption(item)}>{item}</button>)}</div></div>
        {option === 'Custom Question' && <label className="field-label">Custom Question<textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about this image" /></label>}
        <label className="select-control"><span>Result Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select></label>
        {!batch && <ShowcaseExamples type="describer" />}
        {batch && <p className="helper-text">Successful description generations use Prompt Credits. Do not close the page during generation as it cannot be resumed if interrupted.</p>}
        <InlineError>{error}</InlineError>
        <div className="tool-actions-row"><PrimaryButton loading={loading} disabled={batch && !user} onClick={generate}>Generate Description</PrimaryButton><HistoryButton entries={history} onSelect={(item) => { setResult(item.result || ''); setOption(item.option || describeOptions[0]); setLanguage(item.language || 'English'); }} /></div>
        <div className="result-panel"><TextResult value={result} onChange={setResult} onRetry={generate} placeholder="Your description will show here" emptyTitle="Result" /></div>
      </div>
    </section>
    {!batch && <HowToUse title={`How to Use ${title}`} image="https://imageprompt.org/_next/static/media/describe-image-feature.d9afff6b.png" steps={['Upload or select an image you want to analyze', 'Choose a preset option or write your own question about the image', 'Click the “Generate Description” button', 'Wait a few seconds for the description to be generated', 'Read or use the generated description']} />}
    {!batch && <FAQList items={toolFaqs.describer} />}
  </main>;
}

function getGeneratorPrompt() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const prompt = params.get('prompt');
  if (prompt) return prompt;
  const example = inspirationExamples.find((item) => item.id === params.get('imageId'));
  if (example) return example.prompt;
  const style = inspirations.find((item) => item.slug === params.get('tag'));
  return style?.prompt || '';
}

export function AIImageGeneratorTool() {
  const [prompt, setPrompt] = useState(getGeneratorPrompt);
  const [model, setModel] = useState('GPT Image 2.5 Fast20');
  const [size, setSize] = useState('Square 1:1');
  const [background, setBackground] = useState('Opaque');
  const [language, setLanguage] = useState('English');
  const [tab, setTab] = useState('enhance');
  const [result, setResult] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sizes = ['Square 1:1', 'Portrait 4:3', 'Portrait 16:9', 'Landscape 4:3', 'Landscape 16:9'];
  const generate = async () => {
    if (!prompt.trim()) { setError('Enter an image prompt first.'); return; }
    setLoading(true); setError(''); setImage(''); setResult('');
    try {
      const data = await postJson('/api/generate/image', { prompt, model, size, background });
      setImage(data.image);
      setResult(data.revisedPrompt || '');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  const enhance = async () => {
    if (!prompt.trim()) { setError('Enter an image prompt first.'); return; }
    setLoading(true); setError('');
    try { const data = await postJson('/api/generate/text', { prompt, action: tab === 'translate' ? 'translate' : 'enhance', targetLanguage: language }); setPrompt(data.result); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <main>
    <ToolTitle title="AI Image Generator" subtitle="Transform your image prompt into stunning visuals with AI-powered generation" />
    <section className="generator-layout section-wrap" id="generator-section">
      <div className="generator-form-card">
        <p className="generator-cta-note">Create your Arts now!</p>
        <div className="signin-inline"><span>Sign in to generate 2 images for free!</span><Link to="/auth/login" className="button button-outline">Login</Link></div>
        <p className="helper-text generator-guide">For better results, check <Link to="/tutorials/how-to-write-effective-image-prompt">the prompt guide</Link> or <Link to="/image-to-image">add a reference image</Link>.</p>
        <div className="text-workspace-heading"><h2>Prompt</h2><div className="mode-tabs compact-tabs"><button className={tab === 'enhance' ? 'active' : ''} onClick={() => setTab('enhance')}>Magic Enhance</button><button className={tab === 'translate' ? 'active' : ''} onClick={() => setTab('translate')}>Translate</button></div></div>
        <textarea className="large-prompt-input generator-prompt-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the image you want to generate" />
        <div className="generator-settings">
          <label className="select-control"><span>AI Model</span><select value={model} onChange={(e) => setModel(e.target.value)}>{['GPT Image 2.5 Fast20', 'Flux', 'Imagen 4', 'Nano Banana', 'Nano Banana Pro'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="select-control"><span>Image Size</span><select value={size} onChange={(e) => setSize(e.target.value)}>{sizes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="select-control"><span>Background</span><select value={background} onChange={(e) => setBackground(e.target.value)}><option>Opaque</option><option>Transparent</option></select></label>
        </div>
        {tab === 'translate' && <label className="select-control"><span>Target language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select></label>}
        <InlineError>{error}</InlineError>
        <div className="tool-actions-row"><button className="button button-secondary" onClick={enhance} disabled={loading}>{tab === 'translate' ? 'Translate' : 'Magic Enhance'}</button><PrimaryButton loading={loading} onClick={generate}>Generate Image</PrimaryButton></div>
      </div>
      <div className="generator-result-card"><ImageResult src={image} />{result && <div className="image-revised-prompt"><strong>Revised prompt</strong><p>{result}</p></div>}</div>
    </section>
    <section className="section-wrap generator-features">
      <h2>Discover the Power of AI Image Generator</h2>
      <div className="feature-cards-four">
        {[['Hyper-Realistic Image Synthesis', 'Generate cinematic, photo-quality imagery that mimics professional photography, capturing intricate textures, lighting, and details indistinguishable from reality.', `${imgCdn}/sys-txt2img-showcase-realistic-image-01.webp`], ['Limitless Creative Visualization', 'Transcend the boundaries of reality. Turn abstract ideas into vivid, imaginative scenes that exist only in your mind, free from physical constraints.', `${imgCdn}/sys-txt2img-showcase-creative-visualization-01.webp`], ['Design-Ready Text Rendering', 'Create posters and layouts with perfectly rendered text. The AI handles complex typography and design aesthetics, ensuring accurate spelling and stylistic harmony.', `${imgCdn}/sys-txt2img-showcase-text-rendering-01.webp`], ['Knowledge-Driven Enhancement', 'Intelligently infer and complete missing details using vast world knowledge. The AI fills in the gaps to ensure cultural, historical, and logical accuracy, even with sparse prompts.', `${imgCdn}/sys-txt2img-showcase-knowledge-driven-enhancement-01.webp`]].map(([title, desc, src]) => <article className="mini-feature-card" key={title}><DeferredImage src={src} alt={title} /><h3>{title}</h3><p>{desc}</p></article>)}
      </div>
    </section>
    <HowToUse title="How to Use AI Image Generator" image="https://imageprompt.org/_next/static/media/generate-images-feature.d4d72a9b.png" steps={['Enter the image prompt to describe the image you want to generate', 'Choose your preferred image model and size', 'Click the “Generate Image” button', 'Wait a few seconds for your image to be generated', 'Download or further edit the generated image']} />
    <FAQList items={toolFaqs.imageGen} />
  </main>;
}

export function ImageToImageTool() {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('GPT Image 2.5 Fast20');
  const [annotatedImage, setAnnotatedImage] = useState('');
  const [annotateOpen, setAnnotateOpen] = useState(false);
  const preview = useFilePreview(files[0]);
  const [size, setSize] = useState('Original Ratio');
  const [background, setBackground] = useState('Opaque');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const changeFiles = (next) => { setFiles(next); setAnnotatedImage(''); setImage(''); setError(''); };
  const translatePrompt = async () => {
    if (!prompt.trim()) { setError('Enter a prompt before translating.'); return; }
    setTranslating(true); setError('');
    try { const data = await postJson('/api/generate/text', { prompt, action: 'translate', targetLanguage: 'English' }); setPrompt(data.result); }
    catch (e) { setError(e.message); }
    finally { setTranslating(false); }
  };
  const generate = async () => {
    if (!files.length) { setError('Add a reference image before generating.'); return; }
    if (!prompt.trim()) { setError('Enter a prompt describing the image you want to create.'); return; }
    setLoading(true); setError(''); setImage('');
    try {
      const referenceImages = await Promise.all(files.slice(0, 5).map(getImageValue));
      if (annotatedImage) referenceImages[0] = annotatedImage;
      const data = await postJson('/api/generate/image', { prompt, referenceImages, model, size, background });
      setImage(data.image);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <main>
    <ToolTitle title="Image to Image Generator" subtitle="Generate new images based on your existing photos using AI" />
    <section className="generator-layout section-wrap" id="generator-section">
      <div className="generator-form-card">
        <p className="generator-cta-note">Create your Arts now!</p>
        <div className="signin-inline"><span>Sign in to generate 2 images for free!</span><Link to="/auth/login" className="button button-outline">Login</Link></div>
        <div className="workspace-subheading"><h2>Reference Image</h2><p>PNG, JPG, or WEBP · You can also drag &amp; drop or press Ctrl+V / ⌘V anywhere</p></div>
        <UploadArea files={files} onFiles={changeFiles} maxFiles={5} maxSizeMb={4} allowUrl={false} allowPasteTab pasteLabel="Paste" label="Add Image" />
        <label className="field-label">Prompt<textarea className="large-prompt-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe how you want to edit the reference image" /></label>
        <button className="text-link-button" type="button" disabled={translating || !prompt.trim()} onClick={translatePrompt}>{translating ? 'Translating...' : 'Translate'}</button>
        <p className="helper-text">AI models work best with English, but if describing the edit is difficult, you can annotate the image directly.</p>
        <button className="text-link-button" type="button" disabled={!files.length} onClick={() => setAnnotateOpen(true)}>Annotate reference image <span>↗</span></button>
        {annotatedImage && <p className="helper-text">Annotated reference image is ready.</p>}
        <div className="generator-settings"><label className="select-control"><span>Model</span><select value={model} onChange={(e) => setModel(e.target.value)}>{['GPT Image 2.5 Fast20', 'Nano Banana', 'Nano Banana Pro', 'Flux'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="select-control"><span>Image Size</span><select value={size} onChange={(e) => setSize(e.target.value)}>{['Original Ratio', 'Square 1:1', 'Portrait 4:3', 'Portrait 16:9', 'Landscape 4:3', 'Landscape 16:9'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="select-control"><span>Background</span><select value={background} onChange={(e) => setBackground(e.target.value)}><option>Opaque</option><option>Transparent</option></select></label></div>
        <InlineError>{error}</InlineError><PrimaryButton loading={loading} onClick={generate}>Generate Image</PrimaryButton>
      </div>
      <div className="generator-result-card"><ImageResult src={image} /></div>
    </section>
    <div className="section-wrap image-to-image-features"><h2>Discover the power of our Image to Image Generator</h2><div className="feature-cards-three">
      {[
        ['Consistent Character Generation', 'Generate diverse portraits of a specific person by altering expressions, attire, and environments, all while strictly preserving their unique identity.', `${imgCdn}/sys-img2img-showcase-consistent-character-03.webp`],
        ['Intelligent Portrait Merging', 'Seamlessly combine individual portraits into realistic group photos within any scene, with perfect scale, lighting, and natural positioning.', `${imgCdn}/sys-img2img-showcase-portrait-merging-01.webp`],
        ['Prompt-Driven Restyling', 'Instantly transform the aesthetic of any image using natural language while preserving the original subject\'s structural integrity.', `${imgCdn}/sys-img2img-showcase-prompt-restyling-01.webp`],
        ['Seamless Typography Integration', 'Good at handling text-rich visuals like posters. Detect and reconstruct text elements while perfectly preserving complex backgrounds and design aesthetics.', `${imgCdn}/sys-img2img-showcase-typography-01.webp`],
        ['Visual Style Fusion', 'Merge the objects of one photo with the style and texture of another, creating a unified image that looks completely natural.', `${imgCdn}/sys-img2img-showcase-style-fusion-03.webp`],
        ['Annotation-Guided Generation', 'Precisely edit or generate content based on your drawn annotations and masks, giving you pixel-perfect control over exactly where changes occur.', `${imgCdn}/sys-img2img-showcase-annotation-editing-01.webp`],
      ].map(([title, desc, src]) => <article className="mini-feature-card" key={title}><DeferredImage src={src} alt={title} /><h3>{title}</h3><p>{desc}</p></article>)}
    </div></div>
    <HowToUse title="How to Use Image to Image Generator" image={`${imgCdn}/sys-img2img-how-to-use-01.webp`} steps={['Upload your image you want to use as a reference in the Image to Image Generator', 'Enter a prompt describing how you want to generate a new image based on the reference image', 'Click the “Generate Image” button and wait a few seconds', 'Download or further edit your generated image']} />
    <FAQList items={[
      { q: 'What is Image to Image Generator?', a: 'Image to Image Generator is an AI-powered tool that transforms your photos into stunning new creations. Whether you want to edit existing images or generate completely new variations, our Image to Image Generator gives you creative control through simple text prompts. Upload any image, describe your vision, and watch as AI creates artistic interpretations that preserve your desired elements while adding fresh, innovative touches.' },
      { q: 'What should I do if I encounter a bad result in the Image to Image Generator?', a: 'If the initial result from the Image to Image Generator is not ideal, adopt an iterative refinement workflow instead of trying to fix everything in a single prompt. 1) Isolate changes: Break down complex edits into multiple Image to Image steps. 2) Prioritize major elements: Focus on correcting the main subject first, and explicitly add phrases like \'keep the faces unchanged\' to protect parts you are already satisfied with. 3) Work from broad to specific: Start by fixing large-scale composition issues before refining small textures or lighting. 4) Iterate on your generations: Use the best result from the current step as the new source image for the next Image to Image step, gradually layering improvements.' },
      { q: 'What are some tips for using the Image to Image Generator?', a: 'Here are some tips for using the Image to Image Generator: 1) Use positive descriptions: Focus on describing what you want to see (e.g., \'clear sky\') or change rather than negative expressions like \'no clouds\' for better adherence. 2) Preserve specific important elements: Add phrases like \'keep faces unchanged\' to the prompt to maintain consistency in areas you like. 3) Maximize detail to reduce randomness: Providing more specific details in your prompt gives the AI less room for hallucination, making the final Image to Image result more predictable and precise.' },
      { q: 'How do I describe a specific object or position in the image when using Image to Image Generator?', a: 'To describe a specific object or position in our Image to Image Generator, you can use the following tips: 1) Use clear absolute coordinates: Use precise terms to define location. 2) Add visual markers for complex positions: If a location is hard to describe with words, draw clear arrows or circles on your source image to guide the AI. 3) Protect key elements: When adding visual markers, ensure they do not overlap with important parts of the image that you want to remain unchanged.' },
      { q: 'What model should I choose for Image to Image Generator?', a: 'We recommend you try the Nano Banana model first. If the results are not ideal or if you require high-resolution images such as 2K or 4K, please switch to the Nano Banana Pro model. We will add more models to Image to Image Generator in the future.' },
      { q: 'How does the Image to Image Generator work?', a: 'The Image to Image Generator works by analyzing your uploaded image and applying your transformation prompt to generate a new version. The AI uses the original image as a starting point or reference, and then applies the changes described in your prompt to create a new image.' },
      { q: 'Is Image to Image Generator free to use?', a: 'Because our Image to Image Generator requires substantial computing resources, it uses Image Generation Credits. You can subscribe to a premium plan or buy a one-time Image Generation Credits Pack for more access.' },
      { q: 'What are the limitations of the Image to Image Generator?', a: 'While powerful, the Image to Image Generator does have some limitations: 1) English prompts only - works best with English text inputs. 2) AI variability - results may be inconsistent and require multiple attempts with prompt adjustments. 3) Complex transformations may produce unexpected results. 4) Results depend on source image quality and prompt clarity.' },
      { q: 'How many reference images can I upload for Image to Image generation?', a: 'With the Nano Banana model, you can now upload up to 5 reference images to enhance your Image to Image workflow.' },
      { q: 'How is my image data handled in the Image to Image Generator?', a: 'We prioritize your privacy and data security. Your uploaded images in the Image to Image Generator are only temporarily processed to generate transformations and are deleted afterward. We do not store or retain your original images on our servers beyond the processing time required. Your images are used solely for the purpose of performing the requested transformations.' },
      { q: 'Can I use the generated images for commercial purposes in the Image to Image Generator?', a: 'Yes, you can use the generated images from our Image to Image Generator for commercial purposes. However, you should ensure that you have the proper rights to the original images you upload in the Image to Image Generator for transformation.' },
      { q: 'Is NSFW content allowed in the Image to Image Generator?', a: 'No, NSFW content is not allowed in our Image to Image Generator to ensure a safe and appropriate environment for all users. Our Image to Image Generator is designed to detect and reject inappropriate content in both uploaded images and prompts.' },
    ]} />
    {annotateOpen && preview && <AnnotationModal image={preview} onSave={setAnnotatedImage} onClose={() => setAnnotateOpen(false)} />}
  </main>;
}

function SimpleTextTool({ kind }) {
  const video = kind === 'video';
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    if (!prompt.trim()) { setError('Enter your idea in simple text first.'); return; }
    setLoading(true); setError('');
    try { const data = await postJson('/api/generate/text', { prompt, action: video ? 'video-enhance' : 'enhance' }); setResult(data.result); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <main>
    <ToolTitle title={video ? 'Free Video Prompt Generator' : 'Free Image Prompt Generator'} subtitle={video ? 'Transform ideas into professional AI video generation prompts' : 'Create detailed, descriptive image prompt from your idea'} />
    <section className="text-tool-layout section-wrap" id="generator-section">
      <div className="text-workspace-card"><div className="text-workspace-heading"><h2>Prompt</h2><span className="active-mode-label">Magic Enhance</span></div><textarea className="large-prompt-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter your idea in simple text" /><InlineError>{error}</InlineError><div className="tool-actions-row"><PrimaryButton loading={loading} onClick={run}>Magic Enhance</PrimaryButton></div></div>
      <div className="text-workspace-card result-card"><TextResult value={result} onChange={setResult} onRetry={run} placeholder="Your generated prompt will show here" emptyTitle="Result" /></div>
    </section>
    <HowToUse title={video ? 'How to Use Video Prompt Generator' : 'How to Use Image Prompt Generator'} image="https://imageprompt.org/_next/static/media/magic-enhance-feature.51646ad3.png" steps={video ? ['Enter your idea in simple text in Video Prompt Generator', 'Click the “Magic Enhance” button and wait a few seconds', 'Review the generated video prompt', 'Use your new video prompt or further edit it if needed'] : ['Enter your idea in simple text in Image Prompt Generator', 'Click the “Magic Enhance” button and wait a few seconds', 'Review the generated image prompt', 'Use your new image prompt or further edit it if needed']} />
    <FAQList items={video ? toolFaqs.videoPromptGenerator : toolFaqs.generator} />
  </main>;
}

export function VideoPromptGeneratorTool() { return <SimpleTextTool kind="video" />; }

export function ImageToVideoPromptTool() {
  const [files, setFiles] = useState([]);
  const [cameraMovement, setCameraMovement] = useState('Auto');
  const [language, setLanguage] = useState('English');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const preview = useFilePreview(files[0]);
  const run = async () => {
    if (!files[0]) { setError('Upload an image before generating a prompt.'); return; }
    setLoading(true); setError('');
    try { const image = await getImageValue(files[0]); const data = await postJson('/api/generate/prompt', { image, task: 'image-to-video', language, cameraMovement }); setResult(data.result); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <main>
    <ToolTitle title="Image to Video Prompt Generator" subtitle="Generate dynamic video prompts for your image to assist your Image-to-Video workflow" />
    <section className="tool-workspace section-wrap" id="generator-section">
      <div className="image-input-grid"><div className="input-column"><UploadArea files={files} onFiles={setFiles} maxFiles={1} maxSizeMb={4} allowPasteTab /></div><div className="preview-column"><div className="preview-label">Image Preview</div><div className={`image-preview-box ${files.length ? 'has-image' : ''}`}>{preview ? <img src={preview} alt="Image preview" /> : <div className="preview-placeholder"><ImageIcon className="preview-image-icon" size={35} /><span>Your image will show here</span></div>}</div></div></div>
      <div className="workspace-controls generator-settings"><label className="select-control"><span>Camera Movement</span><select value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value)}>{['Auto', 'Static shot', 'Subject Tracking', 'Handheld', 'Push in', 'Pull out', 'Zoom in', 'Zoom out'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="select-control"><span>Output Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select></label><InlineError>{error}</InlineError><div className="tool-actions-row"><PrimaryButton loading={loading} onClick={run}>Generate Prompt</PrimaryButton></div><div className="result-panel"><TextResult value={result} onChange={setResult} onRetry={run} placeholder="Your video prompt will show here" emptyTitle="Result" /></div></div>
    </section>
    <section className="section-wrap single-feature-note"><h2>Turn Images Into Motion</h2><p>Turn any image into a rich video prompt. We automatically add camera directions and movement details for easy generation.</p></section>
    <HowToUse title="How to Use Image to Video Prompt Generator" image="https://imageprompt.org/_next/static/media/image-to-video-prompt-feature.c7746bfb.png" steps={['Upload an image you want to convert to a video prompt', 'Select your preferred output language', 'Click the “Generate Prompt” button', 'Review and modify the prompt, or click “Generate Prompt” again for a new one', 'Copy the final version of the prompt to use in AI image-to-video generators']} />
    <FAQList items={toolFaqs.imageVideo} />
  </main>;
}

export function VideoToPromptTool() {
  const [files, setFiles] = useState([]);
  const [language, setLanguage] = useState('English');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const run = async () => {
    const file = files[0];
    if (!file) { setError('Upload a video before generating a prompt.'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('Video must be 50 MB or smaller.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const duration = await readVideoDuration(file);
      if (duration > 60) throw new Error('Video must be 1 minute or shorter.');
      const form = new FormData(); form.append('video', file); form.append('language', language);
      const response = await fetch('/api/generate/video', { method: 'POST', body: form, credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
      setResult(data.result);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  const copyResult = async () => {
    try { await copyText(JSON.stringify(result, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch (e) { setError(e.message); }
  };
  const shots = Array.isArray(result?.shots) ? result.shots : [];
  return <main>
    <ToolTitle title="Free Video to Prompt Generator" subtitle="Get a detailed, ready-to-use prompt for creating videos inspired by any video" />
    <section className="video-tool-panel section-wrap" id="generator-section">
      <div className="video-input-grid"><div><UploadArea files={files} onFiles={setFiles} maxFiles={1} maxSizeMb={50} accept="video/mp4,video/quicktime,.mp4,.mov" video allowUrl={false} /></div><label className="select-control video-language"><span>Prompt Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <p className="helper-text">MP4/MOV up to 50MB / 1 min</p><InlineError>{error}</InlineError><div className="tool-actions-row"><PrimaryButton loading={loading} onClick={run}>Generate Prompt</PrimaryButton><Link to="/contact-us#feedback" className="text-link">We want to make this tool more useful. Send feedback →</Link></div>
      {result && <div className="video-result-card"><div className="result-heading"><strong>{result.shots?.length || 0} shots{result.duration ? ` · ${result.duration}` : ''}</strong><button className="button button-quiet" onClick={copyResult}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy Result'}</button></div>
        {result.summary && <p className="video-summary">{result.summary}</p>}
        <div className="shot-list">{shots.map((shot, index) => <article className="shot-card" key={`${shot.start}-${index}`}><div className="shot-meta">Shot {index + 1}<span>{shot.start}–{shot.end}</span></div><h3>Generation Prompt</h3><p>{shot.prompt}</p>{shot.dialogues?.length > 0 && <div className="shot-subsection"><h4>Dialogues</h4>{shot.dialogues.map((line, lineIndex) => <p key={lineIndex}>{typeof line === 'string' ? line : `${line.speaker || ''} ${line.text || ''}`}</p>)}</div>}{shot.audio && <div className="shot-subsection"><h4>Audio</h4><p>{shot.audio}</p></div>}</article>)}</div>
        {!shots.length && result.summary && <TextResult value={result.summary} editable={false} emptyTitle="Result" />}
      </div>}
    </section>
    <section className="section-wrap example-result-section"><h2>Example result</h2><div className="example-video-card"><div className="example-video-thumbs">{[1,2,3,4].map((num) => <DeferredImage key={num} src={`${imgCdn}/preset/sys-video-to-prompt-example-tea-${num === 1 ? 'opening-frame-01' : `shot-0${num}`}.webp`} alt={`Example video frame ${num}`} />)}</div><p>4 shots · 15 sec</p><article className="shot-card"><div className="shot-meta">Shot 1 <span>00:00–00:03</span></div><h3>Generation Prompt</h3><p>POV shot from inside a brightly lit refrigerator looking out into a kitchen. A young Asian woman with shoulder-length dark hair, wearing a casual cream-colored sweater, reaches into the fridge to grab a glass bottle of amber-colored beverage. The camera focuses on the bottle with water droplets on its surface, then shifts focus to the woman’s face as she looks at the drink with a calm and contemplative expression. Natural soft indoor lighting. High quality commercial, shallow depth of field, clear details on the bottle glass texture.</p><div className="shot-subsection"><h4>Dialogues</h4><p>(Voiceover) Young woman (Thoughtful, calm): “Some mornings need a reset.”</p></div><div className="shot-subsection"><h4>Audio</h4><p>Ambient home kitchen sounds, soft chime.</p></div></article></div></section>
    <section className="section-wrap video-info-section"><h2>What is Video to Prompt?</h2><p>Video to Prompt is an AI video analysis tool that converts an uploaded video into a structured set of reusable prompts. It divides content into meaningful time-based segments based on changes in action, dialogue, characters, and narrative progression.</p><p>Each segment may contain several related camera cuts from the same continuous event. The generator combines those visual changes into one coherent prompt while preserving camera direction, subject actions, dialogue, voiceover, and audio cues.</p><div className="feature-cards-three compact-features">{[['Structured video segments', 'Meaningful sections based on actions, speakers, and narrative events.'], ['Camera and framing changes', 'Describe close-ups, angle changes, movement, and transitions.'], ['Dialogue and audio cues', 'Preserve spoken lines, ambience, music, and sound effects.']].map(([title, desc]) => <article className="mini-feature-card" key={title}><h3>{title}</h3><p>{desc}</p></article>)}</div></section>
    <HowToUse title="How to convert video to prompt" steps={['Upload a reference MP4 or MOV video (up to 50 MB and 1 minute)', 'Choose the prompt language', 'Generate a structured breakdown', 'Review, copy, and adapt the result']} />
    <FAQList items={toolFaqs.video} />
  </main>;
}
