const { SlashCommandBuilder } = require('discord.js');
const { handlePowerAction } = require('../lib/utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ptero-restart')
    .setDescription('Restart a Pterodactyl server')
    .addStringOption(opt => opt.setName('uuid').setDescription('Pterodactyl Server UUID').setRequired(true)),
  admin: true,
  async execute(interaction) {
    // Execute restart action using helper
    await handlePowerAction(interaction, 'restart', 'Server Restarting', 0x5865F2);
  }
};
