"""Buscador de Instagram: fixtures DOM locales, sin backend de Instagram."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
script = root / 'app/src/main/assets/filter.js'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page()
    html = '''<nav>
      <a id="search" href="/explore/search/">Buscar</a>
      <a id="explore" href="/explore/">Explorar</a>
      <a id="reels" href="/reels/">Reels</a></nav>
      <script>search.onclick=e=>{e.preventDefault();document.body.insertAdjacentHTML('beforeend',
      '<div role="dialog"><input placeholder="Buscar"><a id="result" href="/maria.garcia/">María García</a></div>')}</script>'''
    page.route('https://www.instagram.com/**', lambda r: r.fulfill(body=html, content_type='text/html'))
    page.goto('https://www.instagram.com/direct/inbox/')
    page.add_script_tag(path=str(script))
    assert page.locator('#search').is_visible()
    assert page.locator('#explore').is_hidden()
    assert page.locator('#reels').is_hidden()
    assert page.evaluate('window.__calmaOpenSearch()') is True
    page.locator('input').fill('maria')
    assert page.locator('#result').is_visible()
    # Volver a tocar Buscar enfoca el campo, sin duplicar el panel.
    assert page.evaluate('window.__calmaOpenSearch()') is True
    assert page.locator('input').count() == 1
    assert page.locator('input').evaluate('(el)=>document.activeElement===el')
    page.locator('#result').click()
    assert page.url.endswith('/maria.garcia/')
    # El enlace absoluto al buscador también permanece visible.
    page.locator('#search').evaluate('(el)=>el.href="https://www.instagram.com/explore/search/?q=maria"')
    assert page.locator('#search').is_visible()
    # El buscador de chats no debe confundirse con el global.
    page.set_content('<input placeholder="Search">')
    page.add_script_tag(path=str(script))
    assert page.evaluate('window.__calmaOpenSearch()') is False
    # Variante de Instagram con icono SVG y panel, sin ruta propia.
    page.set_content('''<nav><div role="button" id="icon"><svg aria-label="Search"></svg></div></nav>
      <script>icon.onclick=()=>document.body.insertAdjacentHTML('beforeend','<input placeholder="Search">')</script>''')
    page.add_script_tag(path=str(script))
    assert page.evaluate('window.__calmaOpenSearch()') is True
    assert page.locator('input').count() == 1
    # Sin control disponible: devolver false para que Android abra la URL oficial.
    page.set_content('<main>Sin navegación</main>')
    page.add_script_tag(path=str(script))
    assert page.evaluate('window.__calmaOpenSearch()') is False
    print('PASS: enlace de búsqueda visible, Explorar/Reels ocultos, apertura del panel oficial simulado, enfoque, selección de perfil, icono SVG y fallback.')
    print('Resultados simulados; no verifica sugerencias autenticadas de Instagram.')
    browser.close()
