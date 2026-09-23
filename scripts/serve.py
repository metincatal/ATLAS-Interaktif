"""
Yerel geliştirme sunucusu.

Depo kökünü sunar ve tarayıcı önbelleğini kapatır; böylece yapılan
değişiklikler yenilemede hemen görünür. Uygulama adresi:
    http://localhost:8000/src/web/

Kullanım:
    python3 scripts/serve.py [port]
"""

import http.server
import os
import socketserver
import sys
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".geojson": "application/geo+json",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "404" in (fmt % args):
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    url = f"http://localhost:{PORT}/src/web/"
    with Server(("", PORT), Handler) as httpd:
        print(f"ATLAS İnteraktif çalışıyor: {url}  (durdurmak için Ctrl+C)")
        if "--open" in sys.argv:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
