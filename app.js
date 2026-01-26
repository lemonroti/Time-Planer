// State
let currentDate = new Date();
let selectedColor = 'coral';
let editingTaskId = null;

// Color values
const colors = {
    coral: '#e07a5f',
    sky: '#5b9bd5',
    mint: '#6bab90',
    sand: '#d4a574',
    slate: '#7c8594'
};

// Get date key for storage
function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

// Load data from localStorage
function loadData() {
    const key = getDateKey(currentDate);
    const data = localStorage.getItem('timeplanner_' + key);
    return data ? JSON.parse(data) : [];
}

// Save data to localStorage
function saveData(data) {
    const key = getDateKey(currentDate);
    localStorage.setItem('timeplanner_' + key, JSON.stringify(data));
}

// Format weekday
function formatWeekday(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// Format full date
function formatFullDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Format time for display
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Calculate duration
function calcDuration(startTime, endTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    return (endMins - startMins) / 60;
}

// Format duration
function formatDuration(hours) {
    if (hours <= 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours === 1) return '1h';
    if (Number.isInteger(hours)) return `${hours}h`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Convert time to minutes
function timeToMins(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

// Calculate total allocated hours
function calcTotalAllocated(tasks) {
    if (tasks.length === 0) return 0;

    const intervals = tasks
        .map(t => [timeToMins(t.startTime), timeToMins(t.endTime)])
        .filter(([s, e]) => e > s)
        .sort((a, b) => a[0] - b[0]);

    if (intervals.length === 0) return 0;

    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1];
        const curr = intervals[i];
        if (curr[0] <= last[1]) {
            last[1] = Math.max(last[1], curr[1]);
        } else {
            merged.push(curr);
        }
    }

    return merged.reduce((sum, [s, e]) => sum + (e - s), 0) / 60;
}

// Check if task is a sub-task
function isSubTask(task, allTasks) {
    const tStart = timeToMins(task.startTime);
    const tEnd = timeToMins(task.endTime);
    return allTasks.some(other => {
        if (other.id === task.id) return false;
        const oStart = timeToMins(other.startTime);
        const oEnd = timeToMins(other.endTime);
        return oStart <= tStart && oEnd >= tEnd && !(oStart === tStart && oEnd === tEnd);
    });
}

// Update hours left display
function updateHoursLeft() {
    const tasks = loadData();
    const allocated = calcTotalAllocated(tasks);
    const left = Math.max(0, 24 - allocated);

    const hours = Math.floor(left);
    const mins = Math.round((left - hours) * 60);

    const numEl = document.querySelector('.hours-num');
    if (mins > 0 && hours > 0) {
        numEl.textContent = `${hours}h${mins}m`;
    } else if (mins > 0) {
        numEl.textContent = `${mins}m`;
    } else {
        numEl.textContent = hours;
    }
}

// Change date
function changeDate(delta) {
    currentDate.setDate(currentDate.getDate() + delta);
    updateDateDisplay();
    renderTasks();
}

// Update date display
function updateDateDisplay() {
    document.getElementById('dateWeekday').textContent = formatWeekday(currentDate);
    document.getElementById('currentDate').textContent = formatFullDate(currentDate);
}

// Select color
function selectColor(color) {
    selectedColor = color;
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
    });
}

// Save task (add or update)
function saveTask() {
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const taskText = document.getElementById('taskInput').value.trim();

    if (!taskText) {
        document.getElementById('taskInput').focus();
        return;
    }

    const tasks = loadData();

    if (editingTaskId) {
        // Update existing task
        const task = tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.startTime = startTime;
            task.endTime = endTime;
            task.text = taskText;
            task.color = selectedColor;
        }
        cancelEdit();
    } else {
        // Add new task
        tasks.push({
            id: Date.now(),
            startTime,
            endTime,
            text: taskText,
            color: selectedColor,
            completed: false
        });
    }

    tasks.sort((a, b) => a.startTime.localeCompare(b.startTime));

    saveData(tasks);
    renderTasks();

    document.getElementById('taskInput').value = '';
    document.getElementById('taskInput').focus();
}

// Edit task
function editTask(id) {
    const tasks = loadData();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;

    // Fill form with task data
    document.getElementById('startTime').value = task.startTime;
    document.getElementById('endTime').value = task.endTime;
    document.getElementById('taskInput').value = task.text;
    selectColor(task.color);

    // Update UI to show edit mode
    document.getElementById('btnText').textContent = 'Update';
    document.getElementById('btnIcon').textContent = '✓';
    document.getElementById('addBtn').classList.add('editing');
    document.querySelector('.cancel-btn').classList.add('visible');
    document.querySelector('.section-title').textContent = 'Edit Task';

    // Scroll to form and focus
    document.querySelector('.add-card').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('taskInput').focus();
}

// Cancel edit
function cancelEdit() {
    editingTaskId = null;

    // Reset form
    document.getElementById('startTime').value = '09:00';
    document.getElementById('endTime').value = '10:00';
    document.getElementById('taskInput').value = '';
    selectColor('coral');

    // Update UI back to add mode
    document.getElementById('btnText').textContent = 'Add';
    document.getElementById('btnIcon').textContent = '+';
    document.getElementById('addBtn').classList.remove('editing');
    document.querySelector('.cancel-btn').classList.remove('visible');
    document.querySelector('.section-title').textContent = 'Add Task';
}

// Toggle task completion
function toggleTask(id) {
    const tasks = loadData();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveData(tasks);
        renderTasks();
    }
}

// Delete task
function deleteTask(id) {
    let tasks = loadData();
    tasks = tasks.filter(t => t.id !== id);
    saveData(tasks);
    renderTasks();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render tasks
function renderTasks() {
    const container = document.getElementById('taskContainer');
    const tasks = loadData();

    document.getElementById('taskCount').textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`;

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">○</div>
                <p class="empty-title">No tasks yet</p>
                <p class="empty-subtitle">Add your first task above</p>
            </div>
        `;
        updateHoursLeft();
        return;
    }

    let html = '';
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const duration = calcDuration(task.startTime, task.endTime);
        const isSub = isSubTask(task, tasks);
        const color = colors[task.color] || colors.coral;

        // Check for gap with previous non-sub task
        if (i > 0 && !isSub) {
            const prevTask = tasks.slice(0, i).reverse().find(t => !isSubTask(t, tasks));
            if (prevTask) {
                const gapMins = timeToMins(task.startTime) - timeToMins(prevTask.endTime);
                if (gapMins > 0) {
                    html += `
                        <div class="task-gap">
                            <span class="gap-line"></span>
                            <span class="gap-label">${formatDuration(gapMins / 60)} free</span>
                            <span class="gap-line"></span>
                        </div>
                    `;
                }
            }
        }

        html += `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isSub ? 'sub-task' : ''}" style="animation-delay: ${i * 0.05}s">
                <div class="task-color" style="background: ${color}"></div>
                <div class="task-body">
                    <div class="task-time">
                        <span class="task-time-text">${formatTime(task.startTime)} → ${formatTime(task.endTime)}</span>
                        <span class="task-duration">${formatDuration(duration)}</span>
                        ${isSub ? '<span class="sub-label">sub</span>' : ''}
                    </div>
                    <div class="task-text">${escapeHtml(task.text)}</div>
                </div>
                <div class="task-actions">
                    <button class="task-btn complete-btn" onclick="toggleTask(${task.id})">✓</button>
                    <button class="task-btn delete-btn" onclick="deleteTask(${task.id})">×</button>
                    <button class="task-btn edit-btn" onclick="editTask(${task.id})">✎</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;

    updateHoursLeft();
}

// Export all data to JSON file
function exportData() {
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('timeplanner_')) {
            try {
                const tasks = JSON.parse(localStorage.getItem(key));
                if (Array.isArray(tasks)) {
                    allData[key] = tasks;
                }
            } catch (e) {
                // Skip non-JSON values
            }
        }
    }

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeplanner-backup-${getDateKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import data from JSON file
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            for (const [key, value] of Object.entries(data)) {
                if (key.startsWith('timeplanner_') && Array.isArray(value)) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            }
            renderTasks();
        } catch (err) {
            // Invalid file
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('taskInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') saveTask();
        if (e.key === 'Escape') cancelEdit();
    });

    updateDateDisplay();
    renderTasks();
});
