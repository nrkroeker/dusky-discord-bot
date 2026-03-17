export const deleteOldImages = async (ageDays, channel, lastCheckedId = null) => {
    const now = Date.now();
    const ageLimitMs = ageDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    let beforeId = undefined; // start from the most recent message, page backwards
    let newestReviewedId = null; // the newest message we actually processed (becomes the next checkpoint)

    console.log(`Starting cleanup for images older than ${ageDays} days...`, { lastCheckedId });

    while (true) {
        const fetchOptions = { limit: 100 };
        if (beforeId) fetchOptions.before = beforeId;

        // Discord returns messages newest-first (descending order)
        const messages = await channel.messages.fetch(fetchOptions);
        if (messages.size === 0) break;

        const first = messages.first();
        const last = messages.last();
        console.log(`Fetched ${messages.size} messages | newest: ${first.id} (${Math.round((now - first.createdTimestamp) / 86400000)}d ago) | oldest: ${last.id} (${Math.round((now - last.createdTimestamp) / 86400000)}d ago)`);

        let hitCheckpoint = false;
        for (const msg of messages.values()) {
            // Stop if we've reached or passed the previous checkpoint
            if (lastCheckedId && BigInt(msg.id) <= BigInt(lastCheckedId)) {
                hitCheckpoint = true;
                break;
            }

            const messageAgeMs = now - msg.createdTimestamp;

            // Skip messages newer than the age limit and keep going backwards
            if (messageAgeMs < ageLimitMs) continue;

            // Message is in our window! first one we hit going backwards is the newest reviewed
            if (newestReviewedId === null) newestReviewedId = msg.id;

            if (msg.attachments.size === 0) continue;

            const hasImage = msg.attachments.some(a => a.contentType?.startsWith('image'));
            if (hasImage) {
                try {
                    await msg.delete();
                    deletedCount++;
                    await new Promise(r => setTimeout(r, 1000));
                } catch (error) {
                    console.error(`Failed to delete message ${msg.id}`, error);
                }
            }
        }

        if (hitCheckpoint) break;

        // Page backwards: fetch messages before the oldest in this batch
        beforeId = last.id;
    }

    const checkpoint = newestReviewedId ?? lastCheckedId;
    console.log(`Cleanup Review: Deleted ${deletedCount} images older than ${ageDays} days.`);
    console.log(`Returning checkpoint: ${checkpoint}`);
    return { deletedCount, newLastCheckedId: checkpoint };
};