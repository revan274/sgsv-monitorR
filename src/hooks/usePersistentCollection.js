import { useEffect, useRef, useState } from 'react';

// Carga una colección desde el repositorio y la persiste de forma reactiva
// cada vez que cambia, evitando guardar durante la carga inicial.
export function usePersistentCollection(load, save, { onError } = {}) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let active = true;
    load()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        console.error('Error cargando datos:', err);
        onErrorRef.current?.(err);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    save(items).catch((err) => {
      console.error('Error guardando datos:', err);
      onErrorRef.current?.(err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loaded]);

  return [items, setItems, loaded];
}
