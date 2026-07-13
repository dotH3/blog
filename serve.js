// Static file server for the blog (GitHub Pages-like).
// `bun index.html` does NOT work: its dev server falls back to index.html
// on every route, so fetch("src/posts.json") gets HTML -> JSON parse error.
import { file } from "bun";
import { watch } from "fs";

const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".jfif": "image/jpeg", ".gif": "image/gif",
  ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".pdf": "application/pdf",
  ".enc": "application/octet-stream",
};

// Live-reload: notify connected browsers when any file changes.
const clients = new Set();
function reloadAll() {
  for (const c of clients) c.enqueue("data: reload\n\n");
}
let timer = null;
watch(".", { recursive: true }, (_e, filename) => {
  if (!filename || filename.startsWith(".git")) return;
  clearTimeout(timer);            // debounce burst of fs events
  timer = setTimeout(reloadAll, 100);
});

const RELOAD_SNIPPET = `<script>
new EventSource("/__reload").onmessage = () => location.reload();
</script>`;

Bun.serve({
  port: 8000,
  async fetch(req) {
    let path = decodeURIComponent(new URL(req.url).pathname);

    if (path === "/__reload") {
      let self;
      const stream = new ReadableStream({
        start(ctrl) { self = ctrl; clients.add(ctrl); },
        cancel() { clients.delete(self); },
      });
      return new Response(stream, {
        headers: { "content-type": "text/event-stream", "cache-control": "no-cache", "connection": "keep-alive" },
      });
    }

    if (path === "/") path = "/index.html";
    const f = file("." + path);
    if (!(await f.exists())) return new Response("404", { status: 404 });
    const ext = path.slice(path.lastIndexOf("."));

    if (ext === ".html") {
      const html = (await f.text()) + RELOAD_SNIPPET;
      return new Response(html, { headers: { "content-type": "text/html" } });
    }
    return new Response(f, { headers: { "content-type": MIME[ext] || "application/octet-stream" } });
  },
});
console.log("blog -> http://localhost:8000 (live-reload on)");
