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
import { BuildService } from './build.service';
import { UpsertBuildDto, UpdateBuildDto } from './dto/upsert-build.dto';

@Controller('builds')
export class BuildController {
  constructor(private readonly buildService: BuildService) {}

  @Get()
  findAll() {
    return this.buildService.findAll();
  }

  @Get(':key')
  async findOne(@Param('key') key: string) {
    const build = await this.buildService.findByKey(key);
    if (!build) throw new NotFoundException(`Build '${key}' no encontrado.`);
    return build;
  }

  @Post()
  upsert(@Body() body: UpsertBuildDto) {
    return this.buildService.upsert(body);
  }

  @Put(':key')
  update(@Param('key') key: string, @Body() body: UpdateBuildDto) {
    return this.buildService.upsert({ ...body, key });
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('key') key: string) {
    const deleted = await this.buildService.deleteByKey(key);
    if (!deleted) throw new NotFoundException(`Build '${key}' no encontrado.`);
  }
}
