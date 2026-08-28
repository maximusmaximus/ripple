import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { FEEDBACK_REPO } from "./github-feedback";

const execFileAsync = promisify(execFile);

export type LiveListing = {
  code: string;
  title: string;
  description: string;
  watchable: boolean;
  watchUrl: string;
  updatedAt: string;
};

const LIVE_PATH = "public/studio/live-session.json";
const LOG_PATH = "public/studio/live-log.json";

function repoSpec() {
  return process.env.GITHUB_FEEDBACK_REPO?.trim() || FEEDBACK_REPO;
}

function token() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

async function viaApi(
  method: "GET" | "PUT",
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; json?: Record<string, unknown> }> {
  const spec = repoSpec();
  const [owner, repo] = spec.split("/");
  const t = token();
  if (!t || !owner || !repo) return { ok: false };
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${t}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ripple-studio",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return { ok: false, json: { status: res.status } };
  return { ok: true, json: (await res.json()) as Record<string, unknown> };
}

async function writeLocal(path: string, data: unknown) {
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const full = nodePath.join(process.cwd(), path);
    await mkdir(nodePath.dirname(full), { recursive: true });
    await writeFile(full, `${JSON.stringify(data, null, 2)}\n`);
  } catch {
    /* read-only host */
  }
}

async function putGithubFile(path: string, content: string, message: string) {
  const current = await viaApi("GET", path);
  const sha =
    current.ok && current.json && typeof current.json.sha === "string" ? current.json.sha : undefined;
  const encoded = Buffer.from(content).toString("base64");
  const put = await viaApi("PUT", path, {
    message,
    content: encoded,
    sha,
    branch: "main",
  });
  if (put.ok) return true;
  const spec = repoSpec();
  try {
    const gh = existsSync("/usr/bin/gh") ? "/usr/bin/gh" : "gh";
    await execFileAsync(gh, ["api", "-X", "PUT", `repos/${spec}/contents/${path}`, "-f", `message=${message}`, "-f", `content=${encoded}`, ...(sha ? ["-f", `sha=${sha}`] : [])], {
      timeout: 20_000,
      env: { ...process.env, GH_PAGER: "cat" },
    });
    return true;
  } catch {
    return false;
  }
}

/** Upsert the current public listing and append a log row for later sessions. */
export async function persistLiveListing(listing: LiveListing | null): Promise<void> {
  const current = listing ?? {
    code: "",
    title: "",
    description: "",
    watchable: false,
    watchUrl: "",
    updatedAt: new Date().toISOString(),
  };
  const payload = `${JSON.stringify({ version: 1, listing: listing && listing.watchable ? listing : null, updatedAt: current.updatedAt }, null, 2)}\n`;
  await writeLocal(LIVE_PATH, JSON.parse(payload));
  await putGithubFile(LIVE_PATH, payload, listing?.watchable ? `live: ${listing.title}` : "live: closed");

  if (!listing?.watchable) return;
  try {
    const { readFile } = await import("node:fs/promises");
    const nodePath = await import("node:path");
    let log: LiveListing[] = [];
    try {
      const raw = await readFile(nodePath.join(process.cwd(), LOG_PATH), "utf8");
      const parsed = JSON.parse(raw) as { sessions?: LiveListing[] };
      log = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    } catch {
      log = [];
    }
    log = [listing, ...log.filter((s) => s.code !== listing.code)].slice(0, 40);
    const logBody = `${JSON.stringify({ version: 1, sessions: log }, null, 2)}\n`;
    await writeLocal(LOG_PATH, JSON.parse(logBody));
    await putGithubFile(LOG_PATH, logBody, `live log: ${listing.title}`);
  } catch {
    /* ignore archive failures */
  }
}
