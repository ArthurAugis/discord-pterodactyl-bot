const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ptero = require('../lib/pterodactyl');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ptero-info')
    .setDescription('Displays detailed information for a Pterodactyl server (UUID or partial name)')
    .addStringOption(opt => opt.setName('query').setDescription('UUID or partial name of the Pterodactyl server').setRequired(true)),
  admin: true,
  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('query');
    if (!query) {
      await interaction.editReply('Please provide a UUID or partial server name.');
      return;
    }

    let numericId = null;
    let uuid = null;

    try {
      // Try to resolve the server by name or ID
      const matches = await ptero.resolveServer(query);

      if (matches.length === 1) {
        const m = matches[0];
        numericId = m.raw.attributes?.id || m.raw.id;
        uuid = m.raw.attributes?.uuid || m.raw.uuid || m.id;
      } else if (matches.length > 1) {
        const listNames = matches.slice(0, 10).map(m => `${m.raw.attributes?.name || m.raw.name} — ${m.raw.attributes?.uuid || m.raw.uuid || m.id}`).join('\n');
        await interaction.editReply(`Multiple servers match "${query}". Example:\n${listNames}\nPlease specify the UUID.`);
        return;
      } else {
        // If no matches, check if it looks like a UUID
        const isUuid = query.match(/^[0-9a-fA-F\-]{36}$/) || query.match(/^[0-9a-fA-F]{8}$/);
        if (isUuid) {
          uuid = query;
          numericId = query;
        } else {
          await interaction.editReply(`No server found matching: ${query}`);
          return;
        }
      }

      // Fetch details
      let details = null;
      try {
        details = await ptero.getServerDetails(numericId);
      } catch (e) {
        if (numericId !== uuid) {
          try {
            details = await ptero.getServerDetails(uuid);
          } catch (e2) {
            console.error('ptero-info error', e2);
          }
        }
      }

      // Fetch resources
      let resources = null;
      if (uuid) {
        try {
          resources = await ptero.getServerResources(uuid);
        } catch (e) {
          console.error('ptero-info error', e);
        }
      }

      if (!details && !resources) {
        await interaction.editReply(`Could not fetch info for server ${uuid || query}.`);
        return;
      }

      const normalized = ptero.normalizeServer(details?.data || details || {});
      if (resources && resources.attributes && resources.attributes.current_state) {
        normalized.status = resources.attributes.current_state;
      }

      if (normalized.status === 'no-access') normalized.status = 'restricted';
      if (!normalized.status) normalized.status = 'unknown';

      const resAttrs = resources?.attributes?.resources || resources?.data?.attributes?.resources;

      let mem = 'unknown';
      let cpu = 'unknown';
      let disk = 'unknown';

      if (resAttrs) {
        if (resAttrs.memory_bytes !== undefined) mem = Math.round(resAttrs.memory_bytes / 1024 / 1024);
        if (resAttrs.cpu_absolute !== undefined) cpu = Math.round(resAttrs.cpu_absolute * 100) / 100;
        if (resAttrs.disk_bytes !== undefined) disk = Math.round(resAttrs.disk_bytes / 1024 / 1024);
      }

      const embed = new EmbedBuilder()
        .setTitle(`Info: ${normalized.name || uuid}`)
        .addFields(
          { name: 'UUID', value: `${uuid || normalized.uuid || '?'}`, inline: true },
          { name: 'Status', value: `${normalized.status}`, inline: true },
          { name: 'Node', value: `${normalized.node || 'unknown'}`, inline: true },
          { name: 'Owner', value: `${normalized.owner?.id || normalized.owner || 'unknown'}`, inline: true },
          { name: 'RAM', value: `${mem} MB`, inline: true },
          { name: 'CPU', value: `${cpu}%`, inline: true },
          { name: 'Disk', value: `${disk} MB`, inline: true }
        )
      if (normalized.description) {
        embed.setDescription(normalized.description);
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('ptero-info error', err);
      await interaction.editReply('Error fetching server info: ' + err.message);
    }
  }
};
