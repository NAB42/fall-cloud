import { openTasks } from './shared/helpers.js';
import { resetState } from './shared/state.js';
import { initDashboard } from './dashboard/dashboard.js';
import { initTasks } from './tasks/tasks.js';
import { initCalendar } from './calendar/calendar.js';
import { initPipeline } from './pipeline/pipeline.js';
import { initFiles } from './files/files.js';
import { initWhiteboardPreview } from './whiteboard/whiteboard.js';

const modules = {
  dashboard: initDashboard,
  tasks: initTasks,
  calendar: initCalendar,
  pipeline: initPipeline,
  files: initFiles
};

const page = document.body.dataset.page;
modules[page]?.();

const taskCount = document.querySelector('#task-count');
if (taskCount) taskCount.textContent = openTasks().length || '';

const resetButton = document.querySelector('#reset-data');
resetButton?.addEventListener('click', () => {
  if (confirm('Reset all local demo data?')) resetState();
});

initWhiteboardPreview();
