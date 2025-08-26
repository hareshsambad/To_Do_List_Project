window.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("input_data");
  const addBtn = document.getElementById("add_task_btn");
  const clearAllBtn = document.getElementById("clear_all_btn");
  const taskListEl = document.querySelector(".task_box");
  const promptEl = document.getElementById("customPrompt");
  const promptOkBtn = document.getElementById("promptOkBtn");
  const categoryModal = document.getElementById("categoryModal");
  const catTodayBtn = document.getElementById("catToday");
  const catWeeklyBtn = document.getElementById("catWeekly");
  const catMonthlyBtn = document.getElementById("catMonthly");
  const catCancelBtn = document.getElementById("catCancel");

  const workFilters = {
    all: document.getElementById("all"),
    pending: document.getElementById("pending"),
    completed: document.getElementById("completed"),
  };
  const timeFilters = {
    today: document.getElementById("today"),
    weekly: document.getElementById("weekly"),
    monthly: document.getElementById("monthly"),
  };

  /** State */
  let tasks = loadTasks();
  let activeWorkFilter = "all"; // all | pending | completed
  let activeTimeFilter = null; // null | today | weekly | monthly
  let pendingTextForCategory = null; // temp storage while selecting category

  /** Model */
  function loadTasks() {
    try {
      const raw = localStorage.getItem("todo_tasks");
      const loaded = raw ? JSON.parse(raw) : [];
      // Normalize legacy/missing fields
      return loaded.map((t) => ({
        id: t.id || cryptoRandomId(),
        text: (t.text || String(t)).trim(),
        completed: !!t.completed,
        createdAt: t.createdAt || new Date().toISOString(),
      }));
    } catch (e) {
      return [];
    }
  }

  function persistTasks() {
    localStorage.setItem("todo_tasks", JSON.stringify(tasks));
  }

  /** View */
  function render() {
    taskListEl.innerHTML = "";
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfToday.getDay());
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const filtered = tasks.filter((t) => {
      if (activeWorkFilter === "pending" && t.completed) return false;
      if (activeWorkFilter === "completed" && !t.completed) return false;

      // If task has category, prefer that for filtering
      if (activeTimeFilter && t.category) {
        return t.category === activeTimeFilter;
      }

      if (!activeTimeFilter) return true;
      const createdAt = new Date(t.createdAt);
      if (activeTimeFilter === "today") {
        return createdAt >= startOfToday && createdAt < startOfTomorrow;
      }
      if (activeTimeFilter === "weekly") {
        return createdAt >= startOfWeek && createdAt < startOfNextWeek;
      }
      if (activeTimeFilter === "monthly") {
        return createdAt >= startOfMonth && createdAt < startOfNextMonth;
      }
      return true;
    });

    for (const task of filtered) {
      const li = document.createElement("li");
      li.dataset.id = task.id;
      if (task.completed) li.classList.add("completed");
      li.innerHTML = `
        <div class="task-label">
          <input type=\"checkbox\" ${task.completed ? "checked" : ""}/>
          <p>${escapeHtml(task.text)}</p>
        </div>
        <div class=\"actions\">
          <button class=\"icon-btn edit-btn\" title=\"Edit\" data-action=\"edit\" aria-label=\"Edit\">
            <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 20h9\"></path><path d=\"M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z\"></path></svg>
          </button>
          <button class=\"icon-btn delete-btn\" title=\"Delete\" data-action=\"delete\" aria-label=\"Delete\">
            <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"></polyline><path d=\"M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6\"></path><path d=\"M10 11v6\"></path><path d=\"M14 11v6\"></path><path d=\"M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2\"></path></svg>
          </button>
        </div>`;
      taskListEl.appendChild(li);
    }
  }

  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /** Controllers */
  function addTask(text) {
    tasks.push({
      id: cryptoRandomId(),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      category: null,
    });
    persistTasks();
    render();
  }

  function toggleTask(id, completed) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    t.completed = completed;
    persistTasks();
    render();
  }

  function editTask(id, newText) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    t.text = newText.trim();
    persistTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((x) => x.id !== id);
    persistTasks();
    render();
  }

  function cryptoRandomId() {
    if (window.crypto && crypto.getRandomValues) {
      const buf = new Uint32Array(4);
      crypto.getRandomValues(buf);
      return Array.from(buf).map((n) => n.toString(16)).join("");
    }
    return Math.random().toString(36).slice(2);
  }

  function showPrompt(message) {
    document.getElementById("promptText").innerText = message;
    promptEl.style.display = "flex";
    const close = () => {
      promptEl.style.display = "none";
      document.removeEventListener("keydown", onKey);
      promptOkBtn.removeEventListener("click", close);
    };
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter") close();
    };
    document.addEventListener("keydown", onKey);
    promptOkBtn.addEventListener("click", close);
  }

  /** Events */
  addBtn.addEventListener("click", () => {
    const val = inputEl.value.trim();
    if (!val) return showPrompt("Input is empty!");
    // Ask for category first
    pendingTextForCategory = val;
    openCategoryModal();
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addBtn.click();
    }
  });

  clearAllBtn.addEventListener("click", () => {
    if (tasks.length === 0) return;
    tasks = [];
    persistTasks();
    render();
  });

  // Event delegation for list interactions
  taskListEl.addEventListener("click", (e) => {
    const target = e.target;
    // If SVG or path clicked, bubble up to button
    const actionEl = target.closest("[data-action]");
    const li = target.closest("li");
    if (!li) return;
    const id = li.dataset.id;

    // Icon actions
    if (actionEl && actionEl.dataset.action === "edit") {
      const current = tasks.find((x) => x.id === id);
      if (!current) return;
      const newText = prompt("Edit task", current.text);
      if (newText !== null) {
        const trimmed = newText.trim();
        if (trimmed === "") {
          showPrompt("Task cannot be empty");
        } else {
          editTask(id, trimmed);
        }
      }
      return;
    }

    if (actionEl && actionEl.dataset.action === "delete") {
      deleteTask(id);
      return;
    }
  });

  // Handle checkbox changes using change event
  taskListEl.addEventListener("change", (e) => {
    const target = e.target;
    if (target.matches('input[type="checkbox"]')) {
      const li = target.closest("li");
      if (!li) return;
      toggleTask(li.dataset.id, target.checked);
    }
  });

  // No dropdown anymore

  // Filters
  Object.entries(workFilters).forEach(([key, el]) => {
    el.addEventListener("click", () => {
      activeWorkFilter = key;
      Object.values(workFilters).forEach((n) => n.classList.remove("active"));
      el.classList.add("active");
      render();
    });
  });

  Object.entries(timeFilters).forEach(([key, el]) => {
    el.addEventListener("click", () => {
      // Toggle time filter if clicking the active one
      if (activeTimeFilter === key) {
        activeTimeFilter = null;
        Object.values(timeFilters).forEach((n) => n.classList.remove("active"));
      } else {
        activeTimeFilter = key;
        Object.values(timeFilters).forEach((n) => n.classList.remove("active"));
        el.classList.add("active");
      }
      render();
    });
  });

  // Initial render
  render();

  /** Category Modal control */
  function openCategoryModal() {
    categoryModal.style.display = "flex";
  }
  function closeCategoryModal() {
    categoryModal.style.display = "none";
  }
  function commitCategory(category) {
    if (!pendingTextForCategory) return closeCategoryModal();
    const text = pendingTextForCategory;
    pendingTextForCategory = null;
    // Create with category
    const newTask = {
      id: cryptoRandomId(),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      category,
    };
    tasks.push(newTask);
    persistTasks();
    render();
    inputEl.value = "";
    closeCategoryModal();
  }

  catTodayBtn.addEventListener("click", () => commitCategory("today"));
  catWeeklyBtn.addEventListener("click", () => commitCategory("weekly"));
  catMonthlyBtn.addEventListener("click", () => commitCategory("monthly"));
  catCancelBtn.addEventListener("click", () => {
    pendingTextForCategory = null;
    closeCategoryModal();
  });
});
