export const deleteOldImages = async (ageDays, channel, lastCheckedId = null) => {
    const now = Date.now();
    const ageLimitMs = ageDays * 24 * 60 * 60 * 1000;

    let lastId;
    let deletedCount = 0;
    let newestMessageId = null;

    while (true) {
        const messages = await channel.messages.fetch({
            limit: 100,
            before: lastId
        });

        if (messages.size === 0) break;

        if (!newestMessageId) {
            newestMessageId = messages.first().id;
        }

        for (const msg of messages.values()) {

            if (lastCheckedId && BigInt(msg.id) <= BigInt(lastCheckedId)) {
                return { deletedCount, newLastCheckedId: newestMessageId };
            }

            if (msg.attachments.size === 0) continue;

            const messageAgeMs = now - msg.createdTimestamp;

            const hasImage = msg.attachments.some(
                a => a.contentType?.startsWith('image')
            );

            if (hasImage && messageAgeMs > ageLimitMs) {
                try {
                    await msg.delete();
                    deletedCount++;
                    await new Promise(r => setTimeout(r, 1000));
                } catch (error) {
                    console.error(`Failed to delete message ${msg.id}`, error);
                }
            }
        }

        lastId = messages.last().id;
    }

    console.log(`Cleanup Review: Deleted ${deletedCount} images older than ${ageDays} days.`);
    return { deletedCount, newLastCheckedId: newestMessageId };
};