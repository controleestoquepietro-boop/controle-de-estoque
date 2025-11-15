import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";

// Garantir que o elemento root existe
const rootElement = document.getElementById("root");
if (!rootElement) {
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
}

// Instalar handler global para capturar erros no renderer e enviar ao servidor de debug
try {
  window.addEventListener('error', (event) => {
    try {
      fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'error', message: String(event.message), stack: (event.error && event.error.stack) ? event.error.stack : null }),
      }).catch(() => {});
    } catch (_) {}
    // Também logar no console como fallback
    // eslint-disable-next-line no-console
    console.error('Global error captured:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    try {
      const reason = (ev.reason && ev.reason.stack) ? ev.reason.stack : String(ev.reason);
      fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'warn', message: String(ev.reason), stack: reason }),
      }).catch(() => {});
    } catch (_) {}
    // eslint-disable-next-line no-console
    console.warn('Unhandled rejection captured:', ev.reason);
  });
} catch (e) {
  // ignore - não queremos quebrar o bootstrap por conta do logger
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
