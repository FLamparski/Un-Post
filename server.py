#!/usr/bin/env python3

from http.server import HTTPServer, SimpleHTTPRequestHandler

class CorsHttpRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        super().do_GET()

httpd = HTTPServer(('', 8000), CorsHttpRequestHandler)
try:
    httpd.serve_forever()
except KeyboardInterrupt as e:
    print('Exiting')
