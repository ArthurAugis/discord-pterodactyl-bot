const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const ptero = require('../lib/pterodactyl');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ptero-list')
    .setDescription('Lists all Pterodactyl servers accessible via the API'),
  admin: true,
  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Fetch list of servers
      const res = await ptero.listServers();
      const data = res && res.data ? res.data : (Array.isArray(res) ? res : (res.servers || []));

      if (!data || data.length === 0) {
        await interaction.editReply('No servers found or no access via API.');
        return;
      }

      const ITEMS_PER_PAGE = 10;
      const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
      let currentPage = 0;

      // Helper to generate embed for a specific page
      const generatePage = async (page) => {
        const start = page * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageItems = data.slice(start, end);
        const summaries = pageItems.map(s => ptero.normalizeServer(s));

        const embed = new EmbedBuilder()
          .setTitle(`Pterodactyl Servers(${data.length})`)
          .setDescription(`Page ${page + 1}/${totalPages}`)
          .setColor(0x0099FF)
          .setTimestamp();

        const fields = summaries.map(s => {
          const name = s.name || '(no name)';
          const id = s.identifier || s.uuid?.substring(0, 8) || '?';
          let statusIcon = '⚫';
          const st = (s.status || '').toLowerCase();

          if (st === 'online' || st === 'running') statusIcon = '🟢';
          else if (st === 'offline' || st === 'stopped') statusIcon = '🔴';
          else if (st === 'starting') statusIcon = '🟠';
          else if (st === 'stopping') statusIcon = '🟠';
          else if (st === 'suspended') statusIcon = '⛔';
          else if (st === 'installing') statusIcon = '⚙️';
          else if (st === 'error') statusIcon = '⚠️';

          return {
            name: `${statusIcon} ${name}`,
            value: `ID: \`${id}\` | Status: ${s.status || 'Unknown'}`,
            inline: true
          };
        });

        embed.addFields(fields);
        return embed;
      };

      // Helper to generate pagination buttons
      const generateButtons = (page) => {
        return new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setEmoji('⬅️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId('next')
              .setEmoji('➡️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === totalPages - 1)
          );
      };

      const initialEmbed = await generatePage(currentPage);
      const initialRow = generateButtons(currentPage);
      const response = await interaction.editReply({ content: null, embeds: [initialEmbed], components: [initialRow] });

      // Create collector for pagination
      const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({ content: 'These buttons are not for you.', ephemeral: true });
          return;
        }

        await i.deferUpdate();

        if (i.customId === 'prev') {
          if (currentPage > 0) currentPage--;
        } else if (i.customId === 'next') {
          if (currentPage < totalPages - 1) currentPage++;
        }

        const newEmbed = await generatePage(currentPage);
        const newRow = generateButtons(currentPage);

        await i.editReply({ embeds: [newEmbed], components: [newRow] });
      });

      collector.on('end', () => {
        const disabledRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setEmoji('⬅️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setEmoji('➡️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true)
          );
        interaction.editReply({ components: [disabledRow] }).catch(() => { });
      });

    } catch (err) {
      console.error('ptero-list error', err);
      await interaction.editReply('Error fetching server list: ' + err.message);
    }
  }
};
