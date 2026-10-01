import { createId, saveState, state, STATUSES } from '../shared/state.js';
import { empty, escapeHtml, formatStatus, dateLabel } from '../shared/helpers.js';

function renderTasks() {
  const columns = document.querySelector('#task-columns');
  if (!columns) return;

  const query = (document.querySelector('#task-search')?.value || '').toLowerCase();
  const filter = document.querySelector('#task-filter')?.value || 'ALL';
  const tasks = state.tasks.filter(task => {
    const searchable = `${task.title} ${task.description} ${task.assignee}`.toLowerCase();
    return (!query || searchable.includes(query)) &&
      (filter === 'ALL' || task.status === filter);
  });

  columns.innerHTML = STATUSES.map(status => `
    <section class="task-column">
      <div class="column-heading">
        <span>${formatStatus(status)}</span>
        <span>${tasks.filter(task => task.status === status).length}</span>
      </div>
      ${tasks.filter(task => task.status === status).map(columnTask).join('') || empty('Nothing here yet.')}
    </section>
  `).join('');
}

function columnTask(task) {
  const nextStatus = task.status === 'TO-DO'
    ? 'IN-PROGRESS'
    : task.status === 'IN-PROGRESS' ? 'COMPLETE' : 'TO-DO';
  return `
    <article class="column-task">
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.description || 'No description')}</p>
      <footer>
        <span>${escapeHtml(task.assignee)} · ${dateLabel(task.dueDate)}</span>
        <button class="text-button advance-task" data-id="${escapeHtml(task.id)}" title="Move to ${formatStatus(nextStatus)}">
          ${task.status === 'COMPLETE' ? '↶ Reopen' : 'Advance →'}
        </button>
      </footer>
    </article>
  `;
}

function renderStageOptions() {
  const options = document.querySelector('#task-stage-options');
  if (!options) return;
  options.innerHTML = state.stages.map(stage => `
    <option value="${escapeHtml(stage.id)}">${escapeHtml(stage.name)}</option>
  `).join('');
}

function showTaskDialog() {
  const dialog = document.querySelector('#task-dialog');
  if (dialog && !dialog.open) dialog.showModal();
}

function bindTaskForm() {
  const form = document.querySelector('#task-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    state.tasks.push({
      id: createId('task'),
      title: data.get('title').trim(),
      description: data.get('description').trim(),
      assignee: data.get('assignee').trim() || 'Unassigned',
      dueDate: data.get('dueDate'),
      status: 'TO-DO',
      stageId: data.get('stageId') || state.stages[0]?.id || ''
    });
    saveState();
    form.closest('dialog').close();
    form.reset();
  });
}

export function initTasks() {
  const search = document.querySelector('#task-search');
  const filter = document.querySelector('#task-filter');
  search?.addEventListener('input', renderTasks);
  filter?.addEventListener('change', renderTasks);

  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="new-task"]')) showTaskDialog();
    const advance = event.target.closest('.advance-task');
    if (!advance) return;
    const task = state.tasks.find(item => item.id === advance.dataset.id);
    if (!task) return;
    task.status = task.status === 'TO-DO'
      ? 'IN-PROGRESS'
      : task.status === 'IN-PROGRESS' ? 'COMPLETE' : 'TO-DO';
    saveState();
  });

  bindTaskForm();
  renderStageOptions();
  renderTasks();
  window.addEventListener('planner:statechange', () => {
    renderStageOptions();
    renderTasks();
  });

  if (new URLSearchParams(location.search).get('new') === 'task') {
    showTaskDialog();
  }
}