import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument, UserStatus } from './schemas/user.schema';

export interface UserResponse {
  id: string;
  displayName: string;
  discordUserId?: string;
  discordUsername?: string;
  status: UserStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    const payload = this.toPayload(createUserDto);

    try {
      const user = await this.userModel.create(payload);
      return this.toResponse(user);
    } catch (error) {
      this.handleDuplicate(error);
      throw error;
    }
  }

  async findAll(search?: string): Promise<UserResponse[]> {
    const filter = this.buildSearchFilter(search);
    const users = await this.userModel
      .find(filter)
      .sort({ displayName: 1 })
      .exec();

    return users.map((user) => this.toResponse(user));
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.findDocumentById(id);
    return this.toResponse(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    const payload = this.toPayload(updateUserDto, false);

    try {
      const user = await this.userModel
        .findByIdAndUpdate(id, payload, { new: true })
        .exec();

      if (!user) {
        throw new NotFoundException('User not found.');
      }

      return this.toResponse(user);
    } catch (error) {
      this.handleDuplicate(error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('User not found.');
    }
  }

  private async findDocumentById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user id.');
    }

    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private toPayload(
    dto: CreateUserDto | UpdateUserDto,
    requireDisplayName = true,
  ): Partial<User> {
    const payload: Partial<User> = {};

    if (dto.displayName !== undefined) {
      const displayName = dto.displayName.trim();
      if (!displayName) {
        throw new BadRequestException('Display name is required.');
      }

      payload.displayName = displayName;
    } else if (requireDisplayName) {
      throw new BadRequestException('Display name is required.');
    }

    if (dto.discordUserId !== undefined) {
      payload.discordUserId = this.optionalTrim(dto.discordUserId);
    }

    if (dto.discordUsername !== undefined) {
      payload.discordUsername = this.optionalTrim(dto.discordUsername);
    }

    if (dto.status !== undefined) {
      payload.status = dto.status;
    }

    if (dto.notes !== undefined) {
      payload.notes = this.optionalTrim(dto.notes);
    }

    if (dto.metadata !== undefined) {
      payload.metadata = dto.metadata;
    }

    return payload;
  }

  private buildSearchFilter(search?: string): FilterQuery<User> {
    const normalizedSearch = search?.trim();
    if (!normalizedSearch) {
      return {};
    }

    const regex = new RegExp(this.escapeRegex(normalizedSearch), 'i');

    return {
      $or: [
        { displayName: regex },
        { discordUsername: regex },
        { discordUserId: regex },
      ],
    };
  }

  private toResponse(user: UserDocument): UserResponse {
    return {
      id: user._id.toString(),
      displayName: user.displayName,
      discordUserId: user.discordUserId,
      discordUsername: user.discordUsername,
      status: user.status,
      notes: user.notes,
      metadata: user.metadata,
      createdAt: user.get('createdAt') as Date | undefined,
      updatedAt: user.get('updatedAt') as Date | undefined,
    };
  }

  private optionalTrim(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private handleDuplicate(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      throw new ConflictException('User already exists.');
    }
  }
}
