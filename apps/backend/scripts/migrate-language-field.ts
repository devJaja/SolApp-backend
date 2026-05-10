import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

/**
 * Migration script to add language field to existing user accounts
 * Run with: npx ts-node scripts/migrate-language-field.ts
 */

async function migrate() {
  try {
    console.log('🔄 Starting language field migration...');
    
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

    // Update all users to add language field if it doesn't exist
    const result = await usersCollection.updateMany(
      { language: { $exists: false } },
      { $set: { language: 'en' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);
    console.log(`📝 Matched ${result.matchedCount} users`);

    // Verify the migration
    const usersWithLanguage = await usersCollection.countDocuments({
      language: { $exists: true },
    });

    console.log(`✅ Verification: ${usersWithLanguage}/${totalUsers} users now have language field`);

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
