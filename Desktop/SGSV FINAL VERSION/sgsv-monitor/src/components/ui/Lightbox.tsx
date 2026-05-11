import { useState, useEffect, type MouseEvent } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface LightboxProps {
  imageSrc: string | null;
  onClose: () => void;
}

export default function Lightbox({ imageSrc, onClose }: LightboxProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageSrc) return null;

  const handleDownload = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `evidencia_${Date.now()}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      
      <div className="absolute top-4 right-4 flex items-center gap-3 z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.5, 3)); }}
          className="text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.5, 0.5)); }}
          className="text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button 
          onClick={handleDownload}
          className="text-white bg-white/10 hover:bg-indigo-500 rounded-full w-10 h-10 flex items-center justify-center transition"
          title="Descargar"
        >
          <Download className="w-5 h-5" />
        </button>
        <button 
          className="text-white bg-white/10 hover:bg-red-500 rounded-full w-10 h-10 flex items-center justify-center transition" 
          onClick={onClose}
          title="Cerrar"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="overflow-auto max-w-full max-h-[90vh] custom-scrollbar flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageSrc} 
          alt="Fullscreen view"
          className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl transition-transform duration-300" 
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
