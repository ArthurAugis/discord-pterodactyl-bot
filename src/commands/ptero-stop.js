const { SlashCommandBuilder } = require('discord.js');
const { handlePowerAction } = require('../lib/utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ptero-stop')
    .setDescription('Stop a Pterodactyl server')
    .addStringOption(opt => opt.setName('uuid').setDescription('Pterodactyl Server UUID').setRequired(true)),
  admin: true,
  async execute(interaction) {
    // Execute stop action using helper
    await handlePowerAction(interaction, 'stop', 'Server Stopping', 0xFEE75C);
  }
};
