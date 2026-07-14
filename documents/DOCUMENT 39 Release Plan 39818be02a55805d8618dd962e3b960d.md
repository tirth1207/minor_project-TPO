# DOCUMENT 39: Release Plan

| Phase | Branch | Environment | Trigger | Audience |
| --- | --- | --- | --- | --- |
| **Development** | `feature/*` | Localhost | Dev commit | Developer only |
| **Staging/QA** | `develop` | Vercel Preview (`preview-xxx.vercel.app`) | PR to `develop` | Internal team & college TPO |
| **Production** | `main` | Vercel Production (`app.com`) | PR to `main` (requires 1 approval) | All users |

*Note: We strictly avoid feature flags for V1 to keep the codebase simple for junior devs. Features are hidden via Role-Based Routing, not complex feature flag services.*