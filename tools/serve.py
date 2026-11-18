#!/usr/bin/env python3
"""Servidor local para revisar el sitio:  python3 tools/serve.py  →  http://localhost:5599

Hace lo mismo que `python -m http.server`, pero le dice al navegador que no
guarde nada. Con el servidor de siempre el navegador se quedaba con el CSS y
el JavaScript viejos y mostraba páginas nuevas con estilos de antes.

No se publica (tools/deploy_copy.py sólo copia lo que la web usa).
"""
import http.server
import os
import sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):      # sólo los errores, para no llenar la terminal
        if len(args) > 1 and str(args[1]).startswith(('4', '5')):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5599
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    print(f'Sitio en http://localhost:{port}  (Ctrl+C para cortar)')
    http.server.ThreadingHTTPServer(('', port), SinCache).serve_forever()
