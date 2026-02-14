import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function loadEnvFileIfPresent(filename) {
  const filePath = path.resolve(process.cwd(), filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");

  contents.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    let value = trimmedLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

loadEnvFileIfPresent(".env");
loadEnvFileIfPresent(".env.local");

const PORT = Number.parseInt(
  process.env.AUTH_SERVER_PORT || process.env.PORT || "8787",
  10
);
const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY?.trim() ||
  process.env.VITE_SUPABASE_ANON_KEY?.trim();
const ALLOWED_ORIGINS = (
  process.env.AUTH_ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[auth-server] Missing SUPABASE_URL/SUPABASE_ANON_KEY (or VITE_ equivalents)."
  );
  process.exit(1);
}

if (Number.isNaN(PORT) || PORT <= 0) {
  console.error("[auth-server] Invalid AUTH_SERVER_PORT.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

function resolveCorsOrigin(origin) {
  if (ALLOWED_ORIGINS.includes("*")) {
    return "*";
  }

  if (!origin) {
    return ALLOWED_ORIGINS[0] || "*";
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  return null;
}

function writeJson(res, statusCode, payload, origin) {
  const corsOrigin = resolveCorsOrigin(origin);

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Cache-Control": "no-store",
  };

  if (corsOrigin) {
    headers["Access-Control-Allow-Origin"] = corsOrigin;
    headers["Vary"] = "Origin";
  }

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    let receivedBytes = 0;

    req.on("data", (chunk) => {
      receivedBytes += chunk.length;

      if (receivedBytes > maxBytes) {
        const error = new Error("Request body too large.");
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }

      body += chunk;
    });

    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        const parseError = new Error("Invalid JSON body.");
        parseError.statusCode = 400;
        reject(parseError);
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

function getProviders(appMetadata) {
  if (Array.isArray(appMetadata?.providers)) {
    return appMetadata.providers.filter((provider) => typeof provider === "string");
  }

  if (typeof appMetadata?.provider === "string" && appMetadata.provider) {
    return [appMetadata.provider];
  }

  return [];
}

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID();
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const origin = req.headers.origin;

  if (req.method === "OPTIONS") {
    writeJson(res, 204, {}, origin);
    return;
  }

  console.log(
    "[auth-server]",
    new Date().toISOString(),
    `request_id=${requestId}`,
    `method=${req.method}`,
    `path=${requestUrl.pathname}`
  );

  if (requestUrl.pathname === "/api/health" && req.method === "GET") {
    writeJson(
      res,
      200,
      {
        ok: true,
        service: "auth-server",
        requestId,
      },
      origin
    );
    return;
  }

  if (requestUrl.pathname === "/api/auth/verify" && req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      writeJson(
        res,
        error.statusCode || 400,
        {
          ok: false,
          requestId,
          error: { message: error.message || "Unable to read request body." },
        },
        origin
      );
      return;
    }

    const accessToken =
      typeof body?.accessToken === "string" ? body.accessToken.trim() : "";

    if (!accessToken) {
      writeJson(
        res,
        400,
        {
          ok: false,
          requestId,
          error: { message: "accessToken is required." },
        },
        origin
      );
      return;
    }

    let data;
    let error;

    try {
      ({ data, error } = await supabase.auth.getUser(accessToken));
    } catch (unexpectedError) {
      console.error(
        "[auth-server]",
        new Date().toISOString(),
        `request_id=${requestId}`,
        "unexpected verification error",
        unexpectedError
      );

      writeJson(
        res,
        502,
        {
          ok: false,
          requestId,
          error: {
            message: "Token verification service unavailable.",
          },
        },
        origin
      );
      return;
    }

    if (error || !data?.user) {
      writeJson(
        res,
        401,
        {
          ok: false,
          requestId,
          error: {
            message: error?.message || "Token is invalid or expired.",
          },
        },
        origin
      );
      return;
    }

    const { user } = data;
    const rawUsername =
      user.user_metadata?.username ||
      user.user_metadata?.preferred_username ||
      user.user_metadata?.full_name ||
      "";

    const username = typeof rawUsername === "string" ? rawUsername.trim() : "";

    writeJson(
      res,
      200,
      {
        ok: true,
        requestId,
        user: {
          id: user.id,
          email: user.email || null,
          username: username || null,
          providers: getProviders(user.app_metadata),
          lastSignInAt: user.last_sign_in_at || null,
        },
      },
      origin
    );
    return;
  }

  writeJson(
    res,
    404,
    {
      ok: false,
      requestId,
      error: { message: "Route not found." },
    },
    origin
  );
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    "[auth-server]",
    new Date().toISOString(),
    `listening on http://0.0.0.0:${PORT}`
  );
});
