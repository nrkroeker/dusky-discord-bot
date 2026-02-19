import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { deleteOldImages } from './utils/deleteOldImages.js';
import * as constants from './constants.js';
dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});


client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // scheduleDailyImageCleanup();
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.channelId !== constants.SPICY_CHANNEL_ID) {
        return;
    }
    if (message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
            if (attachment.height && !attachment.spoiler) {
                console.log("Message deleted for containing an un-spoilered image");
                await message.reply(`${message.author} All images or videos posted in this channel must be marked with a spoiler tag and content warning describing what the image contains. Please reupload your image within these guidelines, thank you. 🙂`)
                await message.delete();
            }
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'delete-old-images') {
        await interaction.deferReply({ content: 'Deleting old images... :)'});
        const spicyChannel = await client.channels.fetch(constants.SPICY_CHANNEL_ID);
        const { deletedCount } = await deleteOldImages(1, spicyChannel);
        const returnMessage = deletedCount > 0 ? `Deleted ${deletedCount} images older than ${constants.SPICY_IMAGE_AGE} days` : 'No old images found to delete';
        await interaction.editReply({ content: returnMessage });
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
    if (hasSapphicRole && hasLevelRole) {
        newMember.roles.add(constants.SPICY_ROLE_ID);
    } else if (hasSpicyRole) {
        // roles do not meet criteria and they already had the spicy role
        newMember.roles.remove(constants.SPICY_ROLE_ID); 
    }
})

client.login(process.env.DISCORD_TOKEN);