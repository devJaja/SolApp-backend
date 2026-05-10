import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MiniAppsController } from './mini-apps.controller';
import { MiniAppsService } from './mini-apps.service';
import { JupiterService } from './jupiter.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { Swap, SwapSchema } from '../../schemas/swap.schema';
import { SolanaModule } from '../solana/solana.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Swap.name, schema: SwapSchema },
    ]),
    SolanaModule,
  ],
  controllers: [MiniAppsController],
  providers: [MiniAppsService, JupiterService],
  exports: [MiniAppsService, JupiterService],
})
export class MiniAppsModule {}
