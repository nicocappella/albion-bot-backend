import { Injectable, Logger } from '@nestjs/common';
import {
  Button,
  type ButtonContext,
  ComponentParam,
  Context,
  SelectedStrings,
  StringSelect,
  type StringSelectContext,
} from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
  type TextChannel,
} from 'discord.js';
import { EventSignupService } from './event-signup.service';

@Injectable()
export class EventSignupComponents {
  private readonly logger = new Logger(EventSignupComponents.name);

  constructor(private readonly signupService: EventSignupService) {}

  // ─── Selector de slot ────────────────────────────────────────────────────────

  @StringSelect('event-signup/entry/:compositionKey')
  async onEntrySelected(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() selected: string[],
    @ComponentParam('compositionKey') compositionKey: string,
  ): Promise<void> {
    const entryKey = selected[0];
    if (!entryKey) {
      await interaction.reply({
        content: 'No pude identificar la build seleccionada.',
        ephemeral: true,
      });
      return;
    }

    // Validación previa sin modificar estado
    const check = await this.signupService.checkEntryAvailability(
      interaction.message,
      interaction.user.id,
      compositionKey,
      entryKey,
    );

    if (!check.ok) {
      await interaction.reply({ content: check.message, ephemeral: true });
      return;
    }

    // Obtener entry y construir preview
    const entry = await this.signupService.findEntry(compositionKey, entryKey);
    if (!entry) {
      await interaction.reply({
        content: 'No encontré esa build en la composición.',
        ephemeral: true,
      });
      return;
    }

    const previewEmbed = this.signupService.buildPreviewEmbed(entry);

    // custom ID para el botón confirmar incluye messageId para recuperar el mensaje original
    const messageId = interaction.message.id;
    const confirmId = `event-signup/preview-confirm/${compositionKey}/${entryKey}/${messageId}`;

    const row =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(confirmId)
          .setLabel('✅ Confirmar')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('event-signup/preview-cancel')
          .setLabel('❌ Cancelar')
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.reply({
      embeds: [previewEmbed],
      components: [row],
      ephemeral: true,
    });
  }

  // ─── Confirm / Cancel de preview ─────────────────────────────────────────────

  @Button('event-signup/preview-confirm/:compositionKey/:entryKey/:messageId')
  async onPreviewConfirm(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('compositionKey') compositionKey: string,
    @ComponentParam('entryKey') entryKey: string,
    @ComponentParam('messageId') messageId: string,
  ): Promise<void> {
    // Ack el botón del ephemeral
    await interaction.deferUpdate();

    try {
      // Recuperar el mensaje original del evento desde el canal
      const channel = interaction.channel as TextChannel | null;
      if (!channel) {
        await interaction.followUp({
          content: 'No pude acceder al canal del evento.',
          ephemeral: true,
        });
        return;
      }

      const eventMessage = await channel.messages
        .fetch(messageId)
        .catch(() => null);

      if (!eventMessage) {
        await interaction.followUp({
          content: 'No pude encontrar el mensaje del evento. ¿Fue eliminado?',
          ephemeral: true,
        });
        return;
      }

      const result = await this.signupService.handleEntrySelection(
        eventMessage,
        interaction.user.id,
        compositionKey,
        entryKey,
      );

      if (result.ok) {
        // Reemplazar el preview por confirmación y cerrar el ephemeral
        await interaction.editReply({
          content: '✅ ¡Te inscribiste correctamente! Revisá el mensaje del evento.',
          embeds: [],
          components: [],
        });
      } else {
        await interaction.followUp({
          content: result.message ?? '❌ No se pudo completar la inscripción.',
          ephemeral: true,
        });
      }
    } catch (error) {
      this.logger.error(
        'Error confirmando inscripción desde preview',
        error as Error,
      );
      await interaction.followUp({
        content: '❌ Ocurrió un error al inscribirse. Intentá de nuevo.',
        ephemeral: true,
      });
    }
  }

  @Button('event-signup/preview-cancel')
  async onPreviewCancel(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    // Solo cierra el ephemeral sin hacer nada
    await interaction.deferUpdate();
  }

  // ─── Botones del evento ───────────────────────────────────────────────────────

  @Button('event-signup/change/:compositionKey')
  async onChangeSlot(@Context() [interaction]: ButtonContext): Promise<void> {
    await interaction.reply({
      content:
        'Usá el selector del mensaje para elegir otra build disponible. Si ya estabas anotado, te mueve automáticamente.',
      ephemeral: true,
    });
  }

  @Button('event-signup/leave/:compositionKey')
  async onLeave(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('compositionKey') compositionKey: string,
  ): Promise<void> {
    await interaction.deferUpdate();

    try {
      const result = await this.signupService.handleLeave(
        interaction.message,
        interaction.user.id,
        compositionKey,
      );

      if (!result.ok && result.message) {
        await interaction.followUp({
          content: result.message,
          ephemeral: true,
        });
      }
    } catch (error) {
      this.logger.error('Error procesando salida de evento', error as Error);
      await interaction.followUp({
        content: 'No pude actualizar tu salida del evento.',
        ephemeral: true,
      });
    }
  }

  @Button('event-signup/close/:compositionKey')
  async onClose(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('compositionKey') compositionKey: string,
  ): Promise<void> {
    await interaction.deferUpdate();

    try {
      const result = await this.signupService.handleClose(
        interaction.message,
        interaction.user.id,
        compositionKey,
      );

      if (!result.ok && result.message) {
        await interaction.followUp({
          content: result.message,
          ephemeral: true,
        });
      }
    } catch (error) {
      this.logger.error('Error cerrando evento', error as Error);
      await interaction.followUp({
        content: 'No pude cerrar el evento.',
        ephemeral: true,
      });
    }
  }
}
