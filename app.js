const STORAGE_KEY = "discipline-tracker-v1";

const state = loadState();

const elements = {
  goalForm: document.getElementById("goalForm"),
  taskForm: document.getElementById("taskForm"),
  goalTitle: document.getElementById("goalTitle"),
  goalDescription: document.getElementById("goalDescription"),
  goalTarget: document.getElementById("goalTarget"),
  goalColor: document.getElementById("goalColor"),
  resetDataButton: document.getElementById("resetDataButton"),
  goalsList: document.getElementById("goalsList"),
  taskDate: document.getElementById("taskDate"),
  taskTitle: document.getElementById("taskTitle"),
  taskGoalId: document.getElementById("taskGoalId"),
  taskPoints: document.getElementById("taskPoints"),
  taskCategory: document.getElementById("taskCategory"),
  taskList: document.getElementById("taskList"),
  selectedDayScore: document.getElementById("selectedDayScore"),
  selectedDayCount: document.getElementById("selectedDayCount"),
  totalPoints: document.getElementById("totalPoints"),
  currentStreak: document.getElementById("currentStreak"),
  completionRate: document.getElementById("completionRate"),
  progressCards: document.getElementById("progressCards"),
  scoreChart: document.getElementById("scoreChart"),
  historyList: document.getElementById("historyList"),
  monthLabel: document.getElementById("monthLabel"),
  emptyStateTemplate: document.getElementById("emptyStateTemplate"),
};

initialize();

function initialize() {
  elements.taskDate.value = state.selectedDate;

  elements.goalForm.addEventListener("submit", onGoalSubmit);
  elements.taskForm.addEventListener("submit", onTaskSubmit);
  elements.resetDataButton.addEventListener("click", resetAllData);
  elements.taskDate.addEventListener("change", (event) => {
    state.selectedDate = event.target.value;
    persist();
    render();
  });

  render();
}

function onGoalSubmit(event) {
  event.preventDefault();

  const goal = {
    id: crypto.randomUUID(),
    title: elements.goalTitle.value.trim(),
    description: elements.goalDescription.value.trim(),
    targetPoints: Number(elements.goalTarget.value),
    color: elements.goalColor.value,
    createdAt: new Date().toISOString(),
  };

  state.goals.unshift(goal);
  persist();
  elements.goalForm.reset();
  elements.goalTarget.value = 120;
  elements.goalColor.value = "#ff7a59";
  render();
}

function onTaskSubmit(event) {
  event.preventDefault();

  if (!state.goals.length) {
    window.alert("Create at least one long-term goal first.");
    return;
  }

  const task = {
    id: crypto.randomUUID(),
    title: elements.taskTitle.value.trim(),
    goalId: elements.taskGoalId.value,
    points: Number(elements.taskPoints.value),
    category: elements.taskCategory.value.trim(),
    date: elements.taskDate.value,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  state.tasks.unshift(task);
  persist();
  elements.taskForm.reset();
  elements.taskPoints.value = 10;
  elements.taskDate.value = state.selectedDate;
  render();
}

function loadState() {
  const today = formatDate(new Date());
  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return {
      selectedDate: today,
      goals: [],
      tasks: [],
    };
  }

  try {
    const parsed = JSON.parse(stored);

    return {
      selectedDate: parsed.selectedDate || today,
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    return {
      selectedDate: today,
      goals: [],
      tasks: [],
    };
  }
}

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetAllData() {
  window.localStorage.removeItem(STORAGE_KEY);
  state.selectedDate = formatDate(new Date());
  state.goals = [];
  state.tasks = [];
  elements.taskDate.value = state.selectedDate;
  render();
}

function render() {
  renderGoalOptions();
  renderGoals();
  renderTasks();
  renderSummary();
  renderProgress();
}

function renderGoalOptions() {
  elements.taskGoalId.innerHTML = "";

  if (!state.goals.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Add a goal first";
    elements.taskGoalId.appendChild(option);
    elements.taskGoalId.disabled = true;
    return;
  }

  elements.taskGoalId.disabled = false;

  for (const goal of state.goals) {
    const option = document.createElement("option");
    option.value = goal.id;
    option.textContent = goal.title;
    elements.taskGoalId.appendChild(option);
  }
}

function renderGoals() {
  elements.goalsList.innerHTML = "";

  if (!state.goals.length) {
    elements.goalsList.appendChild(cloneEmptyState());
    return;
  }

  const totalsByGoal = getCompletedPointsByGoal();

  for (const goal of state.goals) {
    const completedPoints = totalsByGoal.get(goal.id) || 0;
    const percent = Math.min(100, Math.round((completedPoints / goal.targetPoints) * 100));

    const card = document.createElement("article");
    card.className = "goal-card";
    card.style.setProperty("--goal-color", goal.color);
    card.innerHTML = `
      <div class="goal-card-top">
        <h3>${escapeHtml(goal.title)}</h3>
        <button class="ghost-button" data-action="delete-goal" data-id="${goal.id}">Delete</button>
      </div>
      <p>${escapeHtml(goal.description || "No description yet.")}</p>
      <div class="progress-bar"><div style="width: ${percent}%"></div></div>
      <div class="goal-meta">
        <span class="pill">${completedPoints}/${goal.targetPoints} pts</span>
        <span class="pill">${percent}% complete</span>
      </div>
    `;

    card.querySelector("[data-action='delete-goal']").addEventListener("click", () => {
      state.goals = state.goals.filter((item) => item.id !== goal.id);
      state.tasks = state.tasks.filter((task) => task.goalId !== goal.id);
      persist();
      render();
    });

    elements.goalsList.appendChild(card);
  }
}

function renderTasks() {
  elements.taskList.innerHTML = "";
  const selectedTasks = state.tasks
    .filter((task) => task.date === state.selectedDate)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  if (!selectedTasks.length) {
    elements.taskList.appendChild(cloneEmptyState("No tasks for this day yet."));
    return;
  }

  for (const task of selectedTasks) {
    const goal = state.goals.find((item) => item.id === task.goalId);
    const card = document.createElement("article");
    card.className = `task-item ${task.completed ? "is-complete" : ""}`;
    card.innerHTML = `
      <div class="task-topline">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <div class="task-meta">
            <span class="pill">${escapeHtml(task.category)}</span>
            <span class="pill">${escapeHtml(goal ? goal.title : "Unlinked goal")}</span>
          </div>
        </div>
        <span class="task-points">${task.points} pts</span>
      </div>
      <div class="task-actions">
        <button class="toggle-button" data-action="toggle-task" data-id="${task.id}">
          ${task.completed ? "Mark Incomplete" : "Mark Complete"}
        </button>
        <button class="ghost-button" data-action="delete-task" data-id="${task.id}">Delete</button>
      </div>
    `;

    card.querySelector("[data-action='toggle-task']").addEventListener("click", () => {
      const match = state.tasks.find((item) => item.id === task.id);
      match.completed = !match.completed;
      persist();
      render();
    });

    card.querySelector("[data-action='delete-task']").addEventListener("click", () => {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      persist();
      render();
    });

    elements.taskList.appendChild(card);
  }
}

function renderSummary() {
  const completedTasks = state.tasks.filter((task) => task.completed);
  const dayTasks = state.tasks.filter((task) => task.date === state.selectedDate && task.completed);
  const totalTasks = state.tasks.length;
  const totalPoints = completedTasks.reduce((sum, task) => sum + task.points, 0);
  const dayPoints = dayTasks.reduce((sum, task) => sum + task.points, 0);
  const completionRate = totalTasks ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  elements.totalPoints.textContent = `${totalPoints}`;
  elements.selectedDayScore.textContent = `${dayPoints} pts`;
  elements.selectedDayCount.textContent = `${dayTasks.length}`;
  elements.completionRate.textContent = `${completionRate}%`;
  elements.currentStreak.textContent = `${calculateStreak()} days`;
}

function renderProgress() {
  renderProgressCards();
  renderScoreChart();
  renderHistory();
}

function renderProgressCards() {
  elements.progressCards.innerHTML = "";
  const monthTasks = getTasksForCurrentMonth();
  const completedMonthTasks = monthTasks.filter((task) => task.completed);
  const scoreByDate = getCompletedScoreByDate(monthTasks);
  const bestDayScore = Math.max(0, ...scoreByDate.values());
  const activeDays = scoreByDate.size;

  const cards = [
    { label: "This Month", value: `${completedMonthTasks.length} tasks` },
    { label: "Best Day", value: `${bestDayScore} pts` },
    { label: "Active Days", value: `${activeDays}` },
  ];

  for (const cardInfo of cards) {
    const card = document.createElement("article");
    card.className = "progress-card";
    card.innerHTML = `<span>${cardInfo.label}</span><strong>${cardInfo.value}</strong>`;
    elements.progressCards.appendChild(card);
  }
}

function renderScoreChart() {
  elements.scoreChart.innerHTML = "";
  const today = parseDateInput(state.selectedDate);
  const year = today.getFullYear();
  const monthIndex = today.getMonth();
  const monthName = today.toLocaleString("en-US", { month: "long", year: "numeric" });
  elements.monthLabel.textContent = monthName;

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const scores = getCompletedScoreByDate(getTasksForCurrentMonth());
  const maxScore = Math.max(10, ...scores.values());

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatDate(new Date(year, monthIndex, day));
    const score = scores.get(date) || 0;
    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";
    wrap.innerHTML = `
      <span class="bar-score">${score}</span>
      <div class="bar" style="height: ${Math.max(8, (score / maxScore) * 160)}px"></div>
      <span class="bar-day">${day}</span>
    `;
    elements.scoreChart.appendChild(wrap);
  }
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  const scores = [...getCompletedScoreByDate(state.tasks).entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .slice(0, 7);

  if (!scores.length) {
    elements.historyList.appendChild(cloneEmptyState("No completed-task history yet."));
    return;
  }

  for (const [date, score] of scores) {
    const completedCount = state.tasks.filter((task) => task.date === date && task.completed).length;
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <div class="history-date">${humanDate(date)}</div>
        <p>${completedCount} completed task${completedCount === 1 ? "" : "s"}</p>
      </div>
      <div class="history-score">${score} pts</div>
    `;
    elements.historyList.appendChild(item);
  }
}

function getCompletedPointsByGoal() {
  const totals = new Map();

  for (const task of state.tasks) {
    if (!task.completed) {
      continue;
    }

    totals.set(task.goalId, (totals.get(task.goalId) || 0) + task.points);
  }

  return totals;
}

function getCompletedScoreByDate(tasks) {
  const totals = new Map();

  for (const task of tasks) {
    if (!task.completed) {
      continue;
    }

    totals.set(task.date, (totals.get(task.date) || 0) + task.points);
  }

  return totals;
}

function getTasksForCurrentMonth() {
  const selected = parseDateInput(state.selectedDate);
  const year = selected.getFullYear();
  const month = selected.getMonth();

  return state.tasks.filter((task) => {
    const date = parseDateInput(task.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function calculateStreak() {
  const scoreMap = getCompletedScoreByDate(state.tasks);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (scoreMap.has(formatDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function cloneEmptyState(message) {
  const node = elements.emptyStateTemplate.content.firstElementChild.cloneNode(true);
  if (message) {
    node.querySelector("p").textContent = message;
  }
  return node;
}

function humanDate(dateString) {
  const date = parseDateInput(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
