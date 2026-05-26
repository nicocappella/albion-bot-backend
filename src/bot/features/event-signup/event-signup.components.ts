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
import { EventSignupService } from './event-signup.service';

@Injectable()
export class EventSignupComponents {
  private readonly logger = new Logger(EventSignupComponents.name);

  constructor(private readonly signupService: EventSignupService) {}

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

    await interaction.deferUpdate();

    try {
      const result = await this.signupService.handleEntrySelection(
        interaction.message,
        interaction.user.id,
        compositionKey,
        entryKey,
      );

      if (!result.ok && result.message) {
        await interaction.followUp({
          content: result.message,
          ephemeral: true,
        });
      }
    } catch (error) {
      this.logger.error('Error procesando selección de build', error as Error);
      await interaction.followUp({
        content: 'No pude actualizar la inscripción.',
        ephemeral: true,
      });
    }
  }

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
