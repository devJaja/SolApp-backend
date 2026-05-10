import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../../schemas/notification.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private firebaseService: FirebaseService,
  ) {}

  async createNotification(data: {
    recipient: string;
    sender?: string;
    type: string;
    message?: string;
    post?: string;
    amount?: number;
    signature?: string;
  }) {
    const notification = await this.notificationModel.create(data);
    
    // Send push notification via Firebase
    const recipient = await this.userModel.findById(data.recipient);
    if (recipient?.expoPushToken && data.message) {
      await this.firebaseService.sendPushNotification(
        recipient.expoPushToken,
        'Solcial',
        data.message,
        {
          type: data.type,
          notificationId: notification._id.toString(),
          ...(data.post && { postId: data.post.toString() }),
          ...(data.signature && { signature: data.signature }),
        },
      );
    }

    return notification;
  }

  async getNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const notifications = await this.notificationModel
      .find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username name avatar')
      .populate('post', 'content')
      .lean();

    return notifications.map((notification) => ({
      ...notification,
      id: notification._id,
    }));
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
    );

    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true },
    );

    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationModel.countDocuments({
      recipient: userId,
      isRead: false,
    });

    return { count };
  }

  async registerPushToken(userId: string, pushToken: string) {
    await this.userModel.findByIdAndUpdate(userId, { expoPushToken: pushToken });
    return { message: 'Push token registered' };
  }
}
