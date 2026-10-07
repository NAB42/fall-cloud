import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { io as createSocket } from 'socket.io-client';
import { createPlannerServer } from '../server.js';

let dataDirectory;
let dataFile;

before(() => {
  dataDirectory = mkdtempSync(join(tmpdir(), 'fall-cloud-'));
  dataFile = join(dataDirectory, 'whiteboard.json');
});

after(() => {
  rmSync(dataDirectory, { recursive: true, force: true });
});

async function listen(server) {
  await new Promise(resolve => server.httpServer.listen(0, resolve));
  return `http://127.0.0.1:${server.httpServer.address().port}`;
}

async function close(server) {
  await new Promise(resolve => server.io.close(resolve));
}

test('REST state initializes once and survives a server restart', async () => {
  let server = createPlannerServer({ dataFile, staticRoot: null });
  let baseUrl = await listen(server);

  const initial = await fetch(`${baseUrl}/whiteboard`).then(response => response.json());
  assert.deepEqual(initial, { content: '', initialized: false });

  const migration = await fetch(`${baseUrl}/whiteboard`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'Migrated notes', initializeOnly: true })
  }).then(response => response.json());
  assert.equal(migration.content, 'Migrated notes');
  assert.equal(migration.initialized, true);

  const ignoredMigration = await fetch(`${baseUrl}/whiteboard`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'Stale notes', initializeOnly: true })
  }).then(response => response.json());
  assert.equal(ignoredMigration.content, 'Migrated notes');
  await close(server);

  server = createPlannerServer({ dataFile, staticRoot: null });
  baseUrl = await listen(server);
  const restored = await fetch(`${baseUrl}/whiteboard`).then(response => response.json());
  assert.equal(restored.content, 'Migrated notes');
  await close(server);
});

test('a socket edit is broadcast and persisted', async () => {
  const server = createPlannerServer({
    dataFile: join(dataDirectory, 'socket-board.json'),
    staticRoot: null
  });
  const baseUrl = await listen(server);
  const sender = createSocket(baseUrl, {
    transports: ['websocket'],
    reconnection: false
  });
  const receiver = createSocket(baseUrl, {
    transports: ['websocket'],
    reconnection: false
  });

  try {
    const initialUpdates = [sender, receiver].map(socket => new Promise(resolve => {
      socket.once('whiteboardUpdate', resolve);
    }));
    await Promise.all([sender, receiver].map(socket => new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    })));
    assert.deepEqual(await Promise.all(initialUpdates), ['', '']);

    let broadcasts = 0;
    let senderEchoes = 0;
    const received = new Promise(resolve => {
      receiver.on('whiteboardUpdate', content => {
        if (content === 'Shared edit') {
          broadcasts++;
          resolve(content);
        }
      });
    });
    sender.on('whiteboardUpdate', content => {
      if (content === 'Shared edit') senderEchoes++;
    });
    sender.emit('whiteboardUpdate', 'Shared edit');
    assert.equal(await received, 'Shared edit');
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(broadcasts, 1);
    assert.equal(senderEchoes, 0);

    const board = await fetch(`${baseUrl}/whiteboard`).then(response => response.json());
    assert.equal(board.content, 'Shared edit');
  } finally {
    sender.close();
    receiver.close();
    await close(server);
  }
});