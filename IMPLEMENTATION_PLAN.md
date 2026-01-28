# Vipro Time - Implementation Plan

## Overview

This document outlines the plan to:
1. Restructure codebase with SRP (Single Responsibility Principle)
2. Add tab-based navigation (Timetable / Todo)
3. Implement Todo feature with time tracking

---

## Phase 1: Code Restructuring

### Current State
```
/
├── index.html      (183 lines)
├── app.js          (961 lines)  ← All logic in one file
├── styles.css      (1,305 lines)
```

### Target State
```
/
├── index.html
├── styles.css
├── js/
│   ├── app.js          # Init, routing, global state
│   ├── storage.js      # localStorage + Supabase sync
│   ├── utils.js        # Shared helpers (escapeHtml, time formatting)
│   ├── timetable.js    # Timetable feature (existing)
│   └── todo.js         # Todo feature (new)
```

### Tasks

- [ ] **1.1** Create `/js` folder
- [ ] **1.2** Extract `storage.js` - localStorage read/write, Supabase sync functions
- [ ] **1.3** Extract `utils.js` - escapeHtml, escapeJsString, timeToMins, formatTime, formatDuration
- [ ] **1.4** Extract `timetable.js` - all timetable rendering and logic
- [ ] **1.5** Create `app.js` - init, tab routing, shared state
- [ ] **1.6** Update `index.html` script imports (load order matters)
- [ ] **1.7** Test all existing features still work

---

## Phase 2: Tab Navigation UI

### Design

```
┌──────────────────────────────────┐
│  [☰]     Vipro Time       [5h]  │
├──────────────────────────────────┤
│  ┌─────────────┬─────────────┐   │
│  │  Timetable  │    Todo     │   │  ← Tab buttons
│  └─────────────┴─────────────┘   │
├──────────────────────────────────┤
│                                  │
│     (active tab content)         │
│                                  │
└──────────────────────────────────┘
```

### Tasks

- [ ] **2.1** Add tab navigation HTML structure
- [ ] **2.2** Add tab CSS styles (active/inactive states)
- [ ] **2.3** Implement `switchTab(tabName)` function in app.js
- [ ] **2.4** Wrap timetable content in `<div id="timetable-tab">`
- [ ] **2.5** Create `<div id="todo-tab">` container (hidden by default)
- [ ] **2.6** Persist active tab in localStorage

---

## Phase 3: Todo Feature

### Data Model

```javascript
// localStorage key: 'vipro_todos'
{
  todos: [
    {
      id: 1706447200000,       // Timestamp ID
      text: "Review PR",       // Task description
      completed: false,        // Checkbox state
      priority: "medium",      // "high" | "medium" | "low"
      dueDate: "2024-01-28",   // Optional, ISO date string
      createdAt: "2024-01-27T10:00:00Z",
      completedAt: null        // Timestamp when completed
    }
  ]
}
```

### UI Components

```
┌──────────────────────────────────┐
│  + Add Todo                      │  ← Input section
│  ┌────────────────────────────┐  │
│  │ Task description...        │  │
│  └────────────────────────────┘  │
│  [High] [Med] [Low]    [+ Add]   │  ← Priority + button
├──────────────────────────────────┤
│  ☐ Review PR              [!]    │  ← High priority marker
│  ☐ Write tests                   │
│  ☑ Fix login bug     ✓ done      │  ← Completed (strikethrough)
├──────────────────────────────────┤
│  Completed: 1/3                  │  ← Progress summary
└──────────────────────────────────┘
```

### Tasks

- [ ] **3.1** Create todo HTML structure in index.html
- [ ] **3.2** Add todo CSS styles (checkbox, priority colors, completed state)
- [ ] **3.3** Implement `todo.js` with:
  - [ ] `loadTodos()` - Load from localStorage
  - [ ] `saveTodos()` - Save to localStorage + trigger sync
  - [ ] `renderTodos()` - Render todo list
  - [ ] `addTodo(text, priority)` - Add new todo
  - [ ] `toggleTodo(id)` - Toggle completion
  - [ ] `deleteTodo(id)` - Remove todo
  - [ ] `editTodo(id)` - Edit todo text
- [ ] **3.4** Add keyboard shortcut (Enter to add)
- [ ] **3.5** Add drag-to-reorder (optional, can defer)
- [ ] **3.6** Integrate with Supabase sync

---

## Phase 4: Time Tracking

### Data Model

```javascript
// Stored within each todo item
{
  id: 1706447200000,
  text: "Review PR",
  // ... other fields
  timeTracking: {
    isRunning: false,
    totalMs: 3600000,          // Total tracked time in ms
    sessions: [
      { start: "2024-01-27T10:00:00Z", end: "2024-01-27T11:00:00Z" }
    ],
    currentSessionStart: null  // Set when timer is running
  }
}
```

### UI Components

```
┌──────────────────────────────────┐
│  ☐ Review PR                     │
│     ⏱ 1h 30m    [▶ Start]       │  ← Time tracked + start button
├──────────────────────────────────┤
│  ☐ Write tests                   │
│     ⏱ 0m        [▶ Start]       │
├──────────────────────────────────┤
│  ☐ Debug API     ⏱ TRACKING     │  ← Currently tracking
│     ⏱ 0h 45m    [⏹ Stop]        │  ← Live updating timer
└──────────────────────────────────┘
```

### Tasks

- [ ] **4.1** Add time tracking UI elements to todo items
- [ ] **4.2** Implement timer functions:
  - [ ] `startTracking(todoId)` - Start timer
  - [ ] `stopTracking(todoId)` - Stop timer, save session
  - [ ] `getTrackedTime(todoId)` - Calculate total time
  - [ ] `formatTrackedTime(ms)` - Display as "1h 30m"
- [ ] **4.3** Add live timer update (setInterval when tracking)
- [ ] **4.4** Only allow one active timer at a time
- [ ] **4.5** Persist running timer state (survive page refresh)
- [ ] **4.6** Add daily/weekly time summary view (optional)

---

## Phase 5: Supabase Schema Update

### New Table: `todos`

```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  todo_id BIGINT NOT NULL,           -- Client-side timestamp ID
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_tracking JSONB,               -- Sessions and total time
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, todo_id)
);
```

### Tasks

- [ ] **5.1** Create `todos` table in Supabase
- [ ] **5.2** Add RLS policies (user can only access own todos)
- [ ] **5.3** Update `storage.js` to sync todos
- [ ] **5.4** Handle merge conflicts (cloud wins or last-write wins)

---

## Implementation Order

```
Week 1: Phase 1 (Restructure) + Phase 2 (Tabs)
        ↓
Week 2: Phase 3 (Todo Feature)
        ↓
Week 3: Phase 4 (Time Tracking)
        ↓
Week 4: Phase 5 (Cloud Sync) + Testing
```

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `js/utils.js` | Create | Shared helper functions |
| `js/storage.js` | Create | localStorage + Supabase |
| `js/timetable.js` | Create | Extracted timetable logic |
| `js/todo.js` | Create | New todo feature |
| `js/app.js` | Create | Init + routing |
| `app.js` | Delete | Replaced by js/ modules |
| `index.html` | Modify | Add tabs, todo section, new script imports |
| `styles.css` | Modify | Add tab styles, todo styles |

---

## Risk & Considerations

| Risk | Mitigation |
|------|------------|
| Breaking existing features | Test thoroughly after Phase 1 |
| Script load order | Use `defer` attribute, load utils first |
| Timer accuracy | Use timestamps, not setInterval counting |
| Offline support | Queue sync operations, retry on reconnect |
| Large todo lists | Consider pagination if > 100 items |

---

## Success Criteria

- [ ] All existing timetable features work unchanged
- [ ] Tab navigation switches views smoothly
- [ ] Can add, edit, complete, delete todos
- [ ] Time tracking starts/stops correctly
- [ ] Timer survives page refresh
- [ ] Data syncs to Supabase when logged in
- [ ] Works fully offline (localStorage fallback)

---

## Future Enhancements (Out of Scope)

- Recurring todos
- Due date reminders/notifications
- Todo categories/tags
- Drag-drop reordering
- Weekly time tracking reports
- Dark mode
- Mobile app (PWA)
