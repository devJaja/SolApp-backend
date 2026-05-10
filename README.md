# Solcial - Social Media on Solana

> ⚠️ **PROPRIETARY SOFTWARE** - This is source-available but NOT open source. 
> You may view and contribute to the code, but you cannot use it for your own projects. 
> See [LICENSE](LICENSE) for details.

A decentralized social media platform built on Solana blockchain with React Native mobile app and NestJS backend.

## 🏗️ Repository Structure

Solcial is organized into two separate repositories:

### Backend & Landing (This Repository)
```
solcial_app/
├── apps/
│   ├── backend/         # NestJS backend API
│   └── landing/         # Next.js landing page
├── packages/            # Shared packages (future)
└── README.md
```

### Mobile App (Separate Repository)
```
solcial/
├── app/                 # Expo Router app
├── components/          # React Native components
├── hooks/              # Custom hooks
├── lib/                # Utilities & API
├── store/              # Zustand stores
└── README.md
```

## 📱 Apps

### Mobile App (solcial)
- **Tech Stack**: React Native, Expo, TypeScript
- **Features**: Social feed, wallet, mini apps, messaging
- **Repository**: [solcial](../solcial)
- **Deployment**: EAS (iOS App Store, Google Play)

### Backend API (solcial_app/apps/backend)
- **Tech Stack**: NestJS, MongoDB, Solana Web3.js
- **Features**: User management, posts, wallet, mini apps
- **Deployment**: Render
- **API Docs**: See `apps/backend/README.md`

### Landing Page (solcial_app/apps/landing)
- **Tech Stack**: Next.js 14, TypeScript, Tailwind CSS
- **Features**: Product showcase, waitlist signup
- **Deployment**: Vercel
- **URL**: https://solcial.app

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- MongoDB
- Solana CLI (for devnet)

### Installation (Backend & Landing)

```bash
# Install dependencies for all apps
pnpm install

# Or install individually
cd apps/backend && pnpm install
cd apps/landing && pnpm install
```

### Development (Backend & Landing)

```bash
# Run backend
pnpm backend

# Run landing page
pnpm landing
```

### Mobile App Setup

See the [solcial](../solcial) repository for mobile app setup and development.

## 🎮 Features

- **Social Feed**: Create posts, like, comment, and share
- **Wallet**: Manage SOL and tokens
- **Mini Apps**: 
  - Token Swap
  - Food Delivery
  - Dice Game
  - Coin Flip
  - Lucky Spin
  - Daily Airdrop
- **Messaging**: Real-time chat
- **Profile**: User profiles with followers

## 🔧 Tech Stack

- **Mobile**: React Native, Expo, TypeScript, TailwindCSS (NativeWind)
- **Backend**: NestJS, MongoDB, Mongoose
- **Landing**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Blockchain**: Solana Web3.js, Jupiter Aggregator
- **Push Notifications**: Firebase Cloud Messaging
- **State Management**: React Query (mobile), TanStack Query (web)

## 📝 License

**Proprietary License - Source Available**

This software is proprietary and source-available under the Solcial Proprietary License. 

### What You CAN Do:
- ✅ View and study the source code for educational purposes
- ✅ Fork the repository to submit contributions
- ✅ Submit pull requests to improve the project

### What You CANNOT Do:
- ❌ Use the software for commercial purposes
- ❌ Deploy or run the software in production
- ❌ Create derivative works for distribution
- ❌ Clone or fork for any purpose other than contributing

For commercial licensing inquiries, please contact: team@solcial.app

See the [LICENSE](LICENSE) file for full terms and conditions.

## 🤝 Contributing

We welcome contributions! By contributing, you agree to license your contributions 
under the same terms as this project. Please read our [CONTRIBUTING.md](CONTRIBUTING.md) 
guide before submitting a pull request.

## 📚 Documentation

- **Backend**: See `apps/backend/README.md`
- **Landing**: See `apps/landing/README.md`
- **Mobile**: See [solcial](../solcial) repository
- **Repository Structure**: See [MIGRATION.md](MIGRATION.md)

