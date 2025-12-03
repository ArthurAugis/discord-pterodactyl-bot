# Discord Pterodactyl Manager Bot

A powerful and easy-to-use Discord bot to manage your Pterodactyl servers directly from Discord. This bot allows you to list servers, view detailed information, and perform power actions (start, stop, restart) with permission controls.

## Features

-   **Server Management**: Start, stop, and restart servers directly from Discord.
-   **Server List**: View all accessible servers with their current status (Online, Offline, Starting, etc.).
-   **Detailed Info**: Get detailed resource usage (CPU, RAM, Disk) and information for any server.
-   **Live Monitoring**: Automatically monitor server statuses and receive notifications in a specific channel when a server goes offline or comes back online.
-   **Permission System**: Restrict sensitive commands (power actions) to specific roles or users.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v16.9.0 or higher)
-   A Pterodactyl Panel instance
-   A Discord Bot Token
-   Pterodactyl API Key (Application Key recommended for full access)

## Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ArthurAugis/discord-pterodactyl-bot
    cd discord-pterodactyl-bot
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configuration**
    Create a `.env` file in the root directory based on the example below:

    ```env
    # Discord bot token and app id
    DISCORD_TOKEN=YourDiscordToken
    DISCORD_CLIENT_ID=YourDiscordClientID
    # Pterodactyl API
    PTERODACTYL_HOST=YourPterodactylHost
    PTERODACTYL_API_KEY=YourPterodactylAPIKey
    ```

4.  **Register Commands**
    Run the following command to register the slash commands with Discord:
    ```bash
    node src/sync-commands.js
    ```

5.  **Start the Bot**
    ```bash
    node src/index.js
    ```

## Commands

| Command | Description | Permission |
| :--- | :--- | :--- |
| `/ptero-list` | Lists all servers with their status. | Admin |
| `/ptero-info <uuid>` | Shows detailed info (Node, Owner, Resources) for a server. | Admin |
| `/ptero-start <uuid>` | Starts a specific server. | Admin |
| `/ptero-stop <uuid>` | Stops a specific server. | Admin |
| `/ptero-restart <uuid>` | Restarts a specific server. | Admin |
| `/ptero-monitor set-channel` | Sets the channel for status notifications. | Administrator (Discord) |
| `/ptero-admin set-role` | Sets the Discord role allowed to use bot commands. | Administrator (Discord) |
| `/help` | Displays the list of available commands. | Everyone |

## Project Structure

-   `src/commands/`: Contains all slash command definitions.
-   `src/lib/`: Helper libraries for API interaction, monitoring, and storage.
-   `data/`: Stores JSON configuration files (created automatically).

## License

This project is licensed under the MIT License.
