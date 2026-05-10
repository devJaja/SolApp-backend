import { connect, connection, Types } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function fixChatParticipants() {
  try {
    console.log('Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const chatsCollection = db.collection('chats');

    // Find all chats
    const chats = await chatsCollection.find({}).toArray();
    console.log(`Found ${chats.length} chats\n`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;

    for (const chat of chats) {
      console.log(`\nChecking chat ${chat._id}:`);
      console.log('- Participants:', chat.participants);
      console.log('- Participants types:', chat.participants.map((p: any) => typeof p));

      // Check if participants are already ObjectIds
      const allObjectIds = chat.participants.every((p: any) => p instanceof Types.ObjectId);

      if (allObjectIds) {
        console.log('✓ Participants are already ObjectIds');
        alreadyCorrectCount++;
        continue;
      }

      // Convert string participants to ObjectIds
      const fixedParticipants = chat.participants.map((p: any) => {
        if (typeof p === 'string') {
          return new Types.ObjectId(p);
        }
        return p;
      });

      // Update the chat
      await chatsCollection.updateOne(
        { _id: chat._id },
        { $set: { participants: fixedParticipants } }
      );

      console.log('✓ Fixed participants to ObjectIds');
      fixedCount++;
    }

    console.log('\n\n=== Summary ===');
    console.log(`Total chats: ${chats.length}`);
    console.log(`Already correct: ${alreadyCorrectCount}`);
    console.log(`Fixed: ${fixedCount}`);

    await connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixChatParticipants();
