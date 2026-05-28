import {
  BadRequestException,
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

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const user = await this.userModel.create(dto);
    return this.toResponse(user);
  }

  async findAll(search?: string): Promise<UserResponse[]> {
    const filter = this.buildSearchFilter(search);
    const users = await this.userModel.find(filter).sort({ displayName: 1 }).exec();
    return users.map((u) => this.toResponse(u));
  }

  async findOne(id: string): Promise<UserResponse> {
    return this.toResponse(await this.findById(id));
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    await this.findById(id);
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    return this.toResponse(user!);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.userModel.findByIdAndDelete(id).exec();
  }

  private async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user id.');
    }
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private buildSearchFilter(search?: string): FilterQuery<User> {
    if (!search) return {};
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return { $or: [{ displayName: regex }, { discordUsername: regex }, { discordUserId: regex }] };
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
}
