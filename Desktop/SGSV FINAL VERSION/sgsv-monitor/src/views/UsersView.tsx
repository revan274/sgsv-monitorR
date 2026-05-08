import { useEffect, useState } from 'react';
import { ShieldCheck, Users, LogIn, LogOut, History } from 'lucide-react';
import { ROLE_LABELS, ROLES } from '../lib/auth';
import { useAppStore } from '../store/useAppStore';
import type { NotificationType, SessionLog, Role } from '../types';
import { createId } from '../lib/utils';

const SESSION_LOG_KEY = 'sgsv_session_log';
const MAX_LOG_ENTRIES = 100;

// ─── Helpers de log de sesión (localStorage) ─────────────────────────────────

function readSessionLog(): SessionLog[] {
  try {
    const raw = localStorage.getItem(SESSION_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeSessionLog(entries: SessionLog[]): void {
  try {
    localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(entries.slice(0, MAX_LOG_ENTRIES)));
  } catch { /* ignore quota */ }
}

export function appendSessionLog(
  userId: string,
  email: string,
  event: 'login' | 'logout',
): void {
  const entries = readSessionLog();
  entries.unshift({
    id: createId(),
    userId,
    email,
    event,
    timestamp: Date.now(),
    userAgent: navigator.userAgent.slice(0, 100),
  });
  writeSessionLog(entries);
}

// ─── Vista ────────────────────────────────────────────────────────────────────

interface UsersViewProps {
  notify: (msg: string, type?: NotificationType) => void;
  openModal: (title: string, content: string, onConfirm: () => void, color?: string) => void;
}

export default function UsersView({ notify, openModal }: UsersViewProps) {
  const usuarios = useAppStore((s) => s.usuarios);
  const usersLoaded = useAppStore((s) => s.usersLoaded);
  const loadUsuarios = useAppStore((s) => s.loadUsuarios);
  const updateUsuarioRole = useAppStore((s) => s.updateUsuarioRole);
  const profile = useAppStore((s) => s.profile);
  const [updatingId, setUpdatingId] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [sessionLog, setSessionLog] = useState<SessionLog[]>([]);

  useEffect(() => {
    loadUsuarios().catch(() => notify('No se pudieron cargar usuarios.', 'error'));
  }, [loadUsuarios, notify]);

  useEffect(() => {
    if (showLog) setSessionLog(readSessionLog());
  }, [showLog]);

  // Registrar inicio de sesión actual
  useEffect(() => {
    if (profile?.id) {
      appendSessionLog(profile.id, profile.email, 'login');
    }
  }, [profile?.id]);

  const handleRoleChange = (id: string, role: Role) => {
    openModal(
      'Confirmar Cambio de Rol',
      `¿Estas seguro de cambiar el rol de este usuario a ${ROLE_LABELS[role]}? Esto puede afectar sus permisos en el sistema.`,
      async () => {
        setUpdatingId(id);
        try {
          await updateUsuarioRole({ id, role });
          notify('Rol actualizado.');
        } catch {
          notify('No se pudo actualizar el rol.', 'error');
        } finally {
          setUpdatingId('');
        }
      },
      'bg-amber-600',
    );
  };

  return (
    <div className="space-y-6 no-print animate-fade-in">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Usuarios</h2>
          <p className="text-sm text-slate-400 mt-1">Control de roles operativos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLog((p) => !p)}
            className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg transition"
          >
            <History className="w-4 h-4" />
            <span className="hidden md:block">Log de sesiones</span>
          </button>
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-300" />
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_180px] gap-4 px-5 py-3 bg-slate-900/50 border-b border-white/10 text-xs uppercase text-slate-400 font-bold">
          <span>Cuenta</span>
          <span>Rol</span>
        </div>

        {!usersLoaded && <div className="p-6 text-slate-400">Cargando usuarios...</div>}
        {usersLoaded && usuarios.length === 0 && <div className="p-6 text-slate-400">Sin usuarios registrados.</div>}

        {usersLoaded && usuarios.map((usuario) => {
          const isCurrentUser = usuario.id === profile?.id;
          return (
            <div
              key={usuario.id}
              className="grid grid-cols-[1fr_180px] gap-4 px-5 py-4 border-b border-white/5 last:border-b-0 items-center"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  <p className="text-white font-medium truncate">{usuario.email}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">{usuario.id}</p>
              </div>
              <select
                value={usuario.role}
                disabled={isCurrentUser || updatingId === usuario.id}
                onChange={(e) => handleRoleChange(usuario.id, e.target.value as Role)}
                className="glass-input rounded-lg px-3 py-2.5 text-white disabled:opacity-50"
              >
                <option value={ROLES.OPERATOR} className="bg-slate-900">{ROLE_LABELS[ROLES.OPERATOR]}</option>
                <option value={ROLES.ADMIN} className="bg-slate-900">{ROLE_LABELS[ROLES.ADMIN]}</option>
              </select>
            </div>
          );
        })}
      </div>

      {/* Historial de sesiones */}
      {showLog && (
        <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-white text-sm">Historial de Accesos</h3>
            <span className="ml-auto text-xs text-slate-500">{sessionLog.length} entradas</span>
          </div>
          {sessionLog.length === 0 ? (
            <div className="px-5 py-6 text-slate-500 text-sm">Sin registros de sesión aún.</div>
          ) : (
            <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {sessionLog.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                  {entry.event === 'login' ? (
                    <LogIn className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm truncate">{entry.email}</p>
                    <p className="text-xs text-slate-500 truncate">{entry.userAgent}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 font-mono">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                    entry.event === 'login' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-rose-900/40 text-rose-300'
                  }`}>
                    {entry.event}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
