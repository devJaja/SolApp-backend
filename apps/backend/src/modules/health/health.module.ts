import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { SolanaModule } from '../solana/solana.module';
import { EmailModule } from '../email/email.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [SolanaModule, EmailModule, UploadModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
