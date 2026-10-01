import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const projectRoot = dirname(fileURLToPath(import.meta.url));

function readBoard(dataFile) {
  try {
    const saved = JSON.parse(readFileSync(dataFile, 'utf8'));
    if (typeof saved.content === 'string' && saved.initialized === true) {
      return { content: saved.content, initialized: true };
    }
  } catch {
    // Start with an empty board if the data file does not exist or is invalid.
  }
  return { content: '', initialized: false };
}

export function createPlannerServer({
  dataFile = resolve(projectRoot, '.data/whiteboard.json'),
  staticRoot = projectRoot
} = {}) {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });
  let board = readBoard(dataFile);

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  function saveBoard(content, initializeOnly = false, sourceSocket = null) {
    if (initializeOnly && board.initialized) return board;

    board = { content, initialized: true };
    mkdirSync(dirname(dataFile), { recursive: true });
    const temporaryFile = `${dataFile}.tmp`;
    writeFileSync(temporaryFile, JSON.stringify(board), 'utf8');
    renameSync(temporaryFile, dataFile);
    if (sourceSocket) {
      sourceSocket.broadcast.emit('whiteboardUpdate', board.content);
    } else {
      io.emit('whiteboardUpdate', board.content);
    }
    return board;
  }

  app.get('/whiteboard', (_request, response) => {
    response.json(board);
  });

  app.put('/whiteboard', (request, response) => {
    const { content, initializeOnly = false } = request.body || {};
    if (typeof content !== 'string') {
      response.status(400).json({ error: 'content must be a string' });
      return;
    }
    const current = saveBoard(content, initializeOnly === true);
    response.json({ success: true, ...current });
  });

  io.on('connection', socket => {
    socket.emit('whiteboardUpdate', board.content);
    socket.on('whiteboardUpdate', content => {
      if (typeof content === 'string') saveBoard(content, false, socket);
    });
  });

  if (staticRoot && existsSync(staticRoot)) {
    app.use(express.static(staticRoot));
  }

  return { app, httpServer, io };
}

export function startServer(port = Number(process.env.PORT) || 8080) {
  const server = createPlannerServer();
  server.httpServer.listen(port, () => {
    console.log(`Fall Cloud is available at http://localhost:${port}`);
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}
