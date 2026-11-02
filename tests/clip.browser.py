"""Prueba local del visor en Chromium. No usa Instagram real ni inicia sesión.
Ejecutar: /opt/pyvenv/bin/python tests/clip.browser.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
filterjs = root / 'app/src/main/assets/filter.js'
clipjs = root / 'app/src/main/assets/clip.js'
html = '''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body><header>Chat</header><div id="conversation">
<a id="shared" href="https://www.instagram.com/reel/ABC123/">Video compartido</a>
<div id="mount"></div></div>
<script>
window.CalmaBridge = {
 armClip(url) { (window.calls ||= []).push(['arm',url]); },
 setClipActive(state) { (window.calls ||= []).push(['active',state]); }
};
document.getElementById('shared').addEventListener('click', event => {
 event.preventDefault();
 setTimeout(() => { document.getElementById('mount').innerHTML =
   '<video id="video" muted playsinline style="width: 300px; height:400px"></video>'; }, 60);
});
</script></body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={"width":390,"height":770}, is_mobile=True, has_touch=True)
    page.route('https://www.instagram.com/**', lambda r: r.fulfill(body=html, content_type='text/html; charset=utf-8'))
    page.goto('https://www.instagram.com/direct/t/test/')
    page.add_script_tag(path=str(clipjs))
    assert page.locator('body.calma-chat').count() == 1
    page.get_by_role('link', name='Video compartido').click()
    page.wait_for_selector('#calma-single-clip video', timeout=3500)
    assert page.locator('#calma-single-clip video').count() == 1
    assert page.evaluate('getComputedStyle(document.querySelector("#calma-single-clip video")).objectFit') == 'contain'
    assert page.evaluate('document.querySelector("#calma-single-clip").getBoundingClientRect().width') == 390
    assert page.evaluate('window.calls.some(x => x[0] === "active" && x[1] === true)')
    assert page.evaluate('window.calls.some(x => x[0] === "arm" && x[1].includes("/reel/ABC123/"))')
    assert page.evaluate('''() => {
      const event = new WheelEvent('wheel',{deltaY:100, cancelable:true, bubbles:true});
      return !document.querySelector('#calma-single-clip').dispatchEvent(event);
    }'''), 'scroll must be blocked'
    # El resto del contenido no sustituye el clip aislado.
    page.evaluate("document.querySelector('#mount').insertAdjacentHTML('beforeend', '<video id=\"suggested\"></video>')")
    assert page.evaluate("document.querySelector('#calma-single-clip video').id") == 'video'
    page.get_by_role('button', name='Activar sonido').click()
    assert page.evaluate('document.querySelector("#calma-single-clip video").muted') is False
    page.evaluate('document.querySelector("#calma-single-clip video").dispatchEvent(new Event("ended", {bubbles:true}))')
    assert page.locator('#calma-single-clip.ended').count() == 1
    page.get_by_role('button', name='Volver al chat').click()
    page.wait_for_function('!document.querySelector("#calma-single-clip")')
    assert page.locator('#mount > video#video').count() == 0
    assert page.url == 'https://www.instagram.com/direct/t/test/'
    print('OK: apertura desde Direct, escala, audio, bloqueo de scroll, fin y vuelta al chat')
    browser.close()
