import { NextRequest, NextResponse } from 'next/server'

/**
 * Reverse proxy that fetches a website and serves it without
 * X-Frame-Options / CSP frame-ancestors headers so it can be
 * embedded in an iframe for inspiration preview.
 *
 * GET /api/website-flow/proxy?url=https://example.com
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 })
  }

  // Basic URL validation
  let parsed: URL
  try {
    parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Only http/https URLs allowed' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Upstream returned ${response.status}` }, { status: 502 })
    }

    const contentType = response.headers.get('content-type') || ''

    // Only proxy HTML pages
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ error: 'Only HTML pages can be proxied' }, { status: 400 })
    }

    let html = await response.text()

    // Inject <base> tag so relative URLs resolve to the original domain,
    // plus an error-suppression script to prevent JS crashes from showing
    // ugly error pages in the preview iframe.
    const baseTag = `<base href="${parsed.origin}/" target="_blank">`
    // Force native scrolling — many portfolio sites (Locomotive Scroll, Lenis,
    // smooth-scrollbar) set overflow:hidden on body and use JS-based scroll
    // which breaks inside sandboxed iframes. This CSS restores native scroll.
    const proxyStyle = `<style>
html,body{overflow:auto!important;height:auto!important;scroll-behavior:auto!important;-webkit-overflow-scrolling:touch!important;position:static!important}
[data-scroll-container],[data-scroll],[data-lenis-prevent],.__next,.smooth-scroll,.locomotive-scroll{transform:none!important;will-change:auto!important;overflow:visible!important}
</style>`
    const proxyScript = `<script>
(function(){
  // Suppress JS errors so they don't show error pages
  window.onerror=function(){return true};
  window.onunhandledrejection=function(e){if(e&&e.preventDefault)e.preventDefault()};
  // Prevent link clicks from navigating away
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a'):null;
    if(a&&a.href){var h=a.getAttribute('href');if(!h||h.charAt(0)==='#')return;e.preventDefault();}
  },true);
  // Intercept JS navigation attempts (location changes)
  try{
    var origAssign=window.location.assign.bind(window.location);
    window.location.assign=function(){};
    var origReplace=window.location.replace.bind(window.location);
    window.location.replace=function(){};
  }catch(x){}
  // After DOM loads, forcibly remove custom scroll library wrappers
  document.addEventListener('DOMContentLoaded',function(){
    // Remove locomotive-scroll / lenis scroll hijacking
    try{
      var h=document.documentElement,b=document.body;
      h.style.setProperty('overflow','auto','important');
      b.style.setProperty('overflow','auto','important');
      h.style.setProperty('height','auto','important');
      b.style.setProperty('height','auto','important');
    }catch(x){}
  });
})();
</script>`
    if (html.includes('<head')) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}${proxyStyle}${proxyScript}`)
    } else if (html.includes('<html')) {
      html = html.replace(
        /<html([^>]*)>/i,
        `<html$1><head>${baseTag}${proxyStyle}${proxyScript}</head>`
      )
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        // Deliberately omit X-Frame-Options and CSP to allow iframe embedding
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to fetch: ${message}` }, { status: 502 })
  }
}
