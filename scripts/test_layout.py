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
    port = 5177
    httpd = socketserver.TCPServer(('127.0.0.1', port), Handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    time.sleep(1)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        page.goto(f'http://127.0.0.1:{port}/')
        page.wait_for_timeout(500)

        # Check font
        body_font = page.evaluate("() => window.getComputedStyle(document.body).fontFamily")
        print('Body font:', body_font)

        # Light theme bg
        bg_light = page.evaluate("() => window.getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim()")
        print('Root light --bg-base:', bg_light)

        # Switch to dark
        page.evaluate("() => document.documentElement.setAttribute('data-theme', 'dark')")
        page.wait_for_timeout(500)

        bg_dark = page.evaluate("() => window.getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim()")
        print('Root dark --bg-base:', bg_dark)

        body_bg_dark = page.evaluate("() => window.getComputedStyle(document.body).backgroundColor")
        print('Body dark bg after transition:', body_bg_dark)

        # Desktop header
        header_h = page.evaluate("() => document.querySelector('.top') ? document.querySelector('.top').offsetHeight : null")
        print('Header height:', header_h)

        # Desktop bottom nav display
        bottom_nav_disp = page.evaluate("() => { const el = document.querySelector('.bottom-nav'); return el ? window.getComputedStyle(el).display : 'null'; }")
        print('Desktop bottom nav display:', bottom_nav_disp)

        # Mobile test
        m_page = browser.new_page(viewport={'width': 390, 'height': 844})
        m_page.goto(f'http://127.0.0.1:{port}/')
        m_page.wait_for_timeout(500)
        m_bottom_nav_disp = m_page.evaluate("() => { const el = document.querySelector('.bottom-nav'); return el ? window.getComputedStyle(el).display : 'null'; }")
        print('Mobile bottom nav display:', m_bottom_nav_disp)
        m_top_nav_disp = m_page.evaluate("() => { const el = document.querySelector('.top-nav'); return el ? window.getComputedStyle(el).display : 'null'; }")
        print('Mobile top nav display:', m_top_nav_disp)

        browser.close()

    httpd.shutdown()
    print('Check complete!')

if __name__ == '__main__':
    main()
