import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle };

// Toast con icono por tipo y barra de progreso del autocierre.
export default function Notification({ notification }) {
  if (!notification) return null;
  const type = notification.type in ICONS ? notification.type : 'success';
  const Icon = ICONS[type];
  return (
    <div key={notification.id} className={`toast ${type} animate-slide-up`} role="status">
      <div className="row">
        <Icon size={19} className="accent" style={{ flex: 'none' }} />
        <span>{notification.message}</span>
      </div>
      <div className="bar">
        <span />
      </div>
    </div>
  );
}
