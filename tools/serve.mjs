#!/usr/bin/env node
/**
 * Local dev server for the product subdomains.
 * Mirrors Firebase Hosting's cleanUrls behaviour so /emi-calculator resolves
 * to emi-calculator.html exactly as it will in production.
 *
 *   node tools/serve.mjs                 # getinterest:4321 getpdf:4322 getjson:4323 main:4320
 *   node tools/serve.mjs getinterest     # just one, on 4321
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITES = {
  main:        { dir: ".",                  port: 4320 },
  getinterest: { dir: "sites/getinterest",  port: 4321 },
  getpdf:      { dir: "sites/getpdf",       port: 4322 },
  getjson:     { dir: "sites/getjson",      port: 4323 },
};

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".wasm": "application/wasm", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".pdf": "application/pdf",
};

async function exists(p) { try { const s = await stat(p); return s.isFile(); } catch { return false; } }

function serve(name, { dir, port }) {
  const base = join(root, dir);
  createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith("/")) p += "index.html";
    let file = join(base, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    if (!(await exists(file)) && !extname(file)) file += ".html";     // cleanUrls
    if (!(await exists(file))) file = join(base, "index.html");        // SPA-ish fallback
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": TYPES[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch (e) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404");
    }
  }).listen(port, () => console.log(`${name.padEnd(12)} http://localhost:${port}  ← ${dir}`));
}

const only = process.argv[2];
for (const [name, cfg] of Object.entries(SITES)) {
  if (only && name !== only) continue;
  serve(name, cfg);
}
