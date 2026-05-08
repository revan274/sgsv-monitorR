import { useState, useEffect, useMemo } from 'react';

export default function AutoVettedSlider({ personasInteres, setLightboxImage, compact = false, className = '' }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const vetadoSlides = useMemo(() => {
    const slides = [];
    for (const persona of personasInteres) {
      const imgs = Array.isArray(persona.imagenes) ? persona.imagenes.filter(Boolean) : [];
      for (let idx = 0; idx < imgs.length; idx++) {
        if (slides.length >= 6) break;
        slides.push({ 
          id: `${persona.id}-${idx}`, 
          src: imgs[idx], 
          nombre: persona.nombre || 'Sin nombre', 
          terminos: persona.terminos || '' 
        });
      }
      if (slides.length >= 6) break;
    }
    return slides;
  }, [personasInteres]);

  const totalSlides = vetadoSlides.length;

  useEffect(() => {
    if (totalSlides < 2) return;
    const id = setInterval(() => setCurrentSlide(prev => (prev + 1) % totalSlides), 3000);
    return () => clearInterval(id);
  }, [totalSlides]);

  if (!totalSlides) return (
    <div className={`${className} glass-panel rounded-xl p-4`}>
      <h3 className="text-white font-semibold mb-1">Fotos de Vetados</h3>
      <p className="text-slate-400 text-sm">No hay imágenes en PCP.</p>
    </div>
  );

  const safeCurrentSlide = totalSlides ? currentSlide % totalSlides : 0;
  const current = vetadoSlides[safeCurrentSlide];

  return (
    <div className={`${className} glass-panel rounded-xl overflow-hidden`}>
      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-slate-900/40">
        <div><h3 className="text-white font-semibold text-sm">Vigilancia Activa PCP</h3></div>
        <span className="text-[10px] text-amber-400 font-bold border border-amber-700/50 bg-amber-900/30 px-2 py-0.5 rounded">
          {safeCurrentSlide + 1}/{totalSlides}
        </span>
      </div>
      <div 
        className={`${compact ? 'h-44' : 'h-72'} relative bg-black/50 cursor-pointer group`} 
        onClick={() => setLightboxImage(current.src)}>
        <img 
          src={current.src} 
          alt={current.nombre}
          className="w-full h-full object-contain group-hover:scale-105 transition duration-500" 
        />
        <div className="absolute left-3 bottom-3 bg-black/70 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 shadow-lg">
          {current.nombre} - {current.terminos}
        </div>
      </div>
    </div>
  );
}
