import React, { useState, useEffect } from 'react';
import { Camera, FileText, MapPin, AlertCircle, Trash2, X, AlertTriangle } from 'lucide-react';
import { INCIDENT_TYPES, SEVERITY_OPTIONS, LOCATION_OPTIONS, STATUS_OPTIONS, compressImage } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

const EditIncidentModal = ({ isOpen, onClose, incidente, updateIncidente, notify }) => {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const profile = useAppStore((state) => state.profile);

  useEffect(() => {
    if (incidente && isOpen) {
      setFormData({
        titulo: incidente.titulo || '',
        descripcion: incidente.descripcion || '',
        tipo: incidente.tipo || INCIDENT_TYPES[0],
        severidad: incidente.severidad || 'Media',
        ubicacion: incidente.ubicacion || 'TJ01',
        status: incidente.status || 'Abierto',
        responsable: incidente.responsable || '',
        imagenEvidencia: incidente.imagenEvidencia || null,
        imagenPersona: incidente.imagenPersona || null,
      });
      setError('');
    }
  }, [incidente, isOpen]);

  if (!isOpen || !incidente) return null;

  const isDirty = () => {
    return (
      formData.titulo !== (incidente.titulo || '') ||
      formData.descripcion !== (incidente.descripcion || '') ||
      formData.tipo !== (incidente.tipo || INCIDENT_TYPES[0]) ||
      formData.severidad !== (incidente.severidad || 'Media') ||
      formData.ubicacion !== (incidente.ubicacion || 'TJ01') ||
      formData.status !== (incidente.status || 'Abierto') ||
      formData.responsable !== (incidente.responsable || '') ||
      formData.imagenEvidencia !== (incidente.imagenEvidencia || null) ||
      formData.imagenPersona !== (incidente.imagenPersona || null)
    );
  };

  const handleClose = () => {
    if (isDirty()) {
      if (window.confirm('Tienes cambios sin guardar. ¿Seguro que deseas salir?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleImageChange = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen valido.');
      return;
    }

    try {
      const base64 = await compressImage(file);
      setFormData(prev => ({ ...prev, [field]: base64 }));
      setError('');
    } catch (err) {
      setError('Error al procesar la imagen.');
    }
  };

  const removeImage = (field) => {
    setFormData(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.descripcion.trim()) {
      setError('Titulo y descripcion son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updatedData = { ...incidente, ...formData };
      
      // Manejar closedAt
      if (formData.status === 'Cerrado' && incidente.status !== 'Cerrado') {
        updatedData.closedAt = Date.now();
      } else if (formData.status !== 'Cerrado') {
        updatedData.closedAt = null;
      }

      await updateIncidente(updatedData);
      notify('Incidente actualizado exitosamente');
      onClose();
    } catch (err) {
      setError(err.message || 'Error al actualizar el incidente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
      <div 
        className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Editar Incidente
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-rose-500/20 text-rose-200 p-3 rounded-lg flex items-center gap-2 text-sm border border-rose-500/30">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Titulo</label>
              <input
                type="text"
                required
                className="glass-input w-full"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ubicacion</label>
              <select
                className="glass-input w-full appearance-none"
                value={formData.ubicacion}
                onChange={(e) => setFormData(prev => ({ ...prev, ubicacion: e.target.value }))}
              >
                {LOCATION_OPTIONS.map(loc => <option key={loc} value={loc} className="bg-slate-800">{loc}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</label>
              <select
                className="glass-input w-full appearance-none"
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
              >
                {INCIDENT_TYPES.map(tipo => <option key={tipo} value={tipo} className="bg-slate-800">{tipo}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Severidad</label>
              <select
                className="glass-input w-full appearance-none"
                value={formData.severidad}
                onChange={(e) => setFormData(prev => ({ ...prev, severidad: e.target.value }))}
              >
                {SEVERITY_OPTIONS.map(sev => <option key={sev} value={sev} className="bg-slate-800">{sev}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</label>
              <select
                className="glass-input w-full appearance-none"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map(st => <option key={st} value={st} className="bg-slate-800">{st}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Responsable</label>
              <input
                type="text"
                className="glass-input w-full"
                value={formData.responsable}
                onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descripcion</label>
            <textarea
              required
              rows={4}
              className="glass-input w-full resize-none"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Evidencia</span>
                {formData.imagenEvidencia && (
                  <button type="button" onClick={() => removeImage('imagenEvidencia')} className="text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </label>
              {formData.imagenEvidencia ? (
                <div className="relative h-32 rounded-xl overflow-hidden border border-white/10 group">
                  <img src={formData.imagenEvidencia} alt="Evidencia" className="w-full h-full object-cover" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-xl cursor-pointer transition">
                  <Camera className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-sm text-slate-400">Subir Imagen</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'imagenEvidencia')} />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Involucrado</span>
                {formData.imagenPersona && (
                  <button type="button" onClick={() => removeImage('imagenPersona')} className="text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </label>
              {formData.imagenPersona ? (
                <div className="relative h-32 rounded-xl overflow-hidden border border-white/10 group">
                  <img src={formData.imagenPersona} alt="Involucrado" className="w-full h-full object-cover" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-xl cursor-pointer transition">
                  <Camera className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-sm text-slate-400">Subir Imagen</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'imagenPersona')} />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditIncidentModal;
