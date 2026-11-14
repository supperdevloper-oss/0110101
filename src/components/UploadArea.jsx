import React, { useEffect, useRef, useState } from 'react';
import { FileImage, ImagePlus, Link2, Upload, X, ClipboardPaste } from 'lucide-react';

export default function UploadArea({
  files = [], onFiles, maxFiles = 1, maxSizeMb = 4, accept = 'image/png,image/jpeg,image/webp',
  allowUrl = true, allowPasteTab = false, pasteLabel = 'Paste Image', label = 'Upload Image', video = false,
}) {
  const inputRef = useRef(null);
  const [tab, setTab] = useState('upload');
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');
  const [previews, setPreviews] = useState([]);
  const isVideo = video;
  const types = isVideo ? ['video/mp4', 'video/quicktime'] : ['image/png', 'image/jpeg', 'image/webp'];

  useEffect(() => {
    const next = files.map((file) => ({ file, src: file.remoteUrl || URL.createObjectURL(file) }));
    setPreviews(next);
    return () => next.forEach((item) => { if (!item.file.remoteUrl) URL.revokeObjectURL(item.src); });
  }, [files]);

  const takeFiles = (list) => {
    setLocalError('');
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const accepted = [];
    for (const file of incoming) {
      if (!types.includes(file.type)) {
        setLocalError(isVideo ? 'Please choose an MP4 or MOV video.' : 'Please choose a PNG, JPG, or WEBP image.');
        continue;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setLocalError(`The file exceeds the ${maxSizeMb} MB limit.`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length) {
      const existingCount = maxFiles === 1 ? 0 : files.length;
      const next = [...(maxFiles === 1 ? [] : files), ...accepted].slice(0, maxFiles);
      if (existingCount + accepted.length > maxFiles) setLocalError(`You can upload up to ${maxFiles} ${isVideo ? 'video' : 'images'}.`);
      onFiles(next);
    }
  };

  useEffect(() => {
    if (isVideo) return undefined;
    const paste = (event) => {
      const items = Array.from(event.clipboardData?.items || []);
      const images = items.filter((item) => item.type.startsWith('image/')).map((item) => item.getAsFile()).filter(Boolean);
      if (images.length) {
        event.preventDefault();
        takeFiles(images);
      }
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [files, maxFiles, onFiles, isVideo]);

  const remove = (index) => onFiles(files.filter((_file, i) => i !== index));
  const useUrl = () => {
    setLocalError('');
    if (!/^https:\/\//i.test(url.trim())) {
      setLocalError('Enter a valid HTTPS image URL.');
      return;
    }
    onFiles([]);
    onFiles([{ name: url.trim(), type: 'image/url', remoteUrl: url.trim(), size: 0 }]);
  };

  return <div className="upload-area-wrap">
    {!isVideo && (allowUrl || allowPasteTab) && <div className="upload-tabs" role="tablist" aria-label="Image input method">
      <button className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')} role="tab" aria-selected={tab === 'upload'}><Upload size={16} /> {label}</button>
      {allowPasteTab && <button className={tab === 'paste' ? 'active' : ''} onClick={() => { setTab('paste'); inputRef.current?.focus(); }} role="tab" aria-selected={tab === 'paste'}><ClipboardPaste size={16} /> {pasteLabel}</button>}
      {allowUrl && <button className={tab === 'url' ? 'active' : ''} onClick={() => setTab('url')} role="tab" aria-selected={tab === 'url'}><Link2 size={16} /> Input Image URL</button>}
    </div>}

    {tab === 'url' && allowUrl && !isVideo ? <div className="url-entry">
      <label htmlFor="image-url">Image URL</label>
      <div className="url-entry-row"><input id="image-url" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && useUrl()} placeholder="https://" /><button className="button button-primary" onClick={useUrl}>Use Image</button></div>
      <p className="helper-text">Enter a publicly accessible HTTPS image URL.</p>
      {files[0]?.remoteUrl && <div className="remote-preview"><img src={files[0].remoteUrl} alt="Selected image" onError={() => setLocalError('This image URL could not be loaded.')} /><button className="remove-upload" aria-label="Remove image URL" onClick={() => onFiles([])}><X size={15} /></button></div>}
    </div> : <>
      {files.length === 0 ? <button
        className={`dropzone ${dragOver ? 'dragover' : ''} ${tab === 'paste' ? 'paste-mode' : ''}`}
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); takeFiles(e.dataTransfer.files); }}
      >
        <span className="dropzone-icon">{isVideo ? <FileImage size={27} /> : <ImagePlus size={28} />}</span>
        <strong>{tab === 'paste' ? 'Paste an image here (Ctrl+V)' : isVideo ? 'Upload a video or drag and drop' : 'Click, drag and drop, or paste (Ctrl+V) image here'}</strong>
        <small>{isVideo ? 'MP4/MOV up to 50MB / 1 min' : `PNG, JPG, or WEBP up to ${maxSizeMb}MB${maxFiles > 1 ? `. Max ${maxFiles} images.` : ''}`}</small>
        <input ref={inputRef} type="file" accept={accept} multiple={maxFiles > 1} hidden onChange={(e) => { takeFiles(e.target.files); e.target.value = ''; }} />
      </button> : <div className={`upload-preview-grid ${maxFiles === 1 ? 'single' : ''}`}>
        {previews.map(({ file, src }, index) => <div className="upload-preview" key={`${file.name}-${index}`}>
          {isVideo ? <video src={src} controls /> : file.remoteUrl ? <img src={file.remoteUrl} alt={file.name} /> : <img src={src} alt={file.name} />}
          <span className="upload-file-name" title={file.name}>{file.name}</span>
          <button className="remove-upload" aria-label={`Remove ${file.name}`} onClick={() => remove(index)}><X size={15} /></button>
        </div>)}
        {maxFiles > files.length && <button className="add-more-upload" onClick={() => inputRef.current?.click()}><ImagePlus size={19} /><span>Add Image</span></button>}
        <input ref={inputRef} type="file" accept={accept} multiple={maxFiles > 1} hidden onChange={(e) => { takeFiles(e.target.files); e.target.value = ''; }} />
      </div>}
    </>}
    {localError && <p className="form-error" role="alert">{localError}</p>}
  </div>;
}
