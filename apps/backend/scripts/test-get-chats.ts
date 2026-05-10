import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function testGetChats() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    console.log('Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const chatsCollection = db.collection('chats');
    const usersCollection = db.collection('users');

    // Get a sample user
    const sampleUser = await usersCollection.findOne({});
    if (!sampleUser) {
      console.log('No users found in database');
      return;
    }

    console.log('Testing with user:', sampleUser.username, '(', sampleUser._id.toString(), ')');
    console.log('');

    // Find chats for this user
    const userChats = await chatsCollection
      .find({ participants: sampleUser._id })
      .toArray();

    console.log(`Found ${userChats.length} chats for this user\n`);

    if (userChats.length > 0) {
      console.log('First chat:');
      console.log(JSON.stringify(userChats[0], null, 2));
    }

    // Also try with string ID
    const userChatsWithString = await chatsCollection
      .find({ participants: sampleUser._id.toString() })
      .toArray();

    console.log(`\nFound ${userChatsWithString.length} chats when searching with string ID`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.close();
    console.log('\nDatabase connection closed');
  }
}

testGetChats();
