import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guild, GuildDocument } from './guild.schema';
import { RegisterGuildDto } from './dto/register-guild.dto';
import { UpdateAllowedRolesDto } from './dto/update-allowed-roles.dto';

@Injectable()
export class GuildsService {
  constructor(
    @InjectModel(Guild.name) private readonly guildModel: Model<GuildDocument>,
  ) {}

  async register(userId: string, dto: RegisterGuildDto): Promise<GuildDocument> {
    const existing = await this.guildModel.findOne({ discordGuildId: dto.discordGuildId });
    if (existing) throw new ConflictException('This Discord server is already registered.');

    return this.guildModel.create({ ...dto, registeredBy: userId });
  }

  async findByUser(userId: string): Promise<GuildDocument[]> {
    return this.guildModel.find({ registeredBy: userId }).exec();
  }

  async updateAllowedRoles(guildId: string, userId: string, dto: UpdateAllowedRolesDto): Promise<GuildDocument> {
    const guild = await this.guildModel.findOneAndUpdate(
      { _id: guildId, registeredBy: userId },
      { $set: { allowedRoles: dto.roles } },
      { new: true },
    );
    if (!guild) throw new NotFoundException('Guild not found or access denied.');
    return guild;
  }
}
