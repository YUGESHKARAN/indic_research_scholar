# Code Standards

## General

- Keep modules small and single-purpose
- Fix root causes, do not layer workarounds
- Do not mix unrelated concerns in one
  component or route

## JavaScript

- Follow Existing Architecture and Coding Conventions
- Write Modular, Readable and Maintainable Code
- Enforce Security and Robust Input Validation
- Preserve Existing Functionality and Minimize Changes
- Verify Every Change Before Completion

## Reactjs-vite

- Component Architecture and Code Reusability
- Correct React State Management and Rendering
- Performance, Responsive UI, and User Experience
- API Integration, Security, and Error Handling
- Testing, Build Verification, and Minimal Changes

## Styling

- Follow Existing Design System and Tailwind Conventions
- Build Reusable, Maintainable UI Components
- Enforce Responsive Design and Accessibility
- Maintain Consistent Visual States and UI Polish
- Validate Styling and Prevent Regressions

## API Routes

- Centralize Axios Configuration and API Clients
- Keep API Routes and Request Logic Separate from UI Components
- Handle Authentication and Interceptors Securely
- Implement Reliable Loading, Error, and Request Handling
- Verify API Contracts and Protect Existing Functionality

## Data and Storage

- User data belongs in the MongoDB database
- Uploaded document vectors and its metadata belongs to pinecone vectorDB
- For Q&A chat conversation history currently stores in localStorage, 
  should be replaced to dedicated databse in future

## File Organization

- `./indic_research_assistant_frontend/` — all the frontend files belong to this folder.
- `./indic_research_assistant_backend/` — both nodejs and flask backned belongs to this folder 
- `./indic_research_assistant_backend/nodejs_service` — primary service where all the users routes, services and controllers 
  belongs to this folder.
- `./indic_research_assistant_backend/flask_service` - all the AI services, controlles and workflows belongs to this folder.
