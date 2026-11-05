import express from 'express';
import { createServer } from 'http';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from frontend/.env to get BASE_PATH if not in environment
const envPath = path.join(__dirname, 'frontend', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.substring(0, eqIdx).trim();
      const val = line.substring(eqIdx + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  }
}

const rawBase = ('VITE_BASE_PATH' in process.env) ? process.env.VITE_BASE_PATH : (process.env.BASE_PATH || '');
const formattedBasePath = rawBase ? '/' + rawBase.replace(/^\//, '').replace(/\/+$/, '') : '';
const BASE_PATH = formattedBasePath;

const app = express();
const DIST_DIR = fs.existsSync(path.join(__dirname, 'frontend', 'dist'))
  ? path.join(__dirname, 'frontend', 'dist')
  : path.join(__dirname, 'dist');

const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 3001);

function proxyReq(req, res, targetPath, isSocketIO = false) {
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${BACKEND_HOST}:${BACKEND_PORT}`,
      'X-Forwarded-For': req.ip,
      'X-Forwarded-Proto': req.protocol || 'http'
    }
  };

  if (isSocketIO && req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    const pReq = http.request(options);
    pReq.on('error', (e) => {
      console.error('WebSocket proxy error:', e.message);
    });
    pReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      const clientSocket = req.socket;
      if (!clientSocket || clientSocket.destroyed) { proxySocket.destroy(); return; }
      clientSocket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      proxySocket.pipe(clientSocket);
      clientSocket.pipe(proxySocket);
      proxySocket.on('error', () => { clientSocket.destroy(); });
      clientSocket.on('error', () => { proxySocket.destroy(); });
    });
    pReq.on('response', () => {});
    req.pipe(pReq);
  } else {
    const pReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    pReq.on('error', (e) => { 
      if (!res.headersSent) res.status(502).json({ error: e.message }); 
    });
    req.pipe(pReq);
  }
}

// API proxy
const apiMount = BASE_PATH ? `${BASE_PATH}/api` : '/api';
app.use(apiMount, (req, res) => {
  const targetPath = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  proxyReq(req, res, targetPath);
});

// Socket.IO proxy
const socketMount = BASE_PATH ? `${BASE_PATH}/socket.io` : '/socket.io';
app.use(socketMount, (req, res) => {
  const targetPath = '/socket.io' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  proxyReq(req, res, targetPath, true);
});

// Static assets & files
if (BASE_PATH) {
  app.use(BASE_PATH, express.static(DIST_DIR));
  app.get(BASE_PATH + '/*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  app.get('/', (req, res) => res.redirect(BASE_PATH + '/'));
} else {
  app.use(express.static(DIST_DIR));
  app.get('/*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const PORT = Number(process.env.PORT || 5002);
const HOST = process.env.HOST || '0.0.0.0';

const server = createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`CogniPulse server running on http://${HOST}:${PORT} (BASE_PATH='${BASE_PATH}', DIST='${DIST_DIR}')`);
});
