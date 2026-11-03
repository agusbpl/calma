"""Profile and notifications must survive filtering app banners during loading."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page()
    html = '''<main><section id="content"><h1>Fede</h1><p>858 followers</p></section><a href="instagram://user">Use the app</a></main>'''
    page.route('https://www.instagram.com/**', lambda r: r.fulfill(body=html,content_type='text/html'))
    for path in ['/fharamberry/', '/notifications/']:
        page.goto('https://www.instagram.com'+path)
        page.add_script_tag(path=str(root/'app/src/main/assets/filter.js'))
        assert page.locator('#content').is_visible(), f'{path}: el filtro oculta el contenido junto con el banner'
        page.locator('#content').evaluate("el=>el.innerHTML='<h1>Contenido cargado</h1>'")
        page.wait_for_timeout(400)
        assert page.locator('#content').is_visible()
        if path == '/notifications/':
            assert page.evaluate('JSON.parse(window.__calmaContext()).type') == 'activity'
    print('PASS: perfil y notificaciones conservan contenido durante y después de cargar; notifications es actividad')
    browser.close()
