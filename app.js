// State
let currentTemplate = '';
let templates = [];
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

// Load templates list
function loadTemplates() {
    const data = localStorage.getItem('timetable_templates');
    return data ? JSON.parse(data) : [];
}

// Save templates list
function saveTemplates() {
    localStorage.setItem('timetable_templates', JSON.stringify(templates));
}

// Get storage key for template
function getTemplateKey(name) {
    return 'timetable_' + name.toLowerCase().replace(/\s+/g, '_');
}

// Load tasks for current template
function loadData() {
    if (!currentTemplate) return [];
    const key = getTemplateKey(currentTemplate);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// Save tasks for current template
function saveData(data) {
    if (!currentTemplate) return;
    const key = getTemplateKey(currentTemplate);
    localStorage.setItem(key, JSON.stringify(data));
}

// Format time for display
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Calculate duration (handles midnight crossing)
function calcDuration(startTime, endTime) {
    const startMins = timeToMins(startTime);
    const endMins = timeToMins(endTime);
    const effectiveEnd = getEffectiveEnd(startMins, endMins);
    return (effectiveEnd - startMins) / 60;
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

// Get effective end time (handles midnight crossing)
// If end < start, assume task crosses midnight and add 24 hours
function getEffectiveEnd(startMins, endMins) {
    return endMins <= startMins ? endMins + 1440 : endMins;
}

// Calculate total allocated hours (handles midnight crossing)
function calcTotalAllocated(tasks) {
    if (tasks.length === 0) return 0;

    const intervals = tasks
        .map(t => {
            const s = timeToMins(t.startTime);
            const e = timeToMins(t.endTime);
            return [s, getEffectiveEnd(s, e)];
        })
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

// Check if task is a sub-task (handles midnight crossing)
function isSubTask(task, allTasks) {
    const tStart = timeToMins(task.startTime);
    const tEnd = getEffectiveEnd(tStart, timeToMins(task.endTime));
    return allTasks.some(other => {
        if (other.id === task.id) return false;
        const oStart = timeToMins(other.startTime);
        const oEnd = getEffectiveEnd(oStart, timeToMins(other.endTime));
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

// Template navigation
function prevTemplate() {
    if (templates.length < 2) return;
    const idx = templates.indexOf(currentTemplate);
    const newIdx = idx <= 0 ? templates.length - 1 : idx - 1;
    switchTemplate(templates[newIdx]);
}

function nextTemplate() {
    if (templates.length < 2) return;
    const idx = templates.indexOf(currentTemplate);
    const newIdx = idx >= templates.length - 1 ? 0 : idx + 1;
    switchTemplate(templates[newIdx]);
}

function switchTemplate(name) {
    currentTemplate = name;
    localStorage.setItem('timetable_current', name);
    document.getElementById('templateName').textContent = name;
    cancelEdit();
    renderTasks();
    hideTemplateMenu();
}

// Template menu
function showTemplateMenu() {
    renderTemplateList();
    document.getElementById('templateMenu').classList.add('visible');
    document.getElementById('templateOverlay').classList.add('visible');
}

function hideTemplateMenu() {
    document.getElementById('templateMenu').classList.remove('visible');
    document.getElementById('templateOverlay').classList.remove('visible');
}

function renderTemplateList() {
    const container = document.getElementById('templateList');
    container.innerHTML = templates.map(name => `
        <div class="template-item ${name === currentTemplate ? 'active' : ''}" onclick="switchTemplate('${escapeJsString(name)}')">
            <span class="template-item-name">${escapeHtml(name)}</span>
            <div class="template-item-actions">
                <button class="template-action-btn" onclick="event.stopPropagation(); renameTemplate('${escapeJsString(name)}')" title="Rename">✎</button>
                <button class="template-action-btn" onclick="event.stopPropagation(); deleteTemplate('${escapeJsString(name)}')" title="Delete">×</button>
            </div>
        </div>
    `).join('');
}

function createTemplate() {
    const input = document.getElementById('newTemplateName');
    const name = input.value.trim();
    if (!name) return;
    if (templates.includes(name)) {
        input.value = '';
        return;
    }
    templates.push(name);
    saveTemplates();
    input.value = '';
    switchTemplate(name);
}

function renameTemplate(oldName) {
    const newName = prompt('Rename schedule:', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;
    if (templates.includes(newName)) return;

    // Update templates list
    const idx = templates.indexOf(oldName);
    templates[idx] = newName;
    saveTemplates();

    // Move data to new key
    const oldKey = getTemplateKey(oldName);
    const newKey = getTemplateKey(newName);
    const data = localStorage.getItem(oldKey);
    if (data) {
        localStorage.setItem(newKey, data);
        localStorage.removeItem(oldKey);
    }

    // Update current if needed
    if (currentTemplate === oldName) {
        switchTemplate(newName);
    } else {
        renderTemplateList();
    }
}

function deleteTemplate(name) {
    if (templates.length <= 1) return;
    if (!confirm(`Delete "${name}"?`)) return;

    // Remove from list
    templates = templates.filter(t => t !== name);
    saveTemplates();

    // Remove data
    localStorage.removeItem(getTemplateKey(name));

    // Switch if current was deleted
    if (currentTemplate === name) {
        switchTemplate(templates[0]);
    } else {
        renderTemplateList();
    }
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
        const task = tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.startTime = startTime;
            task.endTime = endTime;
            task.text = taskText;
            task.color = selectedColor;
        }
        cancelEdit();
    } else {
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

    document.getElementById('startTime').value = task.startTime;
    document.getElementById('endTime').value = task.endTime;
    document.getElementById('taskInput').value = task.text;
    selectColor(task.color);

    document.getElementById('btnText').textContent = 'Update';
    document.getElementById('btnIcon').textContent = '✓';
    document.getElementById('addBtn').classList.add('editing');
    document.querySelector('.cancel-btn').classList.add('visible');
    document.querySelector('.add-card .section-title').textContent = 'Edit Task';

    document.querySelector('.add-card').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('taskInput').focus();
}

// Cancel edit
function cancelEdit() {
    editingTaskId = null;

    document.getElementById('startTime').value = '09:00';
    document.getElementById('endTime').value = '10:00';
    document.getElementById('taskInput').value = '';
    selectColor('coral');

    document.getElementById('btnText').textContent = 'Add';
    document.getElementById('btnIcon').textContent = '+';
    document.getElementById('addBtn').classList.remove('editing');
    document.querySelector('.cancel-btn').classList.remove('visible');
    document.querySelector('.add-card .section-title').textContent = 'Add Task';
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

// Escape HTML for text content
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escape string for JavaScript string literals (single-quoted)
// Used in onclick handlers to prevent XSS
function escapeJsString(str) {
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// Find parent task for a sub-task (handles midnight crossing)
function findParentTask(task, allTasks) {
    const tStart = timeToMins(task.startTime);
    const tEnd = getEffectiveEnd(tStart, timeToMins(task.endTime));

    let parent = null;
    let parentDuration = Infinity;

    for (const other of allTasks) {
        if (other.id === task.id) continue;
        const oStart = timeToMins(other.startTime);
        const oEnd = getEffectiveEnd(oStart, timeToMins(other.endTime));
        const oDuration = oEnd - oStart;

        if (oStart <= tStart && oEnd >= tEnd && !(oStart === tStart && oEnd === tEnd)) {
            if (oDuration < parentDuration) {
                parent = other;
                parentDuration = oDuration;
            }
        }
    }
    return parent;
}

// Sort tasks with sub-tasks under their parents (supports nested levels)
function sortTasksWithHierarchy(tasks) {
    // Build parent-child map
    const childrenOf = {};
    const topLevel = [];

    for (const task of tasks) {
        const parent = findParentTask(task, tasks);
        if (parent) {
            if (!childrenOf[parent.id]) {
                childrenOf[parent.id] = [];
            }
            childrenOf[parent.id].push(task);
        } else {
            topLevel.push(task);
        }
    }

    // Sort top level by start time
    topLevel.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Recursively add task and its children with nesting level
    function addWithChildren(task, result, level) {
        result.push({ task, level });
        const children = childrenOf[task.id] || [];
        children.sort((a, b) => a.startTime.localeCompare(b.startTime));
        for (const child of children) {
            addWithChildren(child, result, level + 1);
        }
    }

    const result = [];
    for (const task of topLevel) {
        addWithChildren(task, result, 0);
    }

    return result;
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
        renderStats();
        return;
    }

    const sortedTasks = sortTasksWithHierarchy(tasks);

    let html = '';
    let lastParentEndTime = null;

    for (let i = 0; i < sortedTasks.length; i++) {
        const { task, level } = sortedTasks[i];
        const duration = calcDuration(task.startTime, task.endTime);
        const isSub = level > 0;
        const color = colors[task.color] || colors.coral;
        const indent = level * 24;

        // Check for gap with previous parent task
        // Note: If previous task crossed midnight, lastParentEndTime > 1440
        // In that case, no gap is shown since we're in "next day" territory
        if (!isSub && lastParentEndTime !== null && lastParentEndTime <= 1440) {
            const gapMins = timeToMins(task.startTime) - lastParentEndTime;
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

        if (!isSub) {
            const taskStart = timeToMins(task.startTime);
            const taskEnd = timeToMins(task.endTime);
            lastParentEndTime = getEffectiveEnd(taskStart, taskEnd);
        }

        html += `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isSub ? 'sub-task' : ''}" style="animation-delay: ${i * 0.05}s; margin-left: ${indent}px;">
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
    // Show remaining free time until midnight after last parent task
    // Don't show if task crossed midnight (lastParentEndTime > 1440)
    if (lastParentEndTime !== null && lastParentEndTime < 1440) {
        const remainingMins = 1440 - lastParentEndTime; // 1440 = 24 * 60 = midnight
        if (remainingMins > 0) {
            html += `
                <div class="task-gap">
                    <span class="gap-line"></span>
                    <span class="gap-label">${formatDuration(remainingMins / 60)} free</span>
                    <span class="gap-line"></span>
                </div>
            `;
        }
    } else if (lastParentEndTime !== null && lastParentEndTime > 1440) {
        // Task crossed midnight - show how far into next day
        const nextDayMins = lastParentEndTime - 1440;
        html += `
            <div class="task-gap">
                <span class="gap-line"></span>
                <span class="gap-label">ends ${formatTime(String(Math.floor(nextDayMins / 60)).padStart(2, '0') + ':' + String(nextDayMins % 60).padStart(2, '0'))} next day</span>
                <span class="gap-line"></span>
            </div>
        `;
    }

    container.innerHTML = html;

    updateHoursLeft();
    renderStats();
}

// Statistics functions
function toggleStats() {
    document.querySelector('.stats-section').classList.toggle('collapsed');
}

function getAllTasks() {
    const allTasks = [];
    for (const name of templates) {
        const key = getTemplateKey(name);
        try {
            const tasks = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(tasks)) {
                allTasks.push(...tasks);
            }
        } catch (e) {
            // Skip invalid data
        }
    }
    return allTasks;
}

function renderStats() {
    const container = document.getElementById('statsContainer');
    const tasks = loadData(); // Only current template

    if (tasks.length === 0) {
        container.innerHTML = '<div class="stats-empty">No tasks to analyze</div>';
        return;
    }

    // Group by task text (case-insensitive)
    const stats = {};
    for (const task of tasks) {
        const name = task.text.toLowerCase().trim();
        if (!stats[name]) {
            stats[name] = {
                displayName: task.text,
                count: 0,
                totalMins: 0
            };
        }
        stats[name].count++;
        const duration = calcDuration(task.startTime, task.endTime);
        stats[name].totalMins += duration * 60;
    }

    // Sort by total time descending
    const sorted = Object.values(stats).sort((a, b) => b.totalMins - a.totalMins);

    container.innerHTML = sorted.map(stat => `
        <div class="stat-item">
            <div class="stat-info">
                <span class="stat-name">${escapeHtml(stat.displayName)}</span>
                <span class="stat-count">${stat.count} ${stat.count === 1 ? 'task' : 'tasks'}</span>
            </div>
            <span class="stat-time">${formatDuration(stat.totalMins / 60)}</span>
        </div>
    `).join('');
}

// Export all data to JSON file
function exportData() {
    const allData = {
        templates: templates,
        current: currentTemplate,
        schedules: {}
    };

    for (const name of templates) {
        const key = getTemplateKey(name);
        try {
            const tasks = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(tasks)) {
                allData.schedules[name] = tasks;
            }
        } catch (e) {
            // Skip invalid data
        }
    }

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable-backup-${new Date().toISOString().split('T')[0]}.json`;
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

            if (data.templates && data.schedules) {
                templates = data.templates;
                saveTemplates();

                for (const [name, tasks] of Object.entries(data.schedules)) {
                    if (Array.isArray(tasks)) {
                        localStorage.setItem(getTemplateKey(name), JSON.stringify(tasks));
                    }
                }

                if (data.current && templates.includes(data.current)) {
                    switchTemplate(data.current);
                } else if (templates.length > 0) {
                    switchTemplate(templates[0]);
                }
            }
        } catch (err) {
            // Invalid file
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load templates
    templates = loadTemplates();

    // Create default template if none exist
    if (templates.length === 0) {
        templates = ['My Schedule'];
        saveTemplates();
    }

    // Load current template
    currentTemplate = localStorage.getItem('timetable_current') || templates[0];
    if (!templates.includes(currentTemplate)) {
        currentTemplate = templates[0];
    }

    document.getElementById('templateName').textContent = currentTemplate;

    document.getElementById('taskInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') saveTask();
        if (e.key === 'Escape') cancelEdit();
    });

    document.getElementById('newTemplateName').addEventListener('keydown', e => {
        if (e.key === 'Enter') createTemplate();
    });

    renderTasks();
});
