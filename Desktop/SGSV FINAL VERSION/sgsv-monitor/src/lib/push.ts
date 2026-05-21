import type { Incidente } from '../types';

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
    // ignore
  }
};

export const notifyCriticalIncident = (incidente: Incidente): void => {
  showLocalNotification(
    `🚨 INCIDENTE CRÍTICO — ${incidente.ubicacion}`,
    `${incidente.titulo}\n${incidente.tipo} · ${incidente.severidad}`,
    `incident-${incidente.id}`,
  );
};
