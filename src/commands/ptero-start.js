const { SlashCommandBuilder } = require('discord.js');
const { handlePowerAction } = require('../lib/utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ptero-start')
    .setDescription('Start a Pterodactyl server')
    .addStringOption(opt => opt.setName('uuid').setDescription('Pterodactyl Server UUID').setRequired(true)),
  admin: true,
  async execute(interaction) {
    // Execute start action using helper
    await handlePowerAction(interaction, 'start', 'Server Starting', 0x57F287);
  }
};
