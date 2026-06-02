import React, { useState, useEffect } from 'react';
import { Camera, FileText, Trash2, X, AlertTriangle } from 'lucide-react';
import { PCP_TERMINO_OPTIONS, MAX_PCP_IMAGES } from '../../lib/utils';
import { handleMediaFile } from '../../lib/mediaStorage';
import { useAppStore } from '../../store/useAppStore';
import type { NotificationType, PcpTermino, PersonaInteres } from '../../types';

interface EditPcpFormData {
  nombre: string;
  descripcion: string;
  terminos: PcpTermino;
  imagenes: string[];
}

interface EditPcpModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: PersonaInteres | null;
  updatePersonaInteres: ReturnType<typeof useAppStore.getState>['updatePersonaInteres'];
  notify: (msg: string, type?: NotificationType) => void;
}

const defaultFormData: EditPcpFormData = {
  nombre: '',
  descripcion: '',
  terminos: PCP_TERMINO_OPTIONS[0],
  imagenes: [],
};

const EditPcpModal = ({ isOpen, onClose, persona, updatePersonaInteres, notify }: EditPcpModalProps) => {
  const [formData, setFormData] = useState<EditPcpFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const config = useAppStore((state) => state.config);
  const allPcpTerminos = [...PCP_TERMINO_OPTIONS, ...(config.customPcpTerminos || [])];

  useEffect(() => {
    if (persona && isOpen) {
      setFormData({
        nombre: persona.nombre || '',
        descripcion: persona.descripcion || '',
        terminos: persona.terminos || PCP_TERMINO_OPTIONS[0],
        imagenes: persona.imagenes || [],
      });
      setError('');
    }
  }, [persona, isOpen]);

  if (!isOpen || !persona) return null;

  const isDirty = () => {
    return (
      formData.nombre !== (persona.nombre || '') ||
      formData.descripcion !== (persona.descripcion || '') ||
      formData.terminos !== (persona.terminos || PCP_TERMINO_OPTIONS[0]) ||
      JSON.stringify(formData.imagenes) !== JSON.stringify(persona.imagenes || [])
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !persona) return;

    if (formData.imagenes.length + files.length > MAX_PCP_IMAGES) {
      setError(`Maximo ${MAX_PCP_IMAGES} imagenes permitidas.`);
      return;
    }

    try {
      const startIndex = formData.imagenes.length;
      const results = await Promise.all(
        files.map((file, i) => {
          if (!file.type.startsWith('image/')) throw new Error('Archivo no valido');
          const storagePath = `pcp/${persona.id}/${Date.now()}_${startIndex + i}.jpg`;
          return handleMediaFile({
            file,
            storagePath,
            entityType: 'pcp',
            entityId: persona.id,
            field: 'imagenes',
            imagenesIndex: startIndex + i,
          });
        }),
      );

      setFormData(prev => ({
        ...prev,
        imagenes: [...prev.imagenes, ...results],
      }));
      setError('');
    } catch {
      setError('Error al procesar imagenes.');
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('Nombre obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updatedData = { ...persona, ...formData };
      await updatePersonaInteres(updatedData);
      notify('Registro PCP actualizado exitosamente');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el registro.');
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
            <FileText className="w-5 h-5 text-amber-400" />
            Editar Persona Vetada (PCP)
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
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</label>
              <input
                type="text"
                required
                className="glass-input w-full"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Motivo de veto</label>
              <select
                className="glass-input w-full appearance-none"
                value={formData.terminos}
                onChange={(e) => setFormData(prev => ({ ...prev, terminos: e.target.value }))}
              >
                {allPcpTerminos.map(term => <option key={term} value={term} className="bg-slate-800">{term}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descripcion y contexto</label>
            <textarea
              rows={4}
              className="glass-input w-full resize-none"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <span>Galeria de Fotos ({formData.imagenes?.length || 0}/{MAX_PCP_IMAGES})</span>
            </label>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.imagenes?.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                  <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {(!formData.imagenes || formData.imagenes.length < MAX_PCP_IMAGES) && (
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-700 hover:border-amber-500 hover:bg-amber-500/10 rounded-xl cursor-pointer transition">
                  <Camera className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-xs text-slate-400 text-center px-2">Agregar<br />Imagen</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
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
              className="px-6 py-2 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_0_15px_rgba(217,119,6,0.3)] hover:shadow-[0_0_25px_rgba(217,119,6,0.5)]"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPcpModal;
