import React from 'react';

type State = { hasError: boolean; error?: Error | null };

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    try {
      // enviar para o servidor de debug (não bloquear)
      fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'error', message: String(error.message), stack: error.stack || info?.componentStack }),
      }).catch(() => {});
    } catch (_) {}
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <h2>Ocorreu um erro ao carregar a aplicação</h2>
          <p>{this.state.error?.message}</p>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
          </details>
        </div>
      );
    }

    return this.props.children as any;
  }
}

export default ErrorBoundary;
