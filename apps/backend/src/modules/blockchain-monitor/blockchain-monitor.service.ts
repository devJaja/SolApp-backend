import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { User, UserDocument } from '../../schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { FirebaseService } from '../firebase/firebase.service';

interface MonitoredTransaction {
  signature: string;
  walletAddress: string;
}

@Injectable()
export class BlockchainMonitorService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainMonitorService.name);
  private connection: Connection;
  private processedSignatures: Set<string> = new Set();
  private lastCheckedSignatures: Map<string, string> = new Map(); // walletAddress -> lastSignature

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
    private firebaseService: FirebaseService,
  ) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed',
    );
  }

  async onModuleInit() {
    this.logger.log('Blockchain Monitor Service initialized');
    // Start monitoring immediately
    await this.monitorIncomingTransactions();
  }

  /**
   * Monitor all user wallets for incoming transactions
   * Runs every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorIncomingTransactions() {
    try {
      // Get all users with push tokens (only notify users who can receive notifications)
      const users = await this.userModel.find({ 
        expoPushToken: { $exists: true, $ne: null } 
      }).select('walletAddress expoPushToken username').lean();

      if (users.length === 0) {
        return;
      }

      this.logger.debug(`Monitoring ${users.length} wallets for incoming transactions`);

      // Check each wallet for new transactions
      await Promise.all(
        users.map(user => this.checkWalletTransactions(user))
      );

    } catch (error) {
      this.logger.error(`Error monitoring transactions: ${error.message}`);
    }
  }

  /**
   * Check a specific wallet for new incoming transactions
   */
  private async checkWalletTransactions(user: any) {
    try {
      const publicKey = new PublicKey(user.walletAddress);
      const lastSignature = this.lastCheckedSignatures.get(user.walletAddress);

      // Get recent signatures
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        {
          limit: 10,
          ...(lastSignature && { until: lastSignature }),
        }
      );

      if (signatures.length === 0) {
        return;
      }

      // Update last checked signature
      this.lastCheckedSignatures.set(user.walletAddress, signatures[0].signature);

      // Process each new transaction
      for (const sig of signatures) {
        // Skip if already processed
        if (this.processedSignatures.has(sig.signature)) {
          continue;
        }

        // Mark as processed
        this.processedSignatures.add(sig.signature);

        // Get transaction details
        const tx = await this.connection.getParsedTransaction(
          sig.signature,
          { maxSupportedTransactionVersion: 0 }
        );

        if (!tx || !tx.meta || tx.meta.err) {
          continue; // Skip failed transactions
        }

        // Check if this is an incoming transaction
        const isIncoming = await this.isIncomingTransaction(
          tx,
          user.walletAddress
        );

        if (isIncoming) {
          await this.handleIncomingTransaction(tx, user, sig.signature);
        }
      }

      // Clean up old processed signatures (keep last 1000)
      if (this.processedSignatures.size > 1000) {
        const signaturesArray = Array.from(this.processedSignatures);
        this.processedSignatures = new Set(signaturesArray.slice(-1000));
      }

    } catch (error) {
      this.logger.warn(`Error checking wallet ${user.walletAddress}: ${error.message}`);
    }
  }

  /**
   * Check if transaction is incoming to the user's wallet
   */
  private async isIncomingTransaction(tx: any, userWalletAddress: string): Promise<boolean> {
    const accountKeys = tx.transaction.message.accountKeys;
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;

    // Find user's account index
    const userAccountIndex = accountKeys.findIndex(
      (key: any) => key.pubkey.toString() === userWalletAddress
    );

    if (userAccountIndex === -1) {
      return false;
    }

    // Check if balance increased
    const balanceChange = postBalances[userAccountIndex] - preBalances[userAccountIndex];
    return balanceChange > 0;
  }

  /**
   * Handle incoming transaction - send notification
   */
  private async handleIncomingTransaction(tx: any, user: any, signature: string) {
    try {
      const accountKeys = tx.transaction.message.accountKeys;
      const preBalances = tx.meta.preBalances;
      const postBalances = tx.meta.postBalances;

      // Find user's account index
      const userAccountIndex = accountKeys.findIndex(
        (key: any) => key.pubkey.toString() === user.walletAddress
      );

      if (userAccountIndex === -1) {
        return;
      }

      // Calculate amount received
      const balanceChange = postBalances[userAccountIndex] - preBalances[userAccountIndex];
      const amountSOL = balanceChange / LAMPORTS_PER_SOL;

      // Get sender address (usually the first account)
      const senderAddress = accountKeys[0]?.pubkey.toString();

      // Check if sender is a Solcial user
      const senderUser = await this.userModel.findOne({ 
        walletAddress: senderAddress 
      }).select('_id username name').lean();

      let message: string;
      let notificationData: any = {
        recipient: user._id,
        type: 'payment_received',
        amount: amountSOL,
        signature: signature, // Include transaction signature
      };

      if (senderUser) {
        // Transaction from another Solcial user
        message = `${senderUser.username || senderUser.name} sent you ${amountSOL.toFixed(4)} SOL`;
        notificationData.sender = senderUser._id;
        notificationData.message = message;
      } else {
        // Transaction from external wallet
        message = `You received ${amountSOL.toFixed(4)} SOL from ${this.shortenAddress(senderAddress)}`;
        notificationData.message = message;
        // For external transactions, we need a sender - use the recipient as sender for schema requirement
        notificationData.sender = user._id;
      }

      // Send push notification via Firebase
      if (user.expoPushToken) {
        await this.firebaseService.sendPushNotification(
          user.expoPushToken,
          'Payment Received',
          message,
          { 
            signature, 
            amount: amountSOL.toString(),
            type: 'payment',
          }
        );
      }

      // Create in-app notification
      await this.notificationsService.createNotification(notificationData);

      this.logger.log(`Notified ${user.username} of incoming ${amountSOL.toFixed(4)} SOL`);

    } catch (error) {
      this.logger.error(`Error handling incoming transaction: ${error.message}`);
    }
  }

  /**
   * Shorten wallet address for display
   */
  private shortenAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  /**
   * Manually trigger check for a specific wallet (useful for testing)
   */
  async checkWalletNow(walletAddress: string) {
    const user = await this.userModel.findOne({ walletAddress })
      .select('walletAddress expoPushToken username _id').lean();

    if (!user) {
      throw new Error('User not found');
    }

    await this.checkWalletTransactions(user);
    return { message: 'Wallet checked successfully' };
  }
}
