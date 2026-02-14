import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_DIRNAME = "gapper_fe";
const REQUIRED_REPO_MARKERS = [
  "pyproject.toml",
  path.join("app", "services", "api", "main.py")
];

function hasAllRequiredMarkers(repoRoot) {
  const missingMarkers = REQUIRED_REPO_MARKERS.filter(
    (marker) => !fs.existsSync(path.join(repoRoot, marker))
  );
  return {
    ok: missingMarkers.length === 0,
    missingMarkers
  };
}

export function evaluateWorkspaceGuard(frontendCwd = process.cwd()) {
  const frontendRoot = path.resolve(frontendCwd);
  const frontendDirName = path.basename(frontendRoot);

  if (frontendDirName !== FRONTEND_DIRNAME) {
    return {
      ok: false,
      frontendRoot,
      repoRoot: path.resolve(frontendRoot, ".."),
      message: `[workspace-guard] Expected to run from "${FRONTEND_DIRNAME}" directory, got "${frontendDirName}".`
    };
  }

  const repoRoot = path.resolve(frontendRoot, "..");
  const markerCheck = hasAllRequiredMarkers(repoRoot);
  if (!markerCheck.ok) {
    return {
      ok: false,
      frontendRoot,
      repoRoot,
      message: `[workspace-guard] Refusing to run: ${frontendRoot} is not attached to a backend workspace (missing ${markerCheck.missingMarkers.join(", ")} under ${repoRoot}).`
    };
  }

  return {
    ok: true,
    frontendRoot,
    repoRoot,
    message: `[workspace-guard] OK: ${frontendRoot} is paired with backend repo ${repoRoot}.`
  };
}

export function assertWorkspaceGuard(frontendCwd = process.cwd()) {
  const result = evaluateWorkspaceGuard(frontendCwd);
  if (result.ok) {
    return result;
  }

  if (process.env.SKIP_GAPPER_WORKSPACE_GUARD === "1") {
    return {
      ...result,
      ok: true,
      skipped: true,
      message: `[workspace-guard] SKIPPED: ${result.message}`
    };
  }

  throw new Error(`${result.message} Set SKIP_GAPPER_WORKSPACE_GUARD=1 to override.`);
}

function isInvokedAsScript() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isInvokedAsScript()) {
  try {
    const result = assertWorkspaceGuard(process.cwd());
    const stream = result.skipped ? process.stderr : process.stdout;
    stream.write(`${result.message}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}
