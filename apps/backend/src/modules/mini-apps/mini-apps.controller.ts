import { Controller, Post, Get, Body, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { MiniAppsService } from './mini-apps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mini-apps')
@UseGuards(JwtAuthGuard)
export class MiniAppsController {
  private readonly logger = new Logger(MiniAppsController.name);

  constructor(private readonly miniAppsService: MiniAppsService) {
    this.logger.log('MiniAppsController initialized');
  }

  @Post('dice/play')
  async playDice(
    @Request() req,
    @Body() body: { betAmount: number; prediction: 'over' | 'under'; targetNumber: number },
  ) {
    this.logger.log(`Dice play request from user ${req.user.userId}`);
    return this.miniAppsService.playDice(
      req.user.userId,
      body.betAmount,
      body.prediction,
      body.targetNumber,
    );
  }

  @Post('coinflip/play')
  async playCoinFlip(
    @Request() req,
    @Body() body: { betAmount: number; choice: 'heads' | 'tails' },
  ) {
    this.logger.log(`Coin flip request from user ${req.user.userId}`);
    return this.miniAppsService.playCoinFlip(
      req.user.userId,
      body.betAmount,
      body.choice,
    );
  }

  @Post('spin/play')
  async playSpin(
    @Request() req,
    @Body() body: { betAmount: number },
  ) {
    this.logger.log(`Spin request from user ${req.user.userId}`);
    return this.miniAppsService.playSpin(req.user.userId, body.betAmount);
  }

  @Post('swap')
  async swapTokens(
    @Request() req,
    @Body() body: { 
      fromToken: string; 
      toToken: string; 
      fromAmount: number;
      toAmount?: number;
      rate?: number;
      priceImpact?: number;
    },
  ) {
    this.logger.log(`Swap request from user ${req.user.userId}`);
    return this.miniAppsService.swapTokens(
      req.user.userId,
      body.fromToken,
      body.toToken,
      body.fromAmount,
      body.toAmount,
      body.rate,
      body.priceImpact,
    );
  }
  @Get('swap/history')
  async getSwapHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`Swap history request from user ${req.user.userId}`);
    return this.miniAppsService.getSwapHistory(
      req.user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('airdrop/claim')
  async claimAirdrop(@Request() req) {
    this.logger.log(`Airdrop claim request from user ${req.user.userId}`);
    return this.miniAppsService.claimAirdrop(req.user.userId);
  }

  @Get('airdrop/status')
  async getAirdropStatus(@Request() req) {
    this.logger.log(`Airdrop status request from user ${req.user.userId}`);
    return this.miniAppsService.getAirdropStatus(req.user.userId);
  }

  @Get('token-prices')
  async getTokenPrices() {
    this.logger.log('Token prices request');
    return this.miniAppsService.getTokenPrices();
  }
}
