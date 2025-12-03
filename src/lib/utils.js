const { EmbedBuilder } = require('discord.js');
const ptero = require('./pterodactyl');

/**
 * Handles a power action (start, stop, restart) for a server.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction The interaction object
 * @param {'start'|'stop'|'restart'} action The action to perform
 * @param {string} title Title of the success embed
 * @param {number} color Color of the success embed
 */
async function handlePowerAction(interaction, action, title, color) {
    await interaction.deferReply();
    const uuid = interaction.options.getString('uuid', true);
    try {
        await ptero.powerAction(uuid, action);
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`Signal sent to server \`${uuid}\` to **${action.toUpperCase()}**.`)
            .setColor(color);
        await interaction.editReply({ embeds: [embed] });
    } catch (err) {
        console.error(`ptero-${action} error`, err);
        const embed = new EmbedBuilder()
            .setTitle('Error')
            .setDescription(`Failed to ${action} server \`${uuid}\`.\n\`${err.message || 'Unknown error'}\``)
            .setColor(0xED4245);
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = { handlePowerAction };
