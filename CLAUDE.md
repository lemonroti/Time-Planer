# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Time Planner is a static web application for daily task scheduling. It runs entirely in the browser with no build process or server required.

## Running the Application

Open `index.html` directly in a browser. No build step, server, or dependencies needed.

## Architecture

**Static frontend with three files:**
- `index.html` - Single-page structure with inline event handlers
- `app.js` - All application logic (state management, localStorage persistence, DOM rendering)
- `styles.css` - CSS custom properties design system with Swiss-inspired minimal theme

**Data Model:**
- Tasks stored in localStorage with key format `timeplanner_YYYY-MM-DD`
- Each task: `{ id, startTime, endTime, text, color, completed }`
- Colors: coral, sky, mint, sand, slate (defined in both JS `colors` object and CSS variables)

**Key Patterns:**
- `loadData()`/`saveData()` handle all localStorage I/O for current date
- `renderTasks()` rebuilds entire task list on any change
- Sub-tasks are auto-detected when one task's time range fully contains another
- Hours remaining calculated by merging overlapping time intervals (not naive sum)
- All user input escaped via `escapeHtml()` before rendering
