"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAvailablePort = findAvailablePort;
exports.setupServerWithPortFallback = setupServerWithPortFallback;
const net_1 = __importDefault(require("net"));
async function findAvailablePort(startPort, endPort) {
    for (let port = startPort; port <= endPort; port++) {
        try {
            await new Promise((resolve, reject) => {
                const server = net_1.default.createServer();
                server.unref();
                server.on('error', reject);
                server.listen(port, '127.0.0.1', () => {
                    server.close(() => resolve());
                });
            });
            return port;
        }
        catch {
            continue;
        }
    }
    throw new Error('No available ports found');
}
function setupServerWithPortFallback(app, startPort = 5000, endPort = 5010) {
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
