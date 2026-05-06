# Contributing to @isdk/proxy

First off, thank you for considering contributing to `@isdk/proxy`! It's people like you who make the open-source community such an amazing place to learn, inspire, and create.

This project aims to provide a **framework-agnostic, high-performance hybrid caching engine**. We value simplicity (**KISS** principle) and technical excellence.

---

## 🛠 Development Setup

### Prerequisites

- **Node.js**: >= 20.11.1
- **pnpm**: Latest version recommended

### Steps

1. **Clone the repository**:

   ```bash
   git clone https://github.com/isdk/proxy.js.git
   cd proxy
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Run tests**:

   ```bash
   pnpm test
   ```

4. **Build the project**:

   ```bash
   pnpm run build
   ```

---

## 🏗 Architecture Overview

Before making changes, it's helpful to understand the core components:

- **`src/core/SmartCache.ts`**: The hybrid storage engine. It manages L1 (Memory) and L2 (Disk) caching. It ensures that metadata is always resident in memory for fast policy evaluation.
- **`src/core/fetchWithCache.ts`**: The central orchestrator. It handles the cache lifecycle, request collapsing (preventing cache stampede), SWR (Stale-While-Revalidate), and error fallbacks.
- **`src/core/generateCacheKey.ts`**: Computes deterministic fingerprints based on request properties and site-specific configurations.

---

## 🧪 Testing Standards

We use **Vitest** for testing and follow the **"test-near-code"** pattern.

- **Location**: Test files (`*.spec.ts`) should be placed in the same directory as the source code they test (e.g., `src/core/SmartCache.spec.ts`).
- **Requirements**:
  - Every new feature must include comprehensive unit tests.
  - Bug fixes must include a regression test.
  - Avoid physical IO competition in tests. Use unique temporary directories (via `os.tmpdir()`) for storage tests.
  - Ensure all tests pass before submitting a Pull Request.

---

## 📝 Coding Guidelines

- **TypeScript**: We use strict TypeScript. Avoid `any` where possible.
- **TSDoc**: All public APIs, interfaces, and complex internal functions **must** have detailed TSDoc comments (preferably in both Chinese and English for this project).
- **KISS**: We prefer simple, readable code over clever but complex abstractions.
- **Framework Agnostic**: Core logic must only depend on Web standard APIs (Request, Response, etc.) and should not be coupled with any specific HTTP library or framework.

---

## 🚀 Pull Request Process

1. **Create a branch**: Use a descriptive name like `feat/awesome-feature` or `fix/issue-description`.
2. **Atomic Commits**: Keep your commits focused and descriptive.
3. **Update Documentation**: If you change an API or add a feature, update the `README.md`, `README.cn.md`, and relevant TSDoc.
4. **Run Quality Checks**:

   ```bash
   pnpm run lint
   pnpm test
   ```

5. **Submit**: Open a PR against the `main` branch. Provide a clear description of the problem solved or the feature added.

---

## 🐞 Reporting Bugs

- Use the GitHub Issue tracker.
- Describe the expected vs. actual behavior.
- Provide a minimal reproduction script or steps.

Thank you for your contribution!
