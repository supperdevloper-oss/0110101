import React, { useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, RefreshCw, Sparkles } from 'lucide-react';
import { copyText } from '../lib/api.js';

export function TextResult({ value, placeholder = 'Your generated prompt will appear here', onChange, onRetry, emptyTitle = 'Result', editable = true }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const copy = async () => {
    if (!value) return;
    try { await copyText(value); setCopied(true); setError(''); setTimeout(() => setCopied(false), 1500); }
    catch (e) { setError(e.message); }
  };
  const download = () => {
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'image-prompt.txt'; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="text-result">
    <div className="result-heading"><strong>{emptyTitle}</strong>{value && <div className="result-actions">
      <button className="small-icon-button" title={copied ? 'Copied' : 'Copy'} onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
      <button className="small-icon-button" title="Download" onClick={download}><Download size={16} /></button>
      {onRetry && <button className="small-icon-button" title="Generate again" onClick={onRetry}><RefreshCw size={16} /></button>}
    </div>}</div>
    {value ? <textarea className="result-textarea" value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={!editable} aria-label="Generated result" /> : <div className="result-empty"><Sparkles className="result-empty-icon" size={27} /><p>{placeholder}</p></div>}
    {error && <p className="form-error">{error}</p>}
  </div>;
}

export function ImageResult({ src, placeholder = 'Generated image will show here' }) {
  const download = () => {
    if (!src) return;
    const anchor = document.createElement('a'); anchor.href = src; anchor.download = 'imageprompt-generated.png'; anchor.click();
  };
  return <div className="image-result">
    <div className="result-heading"><strong>Generated Image</strong>{src && <button className="small-icon-button" title="Download image" onClick={download}><Download size={16} /></button>}</div>
    {src ? <img className="generated-image" src={src} alt="AI-generated result" /> : <div className="image-result-empty"><ImageIcon className="image-empty-icon" size={35} /><p>{placeholder}</p></div>}
  </div>;
}
