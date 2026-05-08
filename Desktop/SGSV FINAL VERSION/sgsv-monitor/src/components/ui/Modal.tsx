export default function Modal({ isOpen, title, content, onClose, onConfirm, confirmColor = 'bg-red-600' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-panel rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up border border-white/10" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="text-slate-300 mb-6">{content}</div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition">Cancelar</button>
          <button 
            onClick={() => { onConfirm?.(); onClose(); }} 
            className={`px-4 py-2 rounded-lg text-white font-bold transition shadow-lg ${confirmColor} hover:opacity-90 hover:scale-105`}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
