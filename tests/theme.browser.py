"""Theme uses site classes, preserves media, and survives SPA resets."""
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    page.set_content('''<style>.__fb-light-mode{--bg:white;--fg:black}.__fb-dark-mode{--bg:#0c1014;--fg:#f5f5f5}body{background:var(--bg);color:var(--fg)}</style><p>Content</p><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"><video></video>''')
    page.add_script_tag(path=str(Path(__file__).resolve().parents[1]/'app/src/main/assets/theme.js'))
    assert page.locator('body').evaluate('(el)=>getComputedStyle(el).backgroundColor')=='rgb(12, 16, 20)'
    assert page.locator('img').evaluate('(el)=>getComputedStyle(el).filter')=='none'
    assert page.locator('video').evaluate('(el)=>getComputedStyle(el).filter')=='none'
    page.evaluate("document.documentElement.className='spa-reset __fb-light-mode'")
    page.wait_for_timeout(50)
    assert page.locator('html').evaluate('(el)=>el.classList.contains("__fb-dark-mode")')
    page.evaluate('window.__calmaApplyTheme(false)')
    assert page.locator('body').evaluate('(el)=>getComputedStyle(el).backgroundColor')=='rgb(255, 255, 255)'
    page.add_script_tag(path=str(Path(__file__).resolve().parents[1]/'app/src/main/assets/theme.js'))
    assert page.locator('html').evaluate('(el)=>el.classList.contains("__fb-light-mode")')
    assert page.locator('html').evaluate('(el)=>el.classList.contains("spa-reset")')
    print('PASS: dark/light site palette, no media inversion, SPA reset and reinjection')
    browser.close()
