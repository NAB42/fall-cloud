import { createId, saveState, state } from '../shared/state.js';
import { dateLabel, empty, escapeHtml, formatBytes } from '../shared/helpers.js';

function renderFiles() {
  const total = document.querySelector('#file-total');
  if (total) {
    total.textContent = `${state.files.length} file${state.files.length === 1 ? '' : 's'}`;
  }

  const list = document.querySelector('#file-list');
  if (!list) return;
  list.innerHTML = state.files.map(file => `
    <div class="file-row">
      <span class="file-icon">▤</span>
      <div class="file-row-main">
        <strong>${escapeHtml(file.name)}</strong>
        <small>${formatBytes(file.size)} · added ${dateLabel(file.addedAt)}</small>
      </div>
      <div class="file-actions">
        <button class="remove-file" data-id="${escapeHtml(file.id)}" title="Remove file">×</button>
      </div>
    </div>
  `).join('') || empty('No shared files yet.');
}

function addFiles(files) {
  Array.from(files).forEach(file => {
    state.files.push({
      id: createId('file'),
      name: file.name,
      size: file.size,
      addedAt: '2026-10-01'
    });
  });
  saveState();
}

export function initFiles() {
  const dropZone = document.querySelector('#drop-zone');
  const fileInput = document.querySelector('#file-input');

  fileInput?.addEventListener('change', event => {
    addFiles(event.currentTarget.files);
    event.currentTarget.value = '';
  });

  if (dropZone) {
    ['dragenter', 'dragover'].forEach(type => {
      dropZone.addEventListener(type, event => {
        event.preventDefault();
        dropZone.classList.add('dragging');
      });
    });
    ['dragleave', 'drop'].forEach(type => {
      dropZone.addEventListener(type, event => {
        event.preventDefault();
        dropZone.classList.remove('dragging');
      });
    });
    dropZone.addEventListener('drop', event => addFiles(event.dataTransfer.files));
  }

  document.addEventListener('click', event => {
    const remove = event.target.closest('.remove-file');
    if (!remove) return;
    state.files = state.files.filter(file => file.id !== remove.dataset.id);
    saveState();
  });

  renderFiles();
  window.addEventListener('planner:statechange', renderFiles);
}