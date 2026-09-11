<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Guidelines

This is a Next.js App Router social-media application written in JavaScript.

The backend API is complete and tested. Frontend development should build on the existing API rather than redesigning it.

## Core Rule

Keep everything simple, explicit, readable, and consistent with the existing project.

Do not overengineer.

If two approaches solve the same problem, use the simpler one unless the more complex approach has a clear immediate benefit.

## Code Style

- Use JavaScript only. Do not introduce TypeScript.
- Follow existing project patterns and naming.
- Prefer simple, explicit code over clever abstractions.
- Make the smallest clean change necessary.
- Do not refactor unrelated working code.
- Do not create unnecessary helpers, wrappers, hooks, providers, services, factories, or abstraction layers.
- Avoid premature optimization.
- Do not add dependencies unless genuinely necessary.
- Inspect `package.json` before considering a new dependency.

## Next.js / React

Use the normal Next.js App Router approach.

- Prefer Server Components where appropriate.
- Use Client Components only when client-side interaction is required.
- Keep components readable and reasonably sized.
- Do not split simple components into many tiny components/files.
- Use normal React state and props.
- Keep state local by default.
- Use `useState` / `useEffect` when appropriate.
- Do not introduce Redux, Zustand, or another global state system unless explicitly requested.
- Do not add complex caching, memoization, providers, reducers, or optimistic-update systems without a demonstrated need.

## Frontend / Backend Boundary

The existing `/api/...` routes are the single interface between the frontend and backend.

ALL frontend data access must go through these API routes.

This includes Server Components.

Do not directly access MongoDB from frontend code.

Do not import backend implementation details into frontend pages or components, including:

- Mongoose models
- database helpers
- `lib/backend` helpers
- backend authentication helpers

The intended flow is:

Frontend page/component
→ `lib/frontend`
→ `/api/...`
→ backend
→ MongoDB

Do not bypass this flow simply because a component runs on the server.

## Frontend API Functions

Put reusable frontend API-call functions in:

`lib/frontend/`

Organize them simply by feature when needed, for example:

- `lib/frontend/auth.js`
- `lib/frontend/posts.js`
- `lib/frontend/profiles.js`
- `lib/frontend/comments.js`

Use explicit functions such as:

- `login()`
- `register()`
- `getFeed()`
- `getPost(id)`
- `getProfile(id)`
- `getMyProfile()`
- `likePost(id)`
- `followProfile(id)`

Do not build a large generic API client or request framework.

Both Server Components and Client Components should use these frontend API functions where appropriate.

Inspect the actual API route and its response format before implementing a frontend API function. Do not guess API behavior.

## Backend

The backend is already complete and has passed its full API regression tests.

Do not modify backend routes just to make frontend implementation easier.

If the existing API genuinely cannot support a required frontend feature, explain the missing capability before changing backend code.

Do not silently change existing API contracts.

## UI

Keep the GUI simple, clean, modern, responsive, and restrained.

Prioritize usability over decoration.

Avoid:

- excessive animations
- unnecessary gradients/effects
- excessive containers
- cards inside cards
- complicated design systems
- unnecessary modals
- unnecessary menus
- visual clutter

Do not invent features that were not requested.

Build the simplest usable version first.

## Data and Interaction

Keep API usage straightforward.

Handle:

- loading
- errors
- empty states
- successful operations

in a simple and understandable way.

Do not introduce complex frontend infrastructure just to handle basic API requests.

## Before Implementing

Before changing a feature:

1. Inspect the relevant existing files.
2. Inspect the relevant `/api` routes.
3. Understand their request and response formats.
4. Check existing project patterns.
5. Reuse those patterns where sensible.
6. Implement the smallest clean solution.

Never guess an API response shape when the implementation exists in the repository.

## Scope

Only implement what was requested.

Do not use a task as an opportunity to introduce a new architecture or refactor unrelated code.

Do not silently add features such as notifications, themes, analytics, infinite scrolling, elaborate animations, or other functionality that was not requested.

## After Changes

When finished, briefly state:

- files added
- files changed
- what was implemented
- what should be manually tested

Keep the explanation concise unless more detail is requested.