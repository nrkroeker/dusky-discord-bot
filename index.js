import dotenv from 'dotenv';
import fs from "fs";
import { Client, GatewayIntentBits, Events, MessageFlags } from 'discord.js';
import { deleteOldImages } from './utils/deleteOldImages.js';
import { CONFIG_FILE, DEFAULT_SPICY_IMAGE_AGE } from './constants.js';
dotenv.config();

/**
 * how old can they live: older than a week? deleted
 * no warning on delete (maybe random)
 * when spencer updates the rules with new guidelines for the spicy channel, i post the "spoilering must be done now and forever"
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
let lastCheckedForImagesMessageId = null;

// Function to read the configuration file
function readConfig() {
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        console.log(config);
        spoilerChannels = config.spoilerWarningChannels || [];
        lastCheckedForImagesMessageId = config.lastCheckedForImagesMessageId || null;
    } catch (error) {
        console.error("Error reading config file:", error);
    }
}

function addSpoilerChannel(channelId) {
    if (!spoilerChannels.includes(channelId)) {
        spoilerChannels.push(channelId);
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ spoilerWarningChannels: spoilerChannels, lastCheckedForImagesMessageId }, null, 4));
    }
}

function removeSpoilerChannel(channelId) {
    spoilerChannels = spoilerChannels.filter(id => id !== channelId);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ spoilerWarningChannels: spoilerChannels, lastCheckedForImagesMessageId }, null, 4));
}

function setLastCheckedForImagesMessageId(messageId) {
    lastCheckedForImagesMessageId = messageId;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ spoilerWarningChannels: spoilerChannels, lastCheckedForImagesMessageId }, null, 4));
}

/** 
 * Event Listeners
 */
client.once(Events.ClientReady, () => {
    readConfig();
    console.log(`Logged in as ${client.user.tag}!`);
    
    // scheduleDailyImageCleanup();
});

// Auto delete and remind on unspoilered images in specified channel
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (!spoilerChannels.includes(message.channelId)) {
        console.log(spoilerChannels, message.channelId);
        return;
    }
    if (message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
            if (attachment.height && !attachment.spoiler) {
                console.log("Message deleted for containing an un-spoilered image");
                await message.reply(`${message.author} All images or videos posted in this channel must be marked with a spoiler tag and content warning describing what they contain. Please reupload your image within these guidelines, thank you! 💃`)
                await message.delete();
            }
        }
    }
});

// TODO figure out how to configure this
// client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
//     const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
//     const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
//     if (addedRoles.length === 0 && removedRoles.length === 0) return;

//     // if roles meet criteria to access spicy channel + account is at least this old
//     const hasSpicyRole = newMember.roles.cache.find(role => role.id === constants.SPICY_ROLE_ID);
//     const hasSapphicRole = newMember.roles.cache.find(role => role.id === constants.SAPPHIC_ROLE_ID);
//     const hasLevelRole = newMember.roles.cache.find(role => role.id === constants.LEVEL_ROLE_ID);
//     try {
//         if (hasSapphicRole && hasLevelRole) {
//             newMember.roles.add(constants.SPICY_ROLE_ID);
//         } else if (hasSpicyRole) {
//             // roles do not meet criteria and they already had the spicy role
//             newMember.roles.remove(constants.SPICY_ROLE_ID); 
//         }
//     } catch (error) {
//         console.error(`Failed to update aggregate role for member ${newMember.user.tag}:`, error);
//     }
// })

/** 
 * Slash commands
*/
// Delete all old images older than a certain age
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'delete-old-images') {
        await interaction.deferReply({ content: 'Deleting old images... :)', flags: MessageFlags.Ephemeral });
        const spicyChannel = await client.channels.fetch(constants.SPICY_CHANNEL_ID);
        const ageOption = interaction.options.getNumber('age');
        const age = ageOption !== null && ageOption !== undefined ? ageOption : DEFAULT_SPICY_IMAGE_AGE;
        const { deletedCount, newLastCheckedId } = await deleteOldImages(age, spicyChannel, lastCheckedForImagesMessageId);
        setLastCheckedForImagesMessageId(newLastCheckedId);
        const returnMessage = deletedCount > 0 ? `Deleted ${deletedCount} images older than ${age} days` : 'No old images found to delete';
        await interaction.editReply({ content: returnMessage, flags: MessageFlags.Ephemeral });
    }
});

// Delete all messages in one channel
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
        addSpoilerChannel(interaction.channelId);
        console.log(`Enabled spoiler requirement for channel ${interaction.channelId}`);
        await interaction.editReply({ content: `Spoiler requirement deletion and message is enabled for this channel`,  flags: MessageFlags.Ephemeral });
    }
})

// Turn off spoiler requirement message for channel
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'disable-spoiler-requirement') {
        await interaction.deferReply({ content: 'Disabling spoiler requirement message... :)',  flags: MessageFlags.Ephemeral });
        removeSpoilerChannel(interaction.channelId);
        console.log(`Disabled spoiler requirement for channel ${interaction.channelId}`);
        await interaction.editReply({ content: `Spoiler requirement deletion and message is disabled for this channel`,  flags: MessageFlags.Ephemeral });
    }
})

client.login(process.env.DISCORD_TOKEN);
