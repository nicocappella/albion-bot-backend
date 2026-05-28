import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Composition, CompositionSchema } from './compositions.schema';
import { CompositionsService } from './compositions.service';
import { CompositionsController } from './compositions.controller';
import { BuildModule } from '../builds/build.module';
import { AlbionItemModule } from '../items/albion-item.module';

// @Global permite que EventsService (siempre cargado) inyecte CompositionsService
// vía @Optional() sin importar este módulo. Solo se registra cuando MONGO_URI existe.
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Composition.name, schema: CompositionSchema },
    ]),
    BuildModule,
    AlbionItemModule,
  ],
  controllers: [CompositionsController],
  providers: [CompositionsService],
  exports: [CompositionsService],
})
export class CompositionsModule {}
