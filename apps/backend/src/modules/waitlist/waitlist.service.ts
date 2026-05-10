import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Waitlist, WaitlistDocument } from '../../schemas/waitlist.schema';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectModel(Waitlist.name) private waitlistModel: Model<WaitlistDocument>,
  ) {}

  async addToWaitlist(email: string) {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if email already exists
    const existing = await this.waitlistModel.findOne({ email });
    if (existing) {
      throw new BadRequestException('Email already on waitlist');
    }

    // Create referral code
    const referralCode = `SOLCIAL-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Add to waitlist
    const waitlistEntry = new this.waitlistModel({
      email,
      referralCode,
    });

    await waitlistEntry.save();

    this.logger.log(`Added to waitlist: ${email}`);

    return {
      message: 'Successfully joined the waitlist!',
      email,
      referralCode,
    };
  }

  async getCount() {
    const count = await this.waitlistModel.countDocuments();
    return { count };
  }

  async getWaitlistEntry(email: string) {
    return this.waitlistModel.findOne({ email });
  }

  async markAsNotified(email: string) {
    return this.waitlistModel.findOneAndUpdate(
      { email },
      { notified: true },
      { new: true },
    );
  }
}
