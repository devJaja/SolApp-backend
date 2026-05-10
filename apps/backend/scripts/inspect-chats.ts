import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function inspectChats() {
  try {
    console.log('Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const chatsCollection = db.collection('chats');
    const usersCollection = db.collection('users');

    // Find all chats
    const chats = await chatsCollection.find({}).toArray();
    console.log(`Found ${chats.length} chats\n`);

    for (const chat of chats) {
      console.log('\n' + '='.repeat(60));
      console.log(`Chat ID: ${chat._id}`);
      console.log(`Created: ${chat.createdAt}`);
      console.log(`Last Message: ${chat.lastMessage || 'None'}`);
      console.log(`Last Message At: ${chat.lastMessageAt || 'Never'}`);
      console.log('\nParticipants:');
      console.log('- Raw:', chat.participants);
      console.log('- Count:', chat.participants?.length || 0);
      console.log('- Types:', chat.participants?.map((p: any) => typeof p));

      // Try to fetch participant details
      if (chat.participants && chat.participants.length > 0) {
        console.log('\nParticipant Details:');
        for (const participantId of chat.participants) {
          try {
            const user = await usersCollection.findOne({ _id: participantId });
            if (user) {
              console.log(`  - ${user.username} (${user.name || 'No name'})`);
              console.log(`    ID: ${user._id}`);
              console.log(`    Email: ${user.email}`);
              console.log(`    Avatar: ${user.avatar || 'None'}`);
            } else {
              console.log(`  - User not found for ID: ${participantId}`);
            }
          } catch (error) {
            console.log(`  - Error fetching user ${participantId}:`, error.message);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n=== Summary ===');
    console.log(`Total chats: ${chats.length}`);

    await connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectChats();
