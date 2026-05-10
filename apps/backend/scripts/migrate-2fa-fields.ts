import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

/**
 * Migration script to add 2FA fields to existing user accounts
 * Run with: npx ts-node scripts/migrate-2fa-fields.ts
 */

async function migrate() {
  try {
    console.log('🔄 Starting 2FA fields migration...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get the users collection
    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const usersCollection = db.collection('users');

    // Count total users
    const totalUsers = await usersCollection.countDocuments();
    console.log(`📊 Found ${totalUsers} users`);

    // Update all users to add 2FA fields if they don't exist
    const result = await usersCollection.updateMany(
      {
        $or: [
          { twoFactorEnabled: { $exists: false } },
          { twoFactorSecret: { $exists: false } },
          { recoveryCodes: { $exists: false } },
          { tempLoginToken: { $exists: false } },
          { tempLoginExpires: { $exists: false } },
          { passwordResetToken: { $exists: false } },
          { passwordResetExpires: { $exists: false } },
        ],
      },
      {
        $set: {
          twoFactorEnabled: false,
          recoveryCodes: [],
        },
        $setOnInsert: {
          twoFactorSecret: null,
          tempLoginToken: null,
          tempLoginExpires: null,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);
    console.log(`📝 Matched ${result.matchedCount} users`);

    // Verify the migration
    const usersWithFields = await usersCollection.countDocuments({
      twoFactorEnabled: { $exists: true },
    });

    console.log(`✅ Verification: ${usersWithFields}/${totalUsers} users now have 2FA fields`);

    // Close connection
    await connection.close();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await connection.close();
    process.exit(1);
  }
}

// Run migration
migrate();
