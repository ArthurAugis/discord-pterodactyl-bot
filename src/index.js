require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { isAuthorized } = require('./lib/auth');

// Load environment variables
const TOKEN = process.env.DISCORD_TOKEN;

// Initialize Discord Client with necessary intents
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();

// Load commands from the commands directory
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath)) {
  if (!file.endsWith('.js')) continue;
  const command = require(path.join(commandsPath, file));
  if (command && command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

const monitor = require('./lib/monitor');

// Event: Bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot ready, registered commands loaded: ', client.commands.map(c => c.data?.name).join(', '));
  // Initialize the server monitor
  monitor.init(client);
});

// Check for token
if (!TOKEN) {
  console.error('DISCORD_TOKEN not provided; exiting');
  process.exit(1);
}

// Event: Interaction Created (Slash Commands)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Check for admin permissions if the command requires it
  if (command.admin && !(await isAuthorized(interaction))) {
    await interaction.reply({ content: 'You are not authorized to perform this action.', flags: 64 });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Command error:', error);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'Error executing command.' });
      } else {
        await interaction.reply({ content: 'Error executing command.', flags: 64 });
      }
    } catch (err) {
      console.error('Failed to reply to interaction error', err);
    }
  }
});

client.login(TOKEN);
