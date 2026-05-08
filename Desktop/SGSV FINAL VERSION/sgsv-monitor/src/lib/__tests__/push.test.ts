import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isPushSupported,
  getNotificationPermission,
  showLocalNotification,
  notifyCriticalIncident,
  savePushSubscription,
  loadPushSubscription,
} from '../push';
import type { Incidente } from '../../types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

const PUSH_STORAGE_KEY = 'sgsv_push_subscription';

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage);
  mockLocalStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── isPushSupported ──────────────────────────────────────────────────────────

describe('isPushSupported', () => {
  it('returns false when Notification is not in window', () => {
    vi.stubGlobal('Notification', undefined);
    expect(isPushSupported()).toBe(false);
  });

  it('returns false when serviceWorker is not in navigator', () => {
    vi.stubGlobal('Notification', { permission: 'default' });
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });
    expect(isPushSupported()).toBe(false);
  });

  it('returns true when all APIs are available', () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    vi.stubGlobal('PushManager', {});
    expect(isPushSupported()).toBe(true);
  });
});

// ─── getNotificationPermission ────────────────────────────────────────────────

describe('getNotificationPermission', () => {
  it('returns "denied" when push is not supported', () => {
    vi.stubGlobal('Notification', undefined);
    expect(getNotificationPermission()).toBe('denied');
  });

  it('returns the current Notification.permission when supported', () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    vi.stubGlobal('PushManager', {});
    expect(getNotificationPermission()).toBe('granted');
  });
});

// ─── showLocalNotification ────────────────────────────────────────────────────

describe('showLocalNotification', () => {
  it('does nothing if push is not supported', () => {
    vi.stubGlobal('Notification', undefined);
    expect(() => showLocalNotification('Title', 'Body')).not.toThrow();
  });

  it('does nothing if permission is not granted', () => {
    const NotificationSpy = vi.fn();
    NotificationSpy.permission = 'default';
    vi.stubGlobal('Notification', NotificationSpy);
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    vi.stubGlobal('PushManager', {});
    showLocalNotification('Title', 'Body');
    expect(NotificationSpy).not.toHaveBeenCalledWith('Title', expect.anything());
  });

  it('creates a Notification when permission is granted', () => {
    const NotificationSpy = vi.fn();
    NotificationSpy.permission = 'granted';
    vi.stubGlobal('Notification', NotificationSpy);
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    vi.stubGlobal('PushManager', {});
    showLocalNotification('Alert', 'Something happened', 'tag-1');
    expect(NotificationSpy).toHaveBeenCalledWith('Alert', expect.objectContaining({
      body: 'Something happened',
      tag: 'tag-1',
    }));
  });
});

// ─── notifyCriticalIncident ───────────────────────────────────────────────────

describe('notifyCriticalIncident', () => {
  it('calls showLocalNotification with incidente details', () => {
    const NotificationSpy = vi.fn();
    NotificationSpy.permission = 'granted';
    vi.stubGlobal('Notification', NotificationSpy);
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    vi.stubGlobal('PushManager', {});

    const incidente: Incidente = {
      id: 'inc-test',
      fecha: '1/1/2024',
      timestamp: 1700000000000,
      titulo: 'Robo crítico',
      tipo: 'Robo',
      severidad: 'Critica',
      descripcion: 'Robo en zona norte',
      ubicacion: 'TJ01',
      status: 'Abierto',
      responsable: 'Op1',
      imagenEvidencia: null,
      imagenPersona: null,
      videoEvidencia: null,
      closedAt: null,
      notas: [],
    };

    notifyCriticalIncident(incidente);

    expect(NotificationSpy).toHaveBeenCalledWith(
      expect.stringContaining('TJ01'),
      expect.objectContaining({
        body: expect.stringContaining('Robo crítico'),
        tag: `incident-${incidente.id}`,
      }),
    );
  });
});

// ─── savePushSubscription / loadPushSubscription ──────────────────────────────

describe('savePushSubscription', () => {
  it('removes key when passed null', () => {
    savePushSubscription(null);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(PUSH_STORAGE_KEY);
  });

  it('stores subscription JSON when passed a subscription object', () => {
    const mockSub = { toJSON: () => ({ endpoint: 'https://push.example.com', keys: {} }) };
    savePushSubscription(mockSub as unknown as PushSubscription);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      PUSH_STORAGE_KEY,
      JSON.stringify(mockSub),
    );
  });
});

describe('loadPushSubscription', () => {
  it('returns null when nothing stored', () => {
    expect(loadPushSubscription()).toBeNull();
  });

  it('returns parsed object when valid JSON stored', () => {
    const data = { endpoint: 'https://push.example.com', keys: { auth: 'a', p256dh: 'b' } };
    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(data));
    const result = loadPushSubscription();
    expect(result).toEqual(data);
  });

  it('returns null when stored value is invalid JSON', () => {
    mockLocalStorage.getItem.mockReturnValueOnce('{bad json}');
    expect(loadPushSubscription()).toBeNull();
  });
});
