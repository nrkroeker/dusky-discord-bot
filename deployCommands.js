import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

// Define your command data using SlashCommandBuilder
const commands = [
  new SlashCommandBuilder()
    .setName('delete-old-images')
    .setDescription('Deletes all old images in specified channel older than certain time! Defaults to 7 days')
        .addNumberOption(option => 
      option
        .setName('age')
        .setDescription('The age of images to delete in days (e.g. 7 will delete all images older than 7 days, default is 7)')
        .setRequired(false)
    )
    .toJSON(),
    new SlashCommandBuilder()
    .setName('delete-all-messages')
    .setDescription('Deletes all messages in the current channel')
    .toJSON(),
    new SlashCommandBuilder()
    .setName('enable-spoiler-requirement')
    .setDescription('Enables auto deleting unspoilered messages and sending a warning message for this channel')
    .toJSON(),
    new SlashCommandBuilder()
    .setName('disable-spoiler-requirement')
    .setDescription('Disables auto deleting unspoilered messages and sending a warning message for this channel')
    .toJSON(),
  // Add more commands here
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    // The put method is used to fully refresh all commands in the guild/globally
    await rest.put(
      Routes.applicationCommands(process.env.APP_ID, process.env.GUILD_ID), // Use Routes.applicationCommands(CLIENT_ID) for global commands
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
