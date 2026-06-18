import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { repository } from './data/repository.js';
import { normalizeIncident, normalizePersona } from './domain/normalize.js';
import { parseStoredArray, sortByTimestampDesc, normalizeSearchText } from './domain/utils.js';
import { BLACKLIST_TERMS } from './domain/constants.js';
import { usePersistentCollection } from './hooks/usePersistentCollection.js';
import { useNotification } from './hooks/useNotification.js';

import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import AppSkeleton from './components/Skeletons.jsx';
import Notification from './components/Notification.jsx';
import Modal from './components/Modal.jsx';
import Lightbox from './components/Lightbox.jsx';
import DashboardView from './views/DashboardView.jsx';
import NewIncidentView from './views/NewIncidentView.jsx';
import HistoryView from './views/HistoryView.jsx';
import PcpView from './views/PcpView.jsx';
import StatisticsView from './views/StatisticsView.jsx';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [notification, notify] = useNotification();
  const [modal, setModal] = useState({ isOpen: false });
  const [lightbox, setLightbox] = useState(null);

  const [incidents, setIncidents, incidentsLoaded] = usePersistentCollection(
    () => repository.loadIncidents(),
    (items) => repository.saveIncidents(items),
    { onError: () => notify('Error al acceder a la base de datos local', 'error') },
  );

  const [personas, setPersonas, personasLoaded] = usePersistentCollection(
    () => repository.loadPersonas(),
    (items) => repository.savePersonas(items),
    { onError: () => notify('Error al acceder a la base de datos local', 'error') },
  );

  const loaded = incidentsLoaded && personasLoaded;

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));
  const confirm = (title, content, onConfirm) => setModal({ isOpen: true, title, content, onConfirm, danger: true });

  const blacklistTerms = useMemo(() => {
    const fromStatic = BLACKLIST_TERMS.map(normalizeSearchText).filter(Boolean);
    const fromPcp = personas.map((p) => normalizeSearchText(p.nombre)).filter(Boolean);
    return Array.from(new Set([...fromStatic, ...fromPcp]));
  }, [personas]);

  const createIncident = (incident) => {
    setIncidents((prev) => sortByTimestampDesc([normalizeIncident(incident), ...prev]));
    notify('Incidente registrado correctamente');
    setView('historial');
  };

  const deleteIncident = (inc) =>
    confirm('Borrar incidente', `¿Borrar "${inc.titulo}"? Esta acción no se puede deshacer.`, () =>
      setIncidents((prev) => prev.filter((i) => i.id !== inc.id)),
    );

  const importIncidents = async (text) => {
    try {
      const parsed = parseStoredArray(text).map(normalizeIncident);
      if (!parsed.length) {
        notify('El archivo no contiene incidentes válidos.', 'warning');
        return;
      }
      setIncidents((prev) => {
        const merged = new Map(prev.map((i) => [i.id, i]));
        parsed.forEach((i) => merged.set(i.id, i));
        return sortByTimestampDesc(Array.from(merged.values()));
      });
      notify(`${parsed.length} registro(s) importado(s).`);
    } catch {
      notify('Error al importar JSON.', 'error');
    }
  };

  const addPersona = (persona) => {
    setPersonas((prev) => [normalizePersona(persona), ...prev]);
    notify('Persona agregada a lista negra');
  };

  const deletePersona = (persona) =>
    confirm('Eliminar de lista negra', `¿Eliminar a ${persona.nombre}?`, () =>
      setPersonas((prev) => prev.filter((x) => x.id !== persona.id)),
    );

  if (!loaded) return <AppSkeleton />;

  const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="shell">
      <Modal config={modal} onClose={closeModal} />
      <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
      <Sidebar view={view} onChange={setView} counts={{ incidentes: incidents.length, pcp: personas.length }} />

      <main className="main">
        <Notification notification={notification} />

        {view === 'dashboard' && (
          <>
            <Topbar
              title="Panel general"
              subtitle={<>Sistema operativo · <b>todo en orden</b> · última sincronización {now}</>}
              actions={
                <button className="btn primary" onClick={() => setView('nuevo')}>
                  <Plus size={15} /> Nuevo evento
                </button>
              }
            />
            <DashboardView incidents={incidents} personas={personas} onImageClick={setLightbox} />
          </>
        )}

        {view === 'nuevo' && (
          <>
            <Topbar title="Registrar evento" subtitle="Documenta un nuevo siniestro o incidencia" />
            <NewIncidentView onCreate={createIncident} notify={notify} />
          </>
        )}

        {view === 'historial' && (
          <HistoryView
            incidents={incidents}
            blacklistTerms={blacklistTerms}
            onDelete={deleteIncident}
            onImport={importIncidents}
            onImageClick={setLightbox}
          />
        )}

        {view === 'pcp' && (
          <PcpView personas={personas} onAdd={addPersona} onDelete={deletePersona} onImageClick={setLightbox} notify={notify} />
        )}

        {view === 'stats' && <StatisticsView incidents={incidents} onImageClick={setLightbox} />}
      </main>
    </div>
  );
}
