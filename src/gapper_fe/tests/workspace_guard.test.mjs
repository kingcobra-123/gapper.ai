import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { evaluateWorkspaceGuard } from "../scripts/workspace_guard.mjs";

async function setupWorkspace({ withBackendMarkers = true } = {}) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gapper-workspace-"));
  const frontendRoot = path.join(repoRoot, "gapper_fe");
  await fs.mkdir(frontendRoot, { recursive: true });

  if (withBackendMarkers) {
    await fs.writeFile(path.join(repoRoot, "pyproject.toml"), "[project]\nname='tmp'\n", "utf8");
    await fs.mkdir(path.join(repoRoot, "app", "services", "api"), { recursive: true });
    await fs.writeFile(path.join(repoRoot, "app", "services", "api", "main.py"), "app = None\n", "utf8");
  }

  return { repoRoot, frontendRoot };
}

test("workspace guard passes when frontend is attached to backend repo root", async () => {
  const { repoRoot, frontendRoot } = await setupWorkspace();
  try {
    const result = evaluateWorkspaceGuard(frontendRoot);
    assert.equal(result.ok, true);
    assert.equal(result.repoRoot, repoRoot);
    assert.equal(result.frontendRoot, frontendRoot);
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("workspace guard fails when command is run outside gapper_fe", async () => {
  const { repoRoot } = await setupWorkspace();
  const wrongDir = path.join(repoRoot, "frontend");
  await fs.mkdir(wrongDir, { recursive: true });

  try {
    const result = evaluateWorkspaceGuard(wrongDir);
    assert.equal(result.ok, false);
    assert.match(result.message, /Expected to run from "gapper_fe"/);
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("workspace guard fails when backend markers are missing", async () => {
  const { repoRoot, frontendRoot } = await setupWorkspace({ withBackendMarkers: false });
  try {
    const result = evaluateWorkspaceGuard(frontendRoot);
    assert.equal(result.ok, false);
    assert.match(result.message, /missing/);
    assert.match(result.message, /pyproject.toml/);
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});
