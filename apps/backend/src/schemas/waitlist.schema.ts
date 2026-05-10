import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WaitlistDocument = Waitlist & Document;

@Schema({ timestamps: true })
export class Waitlist {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: false })
  notified: boolean;

  @Prop()
  referralCode: string;

  @Prop({ default: 0 })
  referralCount: number;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);
