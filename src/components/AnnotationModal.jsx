import React, { useEffect, useRef, useState } from 'react';
import { Check, Eraser, X } from 'lucide-react';
import '../annotation.css';

export default function AnnotationModal({ image, onSave, onClose }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const drawingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const width = 1000;
  const height = 680;

  useEffect(() => {
    const source = new Image();
    imageRef.current = source;
    source.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f2f4f8';
      ctx.fillRect(0, 0, width, height);
      const scale = Math.min(width / source.naturalWidth, height / source.naturalHeight);
      const drawWidth = source.naturalWidth * scale;
      const drawHeight = source.naturalHeight * scale;
      ctx.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      setReady(true);
    };
    source.onerror = () => setReady(false);
    source.src = image;
  }, [image]);

  const point = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (event) => {
    if (!ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const { x, y } = point(event);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.strokeStyle = '#ff365e'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  };
  const move = (event) => {
    if (!drawingRef.current) return;
    const { x, y } = point(event);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y); ctx.stroke();
  };
  const end = () => { drawingRef.current = false; };
  const clear = () => {
    const source = imageRef.current;
    const canvas = canvasRef.current;
    if (!source || !canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f2f4f8'; ctx.fillRect(0, 0, width, height);
    const scale = Math.min(width / source.naturalWidth, height / source.naturalHeight);
    const drawWidth = source.naturalWidth * scale;
    const drawHeight = source.naturalHeight * scale;
    ctx.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    setSaved(false);
  };
  const save = () => { if (!ready) return; onSave(canvasRef.current.toDataURL('image/png')); setSaved(true); onClose(); };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="annotation-modal" role="dialog" aria-modal="true" aria-labelledby="annotation-title">
      <header><div><h2 id="annotation-title">Annotate reference image</h2><p>Draw on the image to show the area you want to change.</p></div><button className="small-icon-button" onClick={onClose} aria-label="Close annotation"><X size={19} /></button></header>
      <div className="annotation-canvas-wrap"><canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} aria-label="Draw annotations on the reference image" /></div>
      <footer><button className="button button-quiet" onClick={clear}><Eraser size={15} /> Clear</button><button className="button button-primary" onClick={save} disabled={!ready}>{saved ? <Check size={16} /> : null} Use Annotated Image</button></footer>
    </section>
  </div>;
}
