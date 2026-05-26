import { Injectable, Logger } from '@nestjs/common';
import { Context, On } from 'necord';
import type { ContextOf } from 'necord';
import {
  Client,
  type AnyThreadChannel,
  type Message,
  type NewsChannel,
  type TextChannel,
} from 'discord.js';
import { DEFAULT_EVENT_COMPOSITION_KEY } from '../../../events/event-composition';
import { EventSignupService } from './event-signup.service';

@Injectable()
export class EventSignupListener {
  private readonly logger = new Logger(EventSignupListener.name);

  constructor(
    private readonly signupService: EventSignupService,
    private readonly client: Client,
  ) {}

  @On('messageCreate')
  async onMessageCreate(
    @Context() [msg]: ContextOf<'messageCreate'>,
  ): Promise<void> {
    const message = await this.resolvePartialMessage(msg);
    if (!message || message.author?.bot) return;

    // Resolver canal/hilo por ID sin depender de getters no cacheados
    const channelId = this.extractChannelId(message);
    if (!channelId) return;

    const ch =
      this.client.channels.cache.get(channelId) ??
      (await this.client.channels.fetch(channelId).catch(() => null));
    if (!ch) return;

    // Mensajes en hilo: operar sobre el starter
    if ('isThread' in ch && ch.isThread()) {
      await this.processThreadMessage(message, ch as AnyThreadChannel);
      return;
    }

    // Mensajes en canal de texto: comando por texto
    if (ch.isTextBased() && !('isDMBased' in ch && ch.isDMBased())) {
      const content = (message.content ?? '').toLowerCase();
      if (
        content.startsWith('/crear-evento') ||
        content.startsWith('//crear-evento') ||
        content.startsWith('!crear-evento') ||
        content.startsWith('crear-evento')
      ) {
        await this.handleCreateEventCommand(
          message,
          ch as TextChannel | NewsChannel,
        );
      }
    }
  }

  private async processThreadMessage(
    message: Message,
    thread: AnyThreadChannel,
  ): Promise<void> {
    const threadId = thread.id;

    try {
      const starter = await thread.fetchStarterMessage().catch(() => null);
      if (!starter) return;
      if (starter.author?.id !== this.client.user?.id) return; // solo editamos posts del bot

      if (!this.signupService.getThreadById(threadId)) {
        this.signupService.trackThread({
          postId: starter.id,
          threadId,
          channelId: starter.channelId,
          lugar: 'CTA',
          epoch: Math.floor(starter.createdTimestamp / 1000) || 0,
          compositionKey: DEFAULT_EVENT_COMPOSITION_KEY,
        });
      }

      const record = this.signupService.getThreadById(threadId)!;
      const reply = await this.signupService.handleThreadMessage({
        message,
        parentMessage: starter as Message,
        thread: record,
      });

      if (reply) await message.reply(reply);
    } catch (error) {
      this.logger.error('Error procesando mensaje en hilo', error as Error);
    }
  }

  private async handleCreateEventCommand(
    message: Message,
    channel: TextChannel | NewsChannel,
  ): Promise<void> {
    const parsed = this.signupService.parseCommand(message.content);
    if (!parsed) {
      await message.reply(
        'Formato inválido. Usá: `/crear-evento <lugar> | [día] | HH:mm (UTC)`',
      );
      return;
    }

    try {
      const { eventName, postId } = await this.signupService.createEventMessage(
        channel,
        parsed,
        undefined,
        message.author.id,
      );
      await message.reply(
        `Evento creado ✅. Revisa el mensaje interactivo **${eventName}**.`,
      );
      this.logger.log(
        `Evento creado por mensaje: post ${postId} en canal ${channel.id}`,
      );
    } catch (error) {
      this.logger.error('Error creando evento', error as Error);
      await message.reply(
        'Algo salió mal al crear el evento. Verificá que tengo permisos para enviar mensajes.',
      );
    }
  }

  private async resolvePartialMessage(
    message: Message,
  ): Promise<Message | null> {
    if (!message.partial) return message;
    try {
      return await message.fetch();
    } catch {
      return null;
    }
  }

  private extractChannelId(msg: Message): string | null {
    const direct = msg.channelId;
    if (typeof direct === 'string' && direct.length > 0) return direct;

    const viaChannel = msg.channel?.id;
    if (typeof viaChannel === 'string' && viaChannel.length > 0)
      return viaChannel;

    const url = msg.url;
    if (typeof url === 'string') {
      const m = url.match(/\/channels\/(\d+)\/(\d+)\/(\d+)/);
      if (m && m[2]) return m[2];
    }
    return null;
  }
}
