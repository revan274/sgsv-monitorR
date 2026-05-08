import { useMemo } from 'react';
import { normalizeSearchText, normalizeTimestamp } from '../lib/utils';
import AutoVettedSlider from '../components/ui/AutoVettedSlider';
import IncidentChart from '../components/ui/IncidentChart';
import { ShieldAlert, Activity, CheckCircle2, Clock, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import type { Incidente, PersonaInteres } from '../types';

interface DashboardViewProps {
  incidentes: Incidente[];
  personasInteres: PersonaInteres[];
  setLightboxImage: (src: string) => void;
  blacklistTerms: string[];
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
        <TrendingUp className="w-3 h-3" /> nuevo
      </span>
    );
  }
  const delta = Math.round(((current - previous) / previous) * 100);
  if (delta > 0)
    return (
      <span className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
        <TrendingUp className="w-3 h-3" /> +{delta}%
      </span>
    );
  if (delta < 0)
    return (
      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
        <TrendingDown className="w-3 h-3" /> {delta}%
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
      <Minus className="w-3 h-3" /> sin cambio
    </span>
  );
}

export default function DashboardView({
  incidentes,
  personasInteres,
  setLightboxImage,
  blacklistTerms,
}: DashboardViewProps) {
  const now = Date.now();
  const PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

  const incidentesPrepared = useMemo(() =>
    incidentes.map((inc) => {
      const indexText = normalizeSearchText(
        `${inc.titulo} ${inc.descripcion} ${inc.ubicacion} ${inc.tipo} ${inc.severidad} ${inc.status} ${inc.responsable}`,
      );
      const hasBlacklistMatch = blacklistTerms.some((t) => t && indexText.includes(t));
      return { ...inc, _indexText: indexText, _hasBlacklistMatch: hasBlacklistMatch };
    }), [incidentes, blacklistTerms]);

  // Estadísticas del periodo actual (últimos 30 días) y anterior (31-60 días)
  const { current, previous } = useMemo(() => {
    const cutCurrent = now - PERIOD_MS;
    const cutPrevious = now - 2 * PERIOD_MS;

    const cur = incidentesPrepared.filter(
      (i) => normalizeTimestamp(i.timestamp) >= cutCurrent,
    );
    const prev = incidentesPrepared.filter(
      (i) =>
        normalizeTimestamp(i.timestamp) >= cutPrevious &&
        normalizeTimestamp(i.timestamp) < cutCurrent,
    );

    const stats = (list: typeof incidentesPrepared) => ({
      total: list.length,
      criticos: list.filter(
        (i) => i.severidad === 'Critica' || i.severidad === 'Crítica' || i.severidad === 'Alta',
      ).length,
      abiertos: list.filter(
        (i) => i.status === 'Abierto' || i.status === 'En seguimiento',
      ).length,
      cerrados: list.filter((i) => i.status === 'Cerrado').length,
    });

    return { current: stats(cur), previous: stats(prev) };
  }, [incidentesPrepared, now]);

  const dashboardStats = useMemo(() => {
    const total = incidentesPrepared.length;
    const cerrados = incidentesPrepared.filter((i) => i.status === 'Cerrado');
    const resolucion = total > 0 ? Math.round((cerrados.length / total) * 100) : 0;
    const cerradosConTiempo = cerrados.filter((i) => i.closedAt && i.timestamp);
    let tiempoPromedio = 0;
    if (cerradosConTiempo.length > 0) {
      const totalMs = cerradosConTiempo.reduce(
        (acc, i) => acc + (normalizeTimestamp(i.closedAt!) - normalizeTimestamp(i.timestamp)),
        0,
      );
      tiempoPromedio = Math.round(totalMs / cerradosConTiempo.length / (1000 * 60 * 60));
    }
    return { total, resolucion, tiempoPromedio, cerrados: cerrados.length, abiertos: current.abiertos };
  }, [incidentesPrepared, current]);

  // Estadísticas por operador
  const operatorStats = useMemo(() => {
    const map: Record<string, { total: number; cerrados: number; criticos: number }> = {};
    incidentesPrepared.forEach((inc) => {
      const op = inc.responsable || 'Sin asignar';
      if (!map[op]) map[op] = { total: 0, cerrados: 0, criticos: 0 };
      map[op].total++;
      if (inc.status === 'Cerrado') map[op].cerrados++;
      if (inc.severidad === 'Critica' || inc.severidad === 'Alta') map[op].criticos++;
    });
    return Object.entries(map)
      .map(([nombre, s]) => ({ nombre, ...s }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [incidentesPrepared]);

  return (
    <div className="space-y-6 animate-fade-in no-print">
      {/* KPI Cards con tendencias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group transition-all hover:scale-[1.02]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-16 h-16 text-indigo-400" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Siniestros</h3>
          </div>
          <p className="text-4xl font-bold text-white mt-1">{dashboardStats.total}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500 font-medium">Últ. 30 días: {current.total}</p>
            <TrendBadge current={current.total} previous={previous.total} />
          </div>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-indigo-500/50 to-transparent" />
        </div>

        {/* Alta Prioridad */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group transition-all hover:scale-[1.02]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert className="w-16 h-16 text-rose-400" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="text-rose-400 text-sm font-medium uppercase tracking-wider">Alta Prioridad</h3>
          </div>
          <p className="text-4xl font-bold text-rose-500 mt-1">{current.criticos}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500 font-medium">Requieren atención</p>
            <TrendBadge current={current.criticos} previous={previous.criticos} />
          </div>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-rose-500/50 to-transparent" />
        </div>

        {/* Activos */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group transition-all hover:scale-[1.02]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16 text-amber-400" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-amber-400 text-sm font-medium uppercase tracking-wider">Activos</h3>
          </div>
          <p className="text-4xl font-bold text-amber-400 mt-1">{dashboardStats.abiertos}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500 font-medium">Prom. cierre: {dashboardStats.tiempoPromedio}h</p>
            <TrendBadge current={current.abiertos} previous={previous.abiertos} />
          </div>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-amber-500/50 to-transparent" />
        </div>

        {/* Resueltos */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group transition-all hover:scale-[1.02]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-emerald-400 text-sm font-medium uppercase tracking-wider">Resueltos</h3>
          </div>
          <div className="flex items-end gap-3 mt-1">
            <p className="text-4xl font-bold text-emerald-500">{dashboardStats.cerrados}</p>
            <p className="text-sm font-bold text-emerald-400/70 mb-1">{dashboardStats.resolucion}% tasa</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500 font-medium">Últ. 30 días: {current.cerrados}</p>
            <TrendBadge current={current.cerrados} previous={previous.cerrados} />
          </div>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
        </div>
      </div>

      <IncidentChart incidentesPrepared={incidentesPrepared} />

      {/* Estadísticas por operador */}
      {operatorStats.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white">Top Operadores (últimos 30 días)</h3>
          </div>
          <div className="space-y-2">
            {operatorStats.map((op) => (
              <div key={op.nombre} className="flex items-center gap-3 bg-slate-800/30 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{op.nombre}</p>
                </div>
                <div className="flex items-center gap-4 text-xs shrink-0">
                  <span className="text-slate-400">
                    <span className="text-white font-bold">{op.total}</span> eventos
                  </span>
                  <span className="text-rose-400">
                    <span className="font-bold">{op.criticos}</span> críticos
                  </span>
                  <span className="text-emerald-400">
                    <span className="font-bold">{op.cerrados}</span> cerrados
                  </span>
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${op.total > 0 ? Math.round((op.cerrados / op.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AutoVettedSlider personasInteres={personasInteres} setLightboxImage={setLightboxImage} />
    </div>
  );
}
