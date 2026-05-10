import { connect, connection, Types } from 'mongoose';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixStringParticipants() {
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

    // Find all chats
    const chats = await chatsCollection.find({}).toArray();
    console.log(`Found ${chats.length} chats\n`);

    let fixedCount = 0;

    for (const chat of chats) {
      const participants = chat.participants;
      
      // Check participant types
      const participantTypes = participants.map((p: any) => ({
        value: p,
        type: typeof p,
        isString: typeof p === 'string',
        isObjectId: p instanceof Types.ObjectId,
        constructor: p?.constructor?.name
      }));
      
      console.log(`\nChat ${chat._id}:`);
      console.log('Participant analysis:', JSON.stringify(participantTypes, null, 2));
      
      // Check if any participant is a string
      const hasStringParticipants = participants.some((p: any) => typeof p === 'string');
      
      if (hasStringParticipants) {
        console.log('HAS STRING PARTICIPANTS - FIXING');
        console.log('Current participants:', participants);
        
        // Convert all participants to ObjectIds
        const fixedParticipants = participants.map((p: any) => {
          if (typeof p === 'string') {
            return new Types.ObjectId(p);
          }
          return p;
        });
        
        console.log('Fixed participants:', fixedParticipants);
        
        // Update the chat
        await chatsCollection.updateOne(
          { _id: chat._id },
          { $set: { participants: fixedParticipants } }
        );
        
        fixedCount++;
        console.log('✓ Fixed');
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total chats checked: ${chats.length}`);
    console.log(`Chats fixed: ${fixedCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.close();
    console.log('\nDatabase connection closed');
  }
}

fixStringParticipants();
