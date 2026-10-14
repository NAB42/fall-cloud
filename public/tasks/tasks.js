// Firestore imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

import { firebaseConfig } from "../config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore collection reference
const tasksCol = collection(db, "tasks");

// -----------------------------
// LOCAL STATE MIRROR (in-memory only)
// -----------------------------
const state = {
  tasks: [],
  stages: [
    { id: "TO-DO", name: "To-do" },
    { id: "IN-PROGRESS", name: "In progress" },
    { id: "COMPLETE", name: "Complete" }
  ]
};

const STATUSES = ["TO-DO", "IN-PROGRESS", "COMPLETE"];

// -----------------------------
// LOAD TASKS FROM FIRESTORE
// -----------------------------
async function loadTasks() {
  const snapshot = await getDocs(tasksCol);
  state.tasks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  renderTasks();
}

// -----------------------------
// RENDER TASK COLUMNS
// -----------------------------
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

// -----------------------------
// RENDER INDIVIDUAL TASK CARD
// -----------------------------
function columnTask(task) {
  const nextStatus =
    task.status === 'TO-DO'
      ? 'IN-PROGRESS'
      : task.status === 'IN-PROGRESS'
        ? 'COMPLETE'
        : 'TO-DO';

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

// -----------------------------
// PIPELINE STAGE OPTIONS
// -----------------------------
function renderStageOptions() {
  const options = document.querySelector('#task-stage-options');
  if (!options) return;

  options.innerHTML = state.stages.map(stage => `
    <option value="${escapeHtml(stage.id)}">${escapeHtml(stage.name)}</option>
  `).join('');
}

// -----------------------------
// SHOW NEW TASK DIALOG
// -----------------------------
function showTaskDialog() {
  const dialog = document.querySelector('#task-dialog');
  if (dialog && !dialog.open) dialog.showModal();
}

// -----------------------------
// ADD NEW TASK (Firestore)
// -----------------------------
function bindTaskForm() {
  const form = document.querySelector('#task-form');
  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const data = new FormData(form);

    const newTask = {
      title: data.get('title').trim(),
      description: data.get('description').trim(),
      assignee: data.get('assignee').trim() || 'Unassigned',
      dueDate: data.get('dueDate'),
      status: 'TO-DO',
      stageId: data.get('stageId') || 'TO-DO',
      createdAt: Date.now()
    };

    await addDoc(tasksCol, newTask);

    form.closest('dialog').close();
    form.reset();

    loadTasks();
  });
}

// -----------------------------
// ADVANCE TASK STATUS (Firestore)
// -----------------------------
async function advanceTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const nextStatus =
    task.status === 'TO-DO'
      ? 'IN-PROGRESS'
      : task.status === 'IN-PROGRESS'
        ? 'COMPLETE'
        : 'TO-DO';

  const ref = doc(db, "tasks", taskId);
  await updateDoc(ref, { status: nextStatus });

  loadTasks();
}

// -----------------------------
// INIT TASKS PAGE
// -----------------------------
export function initTasks() {
  const search = document.querySelector('#task-search');
  const filter = document.querySelector('#task-filter');

  search?.addEventListener('input', renderTasks);
  filter?.addEventListener('change', renderTasks);

  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="new-task"]')) showTaskDialog();

    const advance = event.target.closest('.advance-task');
    if (advance) advanceTask(advance.dataset.id);
  });

  bindTaskForm();
  renderStageOptions();
  loadTasks();

  if (new URLSearchParams(location.search).get('new') === 'task') {
    showTaskDialog();
  }
}
