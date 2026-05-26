import { Module } from '@nestjs/common';
import { EventsModule } from '../../../events/events.module';
import { AlbionEmojisModule } from '../albion-emojis/albion-emojis.module';
import { EventSignupComponents } from './event-signup.components';
import { EventSignupService } from './event-signup.service';
import { EventSignupListener } from './event-signup.listener';

@Module({
  imports: [EventsModule, AlbionEmojisModule],
  providers: [EventSignupService, EventSignupListener, EventSignupComponents],
  exports: [EventSignupService],
})
export class EventSignupModule {}
