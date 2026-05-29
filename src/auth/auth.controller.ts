import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Redirect,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('discord')
  @Redirect()
  redirectToDiscord() {
    return { url: this.authService.getDiscordOAuthUrl() };
  }

  @Get('discord/callback')
  async discordCallback(@Query('code') code: string) {
    if (!code) throw new UnauthorizedException('Missing OAuth2 code.');
    return this.authService.handleDiscordCallback(code);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UserDocument) {
    return {
      id: user._id.toString(),
      displayName: user.displayName,
      discordUserId: user.discordUserId,
      discordUsername: user.discordUsername,
      status: user.status,
    };
  }

  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logout() {
    // Session is destroyed by the BFF. This endpoint exists so the BFF has a
    // server-acknowledged logout and any future token blacklisting can go here.
  }
}
