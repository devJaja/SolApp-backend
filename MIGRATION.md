# Repository Structure Guide

This document explains the current repository structure with separated mobile and backend/landing apps.

## Current Structure

### Monorepo (solcial_app)
```
solcial_app/                # Backend & Landing monorepo
├── .git/                   # Git repository
├── apps/
│   ├── backend/           # Backend API (NestJS)
│   └── landing/           # Landing page (Next.js)
├── packages/              # Shared packages (future)
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # Workspace configuration
└── README.md
```

### Mobile App (solcial)
```
solcial/                    # Mobile app (separate repo)
├── .git/                   # Separate git repository
├── app/                    # Expo Router app
├── components/            # React Native components
├── hooks/                 # Custom hooks
├── lib/                   # Utilities & API
├── store/                 # Zustand stores
├── package.json           # Mobile app package.json
└── README.md
```

## Why Separated?

1. **Different Release Cycles**: Mobile app updates independently from backend/landing
2. **Different Tech Stacks**: React Native vs NestJS/Next.js
3. **Separate Deployments**: Mobile via EAS, Backend via Render, Landing via Vercel
4. **Team Autonomy**: Mobile team can work independently
5. **Reduced Complexity**: Smaller, focused repositories

## Working with Both Repos

### Backend & Landing (solcial_app)

```bash
# Install all dependencies
pnpm install

# Run backend
pnpm backend

# Run landing page
pnpm landing

# Add dependency to backend
pnpm --filter backend add <package>

# Add dependency to landing
pnpm --filter landing add <package>
```

### Mobile App (solcial)

```bash
# Install dependencies
pnpm install

# Run on Android
pnpm android

# Run on iOS
pnpm ios

# Run on web
pnpm web

# Add dependency
pnpm add <package>
```

## Git Workflow

### Backend & Landing
```bash
cd solcial_app
git checkout -b feature/my-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

### Mobile App
```bash
cd solcial
git checkout -b feature/my-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

## Deployment

### Backend
- Hosted on Render
- Deploy from `solcial_app` repository
- Environment: `apps/backend`

### Landing Page
- Hosted on Vercel
- Deploy from `solcial_app` repository
- Environment: `apps/landing`

### Mobile App
- Built with EAS
- Deploy from `solcial` repository
- Platforms: iOS (App Store), Android (Google Play)

## API Communication

Mobile app communicates with backend via REST API:
- Backend URL: Set in `EXPO_PUBLIC_API_URL` environment variable
- Default: `https://api.solcial.app` (production)

## Shared Resources

### Types & Interfaces
- Backend types: `solcial_app/apps/backend/src/types/`
- Mobile types: `solcial/types/`
- Consider creating a shared types package in the future

### Documentation
- Backend API docs: `solcial_app/apps/backend/README.md`
- Mobile setup: `solcial/README.md`
- Landing page: `solcial_app/apps/landing/README.md`

## Next Steps

1. Set up CI/CD for both repositories
2. Configure environment variables for each deployment
3. Set up monitoring and error tracking
4. Create shared types package (optional)
5. Document API contracts between mobile and backend

## Questions?

See respective `README.md` files or `CONTRIBUTING.md` for development guidelines.

