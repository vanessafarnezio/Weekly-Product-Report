// src/notion.js
// Fetches recently updated product/release pages from Notion

const NOTION_API_URL = "https://api.notion.com/v1";

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function fetchRecentNotionPages(lookbackDays = 7) {
  const since = daysAgo(lookbackDays);

  // Search for release and product pages updated this week
  const queries = ["release", "product update", "changelog", "launch"];
  const seen = new Set();
  const pages = [];

  for (const q of queries) {
    const res = await fetch(`${NOTION_API_URL}/search`, {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify({
        query: q,
        filter: { value: "page", property: "object" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
        page_size: 10,
      }),
    });

    if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
    const data = await res.json();

    for (const result of data.results) {
      if (seen.has(result.id)) continue;
      if (result.last_edited_time < since) continue;

      seen.add(result.id);
      const title =
        result.properties?.title?.title?.[0]?.plain_text ||
        result.properties?.Name?.title?.[0]?.plain_text ||
        "Untitled";

      pages.push({
        title,
        url: result.url,
        lastEdited: result.last_edited_time,
      });
    }
  }

  // Sort by most recently edited
  pages.sort((a, b) => new Date(b.lastEdited) - new Date(a.lastEdited));

  // Return top 8 most relevant
  return pages.slice(0, 8);
}

module.exports = { fetchRecentNotionPages };
