// ========================================
// TODO - Todo feature with time tracking
// ========================================

// State
let todos = [];
let editingTodoId = null;
let timerInterval = null;

// Priority colors
const priorityColors = {
    high: '#e07a5f',
    medium: '#d4a574',
    low: '#7c8594'
};

// Load todos
function loadTodos() {
    todos = loadTodosFromStorage();
    return todos;
}

// Save todos
function saveTodos() {
    saveTodosToStorage(todos);
}

// Add new todo
function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (!text) {
        input.focus();
        return;
    }

    // Get selected priority
    const priorityBtn = document.querySelector('.priority-btn.active');
    const priority = priorityBtn ? priorityBtn.dataset.priority : 'medium';

    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: priority,
        dueDate: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        timeTracking: {
            isRunning: false,
            totalMs: 0,
            sessions: [],
            currentSessionStart: null
        }
    };

    todos.unshift(todo);
    saveTodos();
    renderTodos();

    input.value = '';
    input.focus();
}

// Toggle todo completion
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        todo.completedAt = todo.completed ? new Date().toISOString() : null;

        // Stop tracking if completing
        if (todo.completed && todo.timeTracking.isRunning) {
            stopTracking(id);
        }

        saveTodos();
        renderTodos();
    }
}

// Delete todo
function deleteTodo(id) {
    // Stop tracking if running
    const todo = todos.find(t => t.id === id);
    if (todo && todo.timeTracking.isRunning) {
        stopTracking(id);
    }

    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
}

// Edit todo
function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    editingTodoId = id;
    const input = document.getElementById('todoInput');
    input.value = todo.text;

    // Set priority
    selectPriority(todo.priority);

    // Update button
    document.getElementById('todoAddBtn').innerHTML = '<span>Update</span><span class="add-icon">✓</span>';
    document.getElementById('todoAddBtn').classList.add('editing');
    document.querySelector('.todo-cancel-btn').classList.add('visible');

    input.focus();
}

// Save edited todo
function saveEditedTodo() {
    if (!editingTodoId) return addTodo();

    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (!text) {
        input.focus();
        return;
    }

    const todo = todos.find(t => t.id === editingTodoId);
    if (todo) {
        todo.text = text;
        const priorityBtn = document.querySelector('.priority-btn.active');
        todo.priority = priorityBtn ? priorityBtn.dataset.priority : 'medium';
        saveTodos();
    }

    cancelTodoEdit();
    renderTodos();
}

// Cancel edit
function cancelTodoEdit() {
    editingTodoId = null;
    document.getElementById('todoInput').value = '';
    document.getElementById('todoAddBtn').innerHTML = '<span>Add</span><span class="add-icon">+</span>';
    document.getElementById('todoAddBtn').classList.remove('editing');
    document.querySelector('.todo-cancel-btn').classList.remove('visible');
    selectPriority('medium');
}

// Select priority
function selectPriority(priority) {
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.priority === priority);
    });
}

// Handle add/update button click
function handleTodoSubmit() {
    if (editingTodoId) {
        saveEditedTodo();
    } else {
        addTodo();
    }
}

// ========================================
// TIME TRACKING
// ========================================

// Start tracking time
function startTracking(id) {
    // Stop any currently running timer
    const runningTodo = todos.find(t => t.timeTracking.isRunning);
    if (runningTodo && runningTodo.id !== id) {
        stopTracking(runningTodo.id);
    }

    const todo = todos.find(t => t.id === id);
    if (!todo || todo.completed) return;

    todo.timeTracking.isRunning = true;
    todo.timeTracking.currentSessionStart = new Date().toISOString();
    saveTodos();
    startTimerInterval();
    renderTodos();
}

// Stop tracking time
function stopTracking(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo || !todo.timeTracking.isRunning) return;

    const startTime = new Date(todo.timeTracking.currentSessionStart);
    const endTime = new Date();
    const sessionMs = endTime - startTime;

    todo.timeTracking.sessions.push({
        start: todo.timeTracking.currentSessionStart,
        end: endTime.toISOString()
    });

    todo.timeTracking.totalMs += sessionMs;
    todo.timeTracking.isRunning = false;
    todo.timeTracking.currentSessionStart = null;

    saveTodos();
    stopTimerInterval();
    renderTodos();
}

// Toggle tracking
function toggleTracking(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    if (todo.timeTracking.isRunning) {
        stopTracking(id);
    } else {
        startTracking(id);
    }
}

// Get current tracked time for a todo (including running session)
function getTrackedTime(todo) {
    let total = todo.timeTracking.totalMs || 0;
    if (todo.timeTracking.isRunning && todo.timeTracking.currentSessionStart) {
        const sessionMs = Date.now() - new Date(todo.timeTracking.currentSessionStart).getTime();
        total += sessionMs;
    }
    return total;
}

// Timer interval for live updates
function startTimerInterval() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        updateRunningTimers();
    }, 1000);
}

function stopTimerInterval() {
    // Only stop if no todos are running
    const hasRunning = todos.some(t => t.timeTracking.isRunning);
    if (!hasRunning && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateRunningTimers() {
    const runningTodos = todos.filter(t => t.timeTracking.isRunning);
    runningTodos.forEach(todo => {
        const timerEl = document.querySelector(`[data-timer-id="${todo.id}"]`);
        if (timerEl) {
            timerEl.textContent = formatTrackedTime(getTrackedTime(todo));
        }
    });
}

// Restore running timer on page load
function restoreRunningTimer() {
    const runningTodo = todos.find(t => t.timeTracking.isRunning);
    if (runningTodo) {
        startTimerInterval();
    }
}

// ========================================
// RENDERING
// ========================================

function renderTodos() {
    const container = document.getElementById('todoContainer');
    if (!container) return;

    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

    // Sort: high priority first, then medium, then low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    activeTodos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    if (todos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">☐</div>
                <p class="empty-title">No todos yet</p>
                <p class="empty-subtitle">Add your first todo above</p>
            </div>
        `;
        updateTodoProgress();
        return;
    }

    let html = '';

    // Active todos
    activeTodos.forEach((todo, i) => {
        html += renderTodoItem(todo, i);
    });

    // Completed section
    if (completedTodos.length > 0) {
        html += `
            <div class="todo-completed-header">
                <span class="todo-completed-label">Completed (${completedTodos.length})</span>
            </div>
        `;
        completedTodos.forEach((todo, i) => {
            html += renderTodoItem(todo, activeTodos.length + i);
        });
    }

    container.innerHTML = html;
    updateTodoProgress();
}

function renderTodoItem(todo, index) {
    const trackedTime = getTrackedTime(todo);
    const priorityColor = priorityColors[todo.priority] || priorityColors.medium;
    const isTracking = todo.timeTracking.isRunning;

    return `
        <div class="todo-item ${todo.completed ? 'completed' : ''} ${isTracking ? 'tracking' : ''}" style="animation-delay: ${index * 0.05}s">
            <div class="todo-color" style="background: ${priorityColor}"></div>
            <div class="todo-body">
                <div class="todo-header">
                    <button class="todo-checkbox ${todo.completed ? 'checked' : ''}" onclick="toggleTodo(${todo.id})">
                        ${todo.completed ? '✓' : ''}
                    </button>
                    <span class="todo-text">${escapeHtml(todo.text)}</span>
                    ${todo.priority === 'high' ? '<span class="priority-marker">!</span>' : ''}
                </div>
                <div class="todo-meta">
                    <span class="todo-time-display" data-timer-id="${todo.id}">
                        ${formatTrackedTime(trackedTime)}
                    </span>
                    ${!todo.completed ? `
                        <button class="todo-timer-btn ${isTracking ? 'active' : ''}" onclick="toggleTracking(${todo.id})">
                            ${isTracking ? '⏹ Stop' : '▶ Start'}
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="todo-actions">
                ${!todo.completed ? `<button class="task-btn edit-btn" onclick="editTodo(${todo.id})">✎</button>` : ''}
                <button class="task-btn delete-btn" onclick="deleteTodo(${todo.id})">×</button>
            </div>
        </div>
    `;
}

function updateTodoProgress() {
    const progressEl = document.getElementById('todoProgress');
    if (!progressEl) return;

    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;

    if (total === 0) {
        progressEl.textContent = 'No todos';
    } else {
        progressEl.textContent = `${completed}/${total} done`;
    }
}

// Initialize todos
function initTodos() {
    loadTodos();

    const input = document.getElementById('todoInput');
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') handleTodoSubmit();
            if (e.key === 'Escape') cancelTodoEdit();
        });
    }

    // Restore running timer
    restoreRunningTimer();
}
