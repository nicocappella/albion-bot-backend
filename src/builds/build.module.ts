import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Build, BuildSchema } from './build.schema';
import { BuildService } from './build.service';
import { BuildController } from './build.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Build.name, schema: BuildSchema }]),
  ],
  controllers: [BuildController],
  providers: [BuildService],
  exports: [BuildService],
})
export class BuildModule {}
