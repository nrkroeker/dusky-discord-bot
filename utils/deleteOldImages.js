// Function to find all images in a given channel older than a given limit and delete them
export const deleteOldImages = async (ageDays, channel) => {
    const now = Date.now();
    const ageLimitMs = 1200000; // 20 minutes
    // const ageLimitMs = ageDays * 24 * 60 * 60 * 1000; // Convert days to MS
    let fetchedMessages;
    let deletedCount = 0;

    // Fetch messages iteratively to batch into groups of 100
    // while (true) {
        fetchedMessages = await channel.messages.fetch({ limit: 100 }); // 100
        console.log('fetchedMessages: ', fetchedMessages);
        const oldImageMessages = fetchedMessages.filter(msg => {
            const messageAgeMs = now - msg.createdTimestamp;
            // Return true to keep message in array if it is older than the limit AND has an image attachment
            const hasImage = msg.attachments.some(attachment => attachment.contentType.startsWith('image'));
            return hasImage && messageAgeMs > ageLimitMs;
        })
        // if (oldImageMessages.size === 0) break;
        if (oldImageMessages.size === 0) return;

        for (const message of oldImageMessages.values()) {
            try {
                await message.delete();
                deletedCount++;
                await new Promise(resolve => setTimeout(resolve, 1000)); // delay to avoid hitting rate limits by spam deleting
            } catch (error) {
                console.error(`Failed to delete message ${message.id}:`, error);
            }
        }
        console.log(`Cleanup Review: Deleted ${deletedCount} images older than ${ageDays} days.`);
        return { deletedCount };
    // }
}