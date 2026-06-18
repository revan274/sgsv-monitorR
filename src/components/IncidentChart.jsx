import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { INCIDENT_TYPES, CHART_COLORS } from '../domain/constants.js';
import { normalizeTimestamp } from '../domain/utils.js';

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

// Barras apiladas por día y tipo, últimos 60 días.
export default function IncidentChart({ incidents }) {
  const cutoff = Date.now() - SIXTY_DAYS_MS;
  const byDate = {};

  for (const inc of incidents) {
    const ts = normalizeTimestamp(inc.timestamp);
    if (ts < cutoff) continue;
    const d = new Date(ts);
    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byDate[key]) {
      byDate[key] = { date: key, _ts: ts };
      INCIDENT_TYPES.forEach((t) => (byDate[key][t] = 0));
    }
    byDate[key][inc.tipo] = (byDate[key][inc.tipo] || 0) + 1;
  }

  const chartData = Object.values(byDate).sort((a, b) => a._ts - b._ts);

  if (!chartData.length) {
    return (
      <div className="card">
        <div className="card-h">
          <h3>Actividad — últimos 60 días</h3>
        </div>
        <div className="card-b" style={{ color: 'var(--txt-faint)', fontSize: 13, textAlign: 'center' }}>
          Sin incidentes recientes.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-h">
        <h3>Actividad — últimos 60 días</h3>
      </div>
      <div className="card-b">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,23,42,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          {INCIDENT_TYPES.map((tipo) => (
            <Bar key={tipo} dataKey={tipo} stackId="stack" fill={CHART_COLORS[tipo]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
