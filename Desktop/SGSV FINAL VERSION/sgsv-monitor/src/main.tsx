import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';
import { useAppStore } from './store/useAppStore';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { notifyCriticalIncident, requestNotificationPermission } from './lib/push';
import type { Incidente } from './types';

const updateSW = registerSW({
  onNeedRefresh() {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 z-[9999] bg-indigo-950/90 text-indigo-100 px-4 py-3 rounded-xl shadow-[0_0_30px_rgba(79,70,229,0.3)] border border-indigo-500/50 flex flex-col gap-3 backdrop-blur animate-slide-up';
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
        </div>
        <p class="text-sm font-medium">¡Nueva versión disponible!</p>
      </div>
      <div class="flex gap-2 justify-end">
        <button id="pwa-close-btn" class="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-bold transition">Ignorar</button>
        <button id="pwa-refresh-btn" class="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-xs font-bold transition shadow-lg shadow-indigo-500/20">Actualizar ahora</button>
      </div>
    `;
    document.body.appendChild(toast);
    
    document.getElementById('pwa-refresh-btn')?.addEventListener('click', () => {
      void updateSW(true);
    });
    document.getElementById('pwa-close-btn')?.addEventListener('click', () => {
      toast.remove();
    });
  },
  onRegisteredSW: (_swUrl: string, registration?: ServiceWorkerRegistration) => {
    // Check for updates every hour in background if app stays open
    setInterval(() => {
      registration?.update().catch(() => {});
    }, 60 * 60 * 1000);
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
