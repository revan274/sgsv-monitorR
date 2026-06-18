// Estado vacío: caja de icono tenue + mensaje + acción opcional.
export default function EmptyState({ icon: Icon, title, hint, actionLabel, onAction, pad }) {
  return (
    <div className="empty" style={pad ? { padding: pad } : undefined}>
      {Icon && (
        <div className="ico">
          <Icon size={24} strokeWidth={1.6} />
        </div>
      )}
      <h4>{title}</h4>
      {hint && <p>{hint}</p>}
      {actionLabel && onAction && (
        <button className="btn primary" style={{ marginTop: 16 }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
