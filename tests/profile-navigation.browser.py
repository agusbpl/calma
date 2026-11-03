"""Regresión: un enlace bloqueado no expulsa al usuario del perfil."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page()
    page.route('https://www.instagram.com/**', lambda r: r.fulfill(body='''<a id="post" href="/reel/ABC/">Video del perfil</a>
      <a id="activity" href="/accounts/activity/">♡</a>''', content_type='text/html'))
    page.goto('https://www.instagram.com/usuario.real/')
    page.add_script_tag(path=str(root / 'app/src/main/assets/filter.js'))
    page.locator('#post').dispatch_event('click')
    page.wait_for_timeout(400)
    assert page.url.endswith('/usuario.real/'), 'un toque bloqueado expulsa del perfil'
    assert page.locator('#activity').is_visible(), 'el corazón de updates debe estar disponible'
    page.locator('#activity').click()
    page.wait_for_url('**/accounts/activity/')
    page.add_script_tag(path=str(root / 'app/src/main/assets/filter.js'))
    assert page.url.endswith('/accounts/activity/')
    print('PASS: enlaces bloqueados conservan el perfil; updates visibles y accesibles')
    browser.close()
