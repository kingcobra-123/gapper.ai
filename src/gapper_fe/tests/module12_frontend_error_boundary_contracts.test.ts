import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appShellSource = readFileSync(
  resolve(process.cwd(), "src/components/shell/AppShell.tsx"),
  "utf-8"
);
const messageRowSource = readFileSync(
  resolve(process.cwd(), "src/components/chat/MessageRow.tsx"),
  "utf-8"
);
const errorBoundarySource = readFileSync(
  resolve(process.cwd(), "src/components/common/ErrorBoundary.tsx"),
  "utf-8"
);

test("app shell wraps critical panes with ErrorBoundary", () => {
  assert.equal(appShellSource.includes('<ErrorBoundary title="Chat stream unavailable.">'), true);
  assert.equal(appShellSource.includes('<ErrorBoundary title="Composer unavailable.">'), true);
  assert.equal(appShellSource.includes('<ErrorBoundary title="Mini chart unavailable.">'), true);
  assert.equal(appShellSource.includes('<ErrorBoundary title="Sentiment gauge unavailable.">'), true);
  assert.equal((appShellSource.match(/<ChatStream\s*\/>/g) ?? []).length, 1);
  assert.equal((appShellSource.match(/<ChatComposer\s*\/>/g) ?? []).length, 1);
});

test("message row wraps card rendering in ErrorBoundary", () => {
  assert.equal(messageRowSource.includes("<ErrorBoundary"), true);
  assert.equal(messageRowSource.includes("<CardRenderer"), true);
});

test("error boundary component exists with client-side catch hooks", () => {
  assert.equal(errorBoundarySource.includes('"use client";'), true);
  assert.equal(errorBoundarySource.includes("getDerivedStateFromError"), true);
  assert.equal(errorBoundarySource.includes("componentDidCatch"), true);
});
