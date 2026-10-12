# Workspace Studio

## Objective

Create a dedicated studio experience where users can perform all primary research tasks from one premium workspace instead of navigating across separate pages.

The Q&A flow is already implemented and should now be migrated into the workspace studio itself, while the studio shell is designed to accommodate future tasks such as:
- Q&A
- Document presentation / formatting
- Mock tests

This workspace should sit as the new primary interaction surface for authenticated users, replacing the ad-hoc page-based flow with a polished, Vercel-inspired product experience.

## Target file

- `./indic_research_assistant_frontend/src/components/workspace.jsx`

## Product Goals

- Provide a premium, research-focused workspace with a floating left navigation rail
- Keep the user inside a single task-oriented environment rather than hopping across standalone screens
- Make Q&A the first fully shipped feature inside the workspace
- Prepare a reusable shell for future tasks without breaking current flows
- Support both desktop and mobile layouts without layout shift or content push effects

## Core UX Pattern

### Desktop
- Sidebar is fixed to the left side of the screen
- Sidebar remains visible and anchored while the main content scrolls independently
- The shell uses a premium dark interface with soft borders, subtle depth, and minimal chrome
- The main application content should not reflow or push due to the sidebar state

### Mobile
- Sidebar opens as a slide-over panel from the left
- It overlays the primary content instead of pushing it to the side
- A backdrop dims the content behind the panel
- The user can close the sidebar with a swipe or close button
- The sidebar should accept an `isOpen` prop and be controlled from the parent layout

## Sidebar Design

The sidebar must feel premium and productized, similar to Vercel's workspace/navigation patterns, but tuned for academic research workflows.

### Sidebar sections
- Workspace label / project name
- Section navigation:
  - Overview
  - Documents
  - Q&A Studio
  - Mock Tests
  - Presentation Builder
  - Settings
- Quick actions:
  - New task
  - Upload document
  - Switch workspace

### Sidebar behavior
- Fixed width desktop rail, roughly 240-280px
- Floating visual treatment with rounded corners and border separation
- Active item states clearly highlight the current task
- Collapsed/expanded states can be supported later, but the initial version should be clean and stable
- The sidebar must not cause layout jump when toggled on mobile

## Main Workspace Layout

The main studio content area should be structured like a premium dashboard:

### Top bar
- Current workspace title
- Search / quick command area
- User profile / avatar menu
- Task status or action buttons

### Content shell
- Title area with contextual header per task
- Card-based panels for tasks, docs, and results
- Smooth spacing system with generous padding and soft dividers
- The right-hand area should feel like a focused work bench, not a landing page

## Q&A Integration

The existing Q&A flow should be moved into the workspace as the primary execution surface.

### Functional expectations
- Q&A should live under the workspace's main task navigation as `Q&A Studio`
- It should use the already implemented document-selection and retrieval logic
- User can select one or more documents from the library
- Prompt input remains available in the main content area
- Response output is displayed in a structured result panel
- Copy-to-clipboard and voice controls remain available
- Language selection and speaker controls remain within the task panel

### Layout inside workspace
- Left side: document library / selected docs panel
- Center: prompt composer and response output
- Optional right side: metadata, document summary, and task controls

This layout is meant to feel like an expert research assistant by giving the user context while they work.

## Future Task Modules

The workspace shell should be built so other features can be dropped in without redesigning the shell.

### Mock tests
- Future challenge area where the user can generate timed MCQ or short-answer assessments
- Should reuse document context and evaluation logic later

### Presentation / formatting
- Future content generation area for slide creation and document transformation
- Should live under the same workspace shell and use the same document selection model

## Design System Expectations

The workspace should follow the premium design conventions already defined in the project context:
- dark mode default
- neutral, polished surfaces
- subtle borders, restrained contrast
- typography-led hierarchy
- minimal but intentional motion
- no playful or cluttered design language

## Interaction Notes

- The sidebar should open and close without pushing the main pane
- Hover states should feel subtle and premium
- Panel cards should preserve visual rhythm and clean spacing
- Layout should be comfortable for long-duration research work
- The task experience should feel like a professional workspace, not a basic portal

## Acceptance Criteria

1. A dedicated workspace studio section exists for authenticated users.
2. Q&A is available inside the workspace as the first shipped task module.
3. The sidebar is fixed/floating on desktop and slides in from the left on mobile.
4. The sidebar does not push the main content area on either desktop or mobile.
5. The layout is premium, Vercel-inspired, and tuned for research workflows.
6. The shell supports additional features such as mock tests and presentation generation without redesign.

## Proposed Route / Flow

- `/workspace` -> main workspace shell
- `/workspace/qa` -> Q&A studio task
- `/workspace/mock-tests` -> future feature
- `/workspace/presentation` -> future feature

## Notes

This is not just a page redesign; it is a product shift from standalone feature pages to a task-first professional workspace. The Q&A feature already exists and should be incorporated into this workspace as the first canonical task, with the shell designed to scale into the rest of the product roadmap.
