import type { Incidente } from '../types';

const PUSH_STORAGE_KEY = 'sgsv_push_subscription';

export const isPushSupported = (): boolean =>
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

export const getNotificationPermission = (): NotificationPermission =>
  isPushSupported() ? Notification.permission : 'denied';

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) return 'denied';
  return Notification.requestPermission();
};

export const showLocalNotification = (title: string, body: string, tag?: string): void => {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      requireInteraction: true,
    });
  } catch {
    // Fallback silencioso si el navegador no lo soporta en contexto actual
  }
};

export const notifyCriticalIncident = (incidente: Incidente): void => {
  showLocalNotification(
    `🚨 INCIDENTE CRÍTICO — ${incidente.ubicacion}`,
    `${incidente.titulo}\n${incidente.tipo} · ${incidente.severidad}`,
    `incident-${incidente.id}`,
  );
};

export const savePushSubscription = (sub: PushSubscription | null): void => {
  if (!sub) {
    localStorage.removeItem(PUSH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify(sub));
};

export const loadPushSubscription = (): PushSubscriptionJSON | null => {
  const stored = localStorage.getItem(PUSH_STORAGE_KEY);
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
};

export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;

  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) { savePushSubscription(existing); return existing; }

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Sin VAPID keys configuradas, solo usamos notificaciones locales
      applicationServerKey: undefined,
    }).catch(() => null);

    if (sub) savePushSubscription(sub);
    return sub;
  } catch {
    return null;
  }
};

export const unsubscribeFromPush = async (): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    await sub?.unsubscribe();
    savePushSubscription(null);
  } catch {
    // ignore
  }
};
