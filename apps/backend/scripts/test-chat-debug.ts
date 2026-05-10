import * as dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function testChatDebug() {
  try {
    console.log('Testing chat debug endpoint...\n');

    // First, get all chats to find a chat ID (you'll need to provide a valid token)
    const token = process.env.TEST_TOKEN;
    
    if (!token) {
      console.error('Please provide TEST_TOKEN environment variable');
      console.log('Usage: TEST_TOKEN=your_jwt_token pnpm tsx scripts/test-chat-debug.ts');
      process.exit(1);
    }

    console.log('Fetching chats list...');
    const chatsResponse = await fetch(`${API_URL}/chats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!chatsResponse.ok) {
      throw new Error(`HTTP error! status: ${chatsResponse.status}`);
    }

    const chatsData = await chatsResponse.json();
    console.log('Chats found:', chatsData.length);
    
    if (chatsData.length === 0) {
      console.log('No chats found. Create a chat first.');
      return;
    }

    const firstChat = chatsData[0];
    console.log('\nFirst chat from list:');
    console.log('- ID:', firstChat.id);
    console.log('- Other participant:', firstChat.otherParticipant);
    console.log('- Last message:', firstChat.lastMessage);

    // Now test the debug endpoint
    console.log('\n\nTesting debug endpoint for chat:', firstChat.id);
    const debugResponse = await fetch(`${API_URL}/chats/debug/${firstChat.id}`);

    if (!debugResponse.ok) {
      throw new Error(`HTTP error! status: ${debugResponse.status}`);
    }

    const debugData = await debugResponse.json();
    console.log('\nDebug endpoint response:');
    console.log(JSON.stringify(debugData, null, 2));

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testChatDebug();
