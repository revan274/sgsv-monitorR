import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';
import { useAppStore } from './store/useAppStore';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { notifyCriticalIncident, requestNotificationPermission } from './lib/push';
import type { Incidente } from './types';

registerSW({
  immediate: true,
  onRegisteredSW: (_swUrl, registration) => {
    registration?.update();
  },
});

// Solicitar permiso de notificaciones al inicio
requestNotificationPermission().catch(() => {});

const CRITICAL_ALERT_MP3 =
  'data:audio/mp3;base64,UklGRowBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWgBAACA0d+fRh1Gnt3PgDIkYrjguGMmM4DM2Z1JI0md2MqANilktdq1ZCs4gMjUm0wpTZvSxoA7L2ay1bJmMDyAw8+ZUC5Qmc3BgD80Z6/Prmg2QYC/yZhTNFOXyL2ARDlpq8qraTtFgLrEllY5V5bDuIBIPmuoxKhrQEqAtr+UWT9alL20gE1EbaW/pW1FToCxupNdRF2SuK+AUUluormhb0tTgK20kWBKYJGzq4BWTnCes55wUFeAqK+PY09kj62mgFpUcpuum3JVXICkqo1nVWeNqKKAX1lzmKiYdFpggJ+kjGpbaoujnYBjXnWVo5R1YGWAm5+KbWBtip6ZgGhjd5GdkXdlaYCWmohwZnGImJSAbGl5jpiOeWpugJKVh3RrdIaTkIBwbnqLkop7cHKAjY+Fd3F3hY6LgHVzfIiNh3x1d4CJioN6dnqDiIeAeXl+hIeEfnp7gISFgX18foGDgoB+fn+BgYGAf4A=';

const criticalToastIds = new Set<string>();

const isCritical = (inc: Incidente): boolean => inc?.severidad === 'Critica';

const playCriticalSound = (): void => {
  const audio = new Audio(CRITICAL_ALERT_MP3);
  audio.volume = 0.85;
  void audio.play().catch(() => {});
};

const showCriticalToast = (incidente: Incidente): void => {
  const toast = document.createElement('div');
  toast.className = [
    'fixed top-4 right-4 z-[9999] max-w-sm rounded-xl',
    'border border-red-400/80 bg-red-900/90 px-4 py-3 text-white',
    'shadow-[0_0_30px_rgba(248,113,113,0.55)] backdrop-blur animate-slide-up',
  ].join(' ');

  const label = document.createElement('p');
  label.className = 'text-xs font-bold uppercase tracking-[0.18em] text-red-200';
  label.textContent = 'Alerta Critica';

  const title = document.createElement('p');
  title.className = 'mt-1 text-sm font-semibold';
  title.textContent = incidente.titulo || 'Incidente critico registrado';

  const meta = document.createElement('p');
  meta.className = 'mt-1 text-xs text-red-100/90';
  meta.textContent = `${incidente.ubicacion || 'Sin ubicacion'} | ${incidente.fecha || 'Sin fecha'}`;

  toast.append(label, title, meta);
  document.body.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
    window.setTimeout(() => toast.remove(), 220);
  }, 5200);
};

useAppStore.subscribe(
  (state) => ({ dataLoaded: state.dataLoaded, incidentes: state.incidentes }),
  (current, previous) => {
    if (!current.dataLoaded) return;

    if (!previous?.dataLoaded) {
      current.incidentes.forEach((inc) => criticalToastIds.add(inc.id));
      return;
    }

    const previousIds = new Set(previous.incidentes.map((inc) => inc.id));
    const criticalIncident = current.incidentes.find(
      (inc) =>
        isCritical(inc) &&
        !previousIds.has(inc.id) &&
        !criticalToastIds.has(inc.id),
    );

    if (!criticalIncident) return;

    criticalToastIds.add(criticalIncident.id);
    playCriticalSound();
    notifyCriticalIncident(criticalIncident);
    showCriticalToast(criticalIncident);
  },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
