// Modal de confirmación, controlado por estado externo.
export default function Modal({ config, onClose }) {
  if (!config?.isOpen) return null;
  const { title, content, onConfirm, danger = true } = config;

  return (
    <div className="overlay animate-fade-in" onClick={onClose}>
      <div className="dialog animate-scale-up" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{content}</p>
        <div className="acts">
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`btn ${danger ? 'danger' : 'primary'}`}
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
