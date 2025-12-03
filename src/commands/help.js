const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays the list of available commands'),
    admin: false,
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Bot Commands')
            .setColor(0x0099FF)
            .setDescription('Here are the available commands to manage your Pterodactyl servers:')
            .addFields(
                { name: '/ptero-list', value: 'List all servers with their status (Online/Offline).', inline: false },
                { name: '/ptero-info <uuid>', value: 'Get detailed info (Node, Owner, Resources) for a server.', inline: false },
                { name: '/ptero-start <uuid>', value: 'Start a specific server.', inline: true },
                { name: '/ptero-stop <uuid>', value: 'Stop a specific server.', inline: true },
                { name: '/ptero-restart <uuid>', value: 'Restart a specific server.', inline: true },
                { name: '/ptero-monitor set-channel <channel>', value: 'Configure the channel for server status notifications.', inline: false }
            )
            .setFooter({ text: 'Pterodactyl Manager Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
