const { EmbedBuilder } = require('discord.js');
const ptero = require('./pterodactyl');
const storage = require('./storage');

let clientInstance = null;
let intervalId = null;

/**
 * Checks the status of all servers and sends notifications if status changes.
 */
const checkStatuses = async () => {
    // Load monitoring configuration (channels per guild)
    const config = storage.read('monitor-config');
    if (!config || Object.keys(config).length === 0) return;

    let servers = [];
    try {
        const res = await ptero.listServers();
        servers = res && res.data ? res.data : (Array.isArray(res) ? res : (res.servers || []));
    } catch (e) {
        console.error('[monitor] Failed to list servers', e.message);
        return;
    }

    // Load previous state to compare
    const previousState = storage.read('monitor-state');
    const newState = { ...previousState };
    let hasChanges = false;
    const changes = [];

    for (const server of servers) {
        const ns = ptero.normalizeServer(server);
        const id = ns.uuid || ns.identifier;

        let liveStatus = 'unknown';
        try {
            // Fetch current status from API
            const statusRes = await ptero.getStatus(id);
            liveStatus = statusRes.status || 'unknown';
        } catch (e) {
            console.error('[monitor] Failed to get status for server', ns.name, e.message);
        }

        const prev = previousState[id];

        // Detect change (ignoring unknown transitions usually)
        if (prev && prev !== liveStatus && liveStatus !== 'unknown' && prev !== 'unknown') {
            changes.push({ ns, liveStatus });
        }

        if (prev !== liveStatus) {
            hasChanges = true;
        }

        newState[id] = liveStatus;
    }

    // Save new state if changed
    if (hasChanges) {
        storage.write('monitor-state', newState);
    }

    // Send notifications
    if (changes.length > 0) {
        for (const [guildId, channelId] of Object.entries(config)) {
            const channel = await clientInstance.channels.fetch(channelId).catch(() => null);
            if (!channel) continue;

            for (const change of changes) {
                const { ns, liveStatus } = change;
                const embed = new EmbedBuilder()
                    .setTitle(`Server Status Change: ${ns.name}`)
                    .setTimestamp();

                if (liveStatus === 'online' || liveStatus === 'running') {
                    embed.setColor(0x57F287);
                    embed.setDescription(`The server **${ns.name}** is now **ONLINE** 🟢`);
                } else if (liveStatus === 'offline' || liveStatus === 'stopped') {
                    embed.setColor(0xED4245);
                    embed.setDescription(`The server **${ns.name}** is now **OFFLINE** 🔴`);
                } else if (liveStatus === 'starting') {
                    embed.setColor(0xFEE75C);
                    embed.setDescription(`The server **${ns.name}** is **STARTING** 🟠`);
                } else if (liveStatus === 'stopping') {
                    embed.setColor(0xFEE75C);
                    embed.setDescription(`The server **${ns.name}** is **STOPPING** 🟠`);
                } else {
                    embed.setColor(0x95A5A6);
                    embed.setDescription(`The server **${ns.name}** is now **${liveStatus.toUpperCase()}**`);
                }

                await channel.send({ embeds: [embed] }).catch(e => console.error(`[monitor] Failed to send to guild ${guildId}`, e.message));
            }
        }
    }
};

module.exports = {
    /**
     * Initializes the monitor.
     * @param {import('discord.js').Client} client 
     */
    init: (client) => {
        clientInstance = client;
        if (intervalId) clearInterval(intervalId);
        // Check every 60 seconds
        intervalId = setInterval(checkStatuses, 60000);
        console.log('[monitor] Initialized, checking every 60s');
        checkStatuses();
    }
};
