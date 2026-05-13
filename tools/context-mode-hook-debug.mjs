#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    "usage: node tools/context-mode-hook-debug.mjs <timeout_ms> <cmd> <arg1> [arg2 ...]",
  );
  process.exit(2);
}

const timeoutMs = Number.parseInt(args[0], 10);
const cmd = args[1];
const cmdArgs = args.slice(2);

const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(Buffer.from(chunk));
}
const input = Buffer.concat(chunks);

console.error(`[debug] stdin_bytes=${input.length}`);
console.error(`[debug] cmd=${cmd}`);
console.error(`[debug] args=${JSON.stringify(cmdArgs)}`);
if (input.length > 0) {
  console.error(`[debug] stdin_preview=${JSON.stringify(input.toString("utf8"))}`);
}

const child = spawn(cmd, cmdArgs, {
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
let exited = false;

child.stdout.on("data", (chunk) => {
  const text = chunk.toString("utf8");
  stdout += text;
  console.error(`[debug] stdout_chunk_bytes=${Buffer.byteLength(text)}`);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString("utf8");
  stderr += text;
  console.error(`[debug] stderr_chunk_bytes=${Buffer.byteLength(text)}`);
  process.stderr.write(`[child-stderr] ${text}`);
});

child.on("error", (err) => {
  console.error(`[debug] spawn_error=${err.message}`);
});

child.on("exit", (code, signal) => {
  exited = true;
  console.error(`[debug] exit code=${code} signal=${signal}`);
  if (stdout) {
    process.stdout.write(stdout);
  }
  process.exit(code ?? (signal ? 128 : 1));
});

child.stdin.write(input);
child.stdin.end();

setTimeout(() => {
  if (exited) {
    return;
  }
  console.error(`[debug] timeout_ms=${timeoutMs}`);
  console.error(`[debug] partial_stdout=${JSON.stringify(stdout)}`);
  console.error(`[debug] partial_stderr=${JSON.stringify(stderr)}`);
  child.kill("SIGKILL");
  process.exit(124);
}, timeoutMs).unref();
