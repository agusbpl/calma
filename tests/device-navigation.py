"""Live authenticated Android WebView check. Requires ADB-forwarded DevTools.
Usage: python tests/device-navigation.py --cdp http://127.0.0.1:9223 --profile USER
Visits only the selected profile and notifications. Does not export page content.
"""
import argparse
import re
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser()
parser.add_argument('--cdp',required=True)
parser.add_argument('--profile',required=True)
args=parser.parse_args()
if not re.fullmatch(r'[A-Za-z0-9._]{1,30}',args.profile):
    parser.error('invalid profile')
with sync_playwright() as p:
    browser=p.chromium.connect_over_cdp(args.cdp)
    page=next(pg for context in browser.contexts for pg in context.pages if pg.url.startswith('https://www.instagram.com/'))
    for path,kind in [(f'/{args.profile}/','profile'),('/notifications/','activity')]:
        page.goto('https://www.instagram.com'+path,wait_until='domcontentloaded')
        page.wait_for_function('() => window.__calmaInstalled && document.querySelector("main")')
        page.wait_for_timeout(6500)  # Suggestions arrive after initial rendering.
        state=page.evaluate('''() => ({
            path:location.pathname,
            kind:JSON.parse(window.__calmaContext()).type,
            visibleText:document.body.innerText.trim().length,
            hiddenPages:[...document.querySelectorAll('section')].filter(el=>
                el.style.display==='none' && el.querySelector('nav')).length
        })''')
        assert state['path']==path,state
        assert state['kind']==kind,state
        assert state['visibleText']>100,state
        assert state['hiddenPages']==0,state
        assert page.locator('main').first.is_visible(),state
        print(f'PASS: {kind} stays visible after delayed suggestions; authenticated WebView')
