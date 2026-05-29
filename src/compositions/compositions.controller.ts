import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CompositionsService } from './compositions.service';
import { UpsertCompositionDto, UpdateCompositionDto } from './dto/upsert-composition.dto';

@Controller('compositions')
export class CompositionsController {
  constructor(private readonly compositionsService: CompositionsService) {}

  @Get()
  findAll() {
    return this.compositionsService.findAll();
  }

  @Get(':key')
  async findOne(@Param('key') key: string) {
    const composition = await this.compositionsService.findByKey(key);
    if (!composition) throw new NotFoundException(`Composición '${key}' no encontrada.`);
    return composition;
  }

  @Post()
  upsert(@Body() body: UpsertCompositionDto) {
    return this.compositionsService.upsert(body);
  }

  @Put(':key')
  update(@Param('key') key: string, @Body() body: UpdateCompositionDto) {
    body.key = key;
    return this.compositionsService.upsert(body);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('key') key: string) {
    const deleted = await this.compositionsService.deleteByKey(key);
    if (!deleted) throw new NotFoundException(`Composición '${key}' no encontrada.`);
  }

  @Post('seed')
  seed() {
    return this.compositionsService.seed();
  }
}
