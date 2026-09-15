const YEAR = 2026;
const STORAGE_KEY = "peach-calendar-tasks-v1";
const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

const state = {
  month: 0,
  selectedDate: "2026-01-01",
  filter: "all",
  tasks: loadTasks(),
};

const els = {
  monthTitle: document.querySelector("#monthTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  todayButton: document.querySelector("#todayButton"),
  selectedDateWeekday: document.querySelector("#selectedDateWeekday"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  dateBadge: document.querySelector("#dateBadge"),
  taskSummaryText: document.querySelector("#taskSummaryText"),
  taskCount: document.querySelector("#taskCount"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskList: document.querySelector("#taskList"),
  emptyState: document.querySelector("#emptyState"),
  yearProgressText: document.querySelector("#yearProgressText"),
  yearProgressBar: document.querySelector("#yearProgressBar"),
};

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function dateKey(month, day) {
  return `${YEAR}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseSelectedDate() {
  const [year, month, day] = state.selectedDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function tasksFor(key = state.selectedDate) {
  return state.tasks[key] || [];
}

function renderCalendar() {
  els.monthTitle.textContent = `${state.month + 1}월`;
  els.prevMonth.disabled = state.month === 0;
  els.nextMonth.disabled = state.month === 11;
  els.calendarGrid.innerHTML = "";

  const firstDay = new Date(YEAR, state.month, 1).getDay();
  const daysInMonth = new Date(YEAR, state.month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i += 1) {
    const blank = document.createElement("span");
    blank.className = "blank-cell";
    blank.setAttribute("aria-hidden", "true");
    els.calendarGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = dateKey(state.month, day);
    const dayTasks = tasksFor(key);
    const doneCount = dayTasks.filter((task) => task.done).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", `${state.month + 1}월 ${day}일${dayTasks.length ? `, 할 일 ${dayTasks.length}개` : ""}`);
    if (key === state.selectedDate) button.classList.add("selected");
    if (dayTasks.length && doneCount === dayTasks.length) button.classList.add("all-done");

    const preview = dayTasks[0] ? `<span class="task-preview">${escapeHtml(dayTasks[0].text)}</span>` : "";
    const count = dayTasks.length ? `<span class="count-badge">${doneCount === dayTasks.length ? "✓" : dayTasks.length}</span>` : "";
    button.innerHTML = `<span class="day-number">${day}</span>${preview}${count}`;
    button.addEventListener("click", () => selectDate(key));
    els.calendarGrid.appendChild(button);
  }
}

function renderTasks() {
  const selected = parseSelectedDate();
  const allTasks = tasksFor();
  const doneCount = allTasks.filter((task) => task.done).length;
  const visibleTasks = allTasks.filter((task) => {
    if (state.filter === "active") return !task.done;
    if (state.filter === "done") return task.done;
    return true;
  });

  els.selectedDateWeekday.textContent = weekdays[selected.getDay()];
  els.selectedDateTitle.textContent = `${selected.getMonth() + 1}월 ${selected.getDate()}일`;
  els.dateBadge.textContent = String(selected.getDate()).padStart(2, "0");
  els.taskCount.textContent = `${doneCount} / ${allTasks.length}`;
  els.taskSummaryText.textContent = allTasks.length ? "완료한 할 일" : "오늘의 할 일";
  els.taskList.innerHTML = "";

  visibleTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.done ? " done" : ""}`;
    item.innerHTML = `
      <input class="task-check" type="checkbox" ${task.done ? "checked" : ""} aria-label="${escapeHtml(task.text)} 완료 표시" />
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="delete-task" type="button" aria-label="${escapeHtml(task.text)} 삭제">×</button>
    `;
    item.querySelector(".task-check").addEventListener("change", () => toggleTask(task.id));
    item.querySelector(".delete-task").addEventListener("click", () => deleteTask(task.id));
    els.taskList.appendChild(item);
  });

  const isEmpty = visibleTasks.length === 0;
  els.emptyState.hidden = !isEmpty;
  if (isEmpty) {
    const emptyTitle = els.emptyState.querySelector("p");
    const emptyCaption = els.emptyState.querySelector("small");
    if (allTasks.length && state.filter !== "all") {
      emptyTitle.textContent = state.filter === "done" ? "완료한 일이 없어요" : "남은 할 일이 없어요";
      emptyCaption.textContent = state.filter === "done" ? "하나씩 완료해 보세요" : "오늘 계획을 모두 마쳤어요!";
    } else {
      emptyTitle.textContent = "아직 할 일이 없어요";
      emptyCaption.textContent = "가볍게 하나부터 시작해 볼까요?";
    }
  }
}

function renderProgress() {
  const all = Object.values(state.tasks).flat();
  const done = all.filter((task) => task.done).length;
  const percentage = all.length ? Math.round((done / all.length) * 100) : 0;
  els.yearProgressText.textContent = `${percentage}%`;
  els.yearProgressBar.style.width = `${percentage}%`;
}

function render() {
  renderCalendar();
  renderTasks();
  renderProgress();
}

function selectDate(key) {
  state.selectedDate = key;
  state.month = Number(key.slice(5, 7)) - 1;
  render();
}

function addTask(text) {
  const cleanText = text.trim();
  if (!cleanText) return;
  const current = tasksFor();
  state.tasks[state.selectedDate] = [...current, { id: crypto.randomUUID(), text: cleanText, done: false }];
  saveTasks();
  render();
}

function toggleTask(id) {
  state.tasks[state.selectedDate] = tasksFor().map((task) => task.id === id ? { ...task, done: !task.done } : task);
  saveTasks();
  render();
}

function deleteTask(id) {
  const next = tasksFor().filter((task) => task.id !== id);
  if (next.length) state.tasks[state.selectedDate] = next;
  else delete state.tasks[state.selectedDate];
  saveTasks();
  render();
}

function changeMonth(delta) {
  const nextMonth = Math.min(11, Math.max(0, state.month + delta));
  if (nextMonth === state.month) return;
  state.month = nextMonth;
  state.selectedDate = dateKey(state.month, 1);
  render();
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function assert2026Date(value) {
  if (typeof value !== "string" || !/^2026-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) {
    throw new Error("날짜는 2026년의 YYYY-MM-DD 형식이어야 합니다.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    throw new Error("유효하지 않은 날짜입니다.");
  }
  return value;
}

function registerModelTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const reportError = (error) => console.warn("WebMCP 도구 등록에 실패했습니다.", error);

  const registrations = [
    {
      name: "get_date_tasks",
      title: "날짜별 할 일 보기",
      description: "2026년의 지정한 날짜에 저장된 할 일과 완료 상태를 조회합니다.",
      inputSchema: {
        type: "object",
        properties: { date: { type: "string", description: "2026년의 YYYY-MM-DD 날짜" } },
        required: ["date"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        const date = assert2026Date(input?.date);
        return { date, tasks: tasksFor(date).map(({ id, text, done }) => ({ id, text, done })) };
      },
    },
    {
      name: "create_date_task",
      title: "날짜에 할 일 추가",
      description: "2026년의 지정한 날짜에 새 할 일을 추가하고 그 날짜를 화면에 표시합니다.",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "2026년의 YYYY-MM-DD 날짜" },
          text: { type: "string", minLength: 1, maxLength: 80, description: "추가할 할 일" },
        },
        required: ["date", "text"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const date = assert2026Date(input?.date);
        if (typeof input?.text !== "string" || !input.text.trim() || input.text.trim().length > 80) {
          throw new Error("할 일은 1자 이상 80자 이하로 입력해야 합니다.");
        }
        selectDate(date);
        addTask(input.text);
        const created = tasksFor(date).at(-1);
        return { date, task: { id: created.id, text: created.text, done: created.done } };
      },
    },
    {
      name: "complete_date_task",
      title: "할 일 완료하기",
      description: "지정한 날짜의 할 일을 완료 상태로 바꾸고 화면에 결과를 표시합니다.",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "2026년의 YYYY-MM-DD 날짜" },
          taskId: { type: "string", minLength: 1, description: "완료할 할 일 ID" },
        },
        required: ["date", "taskId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const date = assert2026Date(input?.date);
        const task = tasksFor(date).find((item) => item.id === input?.taskId);
        if (!task) throw new Error("해당 할 일을 찾을 수 없습니다.");
        selectDate(date);
        if (!task.done) toggleTask(task.id);
        return { date, taskId: task.id, done: true };
      },
    },
  ];

  registrations.forEach((tool) => {
    try {
      void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(reportError);
    } catch (error) {
      reportError(error);
    }
  });
}

els.prevMonth.addEventListener("click", () => changeMonth(-1));
els.nextMonth.addEventListener("click", () => changeMonth(1));
els.todayButton.addEventListener("click", () => {
  const now = new Date();
  selectDate(now.getFullYear() === YEAR ? dateKey(now.getMonth(), now.getDate()) : "2026-01-01");
});
els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(els.taskInput.value);
  els.taskInput.value = "";
  els.taskInput.focus();
});
document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach((item) => item.classList.toggle("active", item === button));
    renderTasks();
  });
});

render();
registerModelTools();
