# DOCUMENT 28: DevOps Pipeline

```json
# .github/workflows/ci.yml (Conceptual)
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint      # ESLint + Prettier check
      - run: npm run type-check # tsc --noEmit
      - run: npm run test       # Vitest unit tests
      # Vercel handles actual deployment automatically via GitHub Integration
```