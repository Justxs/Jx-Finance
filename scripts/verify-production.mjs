import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { root, run } from "./run.mjs";

const keepStack = process.argv.includes("--keep");
const host = "finance.internal";
const port = Number(process.env.VERIFY_HTTPS_PORT ?? 8443);
const compose = ["compose", "-p", "jx-verify", "-f", "docker-compose.yml", "-f", "docker-compose.production.yml"];
const environment = { SITE_ADDRESS: host, BIND_ADDRESS: "127.0.0.1", HTTPS_PORT: String(port) };
const admin = { email: "verify@example.com", password: "Verify-production-1!", displayName: "Verify" };

function docker(args, options = {}) {
  return run("docker", [...compose, ...args], { ...options, env: environment }).stdout;
}

function request(method, route, { body, cookies } = {}) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const headers = { Host: port === 443 ? host : `${host}:${port}` };
  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(payload);
  }
  if (cookies?.length) headers.Cookie = cookies.join("; ");
  return new Promise((resolve, reject) => {
    const call = https.request(
      { host: "127.0.0.1", port, servername: host, path: route, method, headers, rejectUnauthorized: false },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString("utf8") }));
      },
    );
    call.on("error", reject);
    call.end(payload);
  });
}

const failures = [];
function check(description, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"}  ${description}${passed || !detail ? "" : `  (${detail})`}`);
  if (!passed) failures.push(description);
}

async function main() {
  if (!fs.existsSync(path.join(root, ".env"))) throw new Error("Missing .env; copy .env.example to .env first.");

  docker(["config", "--quiet"]);
  const services = JSON.parse(docker(["config", "--format", "json"], { capture: true })).services;
  const published = Object.entries(services).flatMap(([name, service]) => (service.ports ?? []).map((entry) => `${name}:${entry.target}`));
  check("only the frontend HTTPS port is published", published.join(",") === "frontend:443", published.join(","));
  for (const volume of ["auth_keys", "backups", "attachments"]) {
    const users = Object.entries(services)
      .filter(([, service]) => (service.volumes ?? []).some((mount) => mount.source === volume))
      .map(([name]) => name);
    check(`the ${volume} volume is mounted only into api`, users.join(",") === "api", users.join(","));
  }

  docker(["down", "--volumes", "--remove-orphans"]);
  docker(["up", "-d", "--build", "--wait"]);

  const user = docker(["exec", "-T", "api", "id", "-u"], { capture: true }).trim();
  check("the API container runs as a non-root user", user !== "" && user !== "0", `uid ${user}`);

  const page = await request("GET", "/");
  check("the site answers 200 over HTTPS", page.status === 200, `status ${page.status}`);
  check("HSTS is sent", /max-age=\d+/.test(page.headers["strict-transport-security"] ?? ""), page.headers["strict-transport-security"]);
  check("the site sends its Content-Security-Policy", (page.headers["content-security-policy"] ?? "").includes("script-src 'self'"));
  check("Permissions-Policy is sent", Boolean(page.headers["permissions-policy"]));
  check("Referrer-Policy is sent", Boolean(page.headers["referrer-policy"]));

  const status = await request("GET", "/api/setup/status");
  check("the API answers through Caddy", status.status === 200, `status ${status.status}`);
  check("API responses carry nosniff", status.headers["x-content-type-options"] === "nosniff", String(status.headers["x-content-type-options"]));
  check("API responses carry the restrictive Content-Security-Policy", (status.headers["content-security-policy"] ?? "").startsWith("default-src 'none'"), status.headers["content-security-policy"]);
  check("API responses carry HSTS", Boolean(status.headers["strict-transport-security"]));

  const setup = await request("POST", "/api/setup", { body: admin });
  check("first-run setup creates the administrator", setup.status === 200, `status ${setup.status} ${setup.body.slice(0, 200)}`);

  const login = await request("POST", "/api/auth/login", { body: { email: admin.email, password: admin.password, rememberMe: false, twoFactorCode: null } });
  check("sign-in succeeds", login.status === 200, `status ${login.status} ${login.body.slice(0, 200)}`);
  const setCookies = login.headers["set-cookie"] ?? [];
  check("sign-in sets cookies", setCookies.length > 0);
  for (const cookie of setCookies) {
    const name = cookie.split("=")[0];
    check(`cookie ${name} is Secure`, /;\s*secure/i.test(cookie), cookie.replace(/=[^;]*/, "=<redacted>"));
    check(`cookie ${name} is HttpOnly`, /;\s*httponly/i.test(cookie));
  }
  const cookies = setCookies.map((cookie) => cookie.split(";")[0]).filter((cookie) => cookie.startsWith("jx_access="));
  check("sign-in issues the jx_access cookie", cookies.length === 1);

  const before = await request("GET", "/api/auth/me", { cookies });
  check("the session authenticates before the API is recreated", before.status === 200, `status ${before.status}`);

  docker(["up", "-d", "--force-recreate", "--no-deps", "--wait", "api"]);

  const after = await request("GET", "/api/auth/me", { cookies });
  check("the same access token authenticates after the API container is recreated", after.status === 200, `status ${after.status}`);

  const wrongHost = docker(["exec", "-T", "api", "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-H", "Host: other.example", "http://localhost:8080/api/setup/status"], { capture: true, allowFailure: true }).trim();
  check("the API rejects a Host header outside AllowedHosts", wrongHost === "400", `status ${wrongHost}`);
}

let crashed = false;
try {
  await main();
} catch (error) {
  crashed = true;
  console.error(error.message);
}

if (crashed || failures.length > 0) {
  docker(["ps"], { allowFailure: true });
  docker(["logs", "--no-color", "--tail", "80"], { allowFailure: true });
}
if (!keepStack) docker(["down", "--volumes", "--remove-orphans"], { allowFailure: true });

if (crashed || failures.length > 0) {
  console.error(crashed ? "Production overlay verification did not complete." : `Production overlay verification failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("Production overlay verified.");
