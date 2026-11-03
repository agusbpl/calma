"""Hide only Instagram's duplicate fixed bottom navigation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':800})
    page.route('https://www.instagram.com/**',lambda r:r.fulfill(body='''<section><main><h1>Profile</h1><nav id="back">Back</nav>
      <a href="/">Home link in content</a><a href="/direct/inbox/">Chat link</a></main></section>
      <div id="global" style="position:fixed;bottom:0;left:0;width:100%;height:98px"><a href="/">Home</a><a href="/direct/inbox/">Messages</a></div>''',content_type='text/html'))
    page.goto('https://www.instagram.com/example/')
    page.add_script_tag(path=str(Path(__file__).resolve().parents[1]/'app/src/main/assets/filter.js'))
    assert page.locator('#global').is_hidden()
    assert page.locator('main').is_visible()
    assert page.locator('#back').is_visible()
    assert page.get_by_text('Home link in content',exact=True).is_visible()
    print('PASS: only duplicate global bottom bar hidden; page and contextual controls preserved')
    browser.close()
