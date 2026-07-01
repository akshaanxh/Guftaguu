const axios = require('axios');

async function sendReport(type, title, description) {
    const embed = {
        title: `📢 New ${type}`,
        color: type === 'Bug Report' ? 15548997 : 5763719,
        fields: [{ name: "Title", value: title }, { name: "Description", value: description }],
        footer: { text: "Guftaguu Report System" },
        timestamp: new Date().toISOString()
    };

    if (process.env.DISCORD_WEBHOOK_URL) {
        await axios.post(process.env.DISCORD_WEBHOOK_URL, { embeds: [embed] });
    }
}

module.exports = { sendReport };
