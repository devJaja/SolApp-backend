import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.app = admin.apps[0];
        this.logger.log('Firebase already initialized');
        return;
      }

      // Try to load service account from file
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        // Initialize with service account file (recommended for production)
        const serviceAccount = require(serviceAccountPath);
        
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        this.logger.log('Firebase initialized with service account file');
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Initialize with service account from environment variable (for Render/Heroku)
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        this.logger.log('Firebase initialized with service account from env');
      } else {
        this.logger.warn(
          'Firebase service account not found. Push notifications will not work.\n' +
          'Add firebase-service-account.json to project root or set FIREBASE_SERVICE_ACCOUNT env variable.'
        );
        return;
      }

    } catch (error) {
      this.logger.error('Failed to initialize Firebase:', error);
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    try {
      if (!this.app) {
        this.logger.warn('Firebase not initialized. Cannot send push notification.');
        return false;
      }

      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            color: '#9333ea',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Push notification sent successfully: ${response}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send push notification: ${error?.message || error}`);
      
      // Handle invalid token
      if (error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered') {
        this.logger.warn(`Invalid or expired token: ${token}`);
        // TODO: Remove invalid token from database
      }
      
      return false;
    }
  }

  async sendMulticastNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    try {
      if (!this.app) {
        this.logger.warn('Firebase not initialized. Cannot send push notifications.');
        return { successCount: 0, failureCount: tokens.length };
      }

      if (tokens.length === 0) {
        return { successCount: 0, failureCount: 0 };
      }

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            color: '#9333ea',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      this.logger.log(
        `Multicast notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`,
      );

      // Log failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.logger.warn(`Failed to send to token ${tokens[idx]}: ${resp.error?.message}`);
          }
        });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send multicast notification: ${error?.message || error}`);
      return { successCount: 0, failureCount: tokens.length };
    }
  }
}
