import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument } from '../../schemas/chat.schema';
import { Message, MessageDocument } from '../../schemas/message.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { SolanaService } from '../solana/solana.service';
import { PusherService } from '../pusher/pusher.service';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SendTipDto } from './dto/send-tip.dto';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private solanaService: SolanaService,
    private pusherService: PusherService,
    private firebaseService: FirebaseService,
  ) {}

  async createChat(userId: string, createChatDto: CreateChatDto) {
    const { participantId } = createChatDto;

    if (userId === participantId) {
      throw new BadRequestException('Cannot create chat with yourself');
    }

    const participant = await this.userModel.findById(participantId);
    if (!participant) {
      throw new NotFoundException('User not found');
    }

    // Check if chat already exists - convert IDs to ObjectIds for proper matching
    const userObjId = new Types.ObjectId(userId);
    const participantObjId = new Types.ObjectId(participantId);
    
    const existingChat = await this.chatModel
      .findOne({
        participants: { $all: [userObjId, participantObjId] },
      })
      .populate('participants', 'username name avatar')
      .lean();

    if (existingChat) {
      let participants = existingChat.participants as any[];
      
      // Check if participants are populated (have username field) or still strings/ObjectIds
      const arePopulated = participants.length > 0 && 
                          typeof participants[0] === 'object' && 
                          participants[0]._id &&
                          participants[0].username !== undefined;
      
      // If not populated, manually fetch user details
      if (!arePopulated) {
        participants = await Promise.all(
          participants.map(async (participantId: any) => {
            // Handle both string IDs and ObjectId instances
            const id = participantId._id || participantId;
            const user = await this.userModel
              .findById(id)
              .select('username name avatar')
              .lean();
            return user;
          })
        );
        
        // Filter out null users
        participants = participants.filter(p => p !== null);
      }
      
      const otherParticipant = participants.find((p: any) => {
        if (!p || !p._id) return false;
        return p._id.toString() !== userId;
      });
      
      return {
        ...existingChat,
        id: existingChat._id.toString(),
        participants,
        otherParticipant: otherParticipant || null,
      };
    }

    // Create new chat - convert string IDs to ObjectIds
    const newChat = await this.chatModel.create({
      participants: [new Types.ObjectId(userId), new Types.ObjectId(participantId)],
    });

    const chat = await this.chatModel
      .findById(newChat._id)
      .populate('participants', 'username name avatar')
      .lean();
    
    if (!chat) {
      throw new NotFoundException('Chat not found after creation');
    }
    
    let participants = chat.participants as any[];
    
    // Check if participants are populated (have username field) or still strings/ObjectIds
    const arePopulated = participants.length > 0 && 
                        typeof participants[0] === 'object' && 
                        participants[0]._id &&
                        participants[0].username !== undefined;
    
    // If not populated, manually fetch user details
    if (!arePopulated) {
      participants = await Promise.all(
        participants.map(async (participantId: any) => {
          // Handle both string IDs and ObjectId instances
          const id = participantId._id || participantId;
          const user = await this.userModel
            .findById(id)
            .select('username name avatar')
            .lean();
          return user;
        })
      );
      
      // Filter out null users
      participants = participants.filter(p => p !== null);
    }
    
    const otherParticipant = participants.find((p: any) => {
      if (!p || !p._id) return false;
      return p._id.toString() !== userId;
    });
    
    return {
      ...chat,
      id: chat._id.toString(),
      participants,
      otherParticipant: otherParticipant || null,
    };
  }

  async getChats(userId: string) {
    console.log('[getChats] Fetching chats for user:', userId);
    
    // Convert userId to ObjectId for querying
    const userObjectId = new Types.ObjectId(userId);
    
    // Search for chats where user is a participant
    const chats = await this.chatModel
      .find({ participants: userObjectId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username name avatar')
      .populate('lastMessageBy', 'username name')
      .lean();

    console.log('[getChats] Found chats:', chats.length);

    // Process each chat and manually fetch user details if populate didn't work
    const processedChats = await Promise.all(
      chats.map(async (chat) => {
        let participants = chat.participants as any[];
        
        // Check if participants are populated (objects with _id) or still strings/ObjectIds
        const arePopulated = participants.length > 0 && 
                            typeof participants[0] === 'object' && 
                            participants[0]._id &&
                            participants[0].username !== undefined; // Check if user fields exist
        
        // If not populated (still strings or ObjectIds without user data), manually fetch user details
        if (!arePopulated) {
          console.log('[getChats] Participants not populated, fetching manually for chat:', chat._id);
          console.log('[getChats] Participant types:', participants.map(p => typeof p));
          
          participants = await Promise.all(
            participants.map(async (participantId: any) => {
              // Handle both string IDs and ObjectId instances
              const id = participantId._id || participantId;
              const user = await this.userModel
                .findById(id)
                .select('username name avatar')
                .lean();
              
              if (!user) {
                console.log('[getChats] User not found for ID:', id);
              }
              
              return user;
            })
          );
          
          // Filter out null users
          participants = participants.filter(p => p !== null);
        }
        
        // Find the other participant (not the current user)
        const otherParticipant = participants.find((p: any) => {
          if (!p || !p._id) return false;
          return p._id.toString() !== userId;
        });
        
        return {
          ...chat,
          id: chat._id.toString(),
          participants,
          otherParticipant: otherParticipant || null,
        };
      })
    );

    return processedChats;
  }

  async getChat(chatId: string, userId: string) {
    const chat = await this.chatModel
      .findById(chatId)
      .populate('participants', 'username name avatar')
      .populate('lastMessageBy', 'username name')
      .lean();

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    let participants = chat.participants as any[];
    
    // Check if participants are populated (have username field) or still strings/ObjectIds
    const arePopulated = participants.length > 0 && 
                        typeof participants[0] === 'object' && 
                        participants[0]._id &&
                        participants[0].username !== undefined;
    
    // If not populated, manually fetch user details
    if (!arePopulated) {
      participants = await Promise.all(
        participants.map(async (participantId: any) => {
          // Handle both string IDs and ObjectId instances
          const id = participantId._id || participantId;
          const user = await this.userModel
            .findById(id)
            .select('username name avatar')
            .lean();
          return user;
        })
      );
      
      // Filter out null users
      participants = participants.filter(p => p !== null);
    }

    // Verify user is participant
    const isParticipant = participants.some((p: any) => {
      if (!p || !p._id) return false;
      return p._id.toString() === userId;
    });

    if (!isParticipant) {
      throw new BadRequestException('You are not a participant in this chat');
    }

    // Find the other participant
    const otherParticipant = participants.find((p: any) => {
      if (!p || !p._id) return false;
      return p._id.toString() !== userId;
    });

    return {
      ...chat,
      id: chat._id.toString(),
      participants,
      otherParticipant: otherParticipant || null,
    };
  }

  // DEBUG METHOD - Returns chat without auth check (for testing only)
  async getChatDebug(chatId: string) {
    const chat = await this.chatModel
      .findById(chatId)
      .populate({
        path: 'participants',
        select: 'username name avatar email',
      })
      .populate('lastMessageBy', 'username name')
      .exec();

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const chatObj = chat.toObject();
    
    return {
      ...chatObj,
      id: chatObj._id.toString(),
      debug: {
        participantsCount: (chatObj.participants as any[]).length,
        participantsRaw: chatObj.participants,
        message: 'This is a debug endpoint - no auth required',
      },
    };
  }

  async getMessages(chatId: string, userId: string, page: number = 1, limit: number = 50) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Verify user is participant
    const isParticipant = chat.participants.some((p) => p.toString() === userId);
    if (!isParticipant) {
      throw new BadRequestException('You are not a participant in this chat');
    }

    const skip = (page - 1) * limit;

    const messages = await this.messageModel
      .find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username name avatar')
      .lean();

    // Process messages and manually fetch sender details if populate didn't work
    const processedMessages = await Promise.all(
      messages.map(async (message) => {
        let sender = message.sender as any;
        
        // Check if sender is populated (has username field) or still a string/ObjectId
        const isPopulated = sender && 
                           typeof sender === 'object' && 
                           sender._id &&
                           sender.username !== undefined;
        
        // If not populated, manually fetch user details
        if (!isPopulated && sender) {
          // Handle both string IDs and ObjectId instances
          const id = sender._id || sender;
          sender = await this.userModel
            .findById(id)
            .select('username name avatar')
            .lean();
        }
        
        return {
          ...message,
          id: message._id,
          sender,
          isMine: sender && sender._id && sender._id.toString() === userId,
        };
      })
    );

    return processedMessages.reverse();
  }

  async sendMessage(chatId: string, userId: string, sendMessageDto: SendMessageDto) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Verify user is participant
    const isParticipant = chat.participants.some((p) => p.toString() === userId);
    if (!isParticipant) {
      throw new BadRequestException('You are not a participant in this chat');
    }

    const message = await this.messageModel.create({
      chat: chatId,
      sender: userId,
      content: sendMessageDto.content,
      type: sendMessageDto.type || 'text',
      paymentAmount: sendMessageDto.paymentAmount,
      imageUrl: sendMessageDto.imageUrl,
    });

    // Update chat's last message
    await this.chatModel.findByIdAndUpdate(chatId, {
      lastMessage: sendMessageDto.content,
      lastMessageAt: new Date(),
      lastMessageBy: userId,
    });

    await message.populate('sender', 'username name avatar');

    const messageData = {
      ...message.toObject(),
      id: message._id,
      isMine: true,
    };

    // Trigger Pusher event for real-time delivery
    try {
      await this.pusherService.trigger(`chat-${chatId}`, 'new-message', messageData);

      // Also trigger chat list update for both participants
      const chatUpdate = {
        chatId,
        lastMessage: sendMessageDto.content,
        lastMessageAt: new Date(),
        lastMessageBy: userId,
      };
      
      // Convert ObjectIds to strings safely
      const participantIds = chat.participants.map(p => p.toString());
      for (const participantId of participantIds) {
        await this.pusherService.trigger(
          `user-${participantId}`,
          'chat-updated',
          chatUpdate,
        );
      }
    } catch (error) {
      console.error('Pusher trigger error:', error);
      // Don't fail the message send if Pusher fails
    }

    // Send push notification to other participant(s)
    try {
      const sender = message.sender as any;
      const senderName = sender?.username || sender?.name || 'Someone';
      
      // Get other participants (not the sender)
      const otherParticipantIds = chat.participants
        .map(p => p.toString())
        .filter(id => id !== userId);

      for (const participantId of otherParticipantIds) {
        const recipient = await this.userModel.findById(participantId).select('expoPushToken').lean();
        
        if (recipient?.expoPushToken) {
          // Truncate message for notification
          const notificationContent = sendMessageDto.content.length > 50
            ? sendMessageDto.content.substring(0, 50) + '...'
            : sendMessageDto.content;

          await this.firebaseService.sendPushNotification(
            recipient.expoPushToken,
            senderName,
            notificationContent,
            {
              type: 'chat_message',
              chatId: chatId,
              senderId: userId,
            },
          );
        }
      }
    } catch (error) {
      console.error('Push notification error:', error);
      // Don't fail the message send if push notification fails
    }

    return messageData;
  }

  async sendTip(chatId: string, userId: string, sendTipDto: SendTipDto) {
    const chat = await this.chatModel.findById(chatId).populate('participants').lean();
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    let participants = chat.participants as any[];
    
    // Check if participants are populated (have username field) or still strings/ObjectIds
    const arePopulated = participants.length > 0 && 
                        typeof participants[0] === 'object' && 
                        participants[0]._id &&
                        participants[0].username !== undefined;
    
    // If not populated, manually fetch user details
    if (!arePopulated) {
      participants = await Promise.all(
        participants.map(async (participantId: any) => {
          // Handle both string IDs and ObjectId instances
          const id = participantId._id || participantId;
          const user = await this.userModel.findById(id).lean();
          return user;
        })
      );
      
      // Filter out null users
      participants = participants.filter(p => p !== null);
    }

    // Verify user is participant
    const isParticipant = participants.some((p: any) => p && p._id && p._id.toString() === userId);
    if (!isParticipant) {
      throw new BadRequestException('You are not a participant in this chat');
    }

    // Get sender and recipient
    const sender = await this.userModel.findById(userId);
    const recipient = participants.find(
      (p: any) => p && p._id && p._id.toString() !== userId,
    );

    if (!sender || !recipient) {
      throw new BadRequestException('Invalid participants');
    }

    // Send SOL transaction
    try {
      const signature = await this.solanaService.sendTransaction(
        sender.walletAddress,
        sender.encryptedPrivateKey,
        recipient.walletAddress,
        sendTipDto.amount,
        'Tip via Solcial',
      );

      // Create payment message
      const message = await this.messageModel.create({
        chat: chatId,
        sender: userId,
        content: `Sent ${sendTipDto.amount} SOL`,
        type: 'payment',
        paymentAmount: sendTipDto.amount,
        paymentSignature: signature,
      });

      // Update chat's last message
      await this.chatModel.findByIdAndUpdate(chatId, {
        lastMessage: `Sent ${sendTipDto.amount} SOL`,
        lastMessageAt: new Date(),
        lastMessageBy: userId,
      });

      await message.populate('sender', 'username name avatar');

      const messageData = {
        ...message.toObject(),
        id: message._id,
        isMine: true,
        signature,
      };

      // Trigger Pusher event for real-time delivery
      try {
        await this.pusherService.trigger(`chat-${chatId}`, 'new-message', messageData);

        // Also trigger chat list update for both participants
        const chatUpdate = {
          chatId,
          lastMessage: `Sent ${sendTipDto.amount} SOL`,
          lastMessageAt: new Date(),
          lastMessageBy: userId,
        };
        
        // Convert participant IDs to strings safely
        const participantIds = participants
          .filter(p => p && p._id)
          .map(p => p._id.toString());
        for (const participantId of participantIds) {
          await this.pusherService.trigger(
            `user-${participantId}`,
            'chat-updated',
            chatUpdate,
          );
        }
      } catch (error) {
        console.error('Pusher trigger error:', error);
        // Don't fail the tip send if Pusher fails
      }

      return messageData;
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to send tip');
    }
  }

  async markAsRead(chatId: string, userId: string) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Verify user is participant
    const isParticipant = chat.participants.some((p) => p.toString() === userId);
    if (!isParticipant) {
      throw new BadRequestException('You are not a participant in this chat');
    }

    // Mark all messages from other participants as read
    await this.messageModel.updateMany(
      {
        chat: chatId,
        sender: { $ne: userId },
        isRead: false,
      },
      { isRead: true },
    );

    return { message: 'Messages marked as read' };
  }
}
