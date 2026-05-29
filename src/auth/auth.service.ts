import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { User, UserDocument, UserStatus } from '../users/schemas/user.schema';
import { RegisterCredentialsDto } from './dto/register-credentials.dto';
import { LoginCredentialsDto } from './dto/login-credentials.dto';
import { Guild, GuildDocument } from '../guilds/guild.schema';

export interface JwtPayload {
  sub: string;
  discordId?: string;
}

export interface ManageableGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
}

interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
}

// ADMINISTRATOR (0x8) or MANAGE_GUILD (0x20)
const MANAGE_PERMISSIONS = BigInt(0x8) | BigInt(0x20);
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Guild.name) private readonly guildModel: Model<GuildDocument>,
  ) {}

  getDiscordOAuthUrl(): string {
    const clientId = this.config.getOrThrow<string>('DISCORD_CLIENT_ID');
    const callbackUrl = this.config.getOrThrow<string>('DISCORD_CALLBACK_URL');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'identify guilds',
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async registerWithCredentials(
    dto: RegisterCredentialsDto,
  ): Promise<{ accessToken: string; manageableGuilds: ManageableGuild[] }> {
    const existingUser = await this.userModel
      .findOne({ email: dto.email })
      .exec();
    if (existingUser)
      throw new ConflictException('Email is already registered.');

    const user = await this.userModel.create({
      displayName: dto.displayName,
      email: dto.email,
      passwordHash: await this.hashPassword(dto.password),
      status: UserStatus.Active,
    });

    return this.createAuthResponse(user, []);
  }

  async loginWithCredentials(
    dto: LoginCredentialsDto,
  ): Promise<{ accessToken: string; manageableGuilds: ManageableGuild[] }> {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+passwordHash')
      .exec();

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isValidPassword = await this.verifyPassword(
      dto.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.createAuthResponse(user, []);
  }

  async handleDiscordLoginCallback(
    code: string,
  ): Promise<{ accessToken: string; manageableGuilds: ManageableGuild[] }> {
    const { discordUser, accessToken: discordAccessToken } =
      await this.exchangeCode(code);
    const [user, manageableGuilds] = await Promise.all([
      this.findAndRefreshUser(discordUser),
      this.fetchManageableGuilds(discordAccessToken),
    ]);
    return this.createAuthResponse(user, manageableGuilds);
  }

  async handleDiscordRegisterCallback(
    code: string,
  ): Promise<{ accessToken: string; manageableGuilds: ManageableGuild[] }> {
    const { discordUser, accessToken: discordAccessToken } =
      await this.exchangeCode(code);
    const [user, manageableGuilds] = await Promise.all([
      this.upsertUser(discordUser),
      this.fetchManageableGuilds(discordAccessToken),
    ]);
    return this.createAuthResponse(user, manageableGuilds);
  }

  async handleDiscordLinkCallback(
    code: string,
    currentUser: UserDocument,
  ): Promise<{ accessToken: string; manageableGuilds: ManageableGuild[] }> {
    const { discordUser, accessToken: discordAccessToken } =
      await this.exchangeCode(code);
    const [user, manageableGuilds] = await Promise.all([
      this.linkDiscordUser(currentUser, discordUser),
      this.fetchManageableGuilds(discordAccessToken),
    ]);
    return this.createAuthResponse(user, manageableGuilds);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  private async exchangeCode(
    code: string,
  ): Promise<{ discordUser: DiscordUser; accessToken: string }> {
    const clientId = this.config.getOrThrow<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>(
      'DISCORD_CLIENT_SECRET',
    );
    const callbackUrl = this.config.getOrThrow<string>('DISCORD_CALLBACK_URL');

    const tokenRes = await axios.post<DiscordTokenResponse>(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const discordAccessToken = tokenRes.data.access_token;

    const userRes = await axios.get<DiscordUser>(
      'https://discord.com/api/users/@me',
      {
        headers: { Authorization: `Bearer ${discordAccessToken}` },
      },
    );

    return { discordUser: userRes.data, accessToken: discordAccessToken };
  }

  private async fetchManageableGuilds(
    discordAccessToken: string,
  ): Promise<ManageableGuild[]> {
    const res = await axios.get<DiscordGuild[]>(
      'https://discord.com/api/users/@me/guilds',
      {
        headers: { Authorization: `Bearer ${discordAccessToken}` },
      },
    );

    return res.data
      .filter((g) => (BigInt(g.permissions) & MANAGE_PERMISSIONS) !== BigInt(0))
      .map((g) => ({ id: g.id, name: g.name, icon: g.icon }));
  }

  private createAuthResponse(
    user: UserDocument,
    manageableGuilds: ManageableGuild[],
  ): { accessToken: string; manageableGuilds: ManageableGuild[] } {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      discordId: user.discordUserId,
    };
    return { accessToken: this.jwtService.sign(payload), manageableGuilds };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = await scrypt(password, salt, 64);
    return `scrypt$${salt}$${hash.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const [algorithm, salt, storedHash] = passwordHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !storedHash) return false;

    const hash = await scrypt(password, salt, 64);
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (storedBuffer.length !== hash.length) return false;

    return timingSafeEqual(storedBuffer, hash);
  }

  private async findAndRefreshUser(
    discordUser: DiscordUser,
  ): Promise<UserDocument> {
    const displayName = discordUser.global_name ?? discordUser.username;

    const user = await this.userModel
      .findOne({ discordUserId: discordUser.id })
      .exec();
    if (!user)
      throw new UnauthorizedException('Discord account is not registered.');

    user.discordUsername = discordUser.username;
    if (!user.email) user.displayName = displayName;
    await user.save();

    return user;
  }

  private async upsertUser(discordUser: DiscordUser): Promise<UserDocument> {
    const displayName = discordUser.global_name ?? discordUser.username;

    const user = await this.userModel.findOneAndUpdate(
      { discordUserId: discordUser.id },
      {
        $set: { discordUsername: discordUser.username, displayName },
        $setOnInsert: { status: UserStatus.Active },
      },
      { upsert: true, new: true },
    );

    if (!user) throw new UnauthorizedException('Could not create user.');
    return user;
  }

  private async linkDiscordUser(
    currentUser: UserDocument,
    discordUser: DiscordUser,
  ): Promise<UserDocument> {
    if (
      currentUser.discordUserId &&
      currentUser.discordUserId !== discordUser.id
    ) {
      throw new ConflictException(
        'Current user is already linked to another Discord account.',
      );
    }

    const existingUser = await this.userModel
      .findOne({ discordUserId: discordUser.id })
      .exec();

    if (
      !existingUser ||
      existingUser._id.toString() === currentUser._id.toString()
    ) {
      return this.updateLinkedDiscordUser(currentUser, discordUser);
    }

    return this.mergeDiscordUserIntoCurrentUser(
      currentUser,
      existingUser,
      discordUser,
    );
  }

  private async updateLinkedDiscordUser(
    currentUser: UserDocument,
    discordUser: DiscordUser,
  ): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      currentUser._id,
      {
        $set: {
          discordUserId: discordUser.id,
          discordUsername: discordUser.username,
          displayName: this.resolveLinkedDisplayName(discordUser, currentUser),
        },
      },
      { new: true },
    );

    if (!user)
      throw new UnauthorizedException('Could not link Discord account.');
    return user;
  }

  private async mergeDiscordUserIntoCurrentUser(
    currentUser: UserDocument,
    existingDiscordUser: UserDocument,
    discordUser: DiscordUser,
  ): Promise<UserDocument> {
    await this.userModel.findByIdAndUpdate(existingDiscordUser._id, {
      $unset: { discordUserId: '', discordUsername: '' },
    });

    const user = await this.updateLinkedDiscordUser(currentUser, discordUser);

    await this.guildModel.updateMany(
      { registeredBy: existingDiscordUser._id },
      { $set: { registeredBy: currentUser._id } },
    );
    await this.userModel.findByIdAndDelete(existingDiscordUser._id);

    return user;
  }

  private resolveLinkedDisplayName(
    discordUser: DiscordUser,
    currentUser: UserDocument,
  ): string {
    return (
      discordUser.global_name ?? discordUser.username ?? currentUser.displayName
    );
  }
}
