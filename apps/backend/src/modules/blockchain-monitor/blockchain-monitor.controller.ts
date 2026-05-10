import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { BlockchainMonitorService } from './blockchain-monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('blockchain-monitor')
export class BlockchainMonitorController {
  constructor(
    private readonly blockchainMonitorService: BlockchainMonitorService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('check-wallet')
  async checkWallet(@Request() req) {
    const user = await this.blockchainMonitorService['userModel'].findById(req.user.userId);
    if (!user) {
      return { error: 'User not found' };
    }
    
    return this.blockchainMonitorService.checkWalletNow(user.walletAddress);
  }
}
