import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary Caught]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-[#092328]/95 border-2 border-rose-500/80 rounded-2xl text-rose-100 max-w-lg mx-auto my-4 text-center select-none backdrop-blur-md shadow-2xl">
          <AlertTriangle className="w-8 h-8 text-rose-400 mb-2 animate-bounce" />
          <h3 className="text-sm font-bold text-rose-200">
            {this.props.fallbackTitle || 'Error al renderizar la vista de la mesa'}
          </h3>
          <p className="text-xs text-rose-300/80 mt-1 font-mono break-all max-h-24 overflow-y-auto">
            {this.state.error?.message || 'Error no especificado'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="mt-4 px-4 py-2 bg-rose-800 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-rose-950/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
