// ========================================
// APP - Main initialization and routing
// ========================================

// Current active tab
let activeTab = 'timetable';

// Tab switching
function switchTab(tabName) {
    activeTab = tabName;
    localStorage.setItem('vipro_active_tab', tabName);

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.getElementById('timetable-tab').classList.toggle('hidden', tabName !== 'timetable');
    document.getElementById('todo-tab').classList.toggle('hidden', tabName !== 'todo');

    // Render active tab content
    if (tabName === 'timetable') {
        renderTasks();
    } else if (tabName === 'todo') {
        renderTodos();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    initSupabase();

    // Initialize timetable
    initTimetable();

    // Initialize todos
    initTodos();

    // Restore active tab
    const savedTab = localStorage.getItem('vipro_active_tab') || 'timetable';
    switchTab(savedTab);
});
