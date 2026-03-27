// src/slack.js
// Posts the generated report to one or more Slack channels

const { WebClient } = require("@slack/web-api");

async function postToSlack(text) {
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);

  // Supports multiple channels separated by commas e.g. "C111,C222,C333"
  const channels = process.env.SLACK_CHANNEL_ID.split(",").map((c) => c.trim());

  for (const channel of channels) {
    await client.chat.postMessage({ channel, text, mrkdwn: true });
    console.log(`[Slack] Report posted to channel ${channel}`);
  }
}

module.exports = { postToSlack };
