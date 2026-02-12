import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

// Define your command data using SlashCommandBuilder
const commands = [
  new SlashCommandBuilder()
    .setName('delete-old-images')
    .setDescription('Deletes all old images in specified channel older than certain time!')
    .toJSON(),
  // Add more commands here
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    // The put method is used to fully refresh all commands in the guild/globally
    await rest.put(
      Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID), // Use Routes.applicationCommands(CLIENT_ID) for global commands
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
