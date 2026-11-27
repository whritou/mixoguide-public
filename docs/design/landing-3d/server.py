import http.server
import os
import sys

ROOT = sys.argv[2]
PORT = int(sys.argv[1])


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_PUT(self):
        name = os.path.basename(self.path)
        if not name or not name.replace('.', '').replace('-', '').replace('_', '').isalnum():
            self.send_response(400)
            self.end_headers()
            return
        out = os.path.join(ROOT, 'out')
        os.makedirs(out, exist_ok=True)
        n = int(self.headers.get('Content-Length', '0'))
        with open(os.path.join(out, name), 'wb') as f:
            f.write(self.rfile.read(n))
        self.send_response(200)
        self.end_headers()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
