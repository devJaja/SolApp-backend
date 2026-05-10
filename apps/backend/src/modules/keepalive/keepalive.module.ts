import { Module } from '@nestjs/common';
import { KeepaliveService } from './keepalive.service';
import { KeepaliveController } from './keepalive.controller';

@Module({
  controllers: [KeepaliveController],
  providers: [KeepaliveService],
  exports: [KeepaliveService],
})
export class KeepaliveModule {}
