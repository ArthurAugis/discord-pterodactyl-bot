const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const storage = require('../lib/storage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ptero-admin')
        .setDescription('Configure admin permissions for the bot')
        .addSubcommand(sub =>
            sub.setName('set-role')
                .setDescription('Set the role that can use bot admin commands')
                .addRoleOption(opt => opt.setName('role').setDescription('The role to grant admin permissions').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    admin: true,
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'set-role') {
            const role = interaction.options.getRole('role');

            // Save role ID to config
            const config = storage.read('admin-config');
            config[interaction.guildId] = role.id;
            storage.write('admin-config', config);

            const embed = new EmbedBuilder()
                .setTitle('Admin Role Configured')
                .setDescription(`The role ${role} has been granted bot admin permissions.`)
                .setColor(0x57F287);

            await interaction.reply({ embeds: [embed] });
        }
    }
};
