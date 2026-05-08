import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, FileText, ShieldBan } from 'lucide-react';
import { normalizeSearchText } from '../../lib/utils';
import type { Incidente, PersonaInteres, GlobalSearchResult } from '../../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  incidentes: Incidente[];
  personasInteres: PersonaInteres[];
  setView: (view: string) => void;
  setLightboxImage: (src: string) => void;
}

export default function GlobalSearch({
  isOpen,
  onClose,
  incidentes,
  personasInteres,
  setView,
  setLightboxImage,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const results = useMemo((): GlobalSearchResult[] => {
    const q = normalizeSearchText(query);
    if (!q || q.length < 2) return [];

    const incResults: GlobalSearchResult[] = incidentes
      .filter((inc) => {
        const idx = normalizeSearchText(
          `${inc.titulo} ${inc.descripcion} ${inc.ubicacion} ${inc.tipo} ${inc.responsable}`,
        );
        return idx.includes(q);
      })
      .slice(0, 8)
      .map((item) => ({ kind: 'incident' as const, item }));

    const pcpResults: GlobalSearchResult[] = personasInteres
      .filter((p) => {
        const idx = normalizeSearchText(`${p.nombre} ${p.terminos} ${p.descripcion}`);
        return idx.includes(q);
      })
      .slice(0, 4)
      .map((item) => ({ kind: 'pcp' as const, item }));

    return [...incResults, ...pcpResults];
  }, [query, incidentes, personasInteres]);

  if (!isOpen) return null;

  const handleIncidentClick = () => {
    setView('historial');
    onClose();
  };

  const handlePcpClick = (img: string) => {
    setLightboxImage(img);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar incidentes, personas..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-base"
          />
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {results.length > 0 ? (
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {results.map((r, i) => {
              if (r.kind === 'incident') {
                const inc = r.item as Incidente;
                return (
                  <button
                    key={`inc-${inc.id}`}
                    onClick={handleIncidentClick}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition flex items-start gap-3"
                  >
                    <FileText className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">{inc.titulo}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {inc.tipo} · {inc.ubicacion} · {inc.severidad}
                      </p>
                    </div>
                    <span className="ml-auto text-[10px] text-slate-500 shrink-0">{inc.fecha?.split(',')[0]}</span>
                  </button>
                );
              }

              const pcp = r.item as PersonaInteres;
              return (
                <button
                  key={`pcp-${pcp.id}`}
                  onClick={() => pcp.imagenes[0] ? handlePcpClick(pcp.imagenes[0]) : onClose()}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition flex items-start gap-3"
                >
                  <ShieldBan className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{pcp.nombre}</p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{pcp.terminos}</p>
                  </div>
                  <span className="ml-auto text-[10px] bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded shrink-0">
                    PCP
                  </span>
                </button>
              );
            })}
          </div>
        ) : query.length >= 2 ? (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">
            Sin resultados para "{query}"
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-slate-600 text-sm">
            Escribe al menos 2 caracteres para buscar
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-white/5 flex items-center gap-4 text-[11px] text-slate-600">
          <span><kbd className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> cerrar</span>
          <span className="ml-auto">{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
