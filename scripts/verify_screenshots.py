import http.server
import socketserver
import threading
import time
import os
from playwright.sync_api import sync_playwright

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='frontend/dist', **kwargs)
    def do_GET(self):
        p = os.path.join('frontend/dist', self.path.lstrip('/'))
        if not os.path.exists(p) or os.path.isdir(p):
            self.path = '/index.html'
        return super().do_GET()

def main():
    os.makedirs('docs/audit', exist_ok=True)
    port = 5173
    httpd = socketserver.TCPServer(('127.0.0.1', port), Handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    print(f'Server started on {port}')

    time.sleep(1)

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Desktop Light
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        page.goto(f'http://127.0.0.1:{port}/')
        page.evaluate("() => { document.documentElement.setAttribute('data-theme', 'light'); }")
        page.wait_for_timeout(600)
        page.screenshot(path='docs/audit/verified_light_desktop.png', full_page=True)
        print('Captured docs/audit/verified_light_desktop.png')

        # Desktop Dark
        page.evaluate("() => { document.documentElement.setAttribute('data-theme', 'dark'); }")
        page.wait_for_timeout(600)
        page.screenshot(path='docs/audit/verified_dark_desktop.png', full_page=True)
        print('Captured docs/audit/verified_dark_desktop.png')

        # Mobile Light
        m_page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        m_page.goto(f'http://127.0.0.1:{port}/')
        m_page.evaluate("() => { document.documentElement.setAttribute('data-theme', 'light'); }")
        m_page.wait_for_timeout(600)
        m_page.screenshot(path='docs/audit/verified_light_mobile.png', full_page=True)
        print('Captured docs/audit/verified_light_mobile.png')

        # Mobile Dark
        m_page.evaluate("() => { document.documentElement.setAttribute('data-theme', 'dark'); }")
        m_page.wait_for_timeout(600)
        m_page.screenshot(path='docs/audit/verified_dark_mobile.png', full_page=True)
        print('Captured docs/audit/verified_dark_mobile.png')

        browser.close()

    httpd.shutdown()
    print('All screenshots captured successfully!')

if __name__ == '__main__':
    main()
