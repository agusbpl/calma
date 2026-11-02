"""Regresión: cerrar un clip nunca debe revelar el carrusel situado detrás.
Fixture DOM local; no requiere cuenta ni tráfico real de Instagram.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
clip = (root / 'app/src/main/assets/clip.js').read_text()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for route_path in ['', '/p/SHARED123/', '/reel/SHARED123/']:
        page = browser.new_page(viewport={'width':390, 'height':770}, is_mobile=True, has_touch=True)
        html = '''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <a id="shared" href="/reel/SHARED123/">Video compartido</a><div id="mount"></div>
        <script>
        document.querySelector('#shared').onclick = event => {
          event.preventDefault();
          ROUTE_CHANGE
          document.querySelector('#mount').innerHTML = '<div id="carousel" role="dialog"><video style="width:300px;height:400px"></video><p>Más videos sugeridos</p></div>';
        };
        window.__calmaReturnChatUrl='https://www.instagram.com/direct/t/123456/';
        </script><script>CLIP_SOURCE</script>'''.replace('ROUTE_CHANGE', f'history.pushState({{}}, "", "{route_path}");' if route_path else '').replace('CLIP_SOURCE',clip)
        page.route('https://www.instagram.com/**',lambda r:r.fulfill(body=html,content_type='text/html'))
        page.goto('https://www.instagram.com/direct/t/123456/')
        page.locator('#shared').click()
        page.wait_for_selector('#calma-single-clip video')
        page.get_by_role('button',name='← Chats',exact=True).click()
        page.wait_for_function('!document.querySelector("#carousel")',timeout=2000)
        assert page.url=='https://www.instagram.com/direct/t/123456/', page.url
        print('PASS: cierre regresa al chat sin carrusel, ruta de visor:',route_path or 'Direct sin cambiar URL')
        page.close()
    browser.close()
