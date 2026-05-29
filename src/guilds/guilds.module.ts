import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Guild, GuildSchema } from './guild.schema';
import { GuildsService } from './guilds.service';
import { GuildsController } from './guilds.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Guild.name, schema: GuildSchema }])],
  controllers: [GuildsController],
  providers: [GuildsService],
})
export class GuildsModule {}
