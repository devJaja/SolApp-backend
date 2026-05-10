#!/bin/bash

echo "📧 Installing Resend for email..."
echo ""

cd "$(dirname "$0")"

pnpm add resend

echo ""
echo "✅ Resend installed successfully!"
echo ""
echo "🚀 Next steps:"
echo "1. Restart your backend: pnpm run start:dev"
echo "2. Test signup in your app"
echo "3. Add RESEND_API_KEY to Render environment variables"
echo ""
echo "📖 See RESEND_SETUP.md for complete guide"
