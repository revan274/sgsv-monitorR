import { LayoutGrid, FilePlus2, ListChecks, ShieldAlert, BarChart3, ShieldCheck } from 'lucide-react';

const SECTIONS = [
  {
    label: 'Operación',
    items: [
      { id: 'dashboard', label: 'Panel general', Icon: LayoutGrid },
      { id: 'nuevo', label: 'Registrar evento', Icon: FilePlus2 },
      { id: 'historial', label: 'Bitácora', Icon: ListChecks, badgeKey: 'incidentes' },
      { id: 'pcp', label: 'Lista negra', Icon: ShieldAlert, badgeKey: 'pcp', alert: true, amber: true },
    ],
  },
];

export default function Sidebar({ view, onChange, counts = {} }) {
  return (
    <aside className="side">
      <div className="brand">
        <span className="mark">
          <ShieldCheck size={21} strokeWidth={1.9} />
        </span>
        <div>
          <h1>Centro PCP</h1>
          <span>Seguridad · SGSV</span>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="nav-label">{section.label}</div>
          <nav className="nav">
            {section.items.map(({ id, label, Icon, badgeKey, alert, amber }) => {
              const isActive = view === id;
              const badge = badgeKey ? counts[badgeKey] : undefined;
              return (
                <button
                  key={id}
                  onClick={() => onChange(id)}
                  className={`${isActive ? 'active' : ''} ${amber ? 'amber' : ''} ${alert && badge ? 'alert' : ''}`}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  {label}
                  {badge !== undefined && <span className="badge">{badge}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="nav-label">Análisis</div>
      <nav className="nav">
        <button className={view === 'stats' ? 'active' : ''} onClick={() => onChange('stats')}>
          <BarChart3 size={18} strokeWidth={1.8} />
          Estadísticas
        </button>
      </nav>

      <div className="side-foot">
        <div className="avatar">JR</div>
        <div className="who">
          J. Ramírez
          <small>Turno · TJ01</small>
        </div>
        <span className="pulse" />
      </div>
    </aside>
  );
}
