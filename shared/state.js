export const STORAGE_KEY = 'fall-cloud-planner-v1';

export const STATUSES = ['TO-DO', 'IN-PROGRESS', 'COMPLETE'];

export const STATUS_LABELS = {
  'TO-DO': 'To-do',
  'IN-PROGRESS': 'In progress',
  COMPLETE: 'Complete'
};

export const seed = {
  stages: [
    { id: 'idea', name: 'Idea', order: 1 },
    { id: 'planning', name: 'Planning', order: 2 },
    { id: 'building', name: 'Building', order: 3 },
    { id: 'review', name: 'Review', order: 4 },
    { id: 'launched', name: 'Launched', order: 5 }
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Finalize project brief',
      description: 'Confirm goals and success criteria with the team.',
      assignee: 'Eldon',
      dueDate: '2026-10-02',
      status: 'IN-PROGRESS',
      stageId: 'planning'
    },
    {
      id: 'task-2',
      title: 'Create launch checklist',
      description: 'Collect the final steps for launch day.',
      assignee: 'Maya',
      dueDate: '2026-10-04',
      status: 'TO-DO',
      stageId: 'building'
    },
    {
      id: 'task-3',
      title: 'Review homepage copy',
      description: 'Proofread the latest homepage draft.',
      assignee: 'Jordan',
      dueDate: '2026-10-01',
      status: 'COMPLETE',
      stageId: 'review'
    }
  ],
  events: [
    {
      id: 'event-1',
      title: 'Team stand-up',
      date: '2026-10-01',
      time: '09:00',
      owner: 'Everyone'
    },
    {
      id: 'event-2',
      title: 'Design review',
      date: '2026-10-02',
      time: '13:30',
      owner: 'Maya'
    },
    {
      id: 'event-3',
      title: 'Launch planning',
      date: '2026-10-05',
      time: '10:00',
      owner: 'Everyone'
    }
  ],
  files: [],
  whiteboard:
    'Ideas for the next team session:\n\n' +
    '• What would make our handoffs smoother?\n' +
    '• Which parts of the pipeline should be automated?'
};

function cloneSeed() {
  return JSON.parse(JSON.stringify(seed));
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    return saved ? { ...cloneSeed(), ...saved } : cloneSeed();
  } catch {
    return cloneSeed();
  }
}

export let state = loadState();

export function saveState() {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Unable to save planner data locally.', error);
  }

  const status = document.querySelector('#save-status');
  if (status) {
    status.textContent = 'Saved just now';
    setTimeout(() => {
      status.textContent = 'Saved locally';
    }, 1200);
  }

  window.dispatchEvent(new Event('planner:statechange'));
}

export function resetState() {
  state = cloneSeed();
  saveState();
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}