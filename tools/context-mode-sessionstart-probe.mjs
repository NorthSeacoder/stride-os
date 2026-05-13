#!/usr/bin/env node

import { fileURLToPath } from "node:url";

const base = "/Users/yqg/.local/share/fnm/node-versions/v22.22.2/installation/lib/node_modules/context-mode/hooks";

function log(step, value = "") {
  const suffix = value === "" ? "" : ` ${typeof value === "string" ? value : JSON.stringify(value)}`;
  process.stdout.write(`[probe] ${step}${suffix}\n`);
}

const inputChunks = [];
for await (const chunk of process.stdin) {
  inputChunks.push(Buffer.from(chunk));
}
const rawInput = Buffer.concat(inputChunks).toString("utf8");
log("stdin-bytes", String(Buffer.byteLength(rawInput)));

const helpers = await import(`${base}/session-helpers.mjs`);
log("helpers-imported");
const loadersMod = await import(`${base}/session-loaders.mjs`);
log("loaders-imported");

const input = helpers.parseStdin(rawInput);
log("parsed-source", input.source ?? "startup");

const projectDir = helpers.getInputProjectDir(input, helpers.CODEX_OPTS);
log("project-dir", projectDir);

const dbPath = helpers.getSessionDBPath(helpers.CODEX_OPTS, projectDir);
log("db-path", dbPath);

const hookDir = fileURLToPath(new URL(`${base}/codex/`, import.meta.url));
log("hook-dir", hookDir);

const { createSessionLoaders } = loadersMod;
const { loadSessionDB } = createSessionLoaders(hookDir);
log("loaders-created");

const { SessionDB } = await loadSessionDB();
log("sessiondb-module-loaded");

const db = new SessionDB({ dbPath });
log("sessiondb-opened");

try {
  db.cleanupOldSessions(7);
  log("cleanup-done");
  db.db.exec(`DELETE FROM session_events WHERE session_id NOT IN (SELECT session_id FROM session_meta)`);
  log("orphan-delete-done");
  const sessionId = helpers.getSessionId(input, helpers.CODEX_OPTS);
  log("session-id", sessionId);
  db.ensureSession(sessionId, projectDir);
  log("ensure-session-done");
} finally {
  db.close();
  log("db-closed");
}
