#!/usr/bin/env python3
"""Servidor estático mínimo con directorio absoluto fijo (no usa os.getcwd,
que está bloqueado en el sandbox del preview)."""
import functools
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = "/Users/meowrhino/Desktop/tatara web"
PORT = 8765

Handler = functools.partial(SimpleHTTPRequestHandler, directory=ROOT)
httpd = HTTPServer(("127.0.0.1", PORT), Handler)
print(f"serving {ROOT} at http://127.0.0.1:{PORT}")
httpd.serve_forever()
