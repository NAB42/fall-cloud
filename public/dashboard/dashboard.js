import { state } from '../shared/state.js';
import {
  dateLabel,
  empty,
  eventRow,
  eventSort,
  openTasks,
  pipelineProgress,
  taskRow
} from '../shared/helpers.js';

export function renderDashboard() {
  const progress = pipelineProgress();
  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };
  const setWidth = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.style.width = value;
  };

  setText('#dashboard-progress', `${progress}%`);
  setWidth('#dashboard-progress-bar', `${progress}%`);
  setText(
    '#dashboard-stage',
    `${state.tasks.filter(task => task.status === 'COMPLETE').length} of ${state.tasks.length} tasks complete`
  );
  setText('#open-task-count', String(openTasks().length));
  setText(
    '#event-count',
    String(state.events.filter(event =>
      new Date(`${event.date}T${event.time || '12:00'}`) >= new Date()
    ).length)
  );
  setText('#file-count', String(state.files.length));

  const dueThisWeek = openTasks().filter(task =>
    task.dueDate && task.dueDate <= '2026-10-07'
  ).length;
  setText('#overdue-count', `${dueThisWeek} due this week`);

  const tasks = document.querySelector('#dashboard-tasks');
  if (tasks) {
    tasks.innerHTML = state.tasks
      .slice()
      .sort((a, b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'))
      .slice(0, 4)
      .map(taskRow)
      .join('') || empty('No tasks yet.');
  }

  const events = document.querySelector('#dashboard-events');
  if (events) {
    events.innerHTML = state.events
      .slice()
      .sort(eventSort)
      .slice(0, 4)
      .map(eventRow)
      .join('') || empty('No upcoming events.');
  }

  const preview = document.querySelector('#whiteboard-preview');
  if (preview && !preview.textContent) {
    preview.textContent = state.whiteboard || 'Your team whiteboard is ready for ideas.';
  }

  const date = document.querySelector('#dashboard-date');
  if (date) {
    date.textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }
  setText('#dashboard-today', dateLabel('2026-10-01', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }));
}

export function initDashboard() {
  renderDashboard();
  window.addEventListener('planner:statechange', renderDashboard);
}