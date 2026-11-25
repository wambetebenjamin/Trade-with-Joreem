#!/usr/bin/env python3
"""Small attachment-focused server for the finished presentation downloads."""

from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOWNLOAD_DIR = ROOT / "presentations"


class DownloadHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".pdf": "application/pdf",
        ".zip": "application/zip",
        ".md": "text/markdown; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOWNLOAD_DIR), **kwargs)

    def do_GET(self):
        route = urlsplit(self.path).path
        if route == "/health":
            body = b"ok\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if route in ("", "/", "/download", "/download/"):
            self.path = "/download.html"
        super().do_GET()

    def end_headers(self):
        path = unquote(urlsplit(self.path).path)
        suffix = Path(path).suffix.lower()
        if suffix in {".pptx", ".pdf", ".zip", ".md"}:
            filename = Path(path).name
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Cache-Control", "private, max-age=3600")
        else:
            self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"[Download Center] {self.address_string()} — {fmt % args}", flush=True)


class Server(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    server = Server(("0.0.0.0", args.port), DownloadHandler)
    print(f"Download Center available on 0.0.0.0:{args.port}", flush=True)
    print(f"Serving attachments from {DOWNLOAD_DIR}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
