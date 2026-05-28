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
      scope: 'identify',
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async handleDiscordCallback(code: string): Promise<{ accessToken: string }> {
    const discordUser = await this.exchangeCodeForUser(code);
    const user = await this.upsertUser(discordUser);
    const payload: JwtPayload = { sub: user._id.toString(), discordId: discordUser.id };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  private async exchangeCodeForUser(code: string): Promise<DiscordUser> {
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

    const userRes = await axios.get<DiscordUser>('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });

    return userRes.data;
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
