const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function getWeekRange(lookbackDays) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - lookbackDays);
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

async function generateReport(linearData, lookbackDays = 7) {
  const weekRange = getWeekRange(lookbackDays);

  const linearSummary = Object.entries(linearData.byTeam)
    .map(([team, issues]) => {
      const lines = issues.map((i) => {
        const isBug = i.labels.some((l) => ["Bug", "bug-p0", "bug-p1", "Customer Issues"].includes(l));
        const proj = i.project ? ` [${i.project}]` : "";
        const type = isBug ? "[fix]" : "[feature]";
        return `  - ${type} ${i.title}${proj}`;
      });
      return `Team: ${team}\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const prompt = `You are writing a weekly product update for Jeeves's customer-facing teams (CS, Sales, Account Management).
Your goal: help them understand what changed in the product this week so they can better support clients.

Tone: clear, professional, friendly. No jargon. No implementation details. Focus on "what changed and why it matters to clients".
Language: English only.

FORMAT RULES (follow exactly):

1. Start with this header line:
*🚀 Weekly CS-Product Fixes — ${weekRange}*

2. One blank line, then a short 1-sentence intro.

3. Group issues by product area using these headers (only include areas with content):
*🪙 Wallet & Stablecoin* — WAL team
*💸 Payments* — PAY team
*💳 Cards & Expense Management* — CARDS + Megapod
*🤖 AI & Automation* — AI/ML
*🔒 Security* — SEC team

Under each header, bullet points only. No sub-headers.

4. End with exactly:
#productfixes

CONTENT RULES:
- Plain description of what was fixed, no "Fixed:" prefix
- Only client-facing changes — skip DB migrations, node upgrades, infra, spikes, QA tickets
- Merge similar tickets into one bullet
- Max 20 lines total

Linear issues this week:
\${linearSummary}

Generate the report now.`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

module.exports = { generateReport };
