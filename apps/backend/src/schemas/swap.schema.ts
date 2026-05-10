import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SwapDocument = Swap & Document;

@Schema({ timestamps: true })
export class Swap {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  fromToken: string;

  @Prop({ required: true })
  toToken: string;

  @Prop({ required: true })
  fromAmount: number;

  @Prop({ required: true })
  toAmount: number;

  @Prop({ required: true })
  rate: number;

  @Prop({ type: Number, default: 0 })
  priceImpact: number;

  @Prop()
  signature: string;

  @Prop({ default: 'completed' })
  status: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SwapSchema = SchemaFactory.createForClass(Swap);
