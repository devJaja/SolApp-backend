import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { SolanaModule } from './modules/solana/solana.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { PostsModule } from './modules/posts/posts.module';
import { FollowsModule } from './modules/follows/follows.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ChatsModule } from './modules/chats/chats.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadModule } from './modules/upload/upload.module';
import { KeepaliveModule } from './modules/keepalive/keepalive.module';
import { PusherModule } from './modules/pusher/pusher.module';
import { BlockchainMonitorModule } from './modules/blockchain-monitor/blockchain-monitor.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { MiniAppsModule } from './modules/mini-apps/mini-apps.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/solcial'),
    FirebaseModule,
    PusherModule,
    AuthModule,
    SolanaModule,
    HealthModule,
    UsersModule,
    PostsModule,
    FollowsModule,
    WalletModule,
    ChatsModule,
    PaymentsModule,
    NotificationsModule,
    UploadModule,
    KeepaliveModule,
    BlockchainMonitorModule,
    MiniAppsModule,
    WaitlistModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
