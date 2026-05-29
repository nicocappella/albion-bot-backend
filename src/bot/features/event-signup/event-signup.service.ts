import { Injectable, Logger } from '@nestjs/common';
import type {
  Message,
  MessageActionRowComponentBuilder,
  NewsChannel,
  TextChannel,
} from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { EventsService } from '../../../events/events.service';
import type {
  BuildItem,
  EventComposition,
  EventCompositionEntry,
} from '../../../events/event-composition';
import { AlbionEmojisService } from '../albion-emojis/albion-emojis.service';
import {
  parseEventoArgsUTC,
  type EventCommandArgs,
} from './event-signup.parser';

const ROLE_COLORS: Record<string, number> = {
  Tanque: 0x3498db,
  Healer: 0x2ecc71,
  DPS: 0xe74c3c,
  Soporte: 0x9b59b6,
  Montura: 0xf39c12,
};

const SLOT_LABELS: Record<string, string> = {
  weapon: '⚔️ Arma',
  offhand: '🛡️ Offhand',
  head: '🪖 Cabeza',
  chest: '👕 Pecho',
  shoes: '👟 Pies',
  cape: '🌊 Cape',
  food: '🍖 Comida',
  potion: '💊 Poción',
  mount: '🐎 Montura',
};

interface SignupThreadRecord {
  postId: string;
  threadId: string;
  channelId: string;
  lugar: string;
  epoch: number;
  compositionKey: string;
}

interface ThreadMessageContext {
  message: Message;
  parentMessage: Message;
  thread: SignupThreadRecord;
}

interface EventMessageMetadata {
  creatorUserId: string | null;
  location: string;
  day: string;
  time: string;
}

type CompositionParticipants = Map<string, string[]>;

export interface SignupActionResult {
  ok: boolean;
  message?: string;
}

@Injectable()
export class EventSignupService {
  private readonly logger = new Logger(EventSignupService.name);
  private readonly threads = new Map<string, SignupThreadRecord>();

  constructor(
    private readonly eventsService: EventsService,
    private readonly albionEmojisService: AlbionEmojisService,
  ) {}

  parseCommand(text: string) {
    return parseEventoArgsUTC(text);
  }

  parseFromParts(lugar: string, dayRaw: string | undefined, timeRaw: string) {
    const parts = [lugar];
    if (dayRaw && dayRaw.trim().length > 0) {
      parts.push(dayRaw.trim());
    }
    parts.push(timeRaw);

    return parseEventoArgsUTC(`event ${parts.join(' | ')}`);
  }

  buildEventName(lugar: string, utcLabel: string): string {
    return `CTA • ${lugar} • ${utcLabel}`;
  }

  async createEventMessage(
    channel: TextChannel | NewsChannel,
    parsed: EventCommandArgs,
    compositionKey: string | undefined,
    creatorUserId: string,
  ): Promise<{
    postId: string;
    eventName: string;
  }> {
    const composition = await this.resolveComposition(compositionKey);
    const renderedComposition = await this.albionEmojisService.withGuildEmojis(
      composition,
      channel.guild,
    );
    const participants = this.createEmptyParticipants(composition);
    const embed = this.buildSignupEmbed({
      composition: renderedComposition,
      participants,
      closed: false,
      metadata: {
        creatorUserId,
        location: parsed.lugar,
        day: parsed.dayLabel,
        time: `${parsed.utcLabel} — <t:${parsed.epoch}:R>`,
      },
    });

    const post = await channel.send({
      content: '@everyone',
      embeds: [embed],
      components: this.buildSignupComponents(renderedComposition, embed),
    });

    return {
      postId: post.id,
      eventName: this.buildEventName(parsed.lugar, parsed.utcLabel),
    };
  }

  trackThread(record: SignupThreadRecord): void {
    this.threads.set(record.threadId, record);
  }

  getThreadById(threadId: string): SignupThreadRecord | undefined {
    return this.threads.get(threadId);
  }

  async handleEntrySelection(
    message: Message,
    userId: string,
    compositionKey: string,
    entryKey: string,
  ): Promise<SignupActionResult> {
    const composition = await this.resolveComposition(compositionKey);

    if (this.isEventClosed(message)) {
      return { ok: false, message: '🔒 Las inscripciones están cerradas.' };
    }

    const entry = composition.entries.find((item) => item.key === entryKey);
    if (!entry) {
      return {
        ok: false,
        message: 'No encontré esa build en la composición.',
      };
    }

    const participants = this.extractParticipants(message, composition);
    const entryParticipants = participants.get(entry.key) ?? [];
    const alreadyInEntry = entryParticipants.includes(userId);

    if (!alreadyInEntry && entryParticipants.length >= entry.capacity) {
      return { ok: false, message: '❌ Esa build ya está llena.' };
    }

    this.removeUserFromAllEntries(participants, userId);
    participants.set(entry.key, [
      ...(participants.get(entry.key) ?? []),
      userId,
    ]);

    try {
      await this.updateSignupMessage(message, composition, participants, false);
    } catch (error) {
      this.logger.error(
        'Error al actualizar el mensaje del evento:',
        error as Error,
      );
      return {
        ok: false,
        message:
          '❌ No pude actualizar el mensaje del evento. ¿El bot tiene permisos?',
      };
    }

    return { ok: true };
  }

  async handleLeave(
    message: Message,
    userId: string,
    compositionKey: string,
  ): Promise<SignupActionResult> {
    const composition = await this.resolveComposition(compositionKey);

    if (this.isEventClosed(message)) {
      return { ok: false, message: '🔒 Las inscripciones están cerradas.' };
    }

    const participants = this.extractParticipants(message, composition);
    const currentEntry = this.findUserEntry(participants, userId, composition);
    if (!currentEntry) {
      return { ok: false, message: 'No estás asignado en ninguna build.' };
    }

    this.removeUserFromAllEntries(participants, userId);
    await this.updateSignupMessage(message, composition, participants, false);

    return { ok: true };
  }

  async handleClose(
    message: Message,
    userId: string,
    compositionKey: string,
  ): Promise<SignupActionResult> {
    const composition = await this.resolveComposition(compositionKey);
    const metadata = this.extractMessageMetadata(message);

    if (!metadata.creatorUserId) {
      return {
        ok: false,
        message: 'No pude identificar al creador del evento.',
      };
    }

    if (metadata.creatorUserId !== userId) {
      return {
        ok: false,
        message: '❌ Solo el creador puede cerrar el evento.',
      };
    }

    if (this.isEventClosed(message)) {
      return { ok: false, message: 'El evento ya está cerrado.' };
    }

    const participants = this.extractParticipants(message, composition);
    await this.updateSignupMessage(message, composition, participants, true);

    return { ok: true };
  }

  buildSignupComponents(
    composition: EventComposition,
    messageOrEmbed?: Message | EmbedBuilder,
  ) {
    const participants = messageOrEmbed
      ? this.extractParticipants(messageOrEmbed, composition)
      : this.createEmptyParticipants(composition);
    const closed = messageOrEmbed ? this.isEventClosed(messageOrEmbed) : false;
    const availableEntries = composition.entries.filter((entry) => {
      const current = participants.get(entry.key) ?? [];
      return current.length < entry.capacity;
    });

    const entrySelect =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`event-signup/entry/${composition.key}`)
          .setPlaceholder(
            availableEntries.length > 0
              ? 'Anotarme / cambiar build'
              : 'Sin cupos disponibles',
          )
          .setDisabled(closed || availableEntries.length === 0)
          .addOptions(
            composition.entries.map((entry) => {
              const current = participants.get(entry.key) ?? [];
              const option = {
                label: this.truncate(
                  `${this.getEntryLabel(entry)} [${current.length}/${entry.capacity}]`,
                  100,
                ),
                value: entry.key,
                description: this.truncate(entry.role, 100),
                default: false,
                disabled: closed || current.length >= entry.capacity,
              };

              return entry.emoji
                ? {
                    ...option,
                    emoji: entry.emoji,
                  }
                : option;
            }),
          ),
      );

    const actions =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`event-signup/change/${composition.key}`)
          .setLabel('Cambiar build')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(closed),
        new ButtonBuilder()
          .setCustomId(`event-signup/leave/${composition.key}`)
          .setLabel('Salir')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(closed),
        new ButtonBuilder()
          .setCustomId(`event-signup/close/${composition.key}`)
          .setLabel('Cerrar evento')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(closed),
      );

    return [entrySelect, actions];
  }

  async handleThreadMessage({
    message,
    parentMessage,
    thread,
  }: ThreadMessageContext): Promise<string | null> {
    this.logger.debug(
      `Procesando mensaje en thread ${thread.threadId} para ${thread.lugar}`,
    );

    const userId = message.author.id;
    const userTag = `<@${userId}>`;
    const raw = message.content.trim();
    const lower = raw.toLowerCase();

    const lines = parentMessage.content.split('\n');

    const updatePostContent = async (updatedLines: string[]): Promise<void> => {
      await parentMessage.edit({ content: updatedLines.join('\n') });
    };

    const removeSpecificMatch = lower.match(/^-(\d{1,2})$/);
    if (removeSpecificMatch) {
      const slotNumber = Number.parseInt(removeSpecificMatch[1], 10);

      const idx = this.findLegacySlotIndex(lines, slotNumber);
      if (idx === -1) {
        return 'No se encontró ese número de slot en la lista.';
      }

      if (!lines[idx].includes(userTag)) {
        return `No estás asignado en el slot ${slotNumber}.`;
      }

      lines[idx] = this.clearLegacySlotLine(lines[idx]);
      await updatePostContent(lines);
      return `🗑️ ${userTag} eliminado del slot ${slotNumber}.`;
    }

    if (/^(-|leave|salir)$/.test(lower)) {
      const currentIndex = lines.findIndex((line) => line.includes(userTag));
      if (currentIndex === -1) {
        return 'No estás asignado en ningún slot.';
      }

      const slotMatch = lines[currentIndex].match(/^\*\*\((\d{1,2})\)\*\*/);
      const currentSlot = slotMatch ? Number.parseInt(slotMatch[1], 10) : '?';

      lines[currentIndex] = this.clearLegacySlotLine(lines[currentIndex]);
      await updatePostContent(lines);

      return `🗑️ ${userTag} eliminado del slot ${currentSlot}.`;
    }

    const match = raw.match(/^(\d{1,2})\s*(?:[+:-]\s*)?(.*)$/i);
    if (!match) {
      return 'Formato inválido. Ej: 1, 2 o 3';
    }

    const slotNumber = Number.parseInt(match[1], 10);
    const roleText = (match[2] || '').trim();

    const targetIndex = this.findLegacySlotIndex(lines, slotNumber);
    if (targetIndex === -1) {
      return 'No se encontró ese número de slot en la lista.';
    }

    const currentIndexOfUser = lines.findIndex((line) =>
      line.includes(userTag),
    );
    if (currentIndexOfUser !== -1 && currentIndexOfUser !== targetIndex) {
      lines[currentIndexOfUser] = this.clearLegacySlotLine(
        lines[currentIndexOfUser],
      );
    }

    const existingMentionMatch = lines[targetIndex].match(/<@!?(\d+)>/);
    const someoneElseInSlot =
      existingMentionMatch && existingMentionMatch[1] !== userId;

    if (someoneElseInSlot) {
      return 'Ese slot ya está ocupado por otra persona.';
    }

    lines[targetIndex] = this.assignLegacySlotLine(
      lines[targetIndex],
      userTag,
      roleText,
    );

    await updatePostContent(lines);
    return `✅ ${userTag} asignado al slot ${slotNumber}${
      roleText ? ` (${roleText})` : ''
    }.`;
  }

  // ─── Build preview ───────────────────────────────────────────────────────────

  /**
   * Devuelve el entry de la composición por key, o undefined si no existe.
   */
  async findEntry(
    compositionKey: string,
    entryKey: string,
  ): Promise<EventCompositionEntry | undefined> {
    const composition = await this.resolveComposition(compositionKey);
    return composition.entries.find((e) => e.key === entryKey);
  }

  /**
   * Verifica si el evento está cerrado sin modificar estado.
   */
  checkIsEventClosed(message: Message): boolean {
    return this.isEventClosed(message);
  }

  /**
   * Verifica si el slot tiene capacidad disponible para el usuario.
   * No modifica estado; solo retorna ok/error.
   */
  async checkEntryAvailability(
    message: Message,
    userId: string,
    compositionKey: string,
    entryKey: string,
  ): Promise<SignupActionResult> {
    if (this.isEventClosed(message)) {
      return { ok: false, message: '🔒 Las inscripciones están cerradas.' };
    }

    const composition = await this.resolveComposition(compositionKey);
    const entry = composition.entries.find((e) => e.key === entryKey);
    if (!entry) {
      return { ok: false, message: 'No encontré esa build en la composición.' };
    }

    const participants = this.extractParticipants(message, composition);
    const entryParticipants = participants.get(entry.key) ?? [];
    const alreadyInEntry = entryParticipants.includes(userId);

    if (!alreadyInEntry && entryParticipants.length >= entry.capacity) {
      return { ok: false, message: '❌ Esa build ya está llena.' };
    }

    return { ok: true };
  }

  /**
   * Construye el embed de preview de una build para mostrar antes de confirmar.
   * La imagen del arma se obtiene de la render API de Albion via emojiKey.
   */
  buildPreviewEmbed(entry: EventCompositionEntry): EmbedBuilder {
    const label = entry.label ?? `${entry.role} — ${entry.build}`;
    const color = ROLE_COLORS[entry.role] ?? 0x95a5a6;

    const weaponImageUrl = entry.emojiKey
      ? this.albionEmojisService.getWeaponRenderUrl(entry.emojiKey)
      : null;

    const embed = new EmbedBuilder()
      .setTitle(`${entry.emoji ?? '🎯'} ${label}`)
      .setColor(color)
      .addFields({ name: '🎭 Rol', value: entry.role, inline: true });

    const itemsText = this.buildItemsText(entry);
    if (itemsText) {
      embed.addFields({
        name: '📋 Equipamiento',
        value: itemsText,
        inline: false,
      });
    } else {
      embed.addFields({
        name: '📋 Equipamiento',
        value: '*Sin detalles aún. Consultá a un officer.*',
        inline: false,
      });
    }

    if (weaponImageUrl) {
      embed.setThumbnail(weaponImageUrl);
    }

    embed.setFooter({ text: '¿Podés jugar esta build?' });

    return embed;
  }

  private buildItemsText(entry: EventCompositionEntry): string {
    if (!entry.buildItems || entry.buildItems.length === 0) return '';

    return entry.buildItems
      .map((item: BuildItem) => {
        const slotLabel = item.slot
          ? (SLOT_LABELS[item.slot] ?? item.slot)
          : '•';
        // Si tiene itemUniqueName, el nombre es un link clickeable a la imagen
        const nameText = item.itemUniqueName
          ? `[${item.name}](https://render.albiononline.com/v1/item/${item.itemUniqueName}.png)`
          : `**${item.name}**`;
        return `${slotLabel}: ${nameText}`;
      })
      .join('\n');
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  private async resolveComposition(
    compositionKey?: string,
  ): Promise<EventComposition> {
    const composition = compositionKey
      ? await this.eventsService.findCompositionByKey(compositionKey)
      : await this.eventsService.getDefaultComposition();

    if (!composition) {
      throw new Error(`Composición no encontrada: ${compositionKey}`);
    }

    return composition;
  }

  private buildSignupEmbed({
    composition,
    participants,
    closed,
    metadata,
  }: {
    composition: EventComposition;
    participants: CompositionParticipants;
    closed: boolean;
    metadata: EventMessageMetadata;
  }): EmbedBuilder {
    const totals = this.getParticipantTotals(composition, participants);

    return new EmbedBuilder()
      .setTitle(`⚔️ ${composition.name}`)
      .setDescription(
        [
          closed
            ? '🔒 **Inscripciones cerradas**'
            : '🟢 **Inscripciones abiertas**',
          'Usen el selector para anotarse o cambiar de build.',
        ].join('\n'),
      )
      .setColor(closed ? 0x555555 : 0xff3c3c)
      .addFields(
        {
          name: '📍 Lugar',
          value: metadata.location,
          inline: true,
        },
        {
          name: '📅 Día',
          value: metadata.day,
          inline: true,
        },
        {
          name: '🕒 Horario UTC',
          value: metadata.time,
          inline: false,
        },
        {
          name: '👑 Creador',
          value: metadata.creatorUserId
            ? `<@${metadata.creatorUserId}>`
            : 'Desconocido',
          inline: true,
        },
        {
          name: '👥 Cupos',
          value: `${totals.current}/${totals.capacity}`,
          inline: true,
        },
        ...this.buildCompositionFields(composition, participants),
      )
      .setFooter({
        text: `composition:${composition.key} • status:${closed ? 'closed' : 'open'}`,
      })
      .setTimestamp();
  }

  private buildCompositionFields(
    composition: EventComposition,
    participants: CompositionParticipants,
  ): { name: string; value: string; inline: boolean }[] {
    return composition.entries.map((entry) => {
      const users = participants.get(entry.key) ?? [];

      return {
        name: this.truncate(
          `${this.getEntryDisplayLabel(entry)} [${users.length}/${entry.capacity}]`,
          256,
        ),
        value: [
          `*id:${entry.key}*`,
          users.length
            ? users.map((id) => `✅ <@${id}>`).join('\n')
            : '❌ Vacío',
        ].join('\n'),
        inline: true,
      };
    });
  }

  private async updateSignupMessage(
    message: Message,
    composition: EventComposition,
    participants: CompositionParticipants,
    closed: boolean,
  ): Promise<void> {
    const metadata = this.extractMessageMetadata(message);
    const renderedComposition = await this.albionEmojisService.withGuildEmojis(
      composition,
      message.guild,
    );
    const embed = this.buildSignupEmbed({
      composition: renderedComposition,
      participants,
      closed,
      metadata,
    });

    await message.edit({
      embeds: [embed],
      components: this.buildSignupComponents(renderedComposition, embed),
    });
  }

  private createEmptyParticipants(
    composition: EventComposition,
  ): CompositionParticipants {
    return new Map(composition.entries.map((entry) => [entry.key, []]));
  }

  private extractParticipants(
    messageOrEmbed: Message | EmbedBuilder,
    composition: EventComposition,
  ): CompositionParticipants {
    const participants = this.createEmptyParticipants(composition);
    const embed = this.getEventEmbed(messageOrEmbed);
    if (!embed?.fields) return participants;

    for (const field of embed.fields) {
      const entryMatch =
        field.value.match(/\*id:([^*]+)\*/) ??
        field.name.match(/^\[([^\]]+)\]/);
      if (!entryMatch) continue;

      const entryKey = entryMatch[1];
      if (!participants.has(entryKey)) continue;

      const mentions = [...field.value.matchAll(/<@!?(\d+)>/g)].map(
        (match) => match[1],
      );
      if (mentions.length === 0) continue;

      participants.set(entryKey, mentions);
    }

    return participants;
  }

  private extractMessageMetadata(message: Message): EventMessageMetadata {
    const embed = this.getEventEmbed(message);
    const creatorField = embed?.fields?.find(
      (field) => field.name === '👑 Creador',
    );
    const creatorMatch = creatorField?.value.match(/<@!?(\d+)>/);

    return {
      creatorUserId: creatorMatch?.[1] ?? null,
      location:
        embed?.fields?.find((field) => field.name === '📍 Lugar')?.value ??
        'Sin definir',
      day:
        embed?.fields?.find((field) => field.name === '📅 Día')?.value ??
        'Sin definir',
      time:
        embed?.fields?.find((field) => field.name === '🕒 Horario UTC')
          ?.value ?? 'Sin definir',
    };
  }

  private isEventClosed(messageOrEmbed: Message | EmbedBuilder): boolean {
    const embed = this.getEventEmbed(messageOrEmbed);
    return (
      embed?.footer?.text?.includes('status:closed') === true ||
      embed?.description?.includes('Inscripciones cerradas') === true
    );
  }

  private removeUserFromAllEntries(
    participants: CompositionParticipants,
    userId: string,
  ): void {
    for (const [entryKey, users] of participants.entries()) {
      participants.set(
        entryKey,
        users.filter((id) => id !== userId),
      );
    }
  }

  private findUserEntry(
    participants: CompositionParticipants,
    userId: string,
    composition: EventComposition,
  ): EventCompositionEntry | null {
    const entryKey = [...participants.entries()].find(([, users]) =>
      users.includes(userId),
    )?.[0];

    return composition.entries.find((entry) => entry.key === entryKey) ?? null;
  }

  private getEntryLabel(entry: EventCompositionEntry): string {
    return entry.label ?? `${entry.role} - ${entry.build}`;
  }

  private getEntryDisplayLabel(entry: EventCompositionEntry): string {
    const label = this.getEntryLabel(entry);
    return entry.emoji ? `${entry.emoji} ${label}` : label;
  }

  private getParticipantTotals(
    composition: EventComposition,
    participants: CompositionParticipants,
  ): { current: number; capacity: number } {
    return composition.entries.reduce(
      (totals, entry) => ({
        current: totals.current + (participants.get(entry.key)?.length ?? 0),
        capacity: totals.capacity + entry.capacity,
      }),
      { current: 0, capacity: 0 },
    );
  }

  private getEventEmbed(messageOrEmbed: Message | EmbedBuilder) {
    if (messageOrEmbed instanceof EmbedBuilder) {
      return messageOrEmbed.toJSON();
    }

    return messageOrEmbed.embeds[0]?.toJSON();
  }

  private truncate(value: string, maxLength: number): string {
    return value.length > maxLength
      ? `${value.slice(0, maxLength - 1)}…`
      : value;
  }

  private findLegacySlotIndex(lines: string[], slotNumber: number): number {
    return lines.findIndex((line) => line.startsWith(`**(${slotNumber})**`));
  }

  private clearLegacySlotLine(line: string): string {
    return line.replace(/:\s*.*/, ':');
  }

  private assignLegacySlotLine(
    line: string,
    userTag: string,
    roleText?: string,
  ): string {
    const suffix = `: ${userTag}${roleText ? ` (${roleText})` : ''}`;
    return line.includes(':')
      ? line.replace(/:\s*.*/, suffix)
      : `${line}${suffix}`;
  }
}
