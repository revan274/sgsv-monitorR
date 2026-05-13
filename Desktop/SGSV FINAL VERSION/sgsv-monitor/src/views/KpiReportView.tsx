import { useState, useMemo } from 'react';
import { normalizeTimestamp, INCIDENT_TYPES, CHART_COLORS } from '../lib/utils';
import { Download, Activity, Share2, Mail, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateKpiPdf } from '../lib/pdfGenerator';
import type { Incidente, PersonaInteres } from '../types';

type ChartRow = {
  date: string;
  _ts: number;
} & Record<string, string | number>;

interface KpiReportViewProps {
  incidentes: Incidente[];
  personasInteres: PersonaInteres[];
}

const SEV_CONFIG = [
  { key: 'Critica',  label: 'Crítica', textColor: 'text-red-400',    barColor: 'bg-red-500' },
  { key: 'Alta',     label: 'Alta',    textColor: 'text-orange-400', barColor: 'bg-orange-500' },
  { key: 'Media',    label: 'Media',   textColor: 'text-amber-400',  barColor: 'bg-amber-500' },
  { key: 'Baja',     label: 'Baja',    textColor: 'text-emerald-400',barColor: 'bg-emerald-500' },
] as const;

export default function KpiReportView({ incidentes, personasInteres }: KpiReportViewProps) {
  const [dateRange, setDateRange] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const now = Date.now();

  const reportData = useMemo(() => {
    const cutoff = now - dateRange * 24 * 60 * 60 * 1000;
    const incidentesPeriodo = incidentes.filter((inc) => normalizeTimestamp(inc.timestamp) >= cutoff);

    const total = incidentesPeriodo.length;
    const criticos = incidentesPeriodo.filter((i) => i.severidad === 'Critica' || i.severidad === 'Alta');
    const abiertos = incidentesPeriodo.filter((i) => i.status === 'Abierto' || i.status === 'En seguimiento');
    const cerrados = incidentesPeriodo.filter((i) => i.status === 'Cerrado');
    const resolucion = total > 0 ? Math.round((cerrados.length / total) * 100) : 0;

    const cerradosConTiempo = cerrados.filter((i) => i.closedAt != null && i.timestamp != null);
    let tiempoPromedio = 0;
    if (cerradosConTiempo.length > 0) {
      const totalMs = cerradosConTiempo.reduce(
        (acc, i) => acc + (normalizeTimestamp(i.closedAt) - normalizeTimestamp(i.timestamp)), 0,
      );
      tiempoPromedio = Math.round(totalMs / cerradosConTiempo.length / (1000 * 60 * 60));
    }

    const byLocation: Record<string, number> = {};
    incidentesPeriodo.forEach((inc) => { byLocation[inc.ubicacion] = (byLocation[inc.ubicacion] || 0) + 1; });

    const byType: Record<string, number> = {};
    INCIDENT_TYPES.forEach((t) => { byType[t] = 0; });
    incidentesPeriodo.forEach((inc) => { byType[inc.tipo] = (byType[inc.tipo] || 0) + 1; });

    const chartDataByDate: Record<string, ChartRow> = {};
    incidentesPeriodo.forEach((inc) => {
      const d = new Date(normalizeTimestamp(inc.timestamp));
      const dk = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!chartDataByDate[dk]) {
        chartDataByDate[dk] = { date: dk, _ts: d.getTime() };
        INCIDENT_TYPES.forEach((t) => { chartDataByDate[dk][t] = 0; });
      }
      chartDataByDate[dk][inc.tipo] = Number(chartDataByDate[dk][inc.tipo] || 0) + 1;
    });
    const chartData = Object.values(chartDataByDate).sort((a, b) => a._ts - b._ts);

    return {
      incidentesPeriodo,
      total,
      criticos: criticos.length,
      abiertos: abiertos.length,
      cerrados: cerrados.length,
      resolucion,
      tiempoPromedio,
      byLocation,
      byType,
      topCriticos: criticos.slice(0, 8),
      chartData,
    };
  }, [incidentes, dateRange, now]);

  const buildPdfOptions = () => ({ incidentes, personasInteres, dateRange, reportData });

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      const blob = generateKpiPdf(buildPdfOptions());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SGSV_KPI_${dateRange}dias_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const blob = generateKpiPdf(buildPdfOptions());
      const fileName = `SGSV_KPI_${dateRange}dias.pdf`;
      if (navigator.share) {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
        if (canShare) {
          await navigator.share({ title: 'Reporte KPI SGSV', text: `Reporte de seguridad — Últimos ${dateRange} días`, files: [file] });
          return;
        }
      }
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error(err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Reporte KPI SGSV — Últimos ${dateRange} días`);
    const body = encodeURIComponent(
      `Reporte de Seguridad SGSV Monitor\n\n` +
      `Período: Últimos ${dateRange} días\n` +
      `Total Eventos: ${reportData.total}\n` +
      `Alta Prioridad: ${reportData.criticos}\n` +
      `Abiertos: ${reportData.abiertos}\n` +
      `Resueltos: ${reportData.cerrados}\n` +
      `Tasa Resolución: ${reportData.resolucion}%\n` +
      `Tiempo Prom. Cierre: ${reportData.tiempoPromedio} hrs\n` +
      `PCP Activos: ${personasInteres.length}\n\n` +
      `Generado: ${new Date().toLocaleString()}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 no-print">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-panel p-4 rounded-xl border border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white">Reporte KPI Ejecutivo</h2>
          <p className="text-sm text-slate-400">Generación y exportación de reportes de seguridad</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="glass-input py-2 text-sm"
          >
            <option value={7}  className="bg-slate-900">Últimos 7 días</option>
            <option value={30} className="bg-slate-900">Últimos 30 días</option>
            <option value={60} className="bg-slate-900">Últimos 60 días</option>
            <option value={90} className="bg-slate-900">Últimos 90 días</option>
          </select>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition font-medium shadow-lg text-sm"
          >
            {isGenerating ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isGenerating ? 'Generando…' : 'PDF'}
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition font-medium shadow-lg text-sm"
          >
            {isSharing ? <Activity className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Compartir
          </button>
          <button
            onClick={handleEmail}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition font-medium shadow-lg text-sm"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>
      </div>

      {/* KPI cards row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Eventos',  value: reportData.total,    color: 'text-indigo-400',  border: 'border-indigo-500/30' },
          { label: 'Alta Prioridad', value: reportData.criticos,  color: 'text-red-400',     border: 'border-red-500/30' },
          { label: 'Abiertos',       value: reportData.abiertos,  color: 'text-orange-400',  border: 'border-orange-500/30' },
          { label: 'Resueltos',      value: reportData.cerrados,  color: 'text-emerald-400', border: 'border-emerald-500/30' },
        ].map(({ label, value, color, border }) => (
          <div key={label} className={`glass-panel p-5 rounded-xl border ${border}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-4xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* KPI cards row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-indigo-500/20">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tasa de Resolución</p>
          <p className="text-3xl font-black text-indigo-300">{reportData.resolucion}<span className="text-lg font-semibold text-slate-400 ml-1">%</span></p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-slate-600/30">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tiempo Prom. Cierre</p>
          <p className="text-3xl font-black text-slate-200">{reportData.tiempoPromedio}<span className="text-lg font-semibold text-slate-400 ml-1">hrs</span></p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-amber-500/20">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">PCP Activos</p>
          <p className="text-3xl font-black text-amber-400">{personasInteres.length}</p>
        </div>
      </div>

      {/* Severity distribution */}
      <div className="glass-panel p-5 rounded-2xl">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          Distribución por Severidad
        </h3>
        <div className="space-y-3">
          {SEV_CONFIG.map(({ key, label, textColor, barColor }) => {
            const count = reportData.incidentesPeriodo.filter(
              (i) => i.severidad === key,
            ).length;
            const pct = reportData.total > 0 ? (count / reportData.total) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className={`font-semibold ${textColor}`}>{label}</span>
                  <span className="text-slate-300 font-bold">{count} <span className="text-slate-500 font-normal text-xs">({Math.round(pct)}%)</span></span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column: Location + Type breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Por Ubicación</h3>
          {Object.keys(reportData.byLocation).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(reportData.byLocation).sort((a, b) => b[1] - a[1]).map(([loc, count]) => {
                const pct = reportData.total > 0 ? (count / reportData.total) * 100 : 0;
                return (
                  <div key={loc} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-24 truncate flex-shrink-0">{loc}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-bold text-indigo-400 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm italic">Sin datos en este período</p>
          )}
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Por Tipo</h3>
          {Object.values(reportData.byType).some((v) => v > 0) ? (
            <div className="space-y-2">
              {Object.entries(reportData.byType).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => {
                const pct = reportData.total > 0 ? (count / reportData.total) * 100 : 0;
                return (
                  <div key={tipo} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-32 truncate flex-shrink-0">{tipo}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-bold text-orange-400 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm italic">Sin datos en este período</p>
          )}
        </div>
      </div>

      {/* Activity chart */}
      <div className="glass-panel p-5 rounded-2xl">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Tendencia de Actividad</h3>
        <div className="h-64 w-full">
          {reportData.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#94a3b8' }} />
                {INCIDENT_TYPES.map((tipo) => (
                  <Bar key={tipo} dataKey={tipo} stackId="stack" fill={CHART_COLORS[tipo] || '#94a3b8'} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm bg-white/5 rounded-xl">
              No hay datos para este período
            </div>
          )}
        </div>
      </div>

      {/* Top critical incidents */}
      {reportData.topCriticos.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider mb-4">Eventos de Alta Prioridad Recientes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-2 text-xs text-slate-400 font-semibold uppercase">Fecha</th>
                  <th className="pb-2 text-xs text-slate-400 font-semibold uppercase">Título</th>
                  <th className="pb-2 text-xs text-slate-400 font-semibold uppercase">Ubicación</th>
                  <th className="pb-2 text-xs text-slate-400 font-semibold uppercase">Severidad</th>
                  <th className="pb-2 text-xs text-slate-400 font-semibold uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topCriticos.map((inc) => (
                  <tr key={inc.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-2 text-slate-400">{inc.fecha.split(',')[0]}</td>
                    <td className="py-2 font-medium text-slate-200">{inc.titulo}</td>
                    <td className="py-2 text-slate-300">{inc.ubicacion}</td>
                    <td className={`py-2 font-semibold ${inc.severidad === 'Critica' ? 'text-red-400' : 'text-orange-400'}`}>
                      {inc.severidad}
                    </td>
                    <td className="py-2 text-slate-300">{inc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
