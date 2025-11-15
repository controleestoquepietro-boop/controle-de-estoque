import { Server } from 'http';
import net from 'net';

export async function findAvailablePort(startPort: number, endPort: number): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(port, '127.0.0.1', () => {
          server.close(() => resolve());
        });
      });
      return port;
    } catch {
      continue;
    }
  }
  throw new Error('No available ports found');
}

export function setupServerWithPortFallback(app: any, startPort: number = 5000, endPort: number = 5010): Promise<Server> {
  return new Promise((resolve, reject) => {
    findAvailablePort(startPort, endPort)
      .then(port => {
        process.env.PORT = port.toString();
        const server = app.listen(port, '127.0.0.1', () => {
          console.log(`Server listening on port ${port}`);
          resolve(server);
        });
        server.on('error', reject);
      })
      .catch(reject);
  });
}