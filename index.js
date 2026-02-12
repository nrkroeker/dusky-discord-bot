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

client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;

    console.log(`message received from ${message.author.tag}: ${message.content}`);

    if (message.channelId !== SPICY_CHANNEL_ID) {
        console.log("message in another channel");
        return;
    }
    console.log("message in dusky bot testing");
    if (message.attachments.size > 0) {
        console.log("has attachments")
        for (const attachment of message.attachments.values()) {
            // Having a height indicates it is an image
            if (attachment.height && !attachment.spoiler) {
                console.log("Message deleted for containing an un-spoilered image");
                message.reply(`In this channel, all images must be marked with a spoiler tag and CW describing what the image contains. Please delete and reupload your image within these guidelines, thank you.`)
                // message mod log that an unspoilered image needs to be deleted if user doesn't do so themself
            }
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'delete-old-images') {
        console.log("deleting old images...");
        await interaction.deferReply({ content: 'deleting old images... :)'});
        const spicyChannel = await client.channels.fetch(SPICY_CHANNEL_ID);
        console.log(await spicyChannel.messages.fetch({ limit: 1 }));
        const { deletedCount } = await deleteOldImages(1, spicyChannel);
        const returnMessage = deletedCount > 0 ? `deleted ${deletedCount} old images :)` : 'No old images found to delete';
        await interaction.editReply({ content: returnMessage });
    }
});

client.login(process.env.DISCORD_TOKEN);