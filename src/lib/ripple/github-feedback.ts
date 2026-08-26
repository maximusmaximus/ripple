import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const FEEDBACK_REPO = "maximusmaximus/ripple";
export const FEEDBACK_ISSUES_URL = `https://github.com/${FEEDBACK_REPO}/issues`;

export type FeedbackIssue = { url: string; number: number };

function titleFrom(kind: "feature" | "bug", body: string) {
  const line = body.trim().split(/\n/)[0]?.replace(/\s+/g, " ") ?? "";
  const clipped = line.length > 72 ? `${line.slice(0, 69)}…` : line;
  return kind === "bug" ? `Bug: ${clipped}` : `Feature: ${clipped}`;
}

async function viaApi(
  owner: string,
  repo: string,
  token: string,
  title: string,
  body: string,
  labels: string[],
): Promise<FeedbackIssue | null> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ripple-studio",
    },
    body: JSON.stringify({ title, body, labels }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { html_url?: string; number?: number };
  if (!json.html_url || !json.number) return null;
  return { url: json.html_url, number: json.number };
}

async function viaGh(
  repo: string,
  title: string,
  body: string,
  labels: string[],
): Promise<FeedbackIssue | null> {
  const args = ["issue", "create", "--repo", repo, "--title", title, "--body", body];
  for (const label of labels) {
    args.push("--label", label);
  }
  const { stdout } = await execFileAsync("gh", args, { timeout: 15000, env: process.env });
  const url = stdout.trim().split(/\s+/).pop() ?? "";
  const m = url.match(/\/issues\/(\d+)/);
  if (!url.startsWith("http")) return null;
  return { url, number: m ? Number(m[1]) : 0 };
}

/** Open a GitHub issue for an in-app feature/bug. Fails soft if GitHub is not configured. */
export async function openFeedbackIssue(kind: "feature" | "bug", body: string): Promise<FeedbackIssue | null> {
  const text = body.trim();
  const title = titleFrom(kind, text);
  const issueBody = `Submitted from the Ripple studio **${kind}** form.\n\n${text}`;
  const labels = kind === "bug" ? ["bug", "from-studio"] : ["enhancement", "from-studio"];
  const repoSpec = process.env.GITHUB_FEEDBACK_REPO?.trim() || FEEDBACK_REPO;
  const [owner, repo] = repoSpec.split("/");
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (token && owner && repo) {
    try {
      const hit = await viaApi(owner, repo, token, title, issueBody, labels);
      if (hit) return hit;
    } catch {
      /* fall through */
    }
  }

  try {
    return await viaGh(repoSpec, title, issueBody, labels);
  } catch {
    return null;
  }
}
