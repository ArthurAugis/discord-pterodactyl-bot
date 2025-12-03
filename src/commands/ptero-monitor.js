const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const storage = require('../lib/storage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ptero-monitor')
        .setDescription('Configure server status monitoring')
        .addSubcommand(sub =>
            sub.setName('set-channel')
                .setDescription('Set the channel for status notifications')
                .addChannelOption(opt => opt.setName('channel').setDescription('The channel to send notifications to').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    admin: true,
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'set-channel') {
            const channel = interaction.options.getChannel('channel');

            if (!channel.isTextBased()) {
                await interaction.reply({ content: 'Please select a text channel.', flags: 64 });
                return;
            }

            // Save channel ID to config
            const config = storage.read('monitor-config');
            config[interaction.guildId] = channel.id;
            storage.write('monitor-config', config);

            const embed = new EmbedBuilder()
                .setTitle('Monitoring Configured')
                .setDescription(`Status notifications for this server will now be sent to ${channel}.`)
                .setColor(0x57F287);

            await interaction.reply({ embeds: [embed] });
        }
    }
};