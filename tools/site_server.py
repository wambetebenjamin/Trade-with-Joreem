"""Local preview with clean URLs, gzip and production-like static caching."""
from __future__ import annotations

import argparse
import gzip
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
PAGES = {path.stem for path in ROOT.glob("*.html")}
COMPRESSIBLE = {".html", ".css", ".js", ".json", ".xml", ".txt", ".md", ".svg"}


class CleanURLHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def _clean_path(self) -> bool:
        parts = urlsplit(self.path)
        path = parts.path
        if path != "/" and path.endswith("/") and not (ROOT / path.strip("/")).is_dir():
            self.send_response(308)
            self.send_header("Location", urlunsplit(("", "", path.rstrip("/"), parts.query, parts.fragment)))
            self.end_headers()
            return False
        if path == "/index.html":
            destination = "/"
        elif path.startswith("/") and path.endswith(".html") and Path(path).stem in PAGES and len(Path(path).parts) == 2:
            destination = "/" + Path(path).stem
        else:
            destination = None
        if destination is not None:
            self.send_response(308)
            self.send_header("Location", urlunsplit(("", "", destination, parts.query, parts.fragment)))
            self.end_headers()
            return False
        if path != "/" and not Path(path).suffix and path.strip("/") in PAGES:
            self.path = urlunsplit(("", "", path + ".html", parts.query, parts.fragment))
        return True

    def _serve(self, include_body: bool):
        filename = Path(self.translate_path(self.path))
        if filename.is_dir():
            filename = filename / "index.html"
        if not filename.is_file():
            self.send_error(404, "File not found")
            return
        data = filename.read_bytes()
        content_type = mimetypes.guess_type(filename.name)[0] or "application/octet-stream"
        use_gzip = filename.suffix.lower() in COMPRESSIBLE and len(data) > 512 and "gzip" in self.headers.get("Accept-Encoding", "")
        if use_gzip:
            data = gzip.compress(data, compresslevel=6, mtime=0)
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        if any(part in filename.parts for part in ["assets", "img", "css", "js", "lib"]):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        if filename.suffix.lower() in COMPRESSIBLE:
            self.send_header("Vary", "Accept-Encoding")
        if use_gzip:
            self.send_header("Content-Encoding", "gzip")
        self.end_headers()
        if include_body:
            self.wfile.write(data)

    def do_GET(self):
        if self._clean_path():
            self._serve(True)

    def do_HEAD(self):
        if self._clean_path():
            self._serve(False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8081)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("0.0.0.0", args.port), CleanURLHandler)
    print(f"Trade with Joreem clean-URL preview: http://0.0.0.0:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
