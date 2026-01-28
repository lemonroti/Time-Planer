// ========================================
// STORAGE - localStorage + Supabase sync
// ========================================

// Supabase Setup
const SUPABASE_URL = 'https://qwzejtfuvgrnzobvvpne.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EWnDMnM-lgpBVMzB8dk0Aw_goA23tRu';
let supabaseClient = null;
let currentUser = null;

// Initialize Supabase
function initSupabase() {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        supabaseClient.auth.onAuthStateChange((event, session) => {
            currentUser = session?.user || null;
            updateAuthUI();
            if (currentUser) {
                syncFromCloud();
            }
        });
        // Check current session
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            currentUser = session?.user || null;
            updateAuthUI();
            if (currentUser) {
                syncFromCloud();
            }
        });
    }
}

// Auth UI functions
function toggleAuthModal() {
    const modal = document.getElementById('authModal');
    const overlay = document.getElementById('authOverlay');
    modal.classList.toggle('visible');
    overlay.classList.toggle('visible');
}

function hideAuthModal() {
    document.getElementById('authModal').classList.remove('visible');
    document.getElementById('authOverlay').classList.remove('visible');
}

function updateAuthUI() {
    const loggedOut = document.getElementById('authLoggedOut');
    const loggedIn = document.getElementById('authLoggedIn');
    const authUser = document.getElementById('authUser');
    const syncDot = document.getElementById('syncDot');
    const syncIndicator = document.getElementById('syncIndicator');
    const syncText = document.getElementById('syncText');
    const menuAuthText = document.getElementById('menuAuthText');
    const menuSignOut = document.getElementById('menuSignOut');

    if (currentUser) {
        loggedOut.style.display = 'none';
        loggedIn.style.display = 'block';
        authUser.textContent = currentUser.email;
        syncDot.className = 'sync-dot synced';
        syncIndicator.className = 'sync-indicator synced';
        syncText.textContent = currentUser.email;
        menuAuthText.textContent = 'Sync Now';
        menuSignOut.style.display = 'flex';
    } else {
        loggedOut.style.display = 'block';
        loggedIn.style.display = 'none';
        syncDot.className = 'sync-dot';
        syncIndicator.className = 'sync-indicator';
        syncText.textContent = 'Not signed in';
        menuAuthText.textContent = 'Sign in to sync';
        menuSignOut.style.display = 'none';
    }
}

function handleMenuAuth() {
    if (currentUser) {
        syncNow();
        toggleMenu();
    } else {
        toggleMenu();
        toggleAuthModal();
    }
}

function showAuthError(msg) {
    let errEl = document.querySelector('.auth-error');
    if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'auth-error';
        document.getElementById('authBody').appendChild(errEl);
    }
    errEl.textContent = msg;
    setTimeout(() => errEl.remove(), 3000);
}

async function signInWithEmail() {
    if (!supabaseClient) return showAuthError('Supabase not loaded');
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return showAuthError('Enter email and password');

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        showAuthError(error.message);
    } else {
        hideAuthModal();
    }
}

async function signUpWithEmail() {
    if (!supabaseClient) return showAuthError('Supabase not loaded');
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return showAuthError('Enter email and password');
    if (password.length < 6) return showAuthError('Password must be 6+ chars');

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        showAuthError(error.message);
    } else {
        showAuthError('Check your email to confirm!');
    }
}

async function signOut() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    hideAuthModal();
}

// Sync status UI
function setSyncStatus(status) {
    const syncDot = document.getElementById('syncDot');
    const syncIndicator = document.getElementById('syncIndicator');

    if (status === 'syncing') {
        syncDot.className = 'sync-dot syncing';
        syncIndicator.className = 'sync-indicator syncing';
    } else if (status === 'synced') {
        syncDot.className = 'sync-dot synced';
        syncIndicator.className = 'sync-indicator synced';
    } else if (status === 'error') {
        syncDot.className = 'sync-dot error';
        syncIndicator.className = 'sync-indicator error';
    }
}

// Sync to cloud
async function syncToCloud() {
    if (!supabaseClient || !currentUser) return;

    setSyncStatus('syncing');
    try {
        const allData = {
            templates: templates,
            current: currentTemplate,
            schedules: {},
            todos: loadTodosFromStorage()
        };

        for (const name of templates) {
            const key = getTemplateKey(name);
            try {
                const tasks = JSON.parse(localStorage.getItem(key));
                if (Array.isArray(tasks)) {
                    allData.schedules[name] = tasks;
                }
            } catch (e) {}
        }

        const { error } = await supabaseClient
            .from('user_data')
            .upsert({
                user_id: currentUser.id,
                data: allData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;
        setSyncStatus('synced');
    } catch (e) {
        console.error('Sync to cloud failed:', e);
        setSyncStatus('error');
    }
}

// Sync from cloud
async function syncFromCloud() {
    if (!supabaseClient || !currentUser) return;

    setSyncStatus('syncing');
    try {
        const { data, error } = await supabaseClient
            .from('user_data')
            .select('data')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

        if (data?.data) {
            const cloudData = data.data;

            // Merge: cloud wins for now (simple strategy)
            if (cloudData.templates && cloudData.schedules) {
                templates = cloudData.templates;
                saveTemplates();

                for (const [name, tasks] of Object.entries(cloudData.schedules)) {
                    if (Array.isArray(tasks)) {
                        localStorage.setItem(getTemplateKey(name), JSON.stringify(tasks));
                    }
                }

                if (cloudData.current && templates.includes(cloudData.current)) {
                    currentTemplate = cloudData.current;
                    localStorage.setItem('timetable_current', currentTemplate);
                    document.getElementById('templateName').textContent = currentTemplate;
                }

                // Sync todos if present
                if (cloudData.todos && Array.isArray(cloudData.todos)) {
                    saveTodosToStorage(cloudData.todos);
                    if (typeof renderTodos === 'function') {
                        renderTodos();
                    }
                }

                renderTasks();
            }
        } else {
            // No cloud data, push local to cloud
            await syncToCloud();
        }
        setSyncStatus('synced');
    } catch (e) {
        console.error('Sync from cloud failed:', e);
        setSyncStatus('error');
    }
}

async function syncNow() {
    await syncToCloud();
}

// Debounce sync to avoid too many calls
let syncTimeout = null;
function debouncedSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncToCloud();
    }, 1000);
}

// ========================================
// TIMETABLE STORAGE
// ========================================

// Get storage key for template
function getTemplateKey(name) {
    return 'timetable_' + name.toLowerCase().replace(/\s+/g, '_');
}

// Load templates list
function loadTemplates() {
    const data = localStorage.getItem('timetable_templates');
    return data ? JSON.parse(data) : [];
}

// Save templates list
function saveTemplates() {
    localStorage.setItem('timetable_templates', JSON.stringify(templates));
    debouncedSync();
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
    debouncedSync();
}

// ========================================
// TODO STORAGE
// ========================================

const TODOS_STORAGE_KEY = 'vipro_todos';

// Load todos from localStorage
function loadTodosFromStorage() {
    try {
        const data = localStorage.getItem(TODOS_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

// Save todos to localStorage
function saveTodosToStorage(todos) {
    localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
    debouncedSync();
}
