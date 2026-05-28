import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type { BuildItemSlot } from '../events/event-composition';

export type BuildDocument = HydratedDocument<Build>;

/**
 * Un Build es un conjunto de equipo para un rol específico.
 * Cada slot referencia un item por itemUniqueName (clave de la render API de Albion).
 *
 * Los builds son creados/editados desde el frontend y luego referenciados
 * por las composiciones de eventos.
 */
@Schema({ collection: 'builds', timestamps: true })
export class Build {
  /** Clave única (slug) del build, ej: "maza-1h-tank", "caballero-ga" */
  @Prop({ required: true, unique: true })
  key!: string;

  /** Nombre para mostrar, ej: "Maza 1h", "GA Caballero" */
  @Prop({ required: true })
  name!: string;

  /** Rol principal del build (ej: "Tanque", "Healer", "DPS") */
  @Prop({ required: true })
  role!: string;

  /**
   * Clave del emoji en el manifiesto de albion-emojis.
   * Permite obtener la imagen del arma via render API.
   */
  @Prop()
  emojiKey?: string;

  /** Emoji Unicode para mostrar en Discord */
  @Prop()
  emoji?: string;

  // ─── Slots de equipo ───────────────────────────────────────────────────────
  // Cada slot almacena el itemUniqueName del item equipado.
  // Si el slot está vacío, el campo no existe (undefined).

  @Prop()
  weapon?: string;

  @Prop()
  offhand?: string;

  @Prop()
  head?: string;

  @Prop()
  chest?: string;

  @Prop()
  shoes?: string;

  @Prop()
  cape?: string;

  @Prop()
  food?: string;

  @Prop()
  potion?: string;

  @Prop()
  mount?: string;
}

export const BuildSchema = SchemaFactory.createForClass(Build);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Slots de equipo y sus labels para mostrar al usuario. */
export const BUILD_SLOT_LABELS: Record<BuildItemSlot, string> = {
  weapon: '⚔️ Arma',
  offhand: '🛡️ Off-hand',
  head: '🪖 Cabeza',
  chest: '🥋 Pecho',
  shoes: '👟 Botas',
  cape: '🧣 Capa',
  food: '🍖 Comida',
  potion: '🧪 Poción',
  mount: '🐴 Montura',
};

/** Devuelve todos los slots con un itemUniqueName asignado para un build. */
export function getFilledSlots(
  build: Build,
): Array<{ slot: BuildItemSlot; itemUniqueName: string }> {
  const slots: BuildItemSlot[] = [
    'weapon',
    'offhand',
    'head',
    'chest',
    'shoes',
    'cape',
    'food',
    'potion',
    'mount',
  ];
  return slots
    .filter((slot) => build[slot] != null)
    .map((slot) => ({ slot, itemUniqueName: build[slot] as string }));
}
