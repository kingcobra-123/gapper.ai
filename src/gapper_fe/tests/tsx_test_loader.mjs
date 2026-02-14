import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const TESTS_DIR = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = path.resolve(TESTS_DIR, "..");
const SRC_ROOT = path.join(PROJECT_ROOT, "src");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveCandidate(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.mjs")
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const candidate = await resolveCandidate(path.join(SRC_ROOT, specifier.slice(2)));
    if (candidate) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier) &&
    context.parentURL?.startsWith("file:")
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const candidate = await resolveCandidate(path.resolve(parentDir, specifier));
    if (candidate) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (url.startsWith("file:") && (url.endsWith(".ts") || url.endsWith(".tsx"))) {
    const filename = fileURLToPath(url);
    const sourceText = await fs.readFile(filename, "utf8");
    const transpiled = ts.transpileModule(sourceText, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        esModuleInterop: true
      },
      fileName: filename,
      reportDiagnostics: false
    });

    return {
      format: "module",
      source: transpiled.outputText,
      shortCircuit: true
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
