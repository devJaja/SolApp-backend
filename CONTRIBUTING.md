# Contributing to Solcial

Thank you for your interest in contributing to Solcial! This document provides guidelines and instructions for contributing.

## 🏗️ Monorepo Structure

This is a monorepo managed with pnpm workspaces:

```
solcial/
├── apps/
│   ├── mobile/          # React Native mobile app
│   └── backend/         # NestJS backend API
├── packages/            # Shared packages (future)
└── ...
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- MongoDB
- Git

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd solcial
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Mobile app
cp apps/mobile/.env.example apps/mobile/.env

# Backend
cp apps/backend/.env.example apps/backend/.env
```

4. Start development:
```bash
# Terminal 1 - Backend
pnpm backend

# Terminal 2 - Mobile
pnpm mobile
```

## 📝 Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

Example: `feature/add-video-posts`

### Commit Messages

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `test:` - Tests
- `chore:` - Maintenance

Example: `feat(mobile): add video post support`

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests if applicable
4. Update documentation
5. Submit a pull request
6. Wait for review and address feedback

## 🧪 Testing

```bash
# Backend tests
cd apps/backend
pnpm test

# Mobile tests (if available)
cd apps/mobile
pnpm test
```

## 📦 Adding Dependencies

```bash
# Add to mobile app
pnpm --filter mobile add <package>

# Add to backend
pnpm --filter backend add <package>

# Add to root (dev dependencies)
pnpm add -D -w <package>
```

## 🎨 Code Style

- Use TypeScript
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful variable names
- Add comments for complex logic

## 🐛 Reporting Bugs

1. Check if the bug already exists in Issues
2. Create a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details

## 💡 Feature Requests

1. Check if the feature is already requested
2. Create a new issue with:
   - Clear description
   - Use case
   - Proposed solution (optional)

## 📄 License

By contributing, you agree that your contributions will be licensed under the Solcial Proprietary License.

### Contribution License Agreement

When you submit a contribution, you:
- Grant the project maintainers a perpetual, worldwide, non-exclusive, royalty-free license to use your contribution
- Confirm that your contribution is your original work
- Confirm that you have the right to grant these licenses
- Agree that your contribution does not violate any third-party rights

### Important Notes

- This project is **not open source** - it uses a proprietary license
- The source code is available for viewing and contributing only
- You cannot use this code for your own projects or commercial purposes
- Forks should only be created for the purpose of submitting contributions

For commercial licensing inquiries, contact: team@solcial.app

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## 📞 Questions?

Feel free to open a discussion or reach out to the maintainers.

Thank you for contributing! 🎉
