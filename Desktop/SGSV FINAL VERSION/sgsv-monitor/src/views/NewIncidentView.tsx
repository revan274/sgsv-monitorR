import { useState } from 'react';
import {
  INCIDENT_TYPES,
  SEVERITY_OPTIONS,
  LOCATION_OPTIONS,
  DEFAULT_INCIDENT_TYPE,
  createId,
  normalizeByOptions,
  safeText,
} from '../lib/utils';
import { handleMediaFile } from '../lib/mediaStorage';
import { useAppStore } from '../store/useAppStore';
import { FileImage, User, Send, Video, X } from 'lucide-react';
import type { UserProfile, NotificationType, SeverityLevel } from '../types';

const MAX_VIDEO_MB = 8;

interface NewIncidentViewProps {
  addIncidente: ReturnType<typeof useAppStore.getState>['addIncidente'];
  setView: (view: string) => void;
  notify: (msg: string, type?: NotificationType) => void;
  currentUser: UserProfile | null;
}

export default function NewIncidentView({
  addIncidente,
  setView,
  notify,
  currentUser,
}: NewIncidentViewProps) {
  const config = useAppStore((s) => s.config);
  const allLocations = [...LOCATION_OPTIONS, ...(config.customLocations || [])];
  const allTypes = [...INCIDENT_TYPES, ...(config.customIncidentTypes || [])];

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    incidentId: createId(),
    titulo: '',
    tipo: DEFAULT_INCIDENT_TYPE,
    severidad: 'Alta',
    descripcion: '',
    ubicacion: allLocations[0] || 'TJ01',
    imagenEvidencia: null as string | null,
    imagenPersona: null as string | null,
    videoEvidencia: null as string | null,
    videoFileName: null as string | null,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'imagenEvidencia' | 'imagenPersona',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const storagePath = `incidents/${formData.incidentId}/${field}_${Date.now()}.jpg`;
      const result = await handleMediaFile({
        file,
        storagePath,
        entityType: 'incidente',
        entityId: formData.incidentId,
        field,
      });
      setFormData((prev) => ({ ...prev, [field]: result }));
    } catch {
      notify('Error al procesar imagen', 'error');
    }
    e.target.value = '';
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      notify(`El video excede ${MAX_VIDEO_MB}MB.`, 'error');
      return;
    }
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const storagePath = `incidents/${formData.incidentId}/video_${Date.now()}.${ext}`;
      const result = await handleMediaFile({
        file,
        storagePath,
        entityType: 'incidente',
        entityId: formData.incidentId,
        field: 'videoEvidencia',
      });
      setFormData((prev) => ({ ...prev, videoEvidencia: result, videoFileName: file.name }));
    } catch {
      notify('Error al procesar el video', 'error');
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const titulo = safeText(formData.titulo).trim();
    const descripcion = safeText(formData.descripcion).trim();
    if (!titulo || !descripcion) {
      notify('Completa título y descripción.', 'error');
      return;
    }

    const nuevoIncidente = {
      id: formData.incidentId,
      fecha: new Date().toLocaleString(),
      timestamp: Date.now(),
      titulo,
      tipo: normalizeByOptions(formData.tipo, allTypes, DEFAULT_INCIDENT_TYPE),
      severidad: normalizeByOptions(formData.severidad, SEVERITY_OPTIONS, 'Alta') as SeverityLevel,
      descripcion,
      ubicacion: formData.ubicacion,
      status: 'Abierto' as const,
      responsable: currentUser?.email || 'Operador Turno',
      imagenEvidencia: formData.imagenEvidencia,
      imagenPersona: formData.imagenPersona,
      videoEvidencia: formData.videoEvidencia,
      closedAt: null,
      notas: [],
    };

    setSubmitting(true);
    try {
      await addIncidente(nuevoIncidente);
      notify('Incidente registrado correctamente');
      setFormData({
        incidentId: createId(),
        titulo: '', tipo: DEFAULT_INCIDENT_TYPE, severidad: 'Alta', descripcion: '',
        ubicacion: allLocations[0] || 'TJ01',
        imagenEvidencia: null, imagenPersona: null, videoEvidencia: null, videoFileName: null,
      });
      setView('historial');
    } catch {
      notify('No se pudo registrar el incidente', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto glass-panel p-8 rounded-2xl no-print animate-slide-up">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <span>📝</span> Registrar Nuevo Evento
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Título del Evento</label>
            <input
              required name="titulo" value={formData.titulo} onChange={handleInputChange}
              className="glass-input w-full rounded-lg p-3 text-white"
              placeholder="Ej: Movimiento detectado..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Tipo</label>
            <select name="tipo" value={formData.tipo} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-white">
              {allTypes.map((t) => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Ubicación</label>
            <select name="ubicacion" value={formData.ubicacion} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-white">
              {allLocations.map((l) => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Severidad</label>
            <select name="severidad" value={formData.severidad} onChange={handleInputChange} className="glass-input w-full rounded-lg p-3 text-white">
              {SEVERITY_OPTIONS.map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Descripción Detallada</label>
          <textarea required name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={4} className="glass-input w-full rounded-lg p-3 text-white" />
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-sm font-medium text-slate-300 mb-4">Archivos y Evidencias</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Evidencia */}
            <label className="glass-input flex flex-col items-center justify-center w-full h-32 border border-dashed border-emerald-500/50 rounded-xl cursor-pointer hover:bg-white/5 transition">
              <FileImage className="w-8 h-8 mb-2 text-emerald-400" />
              <p className="text-xs text-slate-300 font-semibold">Evidencia</p>
              <input type="file" className="hidden" accept="image/*,capture=camera" onChange={(e) => handleImageChange(e, 'imagenEvidencia')} />
            </label>
            {/* Persona */}
            <label className="glass-input flex flex-col items-center justify-center w-full h-32 border border-dashed border-amber-500/50 rounded-xl cursor-pointer hover:bg-white/5 transition">
              <User className="w-8 h-8 mb-2 text-amber-400" />
              <p className="text-xs text-slate-300 font-semibold">Foto Persona</p>
              <input type="file" className="hidden" accept="image/*,capture=camera" onChange={(e) => handleImageChange(e, 'imagenPersona')} />
            </label>
            {/* Video */}
            <label className="glass-input flex flex-col items-center justify-center w-full h-32 border border-dashed border-violet-500/50 rounded-xl cursor-pointer hover:bg-white/5 transition">
              <Video className="w-8 h-8 mb-2 text-violet-400" />
              <p className="text-xs text-slate-300 font-semibold">Video (máx {MAX_VIDEO_MB}MB)</p>
              <input type="file" className="hidden" accept="video/*" onChange={handleVideoChange} />
            </label>
          </div>

          {/* Previews */}
          <div className="flex flex-wrap gap-3 mt-4">
            {formData.imagenEvidencia && (
              <div className="relative w-28">
                <img src={formData.imagenEvidencia} className="h-20 w-full object-cover rounded-lg border border-white/10" alt="Evidencia" />
                <button type="button" onClick={() => setFormData((p) => ({ ...p, imagenEvidencia: null }))} className="absolute top-1 right-1 bg-red-600 rounded-full w-5 h-5 text-white text-xs font-bold flex items-center justify-center"><X className="w-3 h-3" /></button>
              </div>
            )}
            {formData.imagenPersona && (
              <div className="relative w-28">
                <img src={formData.imagenPersona} className="h-20 w-full object-cover rounded-lg border border-white/10" alt="Persona" />
                <button type="button" onClick={() => setFormData((p) => ({ ...p, imagenPersona: null }))} className="absolute top-1 right-1 bg-red-600 rounded-full w-5 h-5 text-white text-xs font-bold flex items-center justify-center"><X className="w-3 h-3" /></button>
              </div>
            )}
            {formData.videoFileName && (
              <div className="relative flex items-center gap-2 bg-violet-900/30 border border-violet-500/30 rounded-lg px-3 py-2">
                <Video className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-violet-200 max-w-[120px] truncate">{formData.videoFileName}</span>
                <button type="button" onClick={() => setFormData((p) => ({ ...p, videoEvidencia: null, videoFileName: null }))} className="text-slate-400 hover:text-rose-400 transition"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-900/40 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
          {submitting ? 'Registrando...' : 'Registrar Evento'}
        </button>
      </form>
    </div>
  );
}
