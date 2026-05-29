import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { User, UserDocument, UserStatus } from '../users/schemas/user.schema';

export interface JwtPayload {
  sub: string;
  discordId: string;
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

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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

  async handleDiscordCallback(code: string): Promise<{ accessToken: string; manageableGuilds: ManageableGuild[] }> {
    const { discordUser, accessToken: discordAccessToken } = await this.exchangeCode(code);
    const [user, manageableGuilds] = await Promise.all([
      this.upsertUser(discordUser),
      this.fetchManageableGuilds(discordAccessToken),
    ]);
    const payload: JwtPayload = { sub: user._id.toString(), discordId: discordUser.id };
    return { accessToken: this.jwtService.sign(payload), manageableGuilds };
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  private async exchangeCode(code: string): Promise<{ discordUser: DiscordUser; accessToken: string }> {
    const clientId = this.config.getOrThrow<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('DISCORD_CLIENT_SECRET');
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

    const userRes = await axios.get<DiscordUser>('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${discordAccessToken}` },
    });

    return { discordUser: userRes.data, accessToken: discordAccessToken };
  }

  private async fetchManageableGuilds(discordAccessToken: string): Promise<ManageableGuild[]> {
    const res = await axios.get<DiscordGuild[]>('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${discordAccessToken}` },
    });

    return res.data
      .filter((g) => (BigInt(g.permissions) & MANAGE_PERMISSIONS) !== BigInt(0))
      .map((g) => ({ id: g.id, name: g.name, icon: g.icon }));
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
}
