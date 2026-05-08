import { useState } from 'react';
import { Cloud, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function LoginView() {
  const signIn = useAppStore((state) => state.signIn);
  const authError = useAppStore((state) => state.authError);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');
    setIsSubmitting(true);

    try {
      await signIn(credentials);
    } catch (error) {
      setLocalError(error.message || 'No se pudo iniciar sesion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.25),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.18),transparent_30%)]" />
      <div className="relative glass-panel w-full max-w-md rounded-2xl p-8 animate-slide-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300 font-bold">SGSV Monitor</p>
            <h1 className="text-2xl font-bold text-white mt-2">Acceso Operativo</h1>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-blue-300" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Correo</label>
            <input
              required
              type="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              className="glass-input w-full rounded-lg p-3 text-white"
              placeholder="operador@empresa.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Contrasena</label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                required
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                className="glass-input w-full rounded-lg p-3 pl-10 text-white"
                placeholder="********"
                autoComplete="current-password"
              />
            </div>
          </div>

          {(localError || authError) && (
            <div className="bg-red-950/60 border border-red-500/30 text-red-100 text-sm rounded-xl p-3">
              {localError || authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-900/40"
          >
            <LogIn className="w-5 h-5" />
            {isSubmitting ? 'Validando...' : 'Iniciar Sesion'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <Cloud className="w-4 h-4 text-sky-400" />
          <span>Supabase Auth</span>
        </div>
      </div>
    </div>
  );
}
