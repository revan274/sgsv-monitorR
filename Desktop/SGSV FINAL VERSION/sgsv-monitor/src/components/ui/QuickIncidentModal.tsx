import React, { useState } from 'react';
import { Zap, X, Send } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  SEVERITY_OPTIONS,
  LOCATION_OPTIONS,
  createId,
  normalizeByOptions,
} from '../../lib/utils';
import type { UserProfile, NotificationType } from '../../types';

interface QuickIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  addIncidente: ReturnType<typeof useAppStore.getState>['addIncidente'];
  notify: (msg: string, type?: NotificationType) => void;
  currentUser: UserProfile | null;
}

const severityColors: Record<string, string> = {
  Baja: 'bg-blue-600/80 border-blue-500/50',
  Media: 'bg-yellow-600/80 border-yellow-500/50',
  Alta: 'bg-orange-600/80 border-orange-500/50',
  Critica: 'bg-red-600/80 border-red-500/50',
};

export default function QuickIncidentModal({
  isOpen,
  onClose,
  addIncidente,
  notify,
  currentUser,
}: QuickIncidentModalProps) {
  const config = useAppStore((s) => s.config);
  const allLocations = [
    ...LOCATION_OPTIONS,
    ...(config.customLocations || []),
  ];

  const [form, setForm] = useState({
    severidad: 'Alta',
    ubicacion: allLocations[0] || 'TJ01',
    descripcion: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = form.descripcion.trim();
    if (!desc) { notify('La descripción es obligatoria.', 'error'); return; }

    setSubmitting(true);
    try {
      await addIncidente({
        id: createId(),
        fecha: new Date().toLocaleString(),
        timestamp: Date.now(),
        titulo: `[RÁPIDO] ${form.severidad} — ${form.ubicacion}`,
        tipo: 'Intrusion',
        severidad: normalizeByOptions(form.severidad, SEVERITY_OPTIONS, 'Alta') as 'Alta',
        descripcion: desc,
        ubicacion: form.ubicacion,
        status: 'Abierto',
        responsable: currentUser?.email || 'Operador Turno',
        imagenEvidencia: null,
        imagenPersona: null,
        videoEvidencia: null,
        closedAt: null,
        notas: [],
      });
      notify('Incidente urgente registrado.');
      setForm({ severidad: 'Alta', ubicacion: allLocations[0] || 'TJ01', descripcion: '' });
      onClose();
    } catch {
      notify('No se pudo registrar.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-md rounded-2xl shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Registro Rápido
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Severidad visual */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Severidad</label>
            <div className="grid grid-cols-4 gap-2">
              {SEVERITY_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, severidad: s }))}
                  className={`py-2 rounded-lg border text-xs font-bold transition ${
                    form.severidad === s
                      ? severityColors[s] + ' text-white scale-105'
                      : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Ubicación</label>
            <select
              value={form.ubicacion}
              onChange={(e) => setForm((p) => ({ ...p, ubicacion: e.target.value }))}
              className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm"
            >
              {allLocations.map((l) => (
                <option key={l} value={l} className="bg-slate-900">{l}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">
              Descripción breve <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              placeholder="¿Qué está pasando?"
              className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition shadow-lg"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Registrando...' : 'Registrar Ahora'}
          </button>
        </form>
      </div>
    </div>
  );
}
