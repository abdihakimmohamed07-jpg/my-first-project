"""Local preview server that mimics GitHub Pages URL handling.

Usage: python3 .claude/ghpages_server.py [root] [port]   (defaults: . 8766)

- /            -> index.html
- /fleet       -> fleet.html (clean URLs)
- /fleet.html  -> fleet.html
- /fleet/ and unknown paths -> 404.html with a 404 status
"""
import http.server
import io
import os
import sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8766


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        path = self.path.split("?")[0].split("#")[0]
        file_path = os.path.join(ROOT, path.lstrip("/"))
        if path == "/":
            self.path = "/index.html"
        elif os.path.isfile(file_path):
            pass
        elif not path.endswith("/") and os.path.isfile(file_path + ".html"):
            self.path = path + ".html"
        else:
            with open(os.path.join(ROOT, "404.html"), "rb") as f:
                body = f.read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return io.BytesIO(body)
        return super().send_head()


if __name__ == "__main__":
    print(f"Serving {ROOT} at http://127.0.0.1:{PORT}")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
