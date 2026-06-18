import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

const MAX_SLIDES = 6;

// Carrusel automático de fotos de personas vetadas (PCP).
export default function AutoVettedSlider({ personas, onImageClick }) {
  const slides = useMemo(() => {
    const out = [];
    for (const persona of personas) {
      const imgs = Array.isArray(persona.imagenes) ? persona.imagenes.filter(Boolean) : [];
      for (const src of imgs) {
        if (out.length >= MAX_SLIDES) return out;
        out.push({ id: `${persona.id}-${out.length}`, src, nombre: persona.nombre || 'Sin nombre', terminos: persona.terminos || '' });
      }
    }
    return out;
  }, [personas]);

  const total = slides.length;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (total) setCurrent((prev) => prev % total);
  }, [total]);

  useEffect(() => {
    if (total < 2) return undefined;
    const id = setInterval(() => setCurrent((prev) => (prev + 1) % total), 3000);
    return () => clearInterval(id);
  }, [total]);

  return (
    <div className="card">
      <div className="card-h">
        <h3>
          <ShieldAlert size={17} className="hi" /> Vigilancia activa PCP
        </h3>
        {total > 0 && (
          <span className="info" style={{ fontSize: 11 }}>
            {current + 1}/{total}
          </span>
        )}
      </div>
      {total === 0 ? (
        <div className="card-b" style={{ color: 'var(--txt-faint)', fontSize: 13 }}>
          No hay imágenes en la lista negra.
        </div>
      ) : (
        <div
          style={{ position: 'relative', height: 240, background: '#0a0e1a', cursor: 'pointer' }}
          onClick={() => onImageClick?.(slides[current].src)}
        >
          <img src={slides[current].src} alt={slides[current].nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              background: 'rgba(8,11,20,0.8)',
              border: '1px solid var(--line)',
              borderRadius: 9,
              padding: '6px 11px',
              fontSize: 12,
            }}
          >
            <b>{slides[current].nombre}</b>
            <span style={{ color: 'var(--txt-faint)' }}> · {slides[current].terminos}</span>
          </div>
        </div>
      )}
    </div>
  );
}
