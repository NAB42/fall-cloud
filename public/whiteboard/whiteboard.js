import { state } from '../shared/state.js';

export async function initWhiteboardPreview() {
  const preview = document.querySelector('#whiteboard-preview');
  if (!preview) return;

  try {
    const response = await fetch('/whiteboard');
    if (!response.ok) throw new Error('Whiteboard service unavailable');
    let board = await response.json();

    if (!board.initialized) {
      const migration = await fetch('/whiteboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: state.whiteboard || '',
          initializeOnly: true
        })
      });
      if (!migration.ok) throw new Error('Whiteboard migration failed');
      board = await migration.json();
    }

    preview.textContent = board.content || 'Your team whiteboard is ready for ideas.';
    if (typeof window.io !== 'function') return;
    const socket = window.io();
    socket.on('whiteboardUpdate', content => {
      preview.textContent = content || 'Your team whiteboard is ready for ideas.';
    });
  } catch (error) {
    preview.textContent = 'Shared whiteboard is unavailable. Start the Fall Cloud server to reconnect.';
    console.error(error);
  }
}
