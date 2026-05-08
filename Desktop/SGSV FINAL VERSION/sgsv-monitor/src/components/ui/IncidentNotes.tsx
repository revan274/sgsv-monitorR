import React, { useState } from 'react';
import { MessageSquare, Send, Clock, User } from 'lucide-react';
import { createId } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

const IncidentNotes = ({ incidente, updateIncidente, notify }) => {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const profile = useAppStore((state) => state.profile);

  const notas = Array.isArray(incidente?.notas) ? incidente.notas : [];

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const nota = {
        id: createId(),
        texto: newNote.trim(),
        autor: profile?.email || 'Operador',
        timestamp: Date.now(),
      };

      const updatedData = {
        ...incidente,
        notas: [...notas, nota],
      };

      await updateIncidente(updatedData);
      setNewNote('');
      notify('Nota agregada');
    } catch (error) {
      notify('Error al agregar nota', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Notas de Seguimiento ({notas.length})</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 animate-slide-up">
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {notas.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-4">No hay notas de seguimiento registradas.</p>
            ) : (
              notas.map((nota) => (
                <div key={nota.id} className="bg-slate-800/50 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-300">
                      <User className="w-3 h-3 text-indigo-400" />
                      <span>{nota.autor}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(nota.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{nota.texto}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              placeholder="Agregar nota de seguimiento..."
              className="glass-input flex-1 text-sm py-2"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={!newNote.trim() || isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-xl transition flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default IncidentNotes;
