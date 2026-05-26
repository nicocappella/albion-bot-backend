import { Module } from '@nestjs/common';
import { AlbionEmojisService } from './albion-emojis.service';

@Module({
  providers: [AlbionEmojisService],
  exports: [AlbionEmojisService],
})
export class AlbionEmojisModule {}
