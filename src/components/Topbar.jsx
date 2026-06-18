// Encabezado de vista: título, subtítulo de estado y acciones a la derecha.
export default function Topbar({ title, subtitle, actions }) {
  return (
    <div className="topbar">
      <div>
        <h2>{title}</h2>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      {actions && <div className="top-actions">{actions}</div>}
    </div>
  );
}
