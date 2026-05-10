# Backend Migration Scripts

This directory contains database migration scripts for the Solcial backend.

## Available Scripts

### migrate-2fa-fields.ts

Adds two-factor authentication fields to existing user accounts in the database.

**What it does:**
- Adds `twoFactorEnabled` field (default: false)
- Adds `twoFactorSecret` field (default: null)
- Adds `recoveryCodes` field (default: empty array)
- Adds `tempLoginToken` field (default: null)
- Adds `tempLoginExpires` field (default: null)
- Adds `passwordResetToken` field (default: null)
- Adds `passwordResetExpires` field (default: null)

**How to run:**

```bash
# From the backend directory
cd apps/backend

# Run the migration
npx ts-node scripts/migrate-2fa-fields.ts
```

**Expected output:**
```
🔄 Starting 2FA fields migration...
✅ Connected to MongoDB
📊 Found 150 users
✅ Updated 150 users
📝 Matched 150 users
✅ Verification: 150/150 users now have 2FA fields
✅ Migration completed successfully
```

**Safety:**
- The script uses `$setOnInsert` to avoid overwriting existing data
- Only adds fields that don't already exist
- Safe to run multiple times (idempotent)
- Connects to the database specified in `.env` file

**Prerequisites:**
- MongoDB connection string in `.env` file
- Node.js and TypeScript installed
- Backend dependencies installed (`pnpm install`)

## Creating New Migrations

When creating new migration scripts:

1. Create a new file in this directory: `migrate-<feature-name>.ts`
2. Follow the pattern from existing migrations
3. Always include:
   - Connection handling
   - Error handling
   - Progress logging
   - Verification step
   - Proper cleanup (close connection)
4. Test on a development database first
5. Document the migration in this README

## Best Practices

- Always backup your database before running migrations
- Test migrations on development/staging first
- Use `$setOnInsert` to avoid overwriting existing data
- Log progress and results
- Make migrations idempotent (safe to run multiple times)
- Close database connections properly
- Handle errors gracefully
