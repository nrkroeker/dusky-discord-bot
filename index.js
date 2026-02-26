import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Events, MessageFlags } from 'discord.js';
import { deleteOldImages } from './utils/deleteOldImages.js';
import * as constants from './constants.js';
dotenv.config();

/**
 * SQLite database
 * store channel IDs for things like spoilering
 * slash command to turn on/off spoilering for that channel (and save id)
 * pull ids on server startup? or when a command is issued? - figure out a good way to do that if there's a convention
 */

/**
 * how old can they live: older than a week? deleted
 * no warning on delete (maybe random)
 * when spencer updates the rules with new guidelines for the spicy channel, i post the "spoilering must be done now and forever"
 * (node:39100) Warning: Supplying "ephemeral" for interaction response options is deprecated. Utilize flags instead.        
 */

/**
 * make a post in log channel whenever deleting an unspoilered image
 * or slash command is used
 */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

let spoilerChannels = [];

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // scheduleDailyImageCleanup();
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (!spoilerChannels.includes(message.channelId)) {
        return;
    }
    if (message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
            if (attachment.height && !attachment.spoiler) {
                console.log("Message deleted for containing an un-spoilered image");
                await message.reply(`${message.author} All images or videos posted in this channel must be marked with a spoiler tag and content warning describing what the image contains. Please reupload your image within these guidelines, thank you. 🙂`)
                await message.delete(); // salsa emoji
            }
        }
    }
});

client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
    if (addedRoles.length === 0 && removedRoles.length === 0) return;

    // if roles meet criteria to access spicy channel + account is at least this old
    const hasSpicyRole = newMember.roles.cache.find(role => role.id === constants.SPICY_ROLE_ID);
    const hasSapphicRole = newMember.roles.cache.find(role => role.id === constants.SAPPHIC_ROLE_ID);
    const hasLevelRole = newMember.roles.cache.find(role => role.id === constants.LEVEL_ROLE_ID);
    try {
        if (hasSapphicRole && hasLevelRole) {
            newMember.roles.add(constants.SPICY_ROLE_ID);
        } else if (hasSpicyRole) {
            // roles do not meet criteria and they already had the spicy role
            newMember.roles.remove(constants.SPICY_ROLE_ID); 
        }
    } catch (error) {
        console.error(`Failed to update aggregate role for member ${newMember.user.tag}:`, error);
    }
})

/** 
 * Slash commands
*/
// Delete all old images older than a certain age
// TODO let age be passed in by the user
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'delete-old-images') {
        await interaction.deferReply({ content: 'Deleting old images... :)', flags: MessageFlags.Ephemeral });
        const spicyChannel = await client.channels.fetch(constants.SPICY_CHANNEL_ID);
        const age = interaction.options.getNumber('age') || 7;
        const { deletedCount } = await deleteOldImages(age, spicyChannel);
        const returnMessage = deletedCount > 0 ? `Deleted ${deletedCount} images older than ${age} days` : 'No old images found to delete';
        await interaction.editReply({ content: returnMessage, flags: MessageFlags.Ephemeral });
    }
});

// Delete all messages in one channel
// TODO could add a confirmation message if I feel like it
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'delete-all-messages') {
        await interaction.deferReply({ content: 'Deleting all messages... :)',  flags: MessageFlags.Ephemeral });
        const channel = await client.channels.fetch(interaction.channelId);
        let deletedCount = 0;
        let fetched;
        do {
            fetched = await channel.messages.fetch({ limit: 100 });
            await channel.bulkDelete(fetched);
            deletedCount += fetched.size;
        } while (fetched.size >= 2);
        await interaction.editReply({ content: `Deleted ${deletedCount} messages`,  flags: MessageFlags.Ephemeral });
    }
});

// Turn on spoiler requirement message for channel
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'enable-spoiler-requirement') {
        await interaction.deferReply({ content: 'Enabling spoiler requirement message... :)',  flags: MessageFlags.Ephemeral });
        spoilerChannels.push(interaction.channelId);
        await interaction.editReply({ content: `Spoiler requirement deletion and message enabled for this channel`,  flags: MessageFlags.Ephemeral });
    }
})

// Turn off spoiler requirement message for channel
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'disable-spoiler-requirement') {
        await interaction.deferReply({ content: 'Disabling spoiler requirement message... :)',  flags: MessageFlags.Ephemeral });
        spoilerChannels = spoilerChannels.filter(channelId => channelId !== interaction.channelId);
        await interaction.editReply({ content: `Spoiler requirement deletion and message disabled for this channel`,  flags: MessageFlags.Ephemeral });
    }
})

client.login(process.env.DISCORD_TOKEN);
