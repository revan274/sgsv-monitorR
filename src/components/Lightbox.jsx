import { X } from 'lucide-react';

// Visor de imagen a pantalla completa.
export default function Lightbox({ image, onClose }) {
  if (!image) return null;
  return (
    <div
      className="overlay animate-fade-in"
      style={{ background: 'rgba(3,5,12,0.92)', zIndex: 80 }}
      onClick={onClose}
    >
      <button
        className="btn"
        style={{ position: 'absolute', top: 18, right: 18 }}
        onClick={onClose}
        aria-label="Cerrar"
      >
        <X size={16} /> Cerrar
      </button>
      <img
        src={image}
        alt="Evidencia ampliada"
        className="animate-scale-up"
        style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
