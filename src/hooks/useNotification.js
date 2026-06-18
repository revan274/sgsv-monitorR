import { useCallback, useEffect, useState } from 'react';

// Notificación efímera (toast) que se autodescarta tras `timeout` ms.
export function useNotification(timeout = 3000) {
  const [notification, setNotification] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!notification) return undefined;
    const id = setTimeout(() => setNotification(null), timeout);
    return () => clearTimeout(id);
  }, [notification, timeout]);

  return [notification, notify];
}
