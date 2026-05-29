import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from '../users/schemas/user.schema';

export type GuildDocument = HydratedDocument<Guild>;

export enum AccessLevel {
  Admin = 'admin',
  Member = 'member',
}

export class AllowedRole {
  roleId: string;
  roleName: string;
  accessLevel: AccessLevel;
}

@Schema({ collection: 'guilds', timestamps: true })
export class Guild {
  @Prop({ required: true, unique: true, trim: true })
  discordGuildId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  icon?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  registeredBy: User;

  @Prop({
    type: [
      {
        roleId: { type: String, required: true },
        roleName: { type: String, required: true },
        accessLevel: {
          type: String,
          enum: Object.values(AccessLevel),
          default: AccessLevel.Member,
        },
      },
    ],
    default: [],
  })
  allowedRoles: AllowedRole[];
}

export const GuildSchema = SchemaFactory.createForClass(Guild);
