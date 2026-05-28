import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbionItem, AlbionItemSchema } from './albion-item.schema';
import { AlbionItemService } from './albion-item.service';
import { AlbionItemController } from './albion-item.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlbionItem.name, schema: AlbionItemSchema },
    ]),
  ],
  controllers: [AlbionItemController],
  providers: [AlbionItemService],
  exports: [AlbionItemService],
})
export class AlbionItemModule {}
