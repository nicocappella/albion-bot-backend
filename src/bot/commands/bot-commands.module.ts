import { Module } from '@nestjs/common';

import { MembersModule } from '../../members/members.module';
import { AlbionEmojisModule } from '../features/albion-emojis/albion-emojis.module';
import { EventSignupModule } from '../features/event-signup/event-signup.module';
import { AlbionEmojisCommands } from './albion-emojis.commands';
import { CoreCommands } from './core.commands';
import { GuildCommands } from './guild/guild.commands';

@Module({
  imports: [MembersModule, EventSignupModule, AlbionEmojisModule],
  providers: [GuildCommands, CoreCommands, AlbionEmojisCommands],
})
export class BotCommandsModule {}
