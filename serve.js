// Static file server for the blog (GitHub Pages-like).
// `bun index.html` does NOT work: its dev server falls back to index.html
// on every route, so fetch("src/posts.json") gets HTML -> JSON parse error.
import { file } from "bun";

const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".jfif": "image/jpeg", ".gif": "image/gif",
  ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".pdf": "application/pdf",
  ".enc": "application/octet-stream",
};

Bun.serve({
  port: 8000,
  async fetch(req) {
    let path = decodeURIComponent(new URL(req.url).pathname);
    if (path === "/") path = "/index.html";
    const f = file("." + path);
    if (!(await f.exists())) return new Response("404", { status: 404 });
    const ext = path.slice(path.lastIndexOf("."));
    return new Response(f, { headers: { "content-type": MIME[ext] || "application/octet-stream" } });
  },
});
console.log("blog -> http://localhost:8000");
