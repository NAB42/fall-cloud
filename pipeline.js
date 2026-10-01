/* Browser version of the pipeline feature. No Node.js APIs are used here. */
(function () {
  'use strict';

  const STORAGE_KEY = 'fall-cloud-planner-v1';
  const STATUSES = ['TO-DO', 'IN-PROGRESS', 'COMPLETE'];
  const STATUS_LABELS = {
    'TO-DO': 'To-do',
    'IN-PROGRESS': 'In progress',
    COMPLETE: 'Complete'
  };

  const seed = {
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

  let state = loadState();
  let selectedCalendarDate = new Date('2026-10-01T12:00:00');
  let calendarWeekOffset = 0;

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ||
        structuredClone(seed);
    } catch (_) {
      return JSON.parse(JSON.stringify(seed));
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const status = document.querySelector('#save-status');
    status.textContent = 'Saved just now';

    setTimeout(() => {
      status.textContent = 'Saved locally';
    }, 1200);
  }

  function id(prefix) {
    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[character]));
  }

  function dateLabel(
    value,
    options = { month: 'short', day: 'numeric' }
  ) {
    if (!value) return 'No date';

    return new Date(`${value}T12:00:00`)
      .toLocaleDateString(undefined, options);
  }

  function formatStatus(status) {
    return STATUS_LABELS[status] || status;
  }

  function pipelineProgress() {
    const completedTasks = state.tasks.filter(
      task => task.status === 'COMPLETE'
    ).length;

    return state.tasks.length
      ? Math.round((completedTasks / state.tasks.length) * 100)
      : 0;
  }

  function openTasks() {
    return state.tasks.filter(task => task.status !== 'COMPLETE');
  }

  function render() {
    renderDashboard();
    renderTasks();
    renderCalendar();
    renderPipeline();
    renderFiles();
    renderWhiteboard();

    document.querySelector('#task-count').textContent =
      openTasks().length || '';
  }

  function renderDashboard() {
    const progress = pipelineProgress();

    document.querySelector('#dashboard-progress').textContent =
      `${progress}%`;

    document.querySelector('#dashboard-progress-bar').style.width =
      `${progress}%`;

    document.querySelector('#pipeline-bar').style.width =
      `${progress}%`;

    document.querySelector('#dashboard-stage').textContent =
      `${state.tasks.filter(task => task.status === 'COMPLETE').length} ` +
      `of ${state.tasks.length} tasks complete`;

    document.querySelector('#open-task-count').textContent =
      openTasks().length;

    document.querySelector('#event-count').textContent =
      state.events.filter(event =>
        new Date(`${event.date}T${event.time || '12:00'}`) >= new Date()
      ).length;

    document.querySelector('#file-count').textContent =
      state.files.length;

    const dueThisWeek = openTasks().filter(task =>
      task.dueDate && task.dueDate <= '2026-10-07'
    ).length;

    document.querySelector('#overdue-count').textContent =
      `${dueThisWeek} due this week`;

    document.querySelector('#dashboard-tasks').innerHTML =
      state.tasks
        .slice()
        .sort((a, b) =>
          (a.dueDate || 'z').localeCompare(b.dueDate || 'z')
        )
        .slice(0, 4)
        .map(taskRow)
        .join('') || empty('No tasks yet.');

    document.querySelector('#dashboard-events').innerHTML =
      state.events
        .slice()
        .sort(eventSort)
        .slice(0, 4)
        .map(eventRow)
        .join('') || empty('No upcoming events.');

    document.querySelector('#whiteboard-preview').textContent =
      state.whiteboard ||
      'Your team whiteboard is ready for ideas.';
  }

  function taskRow(task) {
    return `
      <div class="task-row">
        <i class="status-dot ${task.status}"></i>

        <div class="task-row-main">
          <strong>${escapeHtml(task.title)}</strong>
          <small>
            ${escapeHtml(task.assignee)} · ${dateLabel(task.dueDate)}
          </small>
        </div>

        <span class="badge ${task.status}">
          ${formatStatus(task.status)}
        </span>
      </div>
    `;
  }

  function eventRow(event) {
    return `
      <div class="event-row">
        <div class="event-date">
          <strong>
            ${dateLabel(event.date, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </strong>
        </div>

        <div class="event-row-main">
          <strong>${escapeHtml(event.title)}</strong>
          <small>
            ${escapeHtml(event.time || 'All day')} ·
            ${escapeHtml(event.owner || 'Team')}
          </small>
        </div>
      </div>
    `;
  }

  function empty(message) {
    return `<p class="muted">${message}</p>`;
  }

  function renderTasks() {
    const query =
      document.querySelector('#task-search').value.toLowerCase();

    const filter =
      document.querySelector('#task-filter').value;

    const tasks = state.tasks.filter(task => {
      const searchableText =
        `${task.title} ${task.description} ${task.assignee}`
          .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesFilter =
        filter === 'ALL' || task.status === filter;

      return matchesSearch && matchesFilter;
    });

    document.querySelector('#task-columns').innerHTML =
      STATUSES.map(status => `
        <section class="task-column">
          <div class="column-heading">
            <span>${formatStatus(status)}</span>
            <span>
              ${tasks.filter(task => task.status === status).length}
            </span>
          </div>

          ${
            tasks
              .filter(task => task.status === status)
              .map(columnTask)
              .join('') || empty('Nothing here yet.')
          }
        </section>
      `).join('');
  }

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

        <p>
          ${escapeHtml(task.description || 'No description')}
        </p>

        <footer>
          <span>
            ${escapeHtml(task.assignee)} · ${dateLabel(task.dueDate)}
          </span>

          <button
            class="text-button advance-task"
            data-id="${task.id}"
            title="Move to ${formatStatus(nextStatus)}"
          >
            ${task.status === 'COMPLETE' ? '↶ Reopen' : 'Advance →'}
          </button>
        </footer>
      </article>
    `;
  }

  function getWeekStart(date) {
    const weekStart = new Date(date);
    const day = weekStart.getDay();

    weekStart.setDate(
      weekStart.getDate() - day + calendarWeekOffset * 7
    );

    weekStart.setHours(12, 0, 0, 0);

    return weekStart;
  }

  function dateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function eventSort(a, b) {
    return `${a.date}${a.time}`.localeCompare(
      `${b.date}${b.time}`
    );
  }

  function renderCalendar() {
    const start = getWeekStart(selectedCalendarDate);

    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(day.getDate() + index);
      return day;
    });

    document.querySelector('#calendar-label').textContent =
      `${dateLabel(dateKey(days[0]), {
        month: 'short',
        day: 'numeric'
      })} – ${dateLabel(dateKey(days[6]), {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;

    const names = [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat'
    ];

    const calendarDays = days.map(day => {
      const key = dateKey(day);

      const events = state.events.filter(
        event => event.date === key
      );

      const today =
        key === dateKey(new Date('2026-10-01T12:00:00'));

      const selected =
        key === dateKey(selectedCalendarDate);

      return `
        <div
          class="calendar-day ${selected ? 'selected' : ''} ${
            today ? 'today' : ''
          }"
          data-date="${key}"
        >
          <div class="day-number">${day.getDate()}</div>

          ${events.map(event => `
            <div class="day-event">
              ${escapeHtml(event.title)}
            </div>
          `).join('')}
        </div>
      `;
    }).join('');

    document.querySelector('#calendar-grid').innerHTML =
      names.map(name =>
        `<div class="calendar-day-name">${name}</div>`
      ).join('') + calendarDays;

    const selectedDate = dateKey(selectedCalendarDate);

    document.querySelector('#calendar-events').innerHTML =
      state.events
        .filter(event => event.date === selectedDate)
        .sort(eventSort)
        .map(eventRow)
        .join('') ||
      empty(`No events on ${dateLabel(selectedDate)}.`);
  }

  function renderPipeline() {
    const percent = pipelineProgress();

    document.querySelector('#pipeline-percent').textContent =
      `${percent}%`;

    document.querySelector('#pipeline-stages').innerHTML =
      state.stages.map((stage, index) => {
        const stageTasks = state.tasks.filter(
          task => task.stageId === stage.id
        );

        const done =
          stageTasks.length > 0 &&
          stageTasks.every(task => task.status === 'COMPLETE');

        const current =
          stageTasks.some(task => task.status === 'IN-PROGRESS') ||
          (!stageTasks.length && index === 0);

        return `
          <article class="stage-card ${done ? 'done' : ''} ${
            current ? 'current' : ''
          }">
            <div class="stage-marker">
              <i>${done ? '✓' : index + 1}</i>
              <span>Stage ${index + 1}</span>
            </div>

            <h3>${escapeHtml(stage.name)}</h3>

            <small>
              ${stageTasks.length}
              task${stageTasks.length === 1 ? '' : 's'}
            </small>
          </article>
        `;
      }).join('');

    document.querySelector('#task-stage-options').innerHTML =
      state.stages.map(stage => `
        <option value="${stage.id}">
          ${escapeHtml(stage.name)}
        </option>
      `).join('');
  }

  function renderFiles() {
    document.querySelector('#file-total').textContent =
      `${state.files.length} file${
        state.files.length === 1 ? '' : 's'
      }`;

    document.querySelector('#file-list').innerHTML =
      state.files.map(file => `
        <div class="file-row">
          <span class="file-icon">▤</span>

          <div class="file-row-main">
            <strong>${escapeHtml(file.name)}</strong>
            <small>
              ${formatBytes(file.size)} ·
              added ${dateLabel(file.addedAt)}
            </small>
          </div>

          <div class="file-actions">
            <button
              class="remove-file"
              data-id="${file.id}"
              title="Remove file"
            >
              ×
            </button>
          </div>
        </div>
      `).join('') || empty('No shared files yet.');
  }

  function renderWhiteboard() {
    const board = document.querySelector('#whiteboard');

    if (document.activeElement !== board) {
      board.value = state.whiteboard || '';
    }

    const words =
      (board.value.trim().match(/\S+/g) || []).length;

    document.querySelector('#word-count').textContent =
      `${words} word${words === 1 ? '' : 's'}`;
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 KB';

    const units = ['B', 'KB', 'MB', 'GB'];

    const unitIndex = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    return `${(bytes / 1024 ** unitIndex).toFixed(
      unitIndex ? 1 : 0
    )} ${units[unitIndex]}`;
  }

  function showDialog(id) {
    document.querySelector(id).showModal();
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-view]');

    if (nav) {
      document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active-view');
      });

      document
        .querySelector(`#${nav.dataset.view}-view`)
        .classList.add('active-view');

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link === nav);
      });

      return;
    }

    const link = event.target.closest('[data-view-link]');

    if (link) {
      document
        .querySelector(`[data-view="${link.dataset.viewLink}"]`)
        .click();
    }

    const action =
      event.target.closest('[data-action]')?.dataset.action;

    if (action === 'new-task') showDialog('#task-dialog');
    if (action === 'new-event') showDialog('#event-dialog');
    if (action === 'new-stage') showDialog('#stage-dialog');

    const advance = event.target.closest('.advance-task');

    if (advance) {
      const task = state.tasks.find(
        taskItem => taskItem.id === advance.dataset.id
      );

      task.status =
        task.status === 'TO-DO'
          ? 'IN-PROGRESS'
          : task.status === 'IN-PROGRESS'
            ? 'COMPLETE'
            : 'TO-DO';

      saveState();
      render();
    }

    const remove = event.target.closest('.remove-file');

    if (remove) {
      state.files = state.files.filter(
        file => file.id !== remove.dataset.id
      );

      saveState();
      render();
    }

    const day = event.target.closest('.calendar-day');

    if (day) {
      selectedCalendarDate =
        new Date(`${day.dataset.date}T12:00:00`);

      renderCalendar();
    }
  });

  document
    .querySelector('#task-search')
    .addEventListener('input', renderTasks);

  document
    .querySelector('#task-filter')
    .addEventListener('change', renderTasks);

  document
    .querySelector('#previous-week')
    .addEventListener('click', () => {
      calendarWeekOffset--;
      renderCalendar();
    });

  document
    .querySelector('#next-week')
    .addEventListener('click', () => {
      calendarWeekOffset++;
      renderCalendar();
    });

  document
    .querySelector('#task-form')
    .addEventListener('submit', event => {
      event.preventDefault();

      const data = new FormData(event.currentTarget);

      state.tasks.push({
        id: id('task'),
        title: data.get('title').trim(),
        description: data.get('description').trim(),
        assignee: data.get('assignee').trim() || 'Unassigned',
        dueDate: data.get('dueDate'),
        status: 'TO-DO',
        stageId: data.get('stageId')
      });

      saveState();
      event.currentTarget.closest('dialog').close();
      event.currentTarget.reset();
      render();
    });

  document
    .querySelector('#event-form')
    .addEventListener('submit', event => {
      event.preventDefault();

      const data = new FormData(event.currentTarget);

      state.events.push({
        id: id('event'),
        title: data.get('title').trim(),
        date: data.get('date'),
        time: data.get('time'),
        owner: data.get('owner').trim() || 'Team'
      });

      saveState();
      event.currentTarget.closest('dialog').close();
      event.currentTarget.reset();
      render();
    });

  document
    .querySelector('#stage-form')
    .addEventListener('submit', event => {
      event.preventDefault();

      const data = new FormData(event.currentTarget);

      state.stages.push({
        id: id('stage'),
        name: data.get('name').trim(),
        order: state.stages.length + 1
      });

      saveState();
      event.currentTarget.closest('dialog').close();
      event.currentTarget.reset();
      render();
    });

  document
    .querySelector('#whiteboard')
    .addEventListener('input', event => {
      state.whiteboard = event.target.value;
      saveState();
      renderWhiteboard();
    });

  const dropZone = document.querySelector('#drop-zone');
  const fileInput = document.querySelector('#file-input');

  function addFiles(files) {
    Array.from(files).forEach(file => {
      state.files.push({
        id: id('file'),
        name: file.name,
        size: file.size,
        addedAt: '2026-10-01'
      });
    });

    saveState();
    render();
  }

  fileInput.addEventListener('change', event => {
    addFiles(event.target.files);
  });

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

  dropZone.addEventListener('drop', event => {
    addFiles(event.dataTransfer.files);
  });

  document
    .querySelector('#reset-data')
    .addEventListener('click', () => {
      if (confirm('Reset all local demo data?')) {
        state = JSON.parse(JSON.stringify(seed));
        saveState();
        render();
      }
    });

  render();
})();