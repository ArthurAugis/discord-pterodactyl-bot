const { PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');

/**
 * Checks if the user interacting with the bot is authorized to use admin commands.
 * Authorization is based on:
 * 1. Administrator permission in Discord.
 * 2. A specific role configured for the guild.
 * 3. Being in the ALLOWED_USER_IDS list (env).
 * 4. Having the global ADMIN_ROLE_ID (env).
 * 
 * @param {import('discord.js').Interaction} interaction 
 * @returns {Promise<boolean>} True if authorized, false otherwise.
 */
async function isAuthorized(interaction) {
    try {
        // Ensure member object is available
        if (!interaction.member || !interaction.member.permissions) {
            if (interaction.guild) {
                interaction.member = await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member);
            }
        }

        if (!interaction.member) {
            console.log(`[Auth] User ${interaction.user.tag} (${interaction.user.id}) has no member object.`);
            return false;
        }

        // 1. Check for Administrator permission
        if (interaction.member.permissions && interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return true;
        }

        // 2. Check for configured role in this guild
        const config = storage.read('admin-config');
        const roleId = config[interaction.guildId];
        if (roleId && interaction.member.roles.cache.has(roleId)) {
            return true;
        }

        // 3. Check for specific allowed user IDs from .env
        if (process.env.ALLOWED_USER_IDS) {
            const allowed = process.env.ALLOWED_USER_IDS.split(',').map(id => id.trim());
            if (allowed.includes(interaction.user.id)) {
                return true;
            }
        }

        // 4. Check for global admin role from .env
        if (process.env.ADMIN_ROLE_ID) {
            if (interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
                return true;
            }
        }

        console.log(`[Auth] User ${interaction.user.tag} denied. Roles: ${interaction.member.roles.cache.map(r => r.name).join(', ')}`);
        return false;

    } catch (e) {
        console.error('Authorization check error', e);
        return false;
    }
}

module.exports = { isAuthorized };
