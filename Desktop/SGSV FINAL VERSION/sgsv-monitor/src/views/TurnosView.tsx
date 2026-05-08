import React, { useState } from 'react';
import { Clock, Play, Square, PenLine, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LOCATION_OPTIONS } from '../lib/utils';
import type { NotificationType, Turno } from '../types';

interface TurnosViewProps {
  notify: (msg: string, type?: NotificationType) => void;
}

function formatDuration(start: number, end: number | null): string {
  const ms = (end ?? Date.now()) - start;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function TurnoCard({ turno, isActivo, onCerrar, onNota, incidentes }: {
  turno: Turno;
  isActivo: boolean;
  onCerrar?: () => void;
  onNota?: (texto: string) => void;
  incidentes: ReturnType<typeof useAppStore.getState>['incidentes'];
}) {
  const [expanded, setExpanded] = useState(isActivo);
  const [notaInput, setNotaInput] = useState('');

  const incidentesDelTurno = incidentes.filter((i) => turno.incidenteIds.includes(i.id));

  const handleAddNota = () => {
    const t = notaInput.trim();
    if (!t || !onNota) return;
    onNota(t);
    setNotaInput('');
  };

  return (
    <div className={`glass-panel rounded-2xl overflow-hidden transition ${isActivo ? 'ring-2 ring-emerald-500/40' : ''}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {isActivo ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
          )}
          <div>
            <p className="font-bold text-white text-sm">{turno.operador}</p>
            <p className="text-xs text-slate-400">
              {new Date(turno.inicio).toLocaleString()} · {turno.ubicacion}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono px-2 py-1 rounded-lg ${isActivo ? 'bg-emerald-900/40 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
            {formatDuration(turno.inicio, turno.fin)}
          </span>
          <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-1 rounded-lg">
            {incidentesDelTurno.length} evento{incidentesDelTurno.length !== 1 ? 's' : ''}
          </span>
          {isActivo && onCerrar && (
            <button
              onClick={onCerrar}
              className="flex items-center gap-1.5 bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
            >
              <Square className="w-3.5 h-3.5" /> Cerrar Turno
            </button>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-slate-400 hover:text-white transition"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-5 py-4 space-y-4">
          {/* Notas del turno */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Notas de Turno</p>
            {turno.notas.length === 0 ? (
              <p className="text-slate-600 text-xs italic">Sin notas.</p>
            ) : (
              <ul className="space-y-2">
                {turno.notas.map((nota) => (
                  <li key={nota.id} className="bg-slate-800/40 rounded-lg px-3 py-2">
                    <p className="text-slate-200 text-sm">{nota.texto}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {nota.autor} · {new Date(nota.timestamp).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {isActivo && onNota && (
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={notaInput}
                  onChange={(e) => setNotaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNota()}
                  placeholder="Agregar nota de traspaso..."
                  className="glass-input flex-1 rounded-lg px-3 py-2 text-white text-sm"
                />
                <button
                  onClick={handleAddNota}
                  disabled={!notaInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition"
                >
                  <PenLine className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Incidentes del turno */}
          {incidentesDelTurno.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                Eventos registrados en este turno
              </p>
              <ul className="space-y-1.5">
                {incidentesDelTurno.map((inc) => (
                  <li
                    key={inc.id}
                    className="flex items-center gap-2 bg-slate-800/30 rounded-lg px-3 py-2"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      inc.severidad === 'Critica' ? 'bg-red-500' :
                      inc.severidad === 'Alta' ? 'bg-orange-500' :
                      inc.severidad === 'Media' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-slate-200 text-sm flex-1 truncate">{inc.titulo}</span>
                    <span className="text-slate-500 text-xs shrink-0">{inc.ubicacion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TurnosView({ notify }: TurnosViewProps) {
  const profile = useAppStore((s) => s.profile);
  const turnos = useAppStore((s) => s.turnos);
  const turnoActivo = useAppStore((s) => s.turnoActivo);
  const incidentes = useAppStore((s) => s.incidentes);
  const config = useAppStore((s) => s.config);
  const abrirTurno = useAppStore((s) => s.abrirTurno);
  const cerrarTurno = useAppStore((s) => s.cerrarTurno);
  const agregarNotaTurno = useAppStore((s) => s.agregarNotaTurno);

  const [ubicacion, setUbicacion] = useState(LOCATION_OPTIONS[0]);
  const [opening, setOpening] = useState(false);

  const allLocations = [...LOCATION_OPTIONS, ...(config.customLocations || [])];
  const turnosCerrados = turnos.filter((t) => !!t.fin);

  const handleAbrirTurno = async () => {
    setOpening(true);
    try {
      await abrirTurno({ ubicacion });
      notify(`Turno abierto en ${ubicacion}.`);
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setOpening(false);
    }
  };

  const handleCerrarTurno = async (id: string) => {
    try {
      await cerrarTurno(id);
      notify('Turno cerrado correctamente.', 'warning');
    } catch {
      notify('No se pudo cerrar el turno.', 'error');
    }
  };

  const handleNota = (turnoId: string) => async (texto: string) => {
    await agregarNotaTurno(turnoId, texto);
    notify('Nota agregada.');
  };

  return (
    <div className="space-y-6 animate-fade-in no-print">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Turnos</h2>
          <p className="text-sm text-slate-400 mt-1">
            Operador: <span className="text-slate-200">{profile?.email}</span>
          </p>
        </div>
        <Clock className="w-8 h-8 text-indigo-400" />
      </div>

      {/* Abrir turno */}
      {!turnoActivo && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-white">Abrir Nuevo Turno</h3>
          <div className="flex gap-3">
            <select
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="glass-input flex-1 rounded-lg px-3 py-2.5 text-white"
            >
              {allLocations.map((l) => (
                <option key={l} value={l} className="bg-slate-900">{l}</option>
              ))}
            </select>
            <button
              onClick={handleAbrirTurno}
              disabled={opening}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-lg"
            >
              <Play className="w-4 h-4" /> Iniciar Turno
            </button>
          </div>
        </div>
      )}

      {/* Turno activo */}
      {turnoActivo && (
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase mb-2 tracking-wider">Turno Activo</p>
          <TurnoCard
            turno={turnoActivo}
            isActivo
            onCerrar={() => handleCerrarTurno(turnoActivo.id)}
            onNota={handleNota(turnoActivo.id)}
            incidentes={incidentes}
          />
        </div>
      )}

      {/* Historial de turnos */}
      {turnosCerrados.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-3 tracking-wider">
            Historial ({turnosCerrados.length})
          </p>
          <div className="space-y-3">
            {turnosCerrados.slice(0, 20).map((t) => (
              <TurnoCard
                key={t.id}
                turno={t}
                isActivo={false}
                incidentes={incidentes}
              />
            ))}
          </div>
        </div>
      )}

      {turnos.length === 0 && (
        <div className="text-center py-16 glass-panel rounded-2xl">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No hay turnos registrados aún.</p>
        </div>
      )}
    </div>
  );
}
