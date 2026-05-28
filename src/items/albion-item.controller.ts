import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AlbionItemService } from './albion-item.service';
import { FilterItemsDto } from './dto/filter-items.dto';

@Controller('items')
export class AlbionItemController {
  constructor(private readonly itemService: AlbionItemService) {}

  @Get()
  findAll(@Query() query: FilterItemsDto) {
    if (query.slot) return this.itemService.findBySlot(query.slot);
    return this.itemService.findAll();
  }

  @Get(':itemUniqueName')
  async findOne(@Param('itemUniqueName') itemUniqueName: string) {
    const item = await this.itemService.findByUniqueName(itemUniqueName);
    if (!item) throw new NotFoundException(`Item '${itemUniqueName}' no encontrado.`);
    return item;
  }

  @Delete(':itemUniqueName')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('itemUniqueName') itemUniqueName: string) {
    const deleted = await this.itemService.deleteByUniqueName(itemUniqueName);
    if (!deleted) throw new NotFoundException(`Item '${itemUniqueName}' no encontrado.`);
  }

  /**
   * Fuerza una re-sincronización completa desde la OpenAlbion API.
   * Seguro de llamar múltiples veces (upsert).
   */
  @Post('sync')
  sync() {
    return this.itemService.syncFromOpenAlbion();
  }
}
