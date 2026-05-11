import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Actualiza el estado para que el siguiente renderizado muestre la UI de repuesto
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // También puedes registrar el error en un servicio de reporte de errores
    console.error("ErrorBoundary atrapó un error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Puedes renderizar cualquier UI de repuesto personalizada
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
          <div className="glass-panel max-w-md w-full p-8 text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Algo salió mal</h1>
              <p className="text-slate-400 text-sm">
                La aplicación ha encontrado un error inesperado. Por favor recarga la página.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-slate-900/50 p-4 rounded-xl text-left border border-white/5 overflow-x-auto">
                <p className="text-red-400 font-mono text-xs mb-2">Error:</p>
                <p className="text-slate-300 text-sm font-mono whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Recargar Aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
