import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { deleteOldImages } from './utils/deleteOldImages.js';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Channel with sensitive content where images should be spoiler tagged
const SPICY_CHANNEL_ID = '1471357283320598751';
// Age of images in spicy channel in days (e.g. 7 days)
const SPICY_IMAGE_AGE = 7;

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // scheduleDailyImageCleanup();
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.channelId !== SPICY_CHANNEL_ID) {
        return;
    }
    if (message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
            if (attachment.contentType.startsWith('image') && !attachment.spoiler) {
                console.log("Message deleted for containing an un-spoilered image");
                await message.reply(`${message.author} All images posted in this channel must be marked with a spoiler tag and content warning describing what the image contains. Please reupload your image within these guidelines, thank you. 🙂`)
                await message.delete();
            }
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'delete-old-images') {
        await interaction.deferReply({ content: 'Deleting old images... :)'});
        const spicyChannel = await client.channels.fetch(SPICY_CHANNEL_ID);
        const { deletedCount } = await deleteOldImages(1, spicyChannel);
        const returnMessage = deletedCount > 0 ? `Deleted ${deletedCount} images older than ${SPICY_IMAGE_AGE} days` : 'No old images found to delete';
        await interaction.editReply({ content: returnMessage });
    }
});

client.login(process.env.DISCORD_TOKEN);