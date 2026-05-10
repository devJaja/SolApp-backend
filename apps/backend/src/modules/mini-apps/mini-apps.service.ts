import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Swap, SwapDocument } from '../../schemas/swap.schema';
import { SolanaService } from '../solana/solana.service';
import { JupiterService } from './jupiter.service';

@Injectable()
export class MiniAppsService {
  private readonly logger = new Logger(MiniAppsService.name);
  private readonly AIRDROP_AMOUNT = 0.1;
  private readonly AIRDROP_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Swap.name) private swapModel: Model<SwapDocument>,
    private solanaService: SolanaService,
    private jupiterService: JupiterService,
  ) {}

  // ==================== Dice Game ====================
  async playDice(
    userId: string,
    betAmount: number,
    prediction: 'over' | 'under',
    targetNumber: number,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (betAmount <= 0) {
      throw new BadRequestException('Bet amount must be positive');
    }

    if (targetNumber < 1 || targetNumber > 99) {
      throw new BadRequestException('Target number must be between 1 and 99');
    }

    // Roll the dice
    const roll = Math.floor(Math.random() * 100) + 1;
    const won = prediction === 'over' ? roll > targetNumber : roll < targetNumber;

    // Calculate multiplier
    const multiplier = prediction === 'over' 
      ? 100 / (100 - targetNumber)
      : 100 / targetNumber;

    let signature: string | null = null;

    if (won) {
      // User wins - send them SOL
      const winAmount = betAmount * multiplier;
      try {
        // In production, this would come from a house wallet
        // For now, we'll use airdrop on devnet
        signature = await this.solanaService.requestAirdrop(user.walletAddress, winAmount);
      } catch (error) {
        this.logger.error(`Failed to send winnings: ${error.message}`);
        throw new BadRequestException('Failed to process winnings');
      }
    } else {
      // User loses - deduct SOL (in a real app, you'd transfer to house wallet)
      // For demo purposes, we'll just record the loss
      this.logger.log(`User ${userId} lost ${betAmount} SOL`);
    }

    return {
      roll,
      won,
      betAmount,
      winAmount: won ? betAmount * multiplier : 0,
      multiplier,
      signature,
    };
  }

  // ==================== Coin Flip ====================
  async playCoinFlip(userId: string, betAmount: number, choice: 'heads' | 'tails') {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (betAmount <= 0) {
      throw new BadRequestException('Bet amount must be positive');
    }

    // Flip the coin
    const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    const multiplier = 2;

    let signature: string | null = null;

    if (won) {
      const winAmount = betAmount * multiplier;
      try {
        signature = await this.solanaService.requestAirdrop(user.walletAddress, winAmount);
      } catch (error) {
        this.logger.error(`Failed to send winnings: ${error.message}`);
        throw new BadRequestException('Failed to process winnings');
      }
    } else {
      this.logger.log(`User ${userId} lost ${betAmount} SOL on coin flip`);
    }

    return {
      result,
      won,
      betAmount,
      winAmount: won ? betAmount * multiplier : 0,
      multiplier,
      signature,
    };
  }

  // ==================== Lucky Spin ====================
  async playSpin(userId: string, betAmount: number) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (betAmount <= 0) {
      throw new BadRequestException('Bet amount must be positive');
    }

    // Spin the wheel - weighted probabilities
    const multipliers = [
      { value: 0, weight: 25 },      // 25% chance
      { value: 0.5, weight: 20 },    // 20% chance
      { value: 1, weight: 20 },      // 20% chance
      { value: 1.5, weight: 15 },    // 15% chance
      { value: 2, weight: 10 },      // 10% chance
      { value: 3, weight: 7 },       // 7% chance
      { value: 5, weight: 3 },       // 3% chance
    ];

    const totalWeight = multipliers.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedMultiplier = 0;
    for (const mult of multipliers) {
      random -= mult.weight;
      if (random <= 0) {
        selectedMultiplier = mult.value;
        break;
      }
    }

    let signature: string | null = null;
    const winAmount = betAmount * selectedMultiplier;

    if (selectedMultiplier > 0) {
      try {
        signature = await this.solanaService.requestAirdrop(user.walletAddress, winAmount);
      } catch (error) {
        this.logger.error(`Failed to send winnings: ${error.message}`);
        throw new BadRequestException('Failed to process winnings');
      }
    } else {
      this.logger.log(`User ${userId} lost ${betAmount} SOL on spin`);
    }

    return {
      multiplier: selectedMultiplier,
      betAmount,
      winAmount,
      signature,
    };
  }

  // ==================== Token Swap ====================
  async swapTokens(
    userId: string,
    fromToken: string,
    toToken: string,
    fromAmount: number,
    toAmount?: number,
    rate?: number,
    priceImpact?: number,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (fromAmount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    if (fromToken === toToken) {
      throw new BadRequestException('Cannot swap same token');
    }

    try {
      // If values are provided, use them (calculated on frontend)
      let swapData = {
        toAmount: toAmount || 0,
        rate: rate || 0,
        priceImpact: priceImpact || 0,
      };

      // If not provided, try to calculate using Jupiter
      if (!toAmount || !rate) {
        try {
          const jupiterData = await this.jupiterService.calculateSwap(
            fromToken,
            toToken,
            fromAmount,
          );
          swapData = {
            toAmount: jupiterData.toAmount,
            rate: jupiterData.rate,
            priceImpact: Number(jupiterData.priceImpact) || 0,
          };
        } catch (error) {
          this.logger.warn(`Jupiter calculation failed, using provided values: ${error.message}`);
          // If Jupiter fails and no values provided, throw error
          if (!toAmount || !rate) {
            throw new BadRequestException('Unable to calculate swap rate');
          }
        }
      }

      this.logger.log(
        `Swap: ${fromAmount} ${fromToken} → ${swapData.toAmount} ${toToken} (rate: ${swapData.rate}, impact: ${swapData.priceImpact})`,
      );

      // Save swap history
      const signature = 'swap_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      const swap = await this.swapModel.create({
        user: userId,
        fromToken,
        toToken,
        fromAmount,
        toAmount: swapData.toAmount,
        rate: swapData.rate,
        priceImpact: Number(swapData.priceImpact) || 0,
        signature,
        status: 'completed',
      });

      this.logger.log(`Swap saved with ID: ${swap._id}`);

      // In a real implementation, you would:
      // 1. Execute the swap transaction on-chain using Jupiter
      // 2. Update user's token balances in the database
      // 3. Return the actual transaction signature
      // For demo purposes, we return the swap data

      return {
        fromToken,
        toToken,
        fromAmount,
        toAmount: swapData.toAmount,
        rate: swapData.rate,
        priceImpact: swapData.priceImpact,
        signature,
        status: 'completed',
      };
    } catch (error) {
      this.logger.error(`Swap failed: ${error.message}`);
      throw new BadRequestException(`Swap failed: ${error.message}`);
    }
  }
  async getSwapHistory(userId: string, page: number = 1, limit: number = 20) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const skip = (page - 1) * limit;
    const swaps = await this.swapModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.swapModel.countDocuments({ user: userId });

    return {
      swaps: swaps.map((swap: any) => ({
        id: swap._id.toString(),
        fromToken: swap.fromToken,
        toToken: swap.toToken,
        fromAmount: swap.fromAmount,
        toAmount: swap.toAmount,
        rate: swap.rate,
        priceImpact: swap.priceImpact || 0,
        signature: swap.signature,
        status: swap.status,
        createdAt: swap.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get current token prices
  async getTokenPrices() {
    try {
      return await this.jupiterService.getAllTokenPrices();
    } catch (error) {
      this.logger.error(`Failed to get token prices: ${error.message}`);
      throw new BadRequestException('Failed to get token prices');
    }
  }

  // ==================== Daily Airdrop ====================
  async claimAirdrop(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check last airdrop claim
    const now = Date.now();
    const lastClaim = user.lastAirdropClaim ? user.lastAirdropClaim.getTime() : 0;
    const timeSinceLastClaim = now - lastClaim;

    if (timeSinceLastClaim < this.AIRDROP_COOLDOWN) {
      const timeRemaining = this.AIRDROP_COOLDOWN - timeSinceLastClaim;
      const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
      const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
      
      throw new BadRequestException(
        `You can claim again in ${hours}h ${minutes}m`,
      );
    }

    try {
      // Request airdrop from Solana devnet
      const signature = await this.solanaService.requestAirdrop(
        user.walletAddress,
        this.AIRDROP_AMOUNT,
      );

      // Update user's last claim time
      await this.userModel.findByIdAndUpdate(userId, {
        lastAirdropClaim: new Date(),
        $inc: { totalAirdropClaimed: this.AIRDROP_AMOUNT },
      });

      return {
        amount: this.AIRDROP_AMOUNT,
        signature,
        nextClaimAt: new Date(now + this.AIRDROP_COOLDOWN),
      };
    } catch (error) {
      this.logger.error(`Failed to claim airdrop: ${error.message}`);
      throw new BadRequestException('Failed to claim airdrop. Please try again later.');
    }
  }

  async getAirdropStatus(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const now = Date.now();
    const lastClaim = user.lastAirdropClaim ? user.lastAirdropClaim.getTime() : 0;
    const timeSinceLastClaim = now - lastClaim;
    const canClaim = timeSinceLastClaim >= this.AIRDROP_COOLDOWN;

    let nextClaimAt: Date | null = null;
    if (!canClaim) {
      nextClaimAt = new Date(lastClaim + this.AIRDROP_COOLDOWN);
    }

    return {
      canClaim,
      amount: this.AIRDROP_AMOUNT,
      nextClaimAt,
      totalClaimed: user.totalAirdropClaimed || 0,
      lastClaimAt: user.lastAirdropClaim,
    };
  }
}
