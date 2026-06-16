const STORAGE_KEY = "vanillaTodo.tasks";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const taskTemplate = document.querySelector("#task-template");
const filterButtons = document.querySelectorAll(".filter-button");
const emptyState = document.querySelector("#empty-state");
const taskCount = document.querySelector("#task-count");

let tasks = loadTasks();
let currentFilter = "all";

renderTasks();

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();

  if (!text) {
    return;
  }

  addTask(text);
  taskInput.value = "";
  taskInput.focus();
});

document.querySelector(".filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");

  if (!button) {
    return;
  }

  currentFilter = button.dataset.filter;
  updateFilterTabs();
  renderTasks();
});

// One click listener on the list handles task buttons added by every render.
taskList.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");

  if (!actionTarget || actionTarget.dataset.action === "toggle") {
    return;
  }

  const taskItem = actionTarget.closest(".task-item");
  const taskId = taskItem.dataset.id;
  const action = actionTarget.dataset.action;

  if (action === "edit") {
    startEditing(taskItem);
  }

  if (action === "delete") {
    deleteTask(taskId);
  }
});

// Checkbox completion changes are delegated too, so newly rendered tasks work automatically.
taskList.addEventListener("change", (event) => {
  if (!event.target.matches("[data-action='toggle']")) {
    return;
  }

  const taskItem = event.target.closest(".task-item");
  toggleTask(taskItem.dataset.id);
});

taskList.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!event.target.matches(".edit-form")) {
    return;
  }

  const taskItem = event.target.closest(".task-item");
  const input = event.target.querySelector(".edit-input");
  updateTask(taskItem.dataset.id, input.value.trim());
});

function addTask(text) {
  tasks.unshift({
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now()
  });

  commitState();
}

function toggleTask(id) {
  tasks = tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }

    return { ...task, completed: !task.completed };
  });

  commitState();
}

function updateTask(id, text) {
  if (!text) {
    renderTasks();
    return;
  }

  tasks = tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }

    return { ...task, text };
  });

  commitState();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  commitState();
}

function startEditing(taskItem) {
  const task = tasks.find((item) => item.id === taskItem.dataset.id);
  const text = taskItem.querySelector(".task-text");
  const actions = taskItem.querySelector(".task-actions");
  const editForm = taskItem.querySelector(".edit-form");
  const editInput = taskItem.querySelector(".edit-input");

  text.hidden = true;
  actions.hidden = true;
  editForm.hidden = false;
  editInput.value = task.text;
  editInput.focus();
  editInput.select();
}

function getFilteredTasks() {
  if (currentFilter === "active") {
    return tasks.filter((task) => !task.completed);
  }

  if (currentFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }

  return tasks;
}

function renderTasks() {
  const visibleTasks = getFilteredTasks();
  taskList.replaceChildren();

  visibleTasks.forEach((task) => {
    const taskNode = taskTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = taskNode.querySelector("[data-action='toggle']");

    taskNode.dataset.id = task.id;
    taskNode.classList.toggle("completed", task.completed);
    checkbox.checked = task.completed;
    taskNode.querySelector(".task-text").textContent = task.text;

    taskList.append(taskNode);
  });

  updateTaskCount();
  updateEmptyState(visibleTasks.length);
}

function updateFilterTabs() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function updateTaskCount() {
  const activeCount = tasks.filter((task) => !task.completed).length;
  const label = activeCount === 1 ? "1 active" : `${activeCount} active`;
  taskCount.textContent = label;
}

function updateEmptyState(visibleCount) {
  const messages = {
    all: "No tasks yet. Add one above.",
    active: "No active tasks.",
    completed: "No completed tasks."
  };

  emptyState.hidden = visibleCount > 0;
  emptyState.textContent = messages[currentFilter];
}

// Persist after every state mutation so refreshes restore the current list.
function commitState() {
  saveTasks();
  renderTasks();
}

function loadTasks() {
  const savedTasks = window.localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);
    return Array.isArray(parsedTasks) ? parsedTasks : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
