import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { normalizeTimestamp, INCIDENT_TYPES, CHART_COLORS } from '../../lib/utils';
import type { Incidente } from '../../types';

type ChartIncident = Incidente & {
  _indexText?: string;
  _hasBlacklistMatch?: boolean;
};

type ChartRow = {
  date: string;
  _ts: number;
} & Record<string, string | number>;

interface IncidentChartProps {
  incidentesPrepared: ChartIncident[];
  containerId?: string;
}

export default function IncidentChart({ incidentesPrepared, containerId }: IncidentChartProps) {
  const [now] = useState(() => Date.now());

  const chartData = useMemo(() => {
    const byDate: Record<string, ChartRow> = {};
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
    
    incidentesPrepared.forEach(inc => {
      const ts = normalizeTimestamp(inc.timestamp);
      if (ts < sixtyDaysAgo) return;
      const d = new Date(ts);
      const dk = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!byDate[dk]) { 
        byDate[dk] = { date: dk, _ts: ts }; 
        INCIDENT_TYPES.forEach(t => byDate[dk][t] = 0); 
      }
      byDate[dk][inc.tipo] = Number(byDate[dk][inc.tipo] || 0) + 1;
    });
    
    return Object.values(byDate).sort((a, b) => a._ts - b._ts);
  }, [incidentesPrepared, now]);

  if (!chartData.length) {
    return <div className="glass-panel rounded-xl p-6 text-center text-slate-400">Sin incidentes recientes.</div>;
  }

  return (
    <div id={containerId} className="glass-panel rounded-xl p-6 bg-slate-900/80">
      <h3 className="text-white font-semibold mb-4">Actividad — Últimos 60 días</h3>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0' }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            {INCIDENT_TYPES.map(tipo => (
              <Bar key={tipo} dataKey={tipo} stackId="stack" fill={CHART_COLORS[tipo] || '#888'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
