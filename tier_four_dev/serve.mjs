// Serves the site on the local network so the game can be tried on a phone.
// Usage: npm run serve  (then Ctrl+C to stop)
import os from 'node:os';
import { startServer } from './lib/server.mjs';

const port = Number(process.env.PORT ?? 8000);
const server = await startServer({ port, host: '0.0.0.0' });

console.log(`Serving the site on port ${port}. Press Ctrl+C to stop.\n`);
console.log(`On this computer: http://localhost:${port}/tier_four/`);
for (const addresses of Object.values(os.networkInterfaces())) {
    for (const a of addresses ?? []) {
        if (a.family === 'IPv4' && !a.internal) {
            console.log(`On a phone on the same Wi-Fi: http://${a.address}:${port}/tier_four/`);
        }
    }
}
console.log('\nIf the phone cannot connect, allow Node.js through Windows Firewall on private networks.');

process.on('SIGINT', () => server.close(() => process.exit(0)));
