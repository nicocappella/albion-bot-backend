import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Body,
  Post,
  Query,
  Redirect,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { RegisterCredentialsDto } from './dto/register-credentials.dto';
import { LoginCredentialsDto } from './dto/login-credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterCredentialsDto) {
    return this.authService.registerWithCredentials(dto);
  }

  @Post('login')
  login(@Body() dto: LoginCredentialsDto) {
    return this.authService.loginWithCredentials(dto);
  }

  @Get('discord')
  @Redirect()
  redirectToDiscord() {
    return { url: this.authService.getDiscordOAuthUrl() };
  }

  @Get('discord/callback')
  async discordCallback(@Query('code') code: string) {
    if (!code) throw new UnauthorizedException('Missing OAuth2 code.');
    return this.authService.handleDiscordRegisterCallback(code);
  }

  @Get('discord/login/callback')
  async discordLoginCallback(@Query('code') code: string) {
    if (!code) throw new UnauthorizedException('Missing OAuth2 code.');
    return this.authService.handleDiscordLoginCallback(code);
  }

  @Get('discord/register/callback')
  async discordRegisterCallback(@Query('code') code: string) {
    if (!code) throw new UnauthorizedException('Missing OAuth2 code.');
    return this.authService.handleDiscordRegisterCallback(code);
  }

  @Get('discord/link/callback')
  @UseGuards(JwtAuthGuard)
  async discordLinkCallback(
    @Query('code') code: string,
    @CurrentUser() user: UserDocument,
  ) {
    if (!code) throw new UnauthorizedException('Missing OAuth2 code.');
    return this.authService.handleDiscordLinkCallback(code, user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UserDocument) {
    return {
      id: user._id.toString(),
      displayName: user.displayName,
      email: user.email,
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
