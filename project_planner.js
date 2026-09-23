#!/usr/bin/env node

// Load Node.js's built-in file-system module.
const fs = require('node:fs');

// Load Node.js's path module for safely creating file paths.
const path = require('node:path');

// Store application data in a JSON file beside this program.
const DATA_FILE = path.join(__dirname, 'project-data.json');

// These are the allowed task statuses.
const TASK_STATUSES = ['TO-DO', 'IN-PROGRESS', 'COMPLETE'];

// These are the default stages in the business pipeline.
const DEFAULT_PIPELINE = [
  { id: 'idea', name: 'Idea', order: 1 },
  { id: 'planning', name: 'Planning', order: 2 },
  { id: 'preparation', name: 'Preparation', order: 3 },
  { id: 'ready', name: 'Ready', order: 4 },
  { id: 'active', name: 'Active', order: 5 },
  { id: 'complete', name: 'Complete', order: 6 },
];

// Create a unique ID for a task or other future data object.
function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Check that a date is valid and return it in YYYY-MM-DD format.
function parseDate(dateText) {
  // If no date was provided, return null.
  if (!dateText) return null;

  // Add a time to the date so JavaScript can validate it.
  const date = new Date(`${dateText}T23:59:59`);

  // Reject invalid dates.
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateText}. Use YYYY-MM-DD.`);
  }

  return dateText;
}

// Load saved data from project-data.json.
function loadData() {
  // If no saved data exists, begin with an empty task list.
  if (!fs.existsSync(DATA_FILE)) {
    return {
      pipeline: DEFAULT_PIPELINE,
      tasks: [],
    };
  }

  // Read the file and convert its JSON text into a JavaScript object.
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Save the current data object as formatted JSON.
function saveData(data) {
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);
}

// Find a pipeline stage using its ID.
function findPipelineStage(data, stageId) {
  const stage = data.pipeline.find((item) => item.id === stageId);

  // Stop the program if the stage does not exist.
  if (!stage) {
    throw new Error(
      `Unknown pipeline stage: ${stageId}. Available stages: ${data.pipeline
        .map((item) => item.id)
        .join(', ')}`,
    );
  }

  return stage;
}

// Find a task using its ID.
function findTask(data, taskId) {
  const task = data.tasks.find((item) => item.id === taskId);

  // Stop the program if the task does not exist.
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  return task;
}

// Calculate the percentage of tasks that are complete.
function getPipelineProgress(data) {
  // A pipeline with fewer than two stages cannot calculate useful progress.
  if (data.pipeline.length < 2) return 0;

  // Count completed tasks.
  const completedTasks = data.tasks.filter(
    (task) => task.status === 'COMPLETE',
  ).length;

  // Count all tasks.
  const totalTasks = data.tasks.length;

  // Avoid dividing by zero when there are no tasks.
  if (totalTasks === 0) return 0;

  return Math.round((completedTasks / totalTasks) * 100);
}

// Calculate how far a particular stage is through the pipeline.
function getStageProgress(data, stageId) {
  const stage = findPipelineStage(data, stageId);

  return Math.round((stage.order / data.pipeline.length) * 100);
}

// Create and add a new task.
function addTask(data, {
  title,
  description,
  assignee,
  dueDate,
  stageId,
}) {
  // Every task must have a title.
  if (!title) {
    throw new Error('A task title is required.');
  }

  // Make sure the requested pipeline stage exists.
  findPipelineStage(data, stageId);

  // Build the new task object.
  const task = {
    id: createId('task'),
    title,
    description: description || '',
    assignee: assignee || 'Unassigned',
    dueDate: parseDate(dueDate),
    status: 'TO-DO',
    stageId,
    createdAt: new Date().toISOString(),
  };

  // Add the task to the task list.
  data.tasks.push(task);

  return task;
}

// Update one or more properties of an existing task.
function updateTask(data, taskId, changes) {
  const task = findTask(data, taskId);

  // Make sure the new status is allowed.
  if (changes.status && !TASK_STATUSES.includes(changes.status)) {
    throw new Error(
      `Invalid status. Use one of: ${TASK_STATUSES.join(', ')}.`,
    );
  }

  // Make sure the new pipeline stage exists.
  if (changes.stageId) {
    findPipelineStage(data, changes.stageId);
  }

  // Validate a changed deadline.
  if (changes.dueDate) {
    changes.dueDate = parseDate(changes.dueDate);
  }

  // Copy the changes into the task and record the update time.
  Object.assign(task, changes, {
    updatedAt: new Date().toISOString(),
  });

  return task;
}

// Move a task forward by one stage in the pipeline.
function moveTaskToNextStage(data, taskId) {
  const task = findTask(data, taskId);
  const currentStage = findPipelineStage(data, task.stageId);

  // Find the next stage based on the current stage's order number.
  const nextStage = data.pipeline.find(
    (stage) => stage.order === currentStage.order + 1,
  );

  // If there is no next stage, the task is already at the end.
  if (!nextStage) {
    task.status = 'COMPLETE';
    return task;
  }

  // Move the task forward.
  task.stageId = nextStage.id;

  // Completing the final stage completes the task.
  // Otherwise, moving forward makes the task IN-PROGRESS.
  task.status = nextStage.id === 'complete'
    ? 'COMPLETE'
    : 'IN-PROGRESS';

  // Record when the task was moved.
  task.updatedAt = new Date().toISOString();

  return task;
}

// Turn a task object into readable text for the terminal.
function formatTask(task, data) {
  const stage = findPipelineStage(data, task.stageId);

  return [
    `${task.id}: ${task.title}`,
    `  Status: ${task.status}`,
    `  Stage: ${stage.name}`,
    `  Assigned to: ${task.assignee}`,
    `  Due: ${task.dueDate || 'No deadline'}`,
    `  Description: ${task.description || 'None'}`,
  ].join('\n');
}

// Display instructions for using this program.
function printHelp() {
  console.log(`
Project Progression Planner

Commands:
  pipeline
      Show the pipeline stages and overall task progress.

  tasks [status]
      List all tasks, or filter by TO-DO, IN-PROGRESS, or COMPLETE.

  add-task "Title" "Description" "Assignee" YYYY-MM-DD stage-id
      Create a task. Use - for an empty description, assignee, or deadline.

  update-task task-id field value
      Update status, assignee, description, dueDate, or stageId.

  advance-task task-id
      Move a task to the next pipeline stage.

Examples:
  node project-planner.js pipeline
  node project-planner.js add-task "Create homepage" "Build first draft" "Alex" 2026-10-01 planning
  node project-planner.js tasks IN-PROGRESS
  node project-planner.js advance-task task-123
`);
}

// Process a command entered through the terminal.
function runCommand(args) {
  // The first argument is the command.
  // The remaining arguments contain command values.
  const [command, ...values] = args;

  // Load the current data before performing an action.
  const data = loadData();

  // Choose an action based on the command.
  switch (command) {
    // Display pipeline stages and progress.
    case 'pipeline': {
      console.log('Pipeline:');

      // Print every stage in order.
      data.pipeline.forEach((stage, index) => {
        // Count tasks currently assigned to this stage.
        const stageTasks = data.tasks.filter(
          (task) => task.stageId === stage.id,
        );

        console.log(
          `${index + 1}. ${stage.name} ` +
          `(${stageTasks.length} task` +
          `${stageTasks.length === 1 ? '' : 's'}) - ` +
          `${getStageProgress(data, stage.id)}% stage progress`,
        );
      });

      // Display the percentage of completed tasks.
      console.log(
        `Overall task progress: ${getPipelineProgress(data)}%`,
      );

      break;
    }

    // Display all tasks or filter them by status.
    case 'tasks': {
      const requestedStatus = values[0];

      // If a status was supplied, only show matching tasks.
      // Otherwise, show every task.
      const tasks = requestedStatus
        ? data.tasks.filter(
            (task) => task.status === requestedStatus,
          )
        : data.tasks;

      // Tell the user when nothing matched.
      if (tasks.length === 0) {
        console.log('No matching tasks.');
        break;
      }

      // Print each matching task.
      tasks.forEach((task) => {
        console.log(formatTask(task, data));
      });

      break;
    }

    // Create a new task.
    case 'add-task': {
      // Read task values from the command-line arguments.
      const [
        title,
        description,
        assignee,
        dueDate,
        stageId = 'idea',
      ] = values;

      const task = addTask(data, {
        title,
        description: description === '-' ? '' : description,
        assignee: assignee === '-' ? '' : assignee,
        dueDate: dueDate === '-' ? null : dueDate,
        stageId,
      });

      // Save the new task to project-data.json.
      saveData(data);

      console.log(
        'Task created:\n' + formatTask(task, data),
      );

      break;
    }

    // Update one property on an existing task.
    case 'update-task': {
      const [taskId, field, value] = values;

      // Make sure all required arguments were provided.
      if (!taskId || !field || value === undefined) {
        throw new Error(
          'Usage: update-task task-id field value',
        );
      }

      // Use a computed property name so the selected field is updated.
      const task = updateTask(data, taskId, {
        [field]: field === 'dueDate' && value === '-'
          ? null
          : value,
      });

      // Save the updated task.
      saveData(data);

      console.log(
        'Task updated:\n' + formatTask(task, data),
      );

      break;
    }

    // Advance a task to the next pipeline stage.
    case 'advance-task': {
      const [taskId] = values;

      if (!taskId) {
        throw new Error(
          'Usage: advance-task task-id',
        );
      }

      const task = moveTaskToNextStage(data, taskId);

      // Save the task after moving it.
      saveData(data);

      console.log(
        'Task advanced:\n' + formatTask(task, data),
      );

      break;
    }

    // Display help when the user enters "help" or no command.
    case 'help':
    case undefined:
      printHelp();
      break;

    // Handle invalid commands.
    default:
      throw new Error(
        `Unknown command: ${command}. ` +
        'Run "node project-planner.js help".',
      );
  }
}

// Only run the command-line program when this file is executed directly.
// This prevents the commands from running automatically if another file
// imports this file as a reusable module.
if (require.main === module) {
  try {
    // Remove "node" and the filename from the command-line arguments.
    runCommand(process.argv.slice(2));
  } catch (error) {
    // Display errors without showing a confusing stack trace.
    console.error(`Error: ${error.message}`);

    // Tell Node.js that the program ended unsuccessfully.
    process.exitCode = 1;
  }
}

// Export reusable functions for a future web app or test file.
module.exports = {
  DEFAULT_PIPELINE,
  TASK_STATUSES,
  addTask,
  getPipelineProgress,
  getStageProgress,
  loadData,
  moveTaskToNextStage,
  saveData,
  updateTask,
};