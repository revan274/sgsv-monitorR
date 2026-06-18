import { useMemo } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import IncidentChart from '../components/IncidentChart.jsx';
import AutoVettedSlider from '../components/AutoVettedSlider.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { severitySlug, statusSlug } from '../components/badges.js';
import { normalizeTimestamp } from '../domain/utils.js';

function Kpi({ k, label, value, neutral, trend }) {
  return (
    <div className={`kpi ${k}`}>
      <div className="lbl">
        <span className="dot" />
        {label}
      </div>
      <div className={`num ${neutral ? 'neutral' : ''}`}>{value}</div>
      <div className="trend">{trend}</div>
    </div>
  );
}

export default function DashboardView({ incidents, personas, onImageClick }) {
  const stats = useMemo(() => {
    const criticos = incidents.filter((i) => i.severidad === 'Critica' || i.severidad === 'Alta').length;
    const abiertos = incidents.filter((i) => i.status === 'Abierto').length;
    const seguimiento = incidents.filter((i) => i.status === 'En seguimiento').length;
    const cerrados = incidents.filter((i) => i.status === 'Cerrado').length;
    const recientes = [...incidents]
      .sort((a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp))
      .slice(0, 4);
    const pct = incidents.length ? Math.round((cerrados / incidents.length) * 100) : 100;
    return { total: incidents.length, criticos, abiertos, seguimiento, cerrados, recientes, pct };
  }, [incidents]);

  return (
    <div className="animate-fade-in">
      <section className="kpis">
        <Kpi k="k1" label="Total siniestros" value={stats.total} neutral trend={stats.total ? `${stats.total} registrados` : '· sin registros'} />
        <Kpi k="k2" label="Alta prioridad" value={stats.criticos} trend={`${stats.criticos} requieren acción`} />
        <Kpi k="k3" label="Abiertos" value={stats.abiertos} trend={`${stats.seguimiento} en seguimiento`} />
        <Kpi k="k4" label="Cerrados" value={stats.cerrados} trend={`${stats.pct}% resueltos`} />
      </section>

      <div className="grid">
        <div className="col">
          <IncidentChart incidents={incidents} />

          <div className="card">
            <div className="card-h">
              <h3>
                <Clock size={17} className="hi" /> Incidentes recientes
              </h3>
            </div>
            <div className="card-b">
              {stats.recientes.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="Sin incidentes recientes" hint="Las últimas alertas aparecerán aquí." pad="14px 8px" />
              ) : (
                stats.recientes.map((inc) => (
                  <div key={inc.id} className="row-item">
                    <div className={`stripe sev-${severitySlug(inc.severidad)}`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span className={`pill sev-${severitySlug(inc.severidad)}`}>{inc.severidad}</span>
                        <span className={`pill st-${statusSlug(inc.status)}`}>{inc.status}</span>
                        <span className="meta" style={{ marginLeft: 'auto' }}>{inc.fecha}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{inc.titulo}</div>
                      <div className="meta">{inc.tipo} · {inc.ubicacion}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col">
          <AutoVettedSlider personas={personas} onImageClick={onImageClick} />
        </div>
      </div>
    </div>
  );
}
