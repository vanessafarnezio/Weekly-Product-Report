// src/linear.js
// Fetches Done issues from the past N days via Linear GraphQL API

const LINEAR_API_URL = "https://api.linear.app/graphql";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function fetchCompletedIssues(lookbackDays = 7) {
  const since = daysAgo(lookbackDays);

  // Skip internal/infra-only labels that aren't useful for CS teams
  const SKIP_LABELS = ["agent:complete", "agent:blocked", "agent:pr-created", "agent:analyzing", "agent:gathering-info", "agent:awaiting-approval"];

  const query = `
    query CompletedIssues($since: DateTimeOrDuration!) {
      issues(
        filter: {
          state: { type: { eq: "completed" } }
          completedAt: { gte: $since }
        }
        first: 100
        orderBy: updatedAt
      ) {
        nodes {
          identifier
          title
          team { name }
          project { name }
          labels { nodes { name } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  let allIssues = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const paginatedQuery = cursor
      ? query.replace("first: 100", `first: 100, after: "${cursor}"`)
      : query;

    const res = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.LINEAR_API_KEY,
      },
      body: JSON.stringify({ query: paginatedQuery, variables: { since } }),
    });

    if (!res.ok) throw new Error(`Linear API error: ${res.status}`);
    const { data, errors } = await res.json();
    if (errors) throw new Error(`Linear GraphQL: ${JSON.stringify(errors)}`);

    const { nodes, pageInfo } = data.issues;
    allIssues = allIssues.concat(nodes);
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  // Group by team, filter noisy infra labels
  const byTeam = {};
  for (const issue of allIssues) {
    const team = issue.team?.name ?? "Other";
    if (!byTeam[team]) byTeam[team] = [];
    byTeam[team].push({
      id: issue.identifier,
      title: issue.title,
      project: issue.project?.name ?? null,
      labels: issue.labels.nodes
        .map((l) => l.name)
        .filter((l) => !SKIP_LABELS.includes(l)),
    });
  }

  return { byTeam, total: allIssues.length };
}

module.exports = { fetchCompletedIssues };
