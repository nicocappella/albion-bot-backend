import { Injectable, Logger } from '@nestjs/common';
import { type NewsChannel, type TextChannel } from 'discord.js';
import type { SlashCommandContext } from 'necord';
import { Context, Options, SlashCommand } from 'necord';
import { MembersService } from '../../../members/members.service';
import { EventSignupService } from '../../features/event-signup/event-signup.service';
import { CrearEventoDto } from './dto/event.dto';

@Injectable()
export class GuildCommands {
  private readonly logger = new Logger(GuildCommands.name);

  constructor(
    private readonly membersService: MembersService,
    private readonly eventSignupService: EventSignupService,
  ) {}

  // @SlashCommand({
  //   name: 'guild-info',
  //   description: 'Muestra información de la guild configurada',
  // })
  // public async getGuildInfo(
  //   @Context() [interaction]: SlashCommandContext,
  // ): Promise<void> {
  //   const overview = await this.guildService.getOverview();
  //   const membersSummary = this.membersService.getSummary(5);

  //   const focusText = overview.focus.length
  //     ? overview.focus.join(', ')
  //     : 'No definido';
  //   const allianceText = overview.alliance ?? 'Sin alianza';
  //   const lastSyncText = membersSummary.lastSync
  //     ? `<t:${Math.floor(membersSummary.lastSync.getTime() / 1000)}:R>`
  //     : 'Nunca';
  //   const membersPreview = membersSummary.sample.length
  //     ? membersSummary.sample
  //         .map((member) => {
  //           const role = member.role ? ` • ${member.role}` : '';
  //           return `• ${member.ingameName}${role}`;
  //         })
  //         .join('\n')
  //     : 'Añade miembros para ver un resumen aquí.';

  //   const embed = new EmbedBuilder()
  //     .setTitle(overview.name)
  //     .setDescription(overview.description ?? 'Sin descripción disponible.')
  //     .setColor(0x2ecc71)
  //     .addFields(
  //       { name: 'Alianza', value: allianceText, inline: true },
  //       { name: 'Idioma', value: overview.language, inline: true },
  //       { name: 'Enfoque', value: focusText, inline: false },
  //       {
  //         name: `Miembros (${membersSummary.totalMembers})`,
  //         value: membersPreview,
  //         inline: false,
  //       },
  //       { name: 'Última sincronización', value: lastSyncText, inline: true },
  //     )
  //     .setTimestamp(membersSummary.lastSync ?? new Date());

  //   await interaction.reply({
  //     embeds: [embed],
  //     ephemeral: true,
  //   });
  // }

  @SlashCommand({
    name: 'crear-evento',
    description: 'Crea un CTA con inscripción interactiva',
  })
  public async crearEvento(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: CrearEventoDto,
  ): Promise<void> {
    const { lugar, dia, horaUtc, composicion } = options;
    const channel = interaction.channel;

    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      await interaction.reply({
        content:
          'No puedo crear eventos fuera de un canal de texto del servidor.',
        ephemeral: true,
      });
      return;
    }

    if (channel.isThread() || !('send' in channel)) {
      await interaction.reply({
        content:
          'Usá el comando en un canal de texto (no dentro de un hilo) para crear el evento.',
        ephemeral: true,
      });
      return;
    }

    const parsed = this.eventSignupService.parseFromParts(lugar, dia, horaUtc);
    if (!parsed) {
      await interaction.reply({
        content:
          'Formato inválido. Ingresá la hora como `HH:mm` (UTC) y, opcionalmente, el día (ej. `mañana`, `+2`).',
        ephemeral: true,
      });
      return;
    }

    try {
      const { eventName } = await this.eventSignupService.createEventMessage(
        channel as TextChannel | NewsChannel,
        parsed,
        composicion,
        interaction.user.id,
      );

      await interaction.reply({
        content: `Evento creado ✅. Mensaje publicado: **${eventName}**`,
        ephemeral: true,
      });
      this.logger.log(
        `Evento creado por slash command en canal ${channel.id} | evento ${eventName}`,
      );
    } catch (error) {
      this.logger.error(
        `Error creando evento via slash command: ${(error as Error).message}`,
        error as Error,
      );
      await interaction.reply({
        content:
          'No pude crear el evento. Verificá que tengo permisos para enviar mensajes en este canal.',
        ephemeral: true,
      });
    }
  }
}
