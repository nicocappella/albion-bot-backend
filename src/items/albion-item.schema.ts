import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type { BuildItemSlot } from '../events/event-composition';

export type AlbionItemDocument = HydratedDocument<AlbionItem>;

/**
 * Catálogo de items de Albion Online.
 * Cada item tiene un itemUniqueName único que sirve como clave
 * y para obtener la imagen via la render API:
 * https://render.albiononline.com/v1/item/{itemUniqueName}.png
 */
@Schema({ collection: 'albion_items', timestamps: true })
export class AlbionItem {
  /** ID único del item en Albion (ej: "T8_MAIN_MACE"). Sirve como clave de render API. */
  @Prop({ required: true, unique: true })
  itemUniqueName!: string;

  /** Nombre para mostrar (ej: "Maza 1h", "Judi Armor", "Martlock Cape") */
  @Prop({ required: true })
  name!: string;

  /** Slot del equipo donde se usa el item */
  @Prop({ required: true })
  slot!: BuildItemSlot;

  /** Tier del item (1-8). Opcional, solo informativo. */
  @Prop({ min: 1, max: 8 })
  tier?: number;

  /** Tags opcionales para búsqueda en el frontend (ej: ["tank", "burst", "group"]) */
  @Prop({ type: [String], default: [] })
  tags?: string[];
}

export const AlbionItemSchema = SchemaFactory.createForClass(AlbionItem);
