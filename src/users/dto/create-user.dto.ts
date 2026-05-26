import { UserStatus } from '../schemas/user.schema';

export class CreateUserDto {
  displayName!: string;
  discordUserId?: string;
  discordUsername?: string;
  status?: UserStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
}
