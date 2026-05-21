import React, { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import {
  Home, FileEdit, ClipboardList, ShieldBan, Users, LogOut, Cloud, CloudOff,
  CheckCircle, XCircle, AlertTriangle, Printer, Settings, Clock, Search, Zap,
} from 'lucide-react';
import { BLACKLIST_TERMS, normalizeSearchText } from './lib/utils';
import { PERMISSIONS, ROLE_LABELS, can, canAccessView } from './lib/auth';
import { useAppStore } from './store/useAppStore';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import type { Notificacion, NotificationType } from './types';

import Modal from './components/ui/Modal';
import Lightbox from './components/ui/Lightbox';
import SkeletonLoader from './components/ui/SkeletonLoader';
import GlobalSearch from './components/ui/GlobalSearch';
import QuickIncidentModal from './components/ui/QuickIncidentModal';

const DashboardView = React.lazy(() => import('./views/DashboardView'));
const NewIncidentView = React.lazy(() => import('./views/NewIncidentView'));
const HistoryView = React.lazy(() => import('./views/HistoryView'));
const PcpView = React.lazy(() => import('./views/PcpView'));
const LoginView = React.lazy(() => import('./views/LoginView'));
const UsersView = React.lazy(() => import('./views/UsersView'));
const KpiReportView = React.lazy(() => import('./views/KpiReportView'));
const SettingsView = React.lazy(() => import('./views/SettingsView'));
const TurnosView = React.lazy(() => import('./views/TurnosView'));

export default function App() {
  const isOnline = useOnlineStatus();
  const initializeApp = useAppStore((s) => s.initializeApp);
  const hydrateData = useAppStore((s) => s.hydrateData);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const incidentes = useAppStore((s) => s.incidentes);
  const personasInteres = useAppStore((s) => s.personasInteres);
  const addIncidente = useAppStore((s) => s.addIncidente);
  const updateIncidente = useAppStore((s) => s.updateIncidente);
  const deleteIncidente = useAppStore((s) => s.deleteIncidente);
  const addPersonaInteres = useAppStore((s) => s.addPersonaInteres);
  const updatePersonaInteres = useAppStore((s) => s.updatePersonaInteres);
  const deletePersonaInteres = useAppStore((s) => s.deletePersonaInteres);
  const authReady = useAppStore((s) => s.authReady);
  const dataLoaded = useAppStore((s) => s.dataLoaded);
  const cloudEnabled = useAppStore((s) => s.cloudEnabled);
  const session = useAppStore((s) => s.session);
  const profile = useAppStore((s) => s.profile);
  const role = useAppStore((s) => s.role);
  const syncError = useAppStore((s) => s.syncError);
  const signOut = useAppStore((s) => s.signOut);
  const turnoActivo = useAppStore((s) => s.turnoActivo);
  const pendingOpsCount = useAppStore((s) => s.pendingOpsCount);

  const [notificacion, setNotificacion] = useState<Notificacion | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    onConfirm: (() => void) | null;
    confirmColor: string;
  }>({ isOpen: false, title: '', content: '', onConfirm: null, confirmColor: '' });
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showQuickIncident, setShowQuickIncident] = useState(false);

  useEffect(() => { initializeApp(); }, [initializeApp]);

  useEffect(() => {
    if (!notificacion) return undefined;
    const id = setTimeout(() => setNotificacion(null), 4000);
    return () => clearTimeout(id);
  }, [notificacion]);

  // Atajo teclado: Ctrl+K = búsqueda global, Ctrl+Shift+N = registro rápido
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); setShowGlobalSearch(true); }
      if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); setShowQuickIncident(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const notify = useCallback(
    (message: string, type: NotificationType = 'success') => setNotificacion({ message, type }),
    [],
  );

  useEffect(() => {
    const handleAuthError = () => {
      notify('Sesión expirada o permisos insuficientes. Inicia sesión nuevamente.', 'error');
      void signOut();
    };
    window.addEventListener('supabase-auth-error', handleAuthError);
    return () => window.removeEventListener('supabase-auth-error', handleAuthError);
  }, [notify, signOut]);

  const openModal = useCallback(
    (title: string, content: string, onConfirm: () => void, confirmColor = 'bg-red-600') => {
      setModalConfig({ isOpen: true, title, content, onConfirm, confirmColor });
    },
    [],
  );

  const closeModal = () => setModalConfig((prev) => ({ ...prev, isOpen: false }));

  const blacklistTerms = useMemo(() => {
    const staticTerms = BLACKLIST_TERMS.map(normalizeSearchText).filter(Boolean);
    const namesFromPCP = personasInteres.map((p) => normalizeSearchText(p.nombre)).filter(Boolean);
    return Array.from(new Set([...staticTerms, ...namesFromPCP]));
  }, [personasInteres]);

  const roleLabel = ROLE_LABELS[role] || 'Operador';
  const canDeleteIncidents = can(role, PERMISSIONS.DELETE_INCIDENTS);
  const canEditIncidents = can(role, PERMISSIONS.EDIT_INCIDENTS);
  const canExportIncidents = can(role, PERMISSIONS.EXPORT_INCIDENTS);
  const canManagePcp = can(role, PERMISSIONS.MANAGE_PCP);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'nuevo', label: 'Nuevo Evento', icon: FileEdit },
    { id: 'historial', label: 'Bitacora', icon: ClipboardList },
    { id: 'pcp', label: 'Lista Negra', icon: ShieldBan },
    { id: 'reporte', label: 'Reporte KPI', icon: Printer },
    { id: 'turnos', label: 'Turnos', icon: Clock },
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'configuracion', label: 'Configuracion', icon: Settings },
  ].filter((item) => canAccessView(role, item.id));

  const handleSignOut = async () => {
    try { await signOut(); }
    catch { notify('No se pudo cerrar sesion.', 'error'); }
  };

  if (!authReady || !dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto mt-16"><SkeletonLoader /></div>
      </div>
    );
  }

  if (cloudEnabled && !session) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <LoginView />
      </Suspense>
    );
  }

  const navClass = (currentView: string) =>
    `w-full text-left px-3 py-3 rounded-xl transition flex gap-3 items-center ${
      view === currentView
        ? `sidebar-item-active ${currentView === 'pcp' ? 'bg-amber-600/80' : 'bg-blue-600/80'} text-white shadow-lg`
        : 'text-slate-400 hover:bg-white/5'
    }`;

  const renderView = () => {
    let ViewComponent: React.ReactNode = null;

    if (!canAccessView(role, view) || view === 'nuevo') {
      ViewComponent = (
        <NewIncidentView
          addIncidente={addIncidente}
          setView={setView}
          notify={notify}
          currentUser={profile}
        />
      );
    } else if (view === 'dashboard') {
      ViewComponent = (
        <DashboardView
          incidentes={incidentes}
          personasInteres={personasInteres}
          setLightboxImage={setLightboxImage}
          blacklistTerms={blacklistTerms}
        />
      );
    } else if (view === 'historial') {
      ViewComponent = (
        <HistoryView
          incidentes={incidentes}
          deleteIncidente={deleteIncidente}
          updateIncidente={updateIncidente}
          setLightboxImage={setLightboxImage}
          blacklistTerms={blacklistTerms}
          openModal={openModal}
          notify={notify}
          canDelete={canDeleteIncidents}
          canEdit={canEditIncidents}
          canExport={canExportIncidents}
        />
      );
    } else if (view === 'pcp') {
      ViewComponent = (
        <PcpView
          personasInteres={personasInteres}
          addPersonaInteres={addPersonaInteres}
          deletePersonaInteres={deletePersonaInteres}
          updatePersonaInteres={updatePersonaInteres}
          setLightboxImage={setLightboxImage}
          openModal={openModal}
          notify={notify}
          canManagePcp={canManagePcp}
        />
      );
    } else if (view === 'reporte') {
      ViewComponent = (
        <KpiReportView incidentes={incidentes} personasInteres={personasInteres} />
      );
    } else if (view === 'turnos') {
      ViewComponent = <TurnosView notify={notify} />;
    } else if (view === 'usuarios') {
      ViewComponent = <UsersView notify={notify} openModal={openModal} />;
    } else if (view === 'configuracion') {
      ViewComponent = <SettingsView notify={notify} />;
    }

    return (
      <Suspense
        fallback={
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
          </div>
        }
      >
        {ViewComponent}
      </Suspense>
    );
  };

  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'success': return { bg: 'bg-emerald-950/90', border: 'border-emerald-500/30', text: 'text-emerald-100', icon: <CheckCircle className="w-5 h-5 text-emerald-400" /> };
      case 'error':   return { bg: 'bg-rose-950/90',    border: 'border-rose-500/30',    text: 'text-rose-100',    icon: <XCircle className="w-5 h-5 text-rose-400" /> };
      case 'warning': return { bg: 'bg-amber-950/90',   border: 'border-amber-500/30',   text: 'text-amber-100',   icon: <AlertTriangle className="w-5 h-5 text-amber-400" /> };
      default:        return { bg: 'bg-slate-800',       border: 'border-white/10',       text: 'text-white',       icon: null };
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-slate-950 text-slate-200">
      {!isOnline && (
        <div className="w-full bg-rose-500/20 text-rose-200 border-b border-rose-500/20 py-2 px-4 flex items-center justify-center gap-2 text-sm z-50">
          <CloudOff className="w-4 h-4" />
          <span>
            Sin conexión a internet — Los cambios se guardarán localmente.
            {pendingOpsCount > 0 && (
              <span className="ml-2 font-semibold">({pendingOpsCount} pendiente{pendingOpsCount !== 1 ? 's' : ''})</span>
            )}
          </span>
        </div>
      )}
      {isOnline && pendingOpsCount > 0 && (
        <div className="w-full bg-amber-500/20 text-amber-200 border-b border-amber-500/20 py-1.5 px-4 flex items-center justify-center gap-2 text-xs z-50">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Sincronizando {pendingOpsCount} cambio{pendingOpsCount !== 1 ? 's' : ''} pendiente{pendingOpsCount !== 1 ? 's' : ''}...</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Modal {...modalConfig} onClose={closeModal} />
        <Lightbox imageSrc={lightboxImage} onClose={() => setLightboxImage(null)} />
        <GlobalSearch
          isOpen={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
          incidentes={incidentes}
          personasInteres={personasInteres}
          setView={setView}
          setLightboxImage={setLightboxImage}
        />
        <QuickIncidentModal
          isOpen={showQuickIncident}
          onClose={() => setShowQuickIncident(false)}
          addIncidente={addIncidente}
          notify={notify}
          currentUser={profile}
        />

        <aside className="w-16 md:w-64 glass-panel border-r border-white/5 flex flex-col z-10 no-print transition-all rounded-none">
          <div className="p-4 md:p-6 border-b border-white/5">
            <h1 className="font-bold text-white hidden md:block text-xl tracking-tight">SGSV Monitor</h1>
          </div>
          <nav className="flex-1 py-4 px-2 md:px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="relative group/nav">
                  <button onClick={() => setView(item.id)} className={navClass(item.id)}>
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="hidden md:block">{item.label}</span>
                    {item.id === 'turnos' && turnoActivo && (
                      <span className="hidden md:flex ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                  <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-opacity z-50 md:hidden">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </nav>

          <div className="p-2 md:p-4 border-t border-white/5 space-y-2">
            {/* Búsqueda global */}
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="w-full text-left px-3 py-2.5 rounded-xl transition flex gap-3 items-center text-slate-400 hover:bg-white/5"
              title="Ctrl+K"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="hidden md:flex items-center gap-2 flex-1 text-sm">
                Buscar <kbd className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">⌃K</kbd>
              </span>
            </button>
            {/* Registro rápido */}
            <button
              onClick={() => setShowQuickIncident(true)}
              className="w-full text-left px-3 py-2.5 rounded-xl transition flex gap-3 items-center text-amber-400 hover:bg-amber-500/10"
              title="Ctrl+Shift+N"
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span className="hidden md:flex items-center gap-2 flex-1 text-sm">
                Rápido <kbd className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">⌃⇧N</kbd>
              </span>
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 px-1">
              <div className="relative">
                {isOnline ? <Cloud className="w-4 h-4 text-sky-400" /> : <CloudOff className="w-4 h-4 text-rose-400" />}
                {pendingOpsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {pendingOpsCount > 99 ? '99+' : pendingOpsCount}
                  </span>
                )}
              </div>
              <span>{cloudEnabled ? 'Cloud' : 'Local'} / {roleLabel}</span>
            </div>

            {cloudEnabled && (
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-3 rounded-xl transition flex gap-3 items-center text-slate-400 hover:bg-white/5"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="hidden md:block">Salir</span>
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth print:overflow-visible print:p-0">
          {notificacion && (() => {
            const style = getNotificationStyle(notificacion.type);
            return (
              <div className={`absolute top-4 right-4 ${style.bg} ${style.text} px-4 py-3 rounded-xl shadow-2xl border ${style.border} z-50 animate-slide-up backdrop-blur flex items-center gap-3`}>
                {style.icon}
                <span className="text-sm font-medium">{notificacion.message}</span>
              </div>
            );
          })()}

          {syncError && isOnline && (
            <div className="absolute top-4 left-4 bg-red-950/80 text-red-100 px-4 py-3 rounded-xl shadow-2xl border border-red-500/30 z-50 backdrop-blur flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm">{syncError}</span>
              <button
                onClick={() => hydrateData()}
                className="text-xs font-bold bg-red-700/60 hover:bg-red-600 px-2 py-1 rounded-lg transition"
              >
                Reintentar
              </button>
            </div>
          )}

          <div className="max-w-7xl mx-auto">{renderView()}</div>
        </main>
      </div>
    </div>
  );
}
