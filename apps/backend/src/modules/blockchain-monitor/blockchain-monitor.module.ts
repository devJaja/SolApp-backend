import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockchainMonitorService } from './blockchain-monitor.service';
import { BlockchainMonitorController } from './blockchain-monitor.controller';
import { User, UserSchema } from '../../schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [BlockchainMonitorController],
  providers: [BlockchainMonitorService],
  exports: [BlockchainMonitorService],
})
export class BlockchainMonitorModule {}
