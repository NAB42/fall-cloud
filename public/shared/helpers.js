import { STATUS_LABELS, state } from './state.js';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

export function dateLabel(
  value,
  options = { month: 'short', day: 'numeric' }
) {
  if (!value) return 'No date';
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options);
}

export function formatStatus(status) {
  return STATUS_LABELS[status] || status;
}

export function pipelineProgress() {
  const completedTasks = state.tasks.filter(
    task => task.status === 'COMPLETE'
  ).length;
  return state.tasks.length
    ? Math.round((completedTasks / state.tasks.length) * 100)
    : 0;
}

export function openTasks() {
  return state.tasks.filter(task => task.status !== 'COMPLETE');
}

export function eventSort(a, b) {
  return `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
}

export function empty(message) {
  return `<p class="muted">${escapeHtml(message)}</p>`;
}

export function taskRow(task) {
  return `
    <div class="task-row">
      <i class="status-dot ${task.status}"></i>
      <div class="task-row-main">
        <strong>${escapeHtml(task.title)}</strong>
        <small>${escapeHtml(task.assignee)} · ${dateLabel(task.dueDate)}</small>
      </div>
      <span class="badge ${task.status}">${formatStatus(task.status)}</span>
    </div>
  `;
}

export function eventRow(event) {
  return `
    <div class="event-row">
      <div class="event-date">
        <strong>${dateLabel(event.date, {
          weekday: 'short', month: 'short', day: 'numeric'
        })}</strong>
      </div>
      <div class="event-row-main">
        <strong>${escapeHtml(event.title)}</strong>
        <small>${escapeHtml(event.time || 'All day')} · ${escapeHtml(event.owner || 'Team')}</small>
      </div>
    </div>
  `;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex ? 1 : 0)} ${units[unitIndex]}`;
}