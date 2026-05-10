import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  name: string;

  @Prop()
  bio: string;

  @Prop()
  avatar: string;

  @Prop({ required: true, unique: true })
  walletAddress: string;

  @Prop({ required: true })
  encryptedPrivateKey: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  verificationCode: string;

  @Prop()
  verificationCodeExpires: Date;

  @Prop({ default: 0 })
  followersCount: number;

  @Prop({ default: 0 })
  followingCount: number;

  @Prop({ default: 0 })
  postsCount: number;

  @Prop()
  expoPushToken: string;

  @Prop({ default: 0 })
  portfolioValue: number; // Total value of owned post tokens in SOL

  @Prop({ default: 0 })
  totalInvested: number; // Total SOL invested in post tokens

  @Prop()
  lastAirdropClaim: Date; // Last time user claimed airdrop

  @Prop({ default: 0 })
  totalAirdropClaimed: number; // Total SOL claimed from airdrops
  @Prop({ default: 0 })
  seekerBalance: number; // Seeker token balance

  // Two-Factor Authentication
  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  twoFactorSecret: string; // Encrypted TOTP secret

  @Prop({ type: [String], default: [] })
  recoveryCodes: string[]; // Hashed recovery codes

  // Password Reset
  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetExpires: Date;

  // Temporary token for 2FA login
  @Prop()
  tempLoginToken: string;

  @Prop()
  tempLoginExpires: Date;

  // Language Preference
  @Prop({ default: 'en' })
  language: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Remove duplicate indexes - unique: true already creates indexes
// UserSchema.index({ email: 1 });
// UserSchema.index({ username: 1 });
// UserSchema.index({ walletAddress: 1 });
