# Frontend Testing Guide

This document describes the frontend test architecture used in this codebase, including the design decisions behind E2E and component testing separation, the fixture system, and setup/teardown strategies. It is intended as a **transfer document** for onboarding or handover purposes.

### Contents

1. Test Organization
1.1. E2E Tests (for the app directory)
- Sequential on 1 worker
1.2. Component Tests (for the component directory)
- Run in parallel
1.3. Root playwright config under the ui directory
1.4. shared test utils
2. Writing tests
2.1. General
- please read the https://playwright.dev/docs/best-practices
- TL;DR
  - use the playwright UI feature including its own codegen builtin under the locator tab
  - avoid xpath and css selectors
  - isolate tests, so you can rerun them without relying on external factors such as other tests
  - Use web first assertsion
  - Use the test report, traces and debugger
  - Enable multiple browsers (see playwright UI checkboxes)
  - Reuse locators and actions through test fixtures
2.2. Component tests
2.3. E2E tests

---

## 📦 Test Organization

The test suite is split across two major fronts:

### 1. **E2E Tests**
- **Target:** The `manager` app.
- **Worker Scope:** Single worker (to allow shared global state and improved performance).
- **Fixtures:** Shared Manager fixture (`scope: 'worker'`) is used for initializing global resources like realm creation, auth sessions, etc.

### 2. **Component Tests**
- **Target:** UI packages (each component is a standalone NPM package).
- **Runner App:** A dedicated app called `playwright` (used for component mounting).
- **Testing Strategy:** Based on Playwright’s experimental component testing API, but adapted to Webpack using a custom plugin.

---

## ⚙️ Project Configuration

We use Playwright projects to separate test execution logic:

```ts
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'e2e',
      testMatch: /.*\.e2e\.spec\.ts/,
      workers: 1, // One worker to allow shared Manager setup
    },
    {
      name: 'component',
      testMatch: /.*\.component\.spec\.ts/,
      // Parallel execution allowed
    },
  ],
});
