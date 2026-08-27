import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const FEEDBACK_REPO = "maximusmaximus/ripple";
export const FEEDBACK_ISSUES_URL = `https://github.com/${FEEDBACK_REPO}/issues`;

export type FeedbackIssue = { url: string; number: number };
export type FeedbackIssueResult = { issue: FeedbackIssue | null; error?: string };

function titleFrom(kind: "feature" | "bug", body: string) {
  const line = body.trim().split(/\n/)[0]?.replace(/\s+/g, " ") ?? "";
  const clipped = line.length > 72 ? `${line.slice(0, 69)}…` : line;
  return kind === "bug" ? `Bug: ${clipped}` : `Feature: ${clipped}`;
}

function ghBin(): string {
  for (const p of [process.env.GH_PATH, "/usr/local/bin/gh", "/usr/bin/gh"]) {
    if (p && existsSync(p)) return p;
  }
  return "gh";
}

function ghEnv(): NodeJS.ProcessEnv {
  const path = process.env.PATH || "";
  const extra = "/usr/local/bin:/usr/bin";
  return {
    ...process.env,
    PATH: path.includes("/usr/local/bin") ? path : `${path}:${extra}`,
    GH_PAGER: "cat",
  };
}

async function viaApi(
  owner: string,
  repo: string,
  token: string,
  title: string,
  body: string,
  labels: string[],
): Promise<FeedbackIssueResult> {
  const post = async (useLabels: boolean) =>
    fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ripple-studio",
      },
      body: JSON.stringify({ title, body, labels: useLabels ? labels : [] }),
    });

  let res = await post(true);
  if (res.status === 422 && labels.length) res = await post(false);
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 240);
    return { issue: null, error: `GitHub ${res.status}${detail ? `: ${detail}` : ""}` };
  }
  const json = (await res.json()) as { html_url?: string; number?: number };
  if (!json.html_url || !json.number) return { issue: null, error: "GitHub did not return an issue." };
  return { issue: { url: json.html_url, number: json.number } };
}

async function viaGh(
  repo: string,
  title: string,
  body: string,
  labels: string[],
): Promise<FeedbackIssueResult> {
  const run = async (useLabels: boolean) => {
    const args = ["issue", "create", "--repo", repo, "--title", title, "--body", body];
    if (useLabels) {
      for (const label of labels) args.push("--label", label);
    }
    const { stdout } = await execFileAsync(ghBin(), args, { timeout: 20_000, env: ghEnv() });
    const url = stdout.trim().split(/\s+/).pop() ?? "";
    const m = url.match(/\/issues\/(\d+)/);
    if (!url.startsWith("http")) throw new Error(stdout.trim() || "gh created no URL");
    return { issue: { url, number: m ? Number(m[1]) : 0 } };
  };
  try {
    return await run(true);
  } catch (first) {
    try {
      return await run(false);
    } catch (second) {
      const err = second instanceof Error ? second : first;
      return { issue: null, error: err instanceof Error ? err.message : "gh issue create failed" };
    }
  }
}

/** Open a GitHub issue for an in-app feature/bug. Fails soft if GitHub is not configured. */
export async function openFeedbackIssue(kind: "feature" | "bug", body: string): Promise<FeedbackIssueResult> {
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
      if (hit.issue) return hit;
    } catch (e) {
      console.error("[feedback] GitHub API", e);
    }
  }

  try {
    return await viaGh(repoSpec, title, issueBody, labels);
  } catch (e) {
    console.error("[feedback] gh", e);
    return { issue: null, error: e instanceof Error ? e.message : "Could not open GitHub." };
  }
}
