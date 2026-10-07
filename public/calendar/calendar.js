import { createId, saveState, state } from '../shared/state.js';
import { dateLabel, empty, eventRow, eventSort, escapeHtml } from '../shared/helpers.js';

let selectedDate = new Date('2026-10-01T12:00:00');

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(12, 0, 0, 0);
  return start;
}

function renderCalendar() {
  const grid = document.querySelector('#calendar-grid');
  if (!grid) return;

  const start = getWeekStart(selectedDate);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    return day;
  });

  const label = document.querySelector('#calendar-label');
  if (label) {
    label.textContent = `${dateLabel(dateKey(days[0]), { month: 'short', day: 'numeric' })} – ${dateLabel(dateKey(days[6]), { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  grid.innerHTML = names.map(name => `<div class="calendar-day-name">${name}</div>`).join('') +
    days.map(day => {
      const key = dateKey(day);
      const events = state.events.filter(event => event.date === key);
      const today = key === dateKey(new Date('2026-10-01T12:00:00'));
      const selected = key === dateKey(selectedDate);
      return `
        <div class="calendar-day ${selected ? 'selected' : ''} ${today ? 'today' : ''}" data-date="${key}">
          <div class="day-number">${day.getDate()}</div>
          ${events.map(item => `<div class="day-event">${escapeHtml(item.title)}</div>`).join('')}
        </div>
      `;
    }).join('');

  const selectedKey = dateKey(selectedDate);
  const events = document.querySelector('#calendar-events');
  if (events) {
    events.innerHTML = state.events
      .filter(event => event.date === selectedKey)
      .sort(eventSort)
      .map(eventRow)
      .join('') || empty(`No events on ${dateLabel(selectedKey)}.`);
  }
}

function showEventDialog() {
  const dialog = document.querySelector('#event-dialog');
  if (dialog && !dialog.open) dialog.showModal();
}

export function initCalendar() {
  document.querySelector('#previous-week')?.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 7);
    renderCalendar();
  });
  document.querySelector('#next-week')?.addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 7);
    renderCalendar();
  });
  document.querySelector('#calendar-grid')?.addEventListener('click', event => {
    const day = event.target.closest('.calendar-day');
    if (!day) return;
    selectedDate = new Date(`${day.dataset.date}T12:00:00`);
    renderCalendar();
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="new-event"]')) showEventDialog();
  });

  const form = document.querySelector('#event-form');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    state.events.push({
      id: createId('event'),
      title: data.get('title').trim(),
      date: data.get('date'),
      time: data.get('time'),
      owner: data.get('owner').trim() || 'Team'
    });
    saveState();
    form.closest('dialog').close();
    form.reset();
  });

  renderCalendar();
  window.addEventListener('planner:statechange', renderCalendar);
}