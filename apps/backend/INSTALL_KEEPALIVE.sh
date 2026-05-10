#!/bin/bash

echo "🔄 Installing Internal Keepalive Cron Job..."
echo ""

# Install @nestjs/schedule
echo "📦 Installing @nestjs/schedule..."
pnpm add @nestjs/schedule

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Add API_URL to your Render environment variables:"
echo "   API_URL=https://solcial-backend.onrender.com"
echo ""
echo "2. Deploy to Render:"
echo "   git add ."
echo "   git commit -m 'Add internal keepalive cron job'"
echo "   git push"
echo ""
echo "3. Monitor logs in Render dashboard for:"
echo "   - 'Keepalive service initialized'"
echo "   - 'Keepalive ping #X successful'"
echo ""
echo "4. Check statistics:"
echo "   curl https://solcial-backend.onrender.com/api/keepalive/stats"
echo ""
echo "📖 See INTERNAL_KEEPALIVE.md for full documentation"
