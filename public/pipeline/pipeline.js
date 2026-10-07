import { createId, saveState, state } from '../shared/state.js';
import { escapeHtml, pipelineProgress } from '../shared/helpers.js';

function renderPipeline() {
  const percent = pipelineProgress();
  const label = document.querySelector('#pipeline-percent');
  if (label) label.textContent = `${percent}%`;
  const bar = document.querySelector('#pipeline-bar');
  if (bar) bar.style.width = `${percent}%`;

  const stages = document.querySelector('#pipeline-stages');
  if (stages) {
    stages.innerHTML = state.stages.map((stage, index) => {
      const tasks = state.tasks.filter(task => task.stageId === stage.id);
      const done = tasks.length > 0 && tasks.every(task => task.status === 'COMPLETE');
      const current = tasks.some(task => task.status === 'IN-PROGRESS') ||
        (!tasks.length && index === 0);
      return `
        <article class="stage-card ${done ? 'done' : ''} ${current ? 'current' : ''}">
          <div class="stage-marker">
            <i>${done ? '✓' : index + 1}</i>
            <span>Stage ${index + 1}</span>
          </div>
          <h3>${escapeHtml(stage.name)}</h3>
          <small>${tasks.length} task${tasks.length === 1 ? '' : 's'}</small>
        </article>
      `;
    }).join('');
  }
}

function showStageDialog() {
  const dialog = document.querySelector('#stage-dialog');
  if (dialog && !dialog.open) dialog.showModal();
}

export function initPipeline() {
  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="new-stage"]')) showStageDialog();
  });

  const form = document.querySelector('#stage-form');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    state.stages.push({
      id: createId('stage'),
      name: data.get('name').trim(),
      order: state.stages.length + 1
    });
    saveState();
    form.closest('dialog').close();
    form.reset();
  });

  renderPipeline();
  window.addEventListener('planner:statechange', renderPipeline);
}