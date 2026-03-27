// src/index.js
require("dotenv").config();
const cron = require("node-cron");

const { fetchCompletedIssues } = require("./linear");
const { generateReport } = require("./reporter");
const { postToSlack } = require("./slack");

const LOOKBACK_DAYS = parseInt(process.env.LOOKBACK_DAYS ?? "7", 10);
const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? "0 12 * * 1"; // Mon 9am BRT

async function runReport() {
  console.log(`[Reporter] Starting weekly report — looking back ${LOOKBACK_DAYS} days...`);

  try {
    console.log("[Reporter] Fetching Linear issues...");
    const linearData = await fetchCompletedIssues(LOOKBACK_DAYS);
    console.log(`[Reporter] Got ${linearData.total} completed issues across ${Object.keys(linearData.byTeam).length} teams`);

    console.log("[Reporter] Generating report with Claude...");
    const report = await generateReport(linearData, LOOKBACK_DAYS);
    console.log("[Reporter] Report generated:");
    console.log("---");
    console.log(report);
    console.log("---");

    console.log("[Reporter] Posting to Slack...");
    await postToSlack(report);

    console.log("[Reporter] ✅ Done!");
  } catch (err) {
    console.error("[Reporter] ❌ Error:", err.message);
    // Optionally post an error alert to Slack
    try {
      await postToSlack(`⚠️ *Weekly Reporter failed to run*\n\`${err.message}\`\nCheck Railway logs for details.`);
    } catch (_) {}
  }
}

// Check required env vars
const required = ["ANTHROPIC_API_KEY", "SLACK_BOT_TOKEN", "SLACK_CHANNEL_ID", "LINEAR_API_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[Reporter] Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

// Schedule the cron job
console.log(`[Reporter] Scheduled: "${CRON_SCHEDULE}" (UTC)`);
cron.schedule(CRON_SCHEDULE, runReport, { timezone: "UTC" });

// Also run immediately if RUN_NOW=true (useful for testing on Railway)
if (process.env.RUN_NOW === "true") {
  console.log("[Reporter] RUN_NOW=true — running immediately...");
  runReport();
}

console.log("[Reporter] Service running. Waiting for next scheduled run...");
