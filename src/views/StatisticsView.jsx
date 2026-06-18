import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, FileDown } from 'lucide-react';
import {
  INCIDENT_TYPES,
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  LOCATION_OPTIONS,
  CHART_COLORS,
} from '../domain/constants.js';
import Topbar from '../components/Topbar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import IncidentChart from '../components/IncidentChart.jsx';

const SEVERITY_COLORS = { Critica: '#ff4d5e', Alta: '#f0820f', Media: '#eab308', Baja: '#34c6ff' };
const STATUS_COLORS = { Abierto: '#8a97b4', 'En seguimiento': '#3d7bff', Cerrado: '#1fd6a0' };

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(14,19,34,0.95)',
  border: '1px solid #1d273f',
  borderRadius: 8,
  color: '#e7ecf6',
  fontSize: 12,
};

const countList = (items, key, order) => {
  const counts = items.reduce((acc, it) => {
    acc[it[key]] = (acc[it[key]] || 0) + 1;
    return acc;
  }, {});
  return order.map((name) => ({ name, value: counts[name] || 0 }));
};

export default function StatisticsView({ incidents, onImageClick }) {
  void onImageClick;
  const bySeverity = useMemo(() => countList(incidents, 'severidad', SEVERITY_OPTIONS).filter((d) => d.value), [incidents]);
  const byStatus = useMemo(() => countList(incidents, 'status', STATUS_OPTIONS).filter((d) => d.value), [incidents]);
  const byType = useMemo(() => countList(incidents, 'tipo', INCIDENT_TYPES), [incidents]);
  const byLocation = useMemo(() => countList(incidents, 'ubicacion', LOCATION_OPTIONS), [incidents]);

  const hasData = incidents.length > 0;

  return (
    <div className="animate-fade-in">
      <Topbar
        title="Estadísticas"
        subtitle={<><b>{incidents.length}</b> incidente(s) analizado(s)</>}
        actions={
          <button
            className="btn primary"
            disabled={!hasData}
            onClick={async () => {
              const { generatePdfReport } = await import('../lib/pdfReport.js');
              generatePdfReport(incidents, { title: 'Reporte estadístico de siniestros' });
            }}
          >
            <FileDown size={15} /> Reporte PDF
          </button>
        }
      />

      {!hasData ? (
        <div className="card">
          <div className="card-b">
            <EmptyState icon={BarChart3} title="Sin datos para analizar" hint="Registra incidentes para ver las estadísticas." />
          </div>
        </div>
      ) : (
        <>
          <IncidentChart incidents={incidents} />

          <div className="grid" style={{ marginTop: 20 }}>
            <div className="col">
              <ChartCard title="Distribución por tipo">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byType} layout="vertical" margin={{ left: 18, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#8a97b4', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={92} tick={{ fill: '#8a97b4', fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                      {byType.map((d) => (
                        <Cell key={d.name} fill={CHART_COLORS[d.name] || '#3d7bff'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Incidentes por ubicación">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byLocation} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#8a97b4', fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#8a97b4', fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="value" fill="#34c6ff" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="col">
              <ChartCard title="Severidad">
                <DonutChart data={bySeverity} colors={SEVERITY_COLORS} />
              </ChartCard>
              <ChartCard title="Estado de los casos">
                <DonutChart data={byStatus} colors={STATUS_COLORS} />
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <div className="card-h">
        <h3>{title}</h3>
      </div>
      <div className="card-b">{children}</div>
    </div>
  );
}

function DonutChart({ data, colors }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} stroke="none">
          {data.map((d) => (
            <Cell key={d.name} fill={colors[d.name] || '#3d7bff'} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
