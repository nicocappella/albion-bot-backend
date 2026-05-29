import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { RegisterGuildDto } from './dto/register-guild.dto';
import { UpdateAllowedRolesDto } from './dto/update-allowed-roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('guilds')
@UseGuards(JwtAuthGuard)
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  @Post()
  register(@CurrentUser() user: UserDocument, @Body() dto: RegisterGuildDto) {
    return this.guildsService.register(user._id.toString(), dto);
  }

  @Get()
  findMine(@CurrentUser() user: UserDocument) {
    return this.guildsService.findByUser(user._id.toString());
  }

  @Patch(':id/roles')
  updateRoles(
    @CurrentUser() user: UserDocument,
    @Param('id') guildId: string,
    @Body() dto: UpdateAllowedRolesDto,
  ) {
    return this.guildsService.updateAllowedRoles(guildId, user._id.toString(), dto);
  }
}
