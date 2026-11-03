"""Instagram can place recommendation headings inside its whole page section."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    for path,heading in [('/example.profile/','example.profile'),('/notifications/','Notifications')]:
        page.route('https://www.instagram.com/**',lambda r:r.fulfill(body='<section><main><h1 id="content">'+heading+'</h1><div id="suggestions"></div></main><nav>Navigation</nav></section>',content_type='text/html'))
        page.goto('https://www.instagram.com'+path)
        page.add_script_tag(path=str(root/'app/src/main/assets/filter.js'))
        assert page.locator('#content').is_visible()
        page.locator('#suggestions').evaluate("el=>el.innerHTML='<div><span>Suggested for you</span></div>'")
        page.wait_for_timeout(600)
        assert page.locator('#content').is_visible(), f'{path}: recommendation heading hid entire page'
        assert page.locator('nav').is_visible()
        assert page.get_by_text('Suggested for you',exact=True).is_hidden()
        page.unroute_all()
    print('PASS: delayed recommendations do not hide profile/activity page or navigation')
    browser.close()
