import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, UserPlus, Users } from 'lucide-react';
import { ROLE_LABELS, ROLES } from '../lib/auth';
import { useAppStore } from '../store/useAppStore';
import type { NotificationType, Role } from '../types';

// ─── Vista ────────────────────────────────────────────────────────────────────

interface UsersViewProps {
  notify: (msg: string, type?: NotificationType) => void;
  openModal: (title: string, content: string, onConfirm: () => void, color?: string) => void;
}

export default function UsersView({ notify, openModal }: UsersViewProps) {
  const usuarios = useAppStore((s) => s.usuarios);
  const usersLoaded = useAppStore((s) => s.usersLoaded);
  const loadUsuarios = useAppStore((s) => s.loadUsuarios);
  const createUsuario = useAppStore((s) => s.createUsuario);
  const updateUsuarioRole = useAppStore((s) => s.updateUsuarioRole);
  const profile = useAppStore((s) => s.profile);
  const [updatingId, setUpdatingId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: ROLES.OPERATOR as Role,
  });

  useEffect(() => {
    loadUsuarios().catch(() => notify('No se pudieron cargar usuarios.', 'error'));
  }, [loadUsuarios, notify]);

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

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = newUser.email.trim().toLowerCase();
    if (!email || newUser.password.length < 10) {
      notify('Correo y contrasena de al menos 10 caracteres son requeridos.', 'error');
      return;
    }

    setCreating(true);
    try {
      await createUsuario({ email, password: newUser.password, role: newUser.role });
      setNewUser({ email: '', password: '', role: ROLES.OPERATOR });
      notify('Usuario creado.');
    } catch (error) {
      notify((error as Error).message || 'No se pudo crear el usuario.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 no-print animate-fade-in">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Usuarios</h2>
          <p className="text-sm text-slate-400 mt-1">Control de roles operativos</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-300" />
        </div>
      </div>

      <form onSubmit={handleCreateUser} className="glass-panel p-5 rounded-2xl grid grid-cols-1 md:grid-cols-[1fr_220px_180px_auto] gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Correo</label>
          <input
            type="email"
            required
            value={newUser.email}
            onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="operador@empresa.com"
            className="glass-input w-full rounded-lg px-3 py-2.5 text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Contrasena</label>
          <input
            type="password"
            required
            minLength={10}
            value={newUser.password}
            onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Min. 10 caracteres"
            className="glass-input w-full rounded-lg px-3 py-2.5 text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Rol</label>
          <select
            value={newUser.role}
            onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value as Role }))}
            className="glass-input w-full rounded-lg px-3 py-2.5 text-white"
          >
            <option value={ROLES.OPERATOR} className="bg-slate-900">{ROLE_LABELS[ROLES.OPERATOR]}</option>
            <option value={ROLES.ADMIN} className="bg-slate-900">{ROLE_LABELS[ROLES.ADMIN]}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-4 py-3 rounded-xl transition"
        >
          <UserPlus className="w-4 h-4" />
          {creating ? 'Creando' : 'Crear'}
        </button>
      </form>

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

    </div>
  );
}
