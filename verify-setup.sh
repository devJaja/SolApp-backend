#!/bin/bash

echo "🔍 Verifying Monorepo Setup..."
echo ""

# Check directory structure
echo "✓ Checking directory structure..."
if [ -d "apps/mobile" ] && [ -d "apps/backend" ] && [ -d "packages" ]; then
    echo "  ✅ Directory structure is correct"
else
    echo "  ❌ Directory structure is incorrect"
    exit 1
fi

# Check git
echo ""
echo "✓ Checking git configuration..."
if [ -d ".git" ]; then
    BRANCH=$(git branch --show-current)
    if [ "$BRANCH" = "main" ]; then
        echo "  ✅ Git initialized with main branch"
    else
        echo "  ⚠️  Current branch is $BRANCH (expected: main)"
    fi
else
    echo "  ❌ Git not initialized"
    exit 1
fi

# Check workspace files
echo ""
echo "✓ Checking workspace configuration..."
if [ -f "pnpm-workspace.yaml" ] && [ -f "package.json" ]; then
    echo "  ✅ Workspace files exist"
else
    echo "  ❌ Workspace files missing"
    exit 1
fi

# Check apps
echo ""
echo "✓ Checking apps..."
if [ -f "apps/mobile/app.json" ]; then
    echo "  ✅ Mobile app found"
else
    echo "  ❌ Mobile app not found"
fi

if [ -f "apps/backend/package.json" ]; then
    echo "  ✅ Backend app found"
else
    echo "  ❌ Backend app not found"
fi

# Check documentation
echo ""
echo "✓ Checking documentation..."
if [ -f "README.md" ] && [ -f "CONTRIBUTING.md" ] && [ -f "MIGRATION.md" ]; then
    echo "  ✅ Documentation complete"
else
    echo "  ⚠️  Some documentation missing"
fi

echo ""
echo "🎉 Monorepo setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'pnpm install' to install dependencies"
echo "  2. Set up environment variables in apps/mobile/.env and apps/backend/.env"
echo "  3. Run 'pnpm mobile' or 'pnpm backend' to start development"
echo ""
