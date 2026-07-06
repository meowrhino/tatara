#!/usr/bin/env python3
"""Servidor estático mínimo con directorio absoluto fijo (no usa os.getcwd,
que está bloqueado en el sandbox del preview)."""
import functools
from http.server import HTTPServer, SimpleHTTPRequestHandler

# TODO: ruta desactualizada (el repo se movió a ~/Documents/GitHub/tatara).
# Actualizarla o borrar este script y usar `python3 -m http.server 8765` (ver README).
ROOT = "/Users/meowrhino/Desktop/tatara web"
PORT = 8765

Handler = functools.partial(SimpleHTTPRequestHandler, directory=ROOT)
httpd = HTTPServer(("127.0.0.1", PORT), Handler)
print(f"serving {ROOT} at http://127.0.0.1:{PORT}")
httpd.serve_forever()
