import { useState, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { PCP_TERMINO_OPTIONS, DEFAULT_PCP_TERMINO, normalizeSearchText, createId, compressImage, safeText, MAX_PCP_IMAGES } from '../lib/utils';
import { Camera, Plus, Edit2 } from 'lucide-react';
import EditPcpModal from '../components/ui/EditPcpModal';
import type { NotificationType, PersonaInteres } from '../types';
import type { useAppStore } from '../store/useAppStore';

interface PcpForm {
  nombre: string;
  terminos: string;
  descripcion: string;
  imagenes: string[];
}

interface PcpViewProps {
  personasInteres: PersonaInteres[];
  addPersonaInteres: ReturnType<typeof useAppStore.getState>['addPersonaInteres'];
  deletePersonaInteres: ReturnType<typeof useAppStore.getState>['deletePersonaInteres'];
  updatePersonaInteres: ReturnType<typeof useAppStore.getState>['updatePersonaInteres'];
  setLightboxImage: (src: string) => void;
  openModal: (title: string, content: string, onConfirm: () => void | Promise<void>, color?: string) => void;
  notify: (msg: string, type?: NotificationType) => void;
  canManagePcp: boolean;
}

export default function PcpView({
  personasInteres,
  addPersonaInteres,
  deletePersonaInteres,
  updatePersonaInteres,
  setLightboxImage,
  openModal,
  notify,
  canManagePcp,
}: PcpViewProps) {
  const [searchTermPCP, setSearchTermPCP] = useState('');
  const [currentPagePCP, setCurrentPagePCP] = useState(1);
  const PCP_PER_PAGE = 8;
  const [showPCPForm, setShowPCPForm] = useState(false);
  const [slideIdx, setSlideIdx] = useState<Record<string, number>>({});
  const [editingPcp, setEditingPcp] = useState<PersonaInteres | null>(null);

  const [pcpForm, setPcpForm] = useState<PcpForm>({
    nombre: '', terminos: DEFAULT_PCP_TERMINO, descripcion: '', imagenes: []
  });

  const getSlide = (id: string) => slideIdx[id] || 0;
  const setSlide = (id: string, idx: number) => setSlideIdx((prev) => ({ ...prev, [id]: idx }));

  const handlePCPImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const availableSlots = Math.max(0, MAX_PCP_IMAGES - pcpForm.imagenes.length);
    if (availableSlots <= 0) {
      notify(`Límite de ${MAX_PCP_IMAGES} imágenes.`, 'warning');
      e.target.value = '';
      return;
    }
    const filesToAdd = files.slice(0, availableSlots);
    try {
      const images = await Promise.all(filesToAdd.map(f => compressImage(f)));
      setPcpForm(prev => ({ ...prev, imagenes: [...prev.imagenes, ...images] }));
    } catch {
      notify('Error procesando las imágenes', 'error');
    }
    e.target.value = '';
  };

  const savePCP = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nName = pcpForm.nombre.trim();
    if (!nName) { notify('Nombre obligatorio.', 'error'); return; }
    if (personasInteres.some((p) => normalizeSearchText(p.nombre) === normalizeSearchText(nName))) {
      notify('Ya existe una persona con ese nombre o alias.', 'warning');
      return;
    }

    const nuevaPersona = {
      id: createId(),
      fechaRegistro: new Date().toLocaleDateString(),
      nombre: nName,
      terminos: pcpForm.terminos || DEFAULT_PCP_TERMINO,
      descripcion: safeText(pcpForm.descripcion).trim(),
      imagenes: pcpForm.imagenes
    };

    try {
      await addPersonaInteres(nuevaPersona);
      setPcpForm({ nombre: '', terminos: DEFAULT_PCP_TERMINO, descripcion: '', imagenes: [] });
      setShowPCPForm(false);
      notify('Persona agregada a lista negra');
    } catch {
      notify('No se pudo guardar la persona en PCP', 'error');
    }
  };

  const filteredPCP = useMemo(() => {
    const ns = normalizeSearchText(searchTermPCP);
    return personasInteres.filter(p =>
      normalizeSearchText(p.nombre).includes(ns) ||
      normalizeSearchText(p.terminos).includes(ns) ||
      normalizeSearchText(p.descripcion).includes(ns)
    );
  }, [personasInteres, searchTermPCP]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTermPCP(event.target.value);
    setCurrentPagePCP(1);
  };

  const totalPcpPages = Math.max(1, Math.ceil(filteredPCP.length / PCP_PER_PAGE));
  const safeCurrentPagePCP = Math.min(currentPagePCP, totalPcpPages);
  const paginatedPCP = useMemo(() => filteredPCP.slice((safeCurrentPagePCP - 1) * PCP_PER_PAGE, safeCurrentPagePCP * PCP_PER_PAGE), [filteredPCP, safeCurrentPagePCP]);

  return (
    <div className="space-y-6 animate-fade-in no-print">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Lista Negra PCP</h2>
        {canManagePcp && (
          <button onClick={() => setShowPCPForm(!showPCPForm)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-xl transition shadow-lg hover:scale-105">
            <Plus className="w-5 h-5" /> Registrar
          </button>
        )}
      </div>

      {showPCPForm && canManagePcp && (
        <div className="glass-panel p-6 rounded-2xl animate-slide-up">
          <form onSubmit={savePCP} className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <input required placeholder="Nombre o Alias" value={pcpForm.nombre} onChange={e => setPcpForm({...pcpForm, nombre: e.target.value})} className="glass-input w-full rounded-lg p-3 text-white"/>
              <select value={pcpForm.terminos} onChange={e => setPcpForm({...pcpForm, terminos: e.target.value})} className="glass-input w-full rounded-lg p-3 text-white">
                {PCP_TERMINO_OPTIONS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
              </select>
              <textarea placeholder="Notas o detalles..." value={pcpForm.descripcion} onChange={e => setPcpForm({...pcpForm, descripcion: e.target.value})} rows={3} className="glass-input w-full rounded-lg p-3 text-white"/>
            </div>
            <div className="space-y-4">
              <label className="glass-input flex flex-col items-center justify-center w-full h-32 border border-dashed border-amber-500/50 rounded-xl cursor-pointer hover:bg-white/5 transition">
                <Camera className="w-8 h-8 mb-2 text-slate-300" />
                <p className="text-sm text-slate-300 font-semibold">Subir Fotos ({pcpForm.imagenes.length}/{MAX_PCP_IMAGES})</p>
                <input type="file" multiple accept="image/*,capture=camera" onChange={handlePCPImageUpload} className="hidden"/>
              </label>
              <button type="submit" className="w-full bg-amber-600 py-3 rounded-xl font-bold text-white shadow-lg hover:bg-amber-500 transition hover:scale-[1.02]">
                Guardar en Lista Negra
              </button>
            </div>
          </form>
        </div>
      )}

      <input type="text" placeholder="Buscar en PCP..." value={searchTermPCP} onChange={handleSearchChange} className="glass-input w-full rounded-xl py-3 px-5 text-white" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {paginatedPCP.map(p => {
          const currentSlide = getSlide(p.id);
          const hasMultiple = p.imagenes.length > 1;

          return (
            <div key={p.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col hover:border-amber-500/30 transition hover:scale-[1.02] group">
              <div
                className="relative h-48 bg-black/50 cursor-pointer"
                onClick={() => {
                  const img = p.imagenes[currentSlide];
                  if (img) setLightboxImage(img);
                }}
              >
                {p.imagenes.length > 0 ? (
                  <>
                    <img
                      src={p.imagenes[currentSlide]}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      alt={p.nombre}
                    />
                    {hasMultiple && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSlide(p.id, (currentSlide - 1 + p.imagenes.length) % p.imagenes.length);
                          }}
                          className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm z-20 transition"
                        >
                          ‹
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSlide(p.id, (currentSlide + 1) % p.imagenes.length);
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm z-20 transition"
                        >
                          ›
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                          {p.imagenes.map((_, i) => (
                            <span
                              key={i}
                              onClick={(e) => { e.stopPropagation(); setSlide(p.id, i); }}
                              className={`w-1.5 h-1.5 rounded-full transition cursor-pointer ${i === currentSlide ? 'bg-white' : 'bg-white/40'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600">Sin Foto</div>
                )}
                
                {canManagePcp && (
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPcp(p);
                      }}
                      className="bg-amber-600/80 hover:bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center transition backdrop-blur"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal('Eliminar de Lista Negra', `Seguro que deseas eliminar a ${p.nombre}?`, async () => {
                          try {
                            await deletePersonaInteres(p.id);
                            notify('Persona eliminada de PCP.');
                          } catch {
                            notify('No se pudo eliminar de PCP.', 'error');
                          }
                        });
                      }}
                      className="bg-red-600/80 hover:bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center transition backdrop-blur"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-white text-lg">{p.nombre}</h3>
                <p className="text-[10px] font-bold text-amber-500 uppercase mt-1">{p.terminos}</p>
                <p className="text-slate-400 text-sm mt-2 line-clamp-2">{p.descripcion}</p>
                {p.fechaRegistro && (
                  <p className="text-[9px] text-slate-500 mt-auto pt-2 font-mono">
                    Reg: {p.fechaRegistro}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {paginatedPCP.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-10">No se encontraron personas vetadas.</div>
        )}
      </div>

      {totalPcpPages > 1 && (
        <div className="flex justify-between items-center glass-panel p-4 rounded-xl mt-6">
          <button disabled={safeCurrentPagePCP === 1} onClick={() => setCurrentPagePCP(p => Math.max(1, p - 1))} className="px-4 py-2 glass-input rounded-lg disabled:opacity-30 text-sm font-medium cursor-pointer">Anterior</button>
          <span className="text-slate-400 text-sm font-medium">Pagina {safeCurrentPagePCP} de {totalPcpPages}</span>
          <button disabled={safeCurrentPagePCP === totalPcpPages} onClick={() => setCurrentPagePCP(p => Math.min(totalPcpPages, p + 1))} className="px-4 py-2 glass-input rounded-lg disabled:opacity-30 text-sm font-medium cursor-pointer">Siguiente</button>
        </div>
      )}

      <EditPcpModal
        isOpen={!!editingPcp}
        onClose={() => setEditingPcp(null)}
        persona={editingPcp}
        updatePersonaInteres={updatePersonaInteres}
        notify={notify}
      />
    </div>
  );
}
