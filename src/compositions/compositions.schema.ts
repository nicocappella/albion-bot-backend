import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type {
  BuildItemSlot,
  EventComposition,
  EventCompositionEntry,
} from '../events/event-composition';

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

@Schema({ _id: false })
export class BuildItemDocument {
  @Prop({ required: true })
  name!: string;

  /** ID único del item en la API de Albion (para imagen via render API) */
  @Prop()
  itemUniqueName?: string;

  @Prop()
  slot?: BuildItemSlot;
}

@Schema({ _id: false })
export class CompositionEntryDocument {
  @Prop({ required: true })
  key!: string;

  @Prop({ required: true })
  role!: string;

  @Prop({ required: true })
  build!: string;

  @Prop({ required: true, default: 1 })
  capacity!: number;

  @Prop()
  label?: string;

  @Prop()
  emoji?: string;

  @Prop()
  emojiKey?: string;

  /**
   * Referencia a un Build en la colección `builds`.
   * Si está presente, buildItems se hidrata automáticamente al consultar.
   */
  @Prop()
  buildKey?: string;

  /** Lista de items estructurados con soporte de imágenes */
  @Prop({ type: [BuildItemDocument], default: [] })
  buildItems?: BuildItemDocument[];
}

// ─── Root document ────────────────────────────────────────────────────────────

export type CompositionDocument = HydratedDocument<Composition>;

@Schema({ collection: 'compositions', timestamps: true })
export class Composition {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: '' })
  description?: string;

  @Prop({ type: [CompositionEntryDocument], default: [] })
  entries!: CompositionEntryDocument[];
}

export const CompositionSchema = SchemaFactory.createForClass(Composition);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convierte un documento Mongoose al tipo de dominio EventComposition */
export function toEventComposition(doc: CompositionDocument): EventComposition {
  return {
    key: doc.key,
    name: doc.name,
    description: doc.description,
    entries: (doc.entries ?? []).map(
      (entry): EventCompositionEntry => ({
        key: entry.key,
        role: entry.role,
        build: entry.build,
        capacity: entry.capacity,
        label: entry.label,
        emoji: entry.emoji,
        emojiKey: entry.emojiKey,
        buildKey: entry.buildKey,
        buildItems:
          entry.buildItems?.map((item) => ({
            name: item.name,
            itemUniqueName: item.itemUniqueName,
            slot: item.slot,
          })) ?? [],
      }),
    ),
  };
}
