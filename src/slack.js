const { WebClient } = require("@slack/web-api");

async function postToSlack(text) {
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  const channels = process.env.SLACK_CHANNEL_ID.split(",").map((c) => c.trim());
  for (const channel of channels) {
    await client.chat.postMessage({ channel, text, mrkdwn: true });
    console.log(`[Slack] Posted to ${channel}`);
  }
}

module.exports = { postToSlack };
