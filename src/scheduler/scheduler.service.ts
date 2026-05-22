import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { Client, type TextBasedChannel } from 'discord.js';

interface AlbionServerStatus {
  status: string;
  message?: string;
}

type SendableTextChannel = TextBasedChannel & {
  send: (options: { content: string }) => Promise<unknown>;
};

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private lastAlbionStatus: string | null = null;
  private warnedMissingChannel = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly client: Client,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  handleRosterSync(): void {
    this.logger.debug('Scheduler ready - plug roster sync here');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlbionServer(): Promise<void> {
    const channelId =
      this.configService.get<string>('ALBION_STATUS_CHANNEL_ID') ?? '';
    if (!channelId) {
      if (!this.warnedMissingChannel) {
        this.logger.warn(
          'ALBION_STATUS_CHANNEL_ID no configurado; omitiendo notificación de estado de Albion.',
        );
        this.warnedMissingChannel = true;
      }
      return;
    }

    const status = await this.fetchAlbionStatus();
    if (!status) return;

    const currentState = status.status.toLowerCase();
    if (currentState === 'online' && this.lastAlbionStatus !== 'online') {
      await this.notifyServerOnline(channelId, status.message);
    }

    this.lastAlbionStatus = currentState;
  }

  private async fetchAlbionStatus(): Promise<AlbionServerStatus | null> {
    try {
      const { data } = await axios.get<AlbionServerStatus>(
        'https://serverstatus.albiononline.com/servers',
        { timeout: 4000 },
      );

      if (!data?.status) {
        this.logger.warn('Respuesta de estado de Albion sin campo status.');
        return null;
      }

      return data;
    } catch (error) {
      this.logger.warn(
        `No se pudo consultar el estado de Albion: ${(error as Error).message}`,
        error as Error,
      );
      return null;
    }
  }

  private async notifyServerOnline(
    channelId: string,
    message?: string,
  ): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (
        !channel ||
        !channel.isTextBased() ||
        ('isDMBased' in channel && channel.isDMBased()) ||
        !this.canSendMessage(channel)
      ) {
        this.logger.warn(
          `Canal ${channelId} no es de texto utilizable para notificar estado de Albion.`,
        );
        return;
      }

      const mentionRaw =
        this.configService.get<string>('ALBION_STATUS_MENTION') ?? '';
      const mention = mentionRaw.trim();
      const mentionText =
        mention === 'everyone'
          ? '@everyone '
          : mention === 'here'
            ? '@here '
            : /^\d+$/.test(mention)
              ? `<@&${mention}> `
              : '';

      await channel.send({
        content: `${mentionText}🟢 Albion Online está en línea.\n${message ?? 'El servidor ya acepta conexiones.'}`,
      });
      this.logger.log('Notificación enviada: Albion online');
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar la notificación de servidor online: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  private canSendMessage(
    channel: TextBasedChannel,
  ): channel is SendableTextChannel {
    return 'send' in channel && typeof channel.send === 'function';
  }
}
