require('dotenv').config();
const { REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('Please set DISCORD_TOKEN and DISCORD_CLIENT_ID in .env');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Started deleting all application commands.');
        console.log('Deleting global commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
        console.log('Successfully deleted all global commands.');
    } catch (error) {
        console.error(error);
    }
})();
