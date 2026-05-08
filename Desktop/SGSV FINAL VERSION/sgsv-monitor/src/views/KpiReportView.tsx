import { useState, useMemo, useRef } from 'react';
import { normalizeTimestamp, INCIDENT_TYPES, CHART_COLORS } from '../lib/utils';
import { Printer, ShieldCheck, Calendar, Download, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function KpiReportView({ incidentes, personasInteres }) {
  const [dateRange, setDateRange] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef(null);
  const now = Date.now();

  const handlePrint = async () => {
    if (!reportRef.current) return;
    try {
      setIsGenerating(true);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Reporte_SGSV_${dateRange}dias.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Hubo un error al generar el PDF. Intenta usar Ctrl+P o CMD+P.');
    } finally {
      setIsGenerating(false);
    }
  };

  const reportData = useMemo(() => {
    const cutoffDate = now - (dateRange * 24 * 60 * 60 * 1000);
    const incidentesPeriodo = incidentes.filter(inc => normalizeTimestamp(inc.timestamp) >= cutoffDate);
    
    const total = incidentesPeriodo.length;
    const criticos = incidentesPeriodo.filter(i => i.severidad === 'Critica' || i.severidad === 'Crítica' || i.severidad === 'Alta');
    const abiertos = incidentesPeriodo.filter(i => i.status === 'Abierto' || i.status === 'En seguimiento');
    const cerrados = incidentesPeriodo.filter(i => i.status === 'Cerrado');
    
    const resolucion = total > 0 ? Math.round((cerrados.length / total) * 100) : 0;
    
    const cerradosConTiempo = cerrados.filter(i => i.closedAt && i.timestamp);
    let tiempoPromedio = 0;
    if (cerradosConTiempo.length > 0) {
      const totalMs = cerradosConTiempo.reduce((acc, i) => acc + (normalizeTimestamp(i.closedAt) - normalizeTimestamp(i.timestamp)), 0);
      tiempoPromedio = Math.round(totalMs / cerradosConTiempo.length / (1000 * 60 * 60));
    }

    const byLocation = {};
    incidentesPeriodo.forEach(inc => {
      byLocation[inc.ubicacion] = (byLocation[inc.ubicacion] || 0) + 1;
    });

    const byType = {};
    INCIDENT_TYPES.forEach(t => byType[t] = 0);
    incidentesPeriodo.forEach(inc => {
      byType[inc.tipo] = (byType[inc.tipo] || 0) + 1;
    });

    const chartDataByDate = {};
    incidentesPeriodo.forEach(inc => {
      const d = new Date(normalizeTimestamp(inc.timestamp));
      const dk = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!chartDataByDate[dk]) {
        chartDataByDate[dk] = { date: dk, _ts: d.getTime() };
        INCIDENT_TYPES.forEach(t => chartDataByDate[dk][t] = 0);
      }
      chartDataByDate[dk][inc.tipo] = (chartDataByDate[dk][inc.tipo] || 0) + 1;
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
      topCriticos: criticos.slice(0, 5),
      chartData
    };
  }, [incidentes, dateRange, now]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 print-report">
      {/* Controles NO Imprimibles */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white">Reporte KPI Ejecutivo</h2>
          <p className="text-sm text-slate-400">Generacion de reportes para impresion o PDF</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="glass-input py-2 text-sm"
          >
            <option value={7} className="bg-slate-900">Ultimos 7 dias</option>
            <option value={30} className="bg-slate-900">Ultimos 30 dias</option>
            <option value={60} className="bg-slate-900">Ultimos 60 dias</option>
            <option value={90} className="bg-slate-900">Ultimos 90 dias</option>
          </select>
          <button 
            onClick={handlePrint}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition font-medium shadow-lg"
          >
            {isGenerating ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isGenerating ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* DOCUMENTO IMPRIMIBLE */}
      <div ref={reportRef} className="print-only-container bg-white text-black p-8 rounded-xl shadow-xl border border-slate-200 min-h-[1056px] w-full max-w-[816px] mx-auto print:shadow-none print:border-none print:p-0 print:max-w-full">
        
        {/* Header Reporte */}
        <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 mb-2">
              <ShieldCheck className="w-8 h-8" />
              <h1 className="text-3xl font-black tracking-tight">SGSV Monitor</h1>
            </div>
            <h2 className="text-xl font-semibold text-slate-600 uppercase tracking-widest">Reporte de Seguridad y KPI</h2>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-slate-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Periodo: Ultimos {dateRange} dias</span>
            </div>
            <p className="text-sm text-slate-400">Generado: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Resumen Ejecutivo */}
        <div className="mb-8">
          <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">Resumen Ejecutivo</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <p className="text-sm font-semibold text-slate-500 uppercase">Total Eventos</p>
              <p className="text-3xl font-black text-indigo-600 mt-1">{reportData.total}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <p className="text-sm font-semibold text-slate-500 uppercase">Alta Prioridad</p>
              <p className="text-3xl font-black text-rose-600 mt-1">{reportData.criticos}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <p className="text-sm font-semibold text-slate-500 uppercase">Resueltos</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{reportData.cerrados}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <p className="text-sm font-semibold text-slate-500 uppercase">Tasa Resolucion</p>
              <p className="text-3xl font-black text-slate-700 mt-1">{reportData.resolucion}%</p>
            </div>
          </div>
        </div>

        {/* Desglose y Tiempos */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">Desglose por Ubicacion</h3>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(reportData.byLocation).sort((a,b) => b[1] - a[1]).map(([loc, count]) => (
                  <tr key={loc} className="border-b border-slate-100">
                    <td className="py-2 font-medium">{loc}</td>
                    <td className="py-2 text-right font-bold text-indigo-600">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">Metricas de Atencion</h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
              <p className="text-sm text-slate-500 font-medium">Tiempo Promedio de Cierre</p>
              <p className="text-2xl font-bold text-slate-800">{reportData.tiempoPromedio} horas</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-sm text-slate-500 font-medium">Personas en Lista Negra (PCP)</p>
              <p className="text-2xl font-bold text-amber-600">{personasInteres.length} activos</p>
            </div>
          </div>
        </div>

        {/* Grafico (Forzado a estilos claros para impresion) */}
        <div className="mb-8 page-break">
          <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">Tendencia de Actividad</h3>
          <div className="h-64 w-full">
            {reportData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', color: 'black' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {INCIDENT_TYPES.map(tipo => (
                    <Bar key={tipo} dataKey={tipo} stackId="stack" fill={CHART_COLORS[tipo] || '#94a3b8'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
                No hay datos para este periodo
              </div>
            )}
          </div>
        </div>

        {/* Top Incidentes Criticos */}
        <div className="mb-8">
          <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-rose-600">Eventos de Alta Prioridad Recientes</h3>
          {reportData.topCriticos.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Titulo</th>
                  <th className="px-3 py-2">Ubicacion</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topCriticos.map(inc => (
                  <tr key={inc.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-500">{inc.fecha.split(',')[0]}</td>
                    <td className="px-3 py-2 font-medium">{inc.titulo}</td>
                    <td className="px-3 py-2">{inc.ubicacion}</td>
                    <td className="px-3 py-2">{inc.tipo}</td>
                    <td className="px-3 py-2 font-semibold text-rose-600">{inc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-500 italic text-sm">No hubo eventos criticos en este periodo.</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-500">
          <p className="font-bold mb-1">Documento Confidencial - Uso Interno Exclusivo</p>
          <p>Sistema de Gestion de Siniestros y Vulnerabilidades (SGSV)</p>
          <div className="mt-8 mx-auto w-48 border-t border-slate-400 pt-2">
            Firma Responsable
          </div>
        </div>

      </div>
    </div>
  );
}
