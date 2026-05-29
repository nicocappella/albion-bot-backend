import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ lowercase: true, sparse: true, trim: true, unique: true })
  email?: string;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ trim: true, sparse: true, unique: true })
  discordUserId?: string;

  @Prop({ trim: true })
  discordUsername?: string;

  @Prop({
    enum: Object.values(UserStatus),
    default: UserStatus.Active,
  })
  status!: UserStatus;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata?: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);
