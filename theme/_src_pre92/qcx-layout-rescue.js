(function(){
  var already = document.documentElement.getAttribute('data-qcx-rescue') === 'true';
  document.documentElement.setAttribute('data-qcx-rescue', 'true');

  /* Early absolute LCP img removed — it caused CLS 0.93 when hero inserted above it.
     SSR shell <img> + head preload are the only LCP path. */

  /* Reserve homepage feed height early so rescue paint does not score ~0.25 CLS. */
  (function reserveHomepageFeedHeight() {
    try {
      var type = document.documentElement.getAttribute('data-page-type') || '';
      var item = document.documentElement.getAttribute('data-page-item') || '';
      if (type === 'post' || type === 'page' || item === 'single') return;
      if (document.getElementById('qcx-home-cls-reserve')) return;
      var st = document.createElement('style');
      st.id = 'qcx-home-cls-reserve';
      /* Keep reserve modest — 70vh left a huge empty gap when Blog1 sat outside #main. */
      /* In-flow SSR (NOT absolute): Blog1 is empty on live home, so absolute
         shell reserved 0px then rescue painted 9 cards → CLS ~0.16–0.50.
         Keep first card in normal flow; cards appended below do not shift it. */
      st.textContent =
        'html[data-page-type="homepage"] .main-wrapper{position:relative}' +
        'html[data-page-type="homepage"] #qcx-ssr-lcp-shell,' +
        'html[data-page-type="homepage"] #Blog1.qcx-rescue-blog{' +
        'position:relative!important;left:auto!important;right:auto!important;top:auto!important;' +
        'z-index:auto!important;width:100%!important;margin:0 0 16px!important;' +
        'pointer-events:auto!important}' +
        /* Modest reserve — in-place absorb already keeps CLS≈0; huge 78vh hurt Speed Index. */
        'html[data-page-type="homepage"] #qcx-ssr-lcp-shell > .row,' +
        'html[data-page-type="homepage"] #Blog1.qcx-rescue-blog > .row,' +
        'html[data-page-type="homepage"] #Blog1 .all_posts > .row{' +
        'min-height:calc((min(100vw,420px) - 24px) * 9 / 16 + 110px)!important}' +
        'html[data-page-type="homepage"] .card-header,' +
        'html[data-page-type="homepage"] #qcx-ssr-lcp-shell .card-header{' +
        'position:relative;aspect-ratio:16/9;overflow:hidden;background:#0b1a12}' +
        'html[data-page-type="homepage"] .card-header img,' +
        'html[data-page-type="homepage"] #qcx-ssr-lcp-shell img.qcx-card-lcp{' +
        'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;' +
        'opacity:1!important;transition:none!important}' +
        'html[data-page-type="homepage"] img.qcx-card-lcp{' +
        'opacity:1!important;transition:none!important}';
      (document.head || document.documentElement).appendChild(st);
    } catch (ignoreReserve) {}
  })();

  /* Live HTML may still ship dual fetchpriority=high (SSR WebP + Blog1 resizeImage).
     Demote every competitor before polish so LCP stays the preloaded SSR node. */
  (function demoteCompetingHomepageLcp() {
    try {
      var type = document.documentElement.getAttribute('data-page-type') || '';
      var path = location.pathname || '/';
      if (type === 'post' || type === 'page') return;
      if (type !== 'homepage' && type !== 'index' && path !== '/') return;
      var ssr = document.getElementById('qcx-ssr-lcp-shell');
      var keep = ssr ? ssr.querySelector('img.qcx-card-lcp, img.qcx-card-media, .card-header img') : null;
      var imgs = document.querySelectorAll('img.qcx-card-lcp, img[fetchpriority="high"]');
      Array.prototype.forEach.call(imgs, function(img) {
        if (keep && (img === keep || (ssr && ssr.contains(img)))) return;
        img.setAttribute('fetchpriority', 'low');
        try { img.fetchPriority = 'low'; } catch (ignoreFp) {}
        if (!img.getAttribute('loading') || img.getAttribute('loading') === 'eager') {
          img.setAttribute('loading', 'lazy');
        }
        img.classList.remove('qcx-card-lcp');
      });
      var atm = document.getElementById('qcx-atmosphere');
      if (atm && atm.parentNode) atm.parentNode.removeChild(atm);
      if (!document.getElementById('qcx-a11y-touch-fix')) {
        var touch = document.createElement('style');
        touch.id = 'qcx-a11y-touch-fix';
        touch.textContent =
          '.card-header .qcx-card-labels a[rel=tag],.card-header .qcx-card-labels .qcx-label-more,' +
          '.keywords a,.keywords .more-icon{min-height:24px!important;min-width:24px!important;' +
          'padding:6px 10px!important;box-sizing:border-box!important;display:inline-flex!important;' +
          'align-items:center!important}';
        (document.head || document.documentElement).appendChild(touch);
      }
    } catch (ignoreDemote) {}
  })();

  /* F5: do NOT blank Blog SSR. Hiding cards caused empty dark-grid flash (chip only)
     until deferred rescue finished. Keep SSR/shell visible; rescue replaces in place. */
  (function clearStaleReloadHide() {
    try {
      document.documentElement.removeAttribute('data-qcx-reload');
      var st = document.getElementById('qcx-reload-hide-ssr');
      if (st && st.parentNode) st.parentNode.removeChild(st);
    } catch (e) {}
  })();

  /* Cursor/Electron Simple Browser: t.me pages redirect to tg:// and spam
     "Open External Link". Keep normal Chrome/mobile behavior; only gate embedded. */
  (function guardTelegramInEmbeddedBrowser() {
    try {
      var ua = String(navigator.userAgent || '');
      if (!/Electron|Cursor\//i.test(ua)) return;
      if (document.documentElement.getAttribute('data-qcx-tg-guard') === '1') return;
      document.documentElement.setAttribute('data-qcx-tg-guard', '1');
      function isTelegramHref(href) {
        return /(?:^|\b)(?:tg:\/\/|https?:\/\/(?:t\.me|telegram\.me|web\.telegram\.org)\b)/i.test(String(href || ''));
      }
      function toast(msg) {
        try {
          var n = document.getElementById('qcx-tg-guard-toast');
          if (!n) {
            n = document.createElement('div');
            n.id = 'qcx-tg-guard-toast';
            n.setAttribute('role', 'status');
            n.style.cssText = 'position:fixed;z-index:2147483646;left:50%;bottom:24px;transform:translateX(-50%);' +
              'max-width:min(420px,92vw);padding:10px 14px;border-radius:10px;background:#0b1610;color:#dce9df;' +
              'border:1px solid rgba(0,240,163,.28);font:600 12px/1.4 ui-monospace,monospace;box-shadow:0 8px 24px rgba(0,0,0,.35)';
            (document.body || document.documentElement).appendChild(n);
          }
          n.textContent = msg;
          n.hidden = false;
          window.clearTimeout(n._t);
          n._t = window.setTimeout(function(){ n.hidden = true; }, 3200);
        } catch (ignoreToast) {}
      }
      document.addEventListener('click', function(ev) {
        var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href') || a.href || '';
        if (!isTelegramHref(href)) return;
        ev.preventDefault();
        ev.stopPropagation();
        var safe = /^tg:\/\//i.test(href) ? 'https://t.me/superkhung' : href;
        var done = function(){ toast('Đã copy link Telegram — mở bằng app hoặc Chrome'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(safe).then(done).catch(function(){ toast('Telegram: ' + safe); });
        } else {
          toast('Telegram: ' + safe);
        }
      }, true);
    } catch (e) {}
  })();

  function text(value) {
    return String(value == null ? '' : value);
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>"']/g, function(ch) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }

  /* Display titles without "Brand — " prefix (keep full title in feed/SEO). */
  function displayPostTitle(raw) {
    if (typeof window.__qcxDisplayPostTitle === 'function' && window.__qcxDisplayPostTitle !== displayPostTitle) {
      return window.__qcxDisplayPostTitle(raw);
    }
    var t = String(raw || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    var m = t.match(/^.{1,40}?\s*[—–]\s+(.+)$/);
    if (m && m[1]) return m[1].trim();
    m = t.match(/^.{1,40}?\s+-\s+(.+)$/);
    return (m && m[1]) ? m[1].trim() : t;
  }
  window.__qcxDisplayPostTitle = displayPostTitle;

  function stripDomPostTitles(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll(
      '.card-content .title a, .card-content .title, h1.post-title, .item-title > a, .qcx-related-card > span, .qcx-search-result-title'
    );
    Array.prototype.forEach.call(nodes, function(el) {
      var raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!raw) return;
      var next = displayPostTitle(raw);
      if (next && next !== raw) el.textContent = next;
    });
  }
  window.__qcxStripDomPostTitles = stripDomPostTitles;

  function pathOf(url) {
    try { return new URL(url, location.origin).pathname.replace(/\/$/, ''); }
    catch (error) { return text(url).split('?')[0].replace(/\/$/, ''); }
  }

  function plainSummary(html) {
    var box = document.createElement('div');
    box.innerHTML = text(html);
    box.querySelectorAll('script,style,noscript,svg,iframe,code,pre').forEach(function(node){ node.remove(); });
    var raw = text(box.textContent).replace(/\s+/g, ' ').trim();
    /* Only scrub when text looks like leaked CSS. Do NOT treat prose colons (B1:, http:) as CSS. */
    var cssy = /[{}]/.test(raw) ||
      /box-sizing\s*:|font-family\s*:|linear-gradient\s*\(|\.btn-download\s*\{/i.test(raw);
    if (cssy) {
      raw = raw
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\{[^{}]{0,800}\}/g, ' ')
        .replace(/(?:box-sizing|font-family|background(?:-image|-color|-size)?|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|color|display|position|width|height|border(?:-radius|-color|-width)?|overflow|z-index|opacity|transform|transition|content|flex|grid|gap|top|left|right|bottom)\s*:\s*[^;{]{1,120};?/gi, ' ')
        .replace(/[{};]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (!raw || /^[\{\}\*\#\.\;\:\-\s,]+$/.test(raw) || raw.length < 18) return '';
    if (/[{}]/.test(raw) && /box-sizing|font-family|linear-gradient|\.btn-download/i.test(raw)) return '';
    return raw.slice(0, 140);
  }

  function cleanCardSnippets(root) {
    var scope = root || document;
    /* Homepage cards are title-only — always strip card snippets/excerpts (teaser lives in-post). */
    scope.querySelectorAll('.card-content .post-entry, .card .post-entry, .card-content .qcx-card-excerpt').forEach(function(node){
      node.innerHTML = '';
      node.classList.add('is-css-leak');
      node.setAttribute('data-qcx-snippet', 'hidden');
      node.removeAttribute('data-qcx-excerpt');
      node.style.setProperty('display', 'none', 'important');
      try { node.remove(); } catch (ignore) {}
    });
  }
  window.__qcxCleanCardSnippets = cleanCardSnippets;

  function hydrateNativeCardExcerpts() {
    /* no-op: homepage cards stay title-only; teaser is .qcx-teaser inside posts */
  }
  window.__qcxHydrateNativeCardExcerpts = hydrateNativeCardExcerpts;

  function sanitizePostHtml(html) {
    var box = document.createElement('div');
    box.innerHTML = text(html);
    var isAdmin = !!(box.querySelector('#qcx-admin-root') || /id=['\"]qcx-admin-root['\"]/i.test(String(html || '')));
    var scripts = [];
    if (isAdmin) {
      box.querySelectorAll('script').forEach(function(node){
        scripts.push({ src: node.getAttribute('src') || '', code: node.textContent || '' });
        if (node.parentNode) node.parentNode.removeChild(node);
      });
      box.querySelectorAll('style').forEach(function(node){
        if ((node.id || '') !== 'qcx-admin-ui') node.remove();
      });
      box.querySelectorAll('noscript').forEach(function(node){ node.remove(); });
    } else {
      /* style/script trong bài thường global (h1,body,*) — bỏ để không phá dark theme */
      box.querySelectorAll('script,style,noscript').forEach(function(node){ node.remove(); });
    }
    box.querySelectorAll('img').forEach(function(img){
      img.loading = 'lazy';
      img.decoding = 'async';
      if (!img.alt) img.alt = '';
    });
    box.querySelectorAll('a[href]').forEach(function(anchor){
      try {
        var url = new URL(anchor.href, location.origin);
        if (url.origin !== location.origin) {
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
        }
      } catch (ignore) {}
    });
    return { html: box.innerHTML, scripts: scripts, isAdmin: isAdmin };
  }

  function rehydrateAdminScripts(scripts) {
    (scripts || []).forEach(function(item){
      try {
        if (item && item.src) {
          var s = document.createElement('script');
          s.src = item.src;
          s.async = false;
          (document.body || document.documentElement).appendChild(s);
        } else if (item && item.code) {
          var t = document.createElement('script');
          t.text = item.code;
          (document.body || document.documentElement).appendChild(t);
        }
      } catch (ignore) {}
    });
  }

  function entryLink(entry) {
    var linkObj = (entry.link || []).filter(function(item){ return item.rel === 'alternate'; })[0];
    return linkObj ? linkObj.href : '';
  }

  function entryLabels(entry) {
    return (entry.category || []).map(function(cat){ return cat.term; }).filter(Boolean);
  }

  function isLikelyAnimatedUrl(url) {
    var u = String(url || '');
    if (/\.gif(?:$|[?#])/i.test(u)) return true;
    if (/\/[^/?#]*gif[^/?#]*\.(?:gif|webp)(?:$|[?#])/i.test(u)) return true;
    return false;
  }

  function qcxCdnPin() {
    var m = String(QCX_CDN || '').match(/@(v\d[\w.-]+)\//);
    return (m && m[1]) || 'v2026.11.19.106';
  }

  /* Homepage cards: ~15–55KB WebP instead of 450–1000KB hero JPG (PSI image delivery). */
  function toCardWebp(url) {
    var u = String(url || '');
    if (!u || u.indexOf('data:') === 0) return '';
    if (/\/images\/hero\/card\/[^/?#]+\.webp(?:$|[?#])/i.test(u)) return u;
    var hero = u.match(/\/images\/hero\/([^/?#]+)\.(jpe?g|png)(?:$|[?#])/i);
    if (hero) {
      return 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@' +
        qcxCdnPin() + '/images/hero/card/' + hero[1] + '.webp';
    }
    var cat = u.match(/files\.catbox\.moe\/([a-z0-9]+)\.(jpe?g|png|webp)(?:$|[?#])/i)
      || u.match(/[?&]url=https?%3A%2F%2Ffiles\.catbox\.moe%2F([a-z0-9]+)\./i);
    if (cat) {
      return 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@' +
        qcxCdnPin() + '/images/hero/card/catbox-' + cat[1] + '.webp';
    }
    /* No third-party image proxy (wsrv) — broken loads tank Best Practices. */
    return '';
  }

  function upgradeThumb(url, opts) {
    if (!url) return '';
    var anim = !!(opts && opts.anim) || isLikelyAnimatedUrl(url);
    var forCard = !!(opts && opts.card);
    var u = String(url);
    if (forCard && !anim) {
      var cardWebp = toCardWebp(u);
      if (cardWebp) return cardWebp;
    }
    /* External featured images via Blogger proxy — card LCP caps at 720; else full. */
    if (/blogger_img_proxy/i.test(u)) {
      u = u
        .replace(/=s\d+(?:-[^?&#]*)?(?=$|[?#])/i, '')
        .replace(/=w\d+-h\d+(?:-[^?&#]*)?(?=$|[?#])/i, '');
      if (anim) return u + '=w640-h360-c';
      return u + (forCard ? '=w720-h405-c' : '=s0');
    }
    /* Cards: w720 for LCP/PSI. Post-body / retina: keep larger source. */
    var crop = anim ? 'w640-h360-c' : (forCard ? 'w720-h405-c' : 'w1600-h900-c');
    var bare = anim ? 's640' : (forCard ? 's720' : 's1600');
    return u
      .replace(/\/s\d+-c\//i, '/' + crop + '/')
      .replace(/=s\d+-c(?=$|[/?#])/i, '=' + crop)
      .replace(/\/w\d+-h\d+-c\//i, '/' + crop + '/')
      .replace(/=w\d+-h\d+-c(?=$|[/?#])/i, '=' + crop)
      .replace(/\/s\d+\//i, '/' + bare + '/')
      .replace(/=s\d+(?=$|[/?#])/i, '=' + bare);
  }

  function sharpenCardImages(root) {
    var scope = root || document;
    var imgs = scope.querySelectorAll(
      'img.qcx-card-media, .card-header img, .item-thumbnail img, .qcx-related-card img, .post-body img'
    );
    imgs.forEach(function(img) {
      var dataSrc = img.getAttribute('data-src') || '';
      var srcAttr = img.getAttribute('src') || '';
      var raw = dataSrc && dataSrc.indexOf('data:') !== 0 ? dataSrc
        : (srcAttr && srcAttr.indexOf('data:') !== 0 ? srcAttr : '');
      if (!raw) return;
      var anim = img.getAttribute('data-qcx-anim') === '1' || isLikelyAnimatedUrl(raw);
      var isCard = !!(img.classList && img.classList.contains('qcx-card-media')) ||
        !!(img.closest && img.closest('.card-header, .item-thumbnail, .qcx-related-card'));
      var next = upgradeThumb(raw, { anim: anim, card: isCard });
      if (!next) return;
      var lazyPending = !!(img.classList && img.classList.contains('lazyload') &&
        !img.classList.contains('lazyloaded'));
      var alreadySharp = img.getAttribute('data-qcx-sharp') === '1';
      if (dataSrc && dataSrc.indexOf('data:') !== 0 && dataSrc !== next) {
        img.setAttribute('data-src', next);
      }
      /* Never fight lazysizes: pending lazyload only upgrades data-src. */
      if (lazyPending) {
        img.setAttribute('data-qcx-sharp', '1');
        return;
      }
      try {
        var live = img.currentSrc || img.src || '';
        var soft = /blogger_img_proxy/i.test(live) && img.naturalWidth > 0 && img.naturalWidth < 900;
        if (alreadySharp && !soft && live === next) {
          return;
        }
        if (soft || (live && live.indexOf('data:') !== 0 && live !== next && /blogger_img_proxy|=s\d+|\/s\d+/i.test(live))) {
          img.src = next;
        } else if ((!srcAttr || srcAttr.indexOf('data:') === 0) && dataSrc) {
          /* lazysizes pending — data-src already upgraded */
        } else if (srcAttr && srcAttr.indexOf('data:') !== 0 && srcAttr !== next) {
          img.src = next;
        }
      } catch (ignore) {}
      img.setAttribute('data-qcx-sharp', '1');
    });
  }

  var __qcxSharpenRaf = 0;
  var __qcxSharpenDelayed = 0;
  function scheduleSharpenCardImages(root, delayMs) {
    var scope = root || null;
    if (delayMs && delayMs > 0) {
      if (__qcxSharpenDelayed) return;
      __qcxSharpenDelayed = window.setTimeout(function(){
        __qcxSharpenDelayed = 0;
        try { sharpenCardImages(scope); } catch (ignoreSharp) {}
      }, delayMs);
      return;
    }
    if (__qcxSharpenRaf) return;
    __qcxSharpenRaf = window.requestAnimationFrame(function(){
      __qcxSharpenRaf = 0;
      try { sharpenCardImages(scope); } catch (ignoreSharp) {}
    });
  }

  function entryThumbMeta(entry) {
    var html = (entry.content && entry.content.$t) || '';
    var bodyUrl = '';
    var bodyAnim = false;
    try {
      var re = /<img[^>]+src=["']([^"']+)["']/gi;
      var match;
      while ((match = re.exec(html))) {
        var src = match[1];
        if (isLikelyAnimatedUrl(src)) continue;
        if (/blogger_img_proxy/i.test(src)) continue;
        bodyUrl = src;
        break;
      }
      if (!bodyUrl) {
        var gifMatch = String(html).match(/<img[^>]+src=["']([^"']+\.gif[^"']*)["']/i);
        if (gifMatch) {
          bodyUrl = gifMatch[1];
          bodyAnim = true;
        }
      }
    } catch (ignore) {}
    /* Cards: card WebP from body hero, else Blogger feed thumb — never full-size catbox/jpg. */
    if (bodyUrl && !bodyAnim) {
      var bodyCard = toCardWebp(bodyUrl);
      if (bodyCard) return { url: bodyCard, anim: false, source: 'body-webp' };
    }
    try {
      if (entry.media$thumbnail && entry.media$thumbnail.url) {
        var feedUrl = entry.media$thumbnail.url;
        var feedCard = upgradeThumb(feedUrl, { anim: isLikelyAnimatedUrl(feedUrl), card: true });
        if (feedCard) {
          return {
            url: feedCard,
            anim: isLikelyAnimatedUrl(feedUrl),
            source: 'feed'
          };
        }
      }
    } catch (ignore) {}
    if (bodyUrl && !bodyAnim) {
      var bodyUp = upgradeThumb(bodyUrl, { card: true });
      /* Skip huge remote hosts without a card WebP — feed already tried. */
      if (bodyUp && !/files\.catbox\.moe|i\.imgur\.com/i.test(bodyUp)) {
        return { url: bodyUp, anim: false, source: 'body' };
      }
    }
    if (bodyUrl && bodyAnim) {
      return { url: upgradeThumb(bodyUrl, { anim: true, card: true }), anim: true, source: 'body-gif' };
    }
    return { url: '', anim: false, source: '' };
  }

  function entryThumb(entry) {
    return entryThumbMeta(entry).url;
  }

  function ensureHeaderSearch() {
    var header = document.querySelector('#header');
    if (!header || header.querySelector('form, .web-search, .widget')) return;
    header.classList.remove('no-items');
    var wrap = el('div', 'widget web-search flex-align qcx-rescue-search');
    wrap.innerHTML = '<form action="/search" method="get" role="search">' +
      '<button class="submit has-hover has-svg-icon" type="submit" aria-label="Tìm kiếm"></button>' +
      '<input autocomplete="off" name="q" placeholder="Tìm bài viết" required="" spellcheck="false" type="search"/>' +
      '</form>';
    header.appendChild(wrap);
  }

  var QCX_HERO_TITLE = 'MMO TEAM';
  var QCX_HERO_BIO = 'Khám phá những giới hạn mới của nhiếp ảnh AI, nghệ thuật kể chuyện bằng hình ảnh, công nghệ, thủ thuật Windows và sáng tạo mã nguồn mở.';

  function polishHeroBrand() {
    var titleEl = document.querySelector('.qcx-hero-title');
    if (titleEl && text(titleEl.textContent) !== QCX_HERO_TITLE) titleEl.textContent = QCX_HERO_TITLE;
    var bioEl = document.querySelector('.qcx-hero .qcx-bio, .qcx-bio');
    if (bioEl && text(bioEl.textContent) !== QCX_HERO_BIO) bioEl.textContent = QCX_HERO_BIO;
  }

  function ensureHero(main) {
    polishHeroBrand();
    if (document.querySelector('.qcx-hero')) return;
    var hero = el('section', 'qcx-hero');
    hero.setAttribute('data-enter', 'hero');
    hero.innerHTML =
      '<div class="qcx-hero-inner">' +
      '<h1 class="qcx-hero-title" data-enter="title">' + escapeHtml(QCX_HERO_TITLE) + '</h1>' +
      '<div class="qcx-hero-divider"></div>' +
      '<p class="qcx-bio" data-enter="bio">' + escapeHtml(QCX_HERO_BIO) + '</p>' +
      '<div class="qcx-hero-cta qcx-hero-cta--pro" data-enter="cta" data-qcx-cta-pro="1">' +
      '<a class="qcx-cta-btn" href="/search/label/AI"><span class="qcx-cta-label">Khám phá AI</span>' +
      '<span class="qcx-cta-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>' +
      '<a class="qcx-cta-btn qcx-cta-outline" href="https://t.me/superkhung" rel="noopener noreferrer" target="_blank">' +
      '<span class="qcx-cta-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.8 4.2 2.9 11.5c-.9.35-.9 1.62.05 1.9l4.7 1.45 1.8 5.55c.28.87 1.4 1.1 2.02.42l2.55-2.8 4.85 3.55c.78.57 1.88.17 2.12-.78L22.9 5.3c.25-1-.75-1.8-1.7-1.4z"/></svg></span>' +
      '<span class="qcx-cta-label">Hỗ trợ Telegram</span></a>' +
      '</div>' +
      '</div>' +
      '<div class="qcx-avatar-wrap" data-enter="avatar">' + brandAvatarHtml() + '</div>';
    /* Place hero ABOVE .main-wrapper so PC sidebar/find: sits with the feed, not beside hero. */
    placeHero(hero, main);
    ensureSidebarSearch();
  }

  function placeHero(hero, main) {
    if (!hero) return;
    var container = (main && main.closest && main.closest('main.main-container')) ||
      document.querySelector('main.main-container');
    var wrap = document.querySelector('.main-wrapper');
    /* Final slot already occupied (SSR) — insertBefore same place still moves layout = CLS. */
    if (wrap && hero.nextElementSibling === wrap) return;
    if (container && wrap && wrap.parentNode === container) {
      container.insertBefore(hero, wrap);
      return;
    }
    if (main) {
      main.insertBefore(hero, main.firstChild);
      return;
    }
    if (container) container.insertBefore(hero, container.firstChild);
  }

  function polishHeroCta() {
    var cta = document.querySelector('.qcx-hero-cta');
    if (!cta) return;
    cta.classList.add('qcx-hero-cta--pro');
    /* SSR hero already ships final CTA markup — skip stylesheet/HTML rewrite (CLS). */
    if (cta.getAttribute('data-qcx-cta-pro') === '1') return;

    if (!document.getElementById('qcx-cta-pro-live')) {
      var st = document.createElement('style');
      st.id = 'qcx-cta-pro-live';
      st.textContent =
        'html body:not(#layout) .qcx-hero-cta.qcx-hero-cta--pro,html body .qcx-hero-cta.qcx-hero-cta--pro{display:flex!important;flex-direction:column!important;gap:8px!important;margin-top:10px!important;max-width:none!important;width:100%!important}' +
        '@media (max-width:860px){html body:not(#layout) .qcx-hero,html body .qcx-hero{width:100%!important;max-width:none!important;padding-left:0!important;padding-right:0!important;margin-left:0!important;margin-right:0!important;box-sizing:border-box!important}html body:not(#layout) .qcx-hero-cta.qcx-hero-cta--pro,html body .qcx-hero-cta.qcx-hero-cta--pro{max-width:none!important;width:100%!important}}' +
        'html body:not(#layout) .qcx-hero-cta.qcx-hero-cta--pro>a.qcx-cta-btn,html body .qcx-hero-cta.qcx-hero-cta--pro>a.qcx-cta-btn{box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:100%!important;height:48px!important;min-height:48px!important;max-height:48px!important;padding:0 16px!important;border-radius:12px!important;font:700 14px/1 system-ui,sans-serif!important;letter-spacing:-.01em!important;text-decoration:none!important;white-space:nowrap!important;overflow:hidden!important}' +
        'html body:not(#layout) .qcx-hero-cta.qcx-hero-cta--pro>a.qcx-cta-btn:not(.qcx-cta-outline),html body .qcx-hero-cta.qcx-hero-cta--pro>a.qcx-cta-btn:not(.qcx-cta-outline){background:linear-gradient(180deg,#34e6a0 0%,#1fd68a 100%)!important;border:1px solid rgba(0,0,0,.18)!important;color:#06140e!important;-webkit-text-fill-color:#06140e!important;box-shadow:0 1px 0 rgba(255,255,255,.28) inset,0 10px 28px rgba(0,240,163,.22)!important}' +
        'html body:not(#layout) .qcx-hero-cta.qcx-hero-cta--pro>a.qcx-cta-outline,html body .qcx-hero-cta.qcx-hero-cta--pro>a.qcx-cta-outline{background:rgba(255,255,255,.03)!important;border:1px solid rgba(0,240,163,.28)!important;color:#e8fff2!important;-webkit-text-fill-color:#e8fff2!important;box-shadow:none!important;font-weight:650!important;height:48px!important;min-height:48px!important;max-height:48px!important}' +
        'html body:not(#layout) .qcx-cta-ico,.qcx-cta-ico{display:inline-flex!important;align-items:center!important;justify-content:center!important;align-self:center!important;width:16px!important;height:16px!important;flex:0 0 16px!important;line-height:0!important}' +
        'html body:not(#layout) .qcx-cta-ico svg,.qcx-cta-ico svg{display:block!important;width:16px!important;height:16px!important}' +
        'html body:not(#layout) .qcx-cta-label,.qcx-cta-label{display:inline-flex!important;align-items:center!important;line-height:1!important;transform:translateY(.5px)!important}' +
        '@media (min-width:861px){html body:not(#layout) .qcx-hero-cta.qcx-hero-cta--pro,html body .qcx-hero-cta.qcx-hero-cta--pro{flex-direction:row!important;max-width:none!important;gap:12px!important}html body:not(#layout) .qcx-hero-cta.qcx-hero-cta--pro>a.qcx-cta-btn,html body .qcx-hero-cta.qcx-hero-cta--pro>a.qcx-cta-btn{width:auto!important;min-width:168px!important;padding:0 20px!important}}';
      (document.head || document.documentElement).appendChild(st);
    }

    cta.setAttribute('data-qcx-cta-pro', '1');

    var primary = cta.querySelector('a.qcx-cta-btn:not(.qcx-cta-outline)');
    var secondary = cta.querySelector('a.qcx-cta-outline');
    var arrow =
      '<span class="qcx-cta-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none">' +
      '<path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    var tg =
      '<span class="qcx-cta-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor">' +
      '<path d="M21.8 4.2 2.9 11.5c-.9.35-.9 1.62.05 1.9l4.7 1.45 1.8 5.55c.28.87 1.4 1.1 2.02.42l2.55-2.8 4.85 3.55c.78.57 1.88.17 2.12-.78L22.9 5.3c.25-1-.75-1.8-1.7-1.4z"/></svg></span>';

    if (primary && !primary.querySelector('.qcx-cta-ico')) {
      var pText = (primary.textContent || 'Khám phá AI').replace(/\s+/g, ' ').trim() || 'Khám phá AI';
      if (/khám phá bài/i.test(pText)) pText = 'Khám phá AI';
      primary.innerHTML = '<span class="qcx-cta-label"></span>' + arrow;
      primary.querySelector('.qcx-cta-label').textContent = pText;
      if (!primary.getAttribute('href') || primary.getAttribute('href') === '/search') {
        primary.setAttribute('href', '/search/label/AI');
      }
    }
    if (secondary && !secondary.querySelector('.qcx-cta-ico')) {
      var sText = (secondary.textContent || 'Hỗ trợ Telegram').replace(/\s+/g, ' ').trim() || 'Hỗ trợ Telegram';
      secondary.innerHTML = tg + '<span class="qcx-cta-label"></span>';
      secondary.querySelector('.qcx-cta-label').textContent = sText;
      secondary.setAttribute('rel', 'noopener noreferrer');
      secondary.setAttribute('target', '_blank');
    }
  }
  window.__qcxPolishHeroCta = polishHeroCta;

  function relocateHeroForDesktopRail() {
    var hero = document.querySelector('.qcx-hero');
    if (!hero) return;
    var wrap = document.querySelector('.main-wrapper');
    /* Already in final slot (SSR) — moving it after first paint = CLS ~0.93. */
    if (wrap && hero.nextElementSibling === wrap) return;
    if (wrap && hero.parentNode === wrap.parentNode && hero.compareDocumentPosition(wrap) & Node.DOCUMENT_POSITION_FOLLOWING) {
      var prev = wrap.previousElementSibling;
      if (prev === hero) return;
    }
    placeHero(hero, document.querySelector('#main, .main'));
  }

  function ensureSidebarSearch() {
    /* Search lives in Menu + Cmd/Ctrl+Space (and Cmd/Ctrl+K) — no duplicate rail field. */
    var nodes = document.querySelectorAll(
      '#sidebar .widget.qcx-sidebar-search, #sidebar .qcx-inline-search.qcx-sidebar-search, .widget.HTML.qcx-sidebar-search'
    );
    Array.prototype.forEach.call(nodes, function(node) {
      try { node.remove(); } catch (ignoreRm) {
        node.style.setProperty('display', 'none', 'important');
        node.setAttribute('hidden', 'hidden');
      }
    });
  }

  /* Font-only: Inter title/body like breakdev.org — no UI chrome changes. */
  var QCX_CDN = 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.106/theme/';
  var QCX_FONTS_CSS = QCX_CDN + 'qcx-breakdev-fonts.css';
  var QCX_ATMOSPHERE_CSS = QCX_CDN + 'qcx-atmosphere.css';
  var QCX_SITE_FAVICON = 'https://www.mmo.team/favicon.ico';

  function brandAvatarHtml() {
    var src1 = QCX_CDN + 'qcx-brand-mark.webp';
    return '<div class="qcx-avatar" aria-label="MMO">' +
      '<img class="qcx-brand-raster" src="' + src1 + '" ' +
      'width="64" height="64" decoding="async" alt="MMO"/>' +
      '<svg xmlns="http://www.w3.org/2000/svg" class="qcx-brand-mark qcx-brand-svg qcx-brand-eyes-only" ' +
      'viewBox="0 0 512 512" width="64" height="64" role="img" aria-hidden="true">' +
      '<g class="qcx-ghost-eyes">' +
      '<circle class="qcx-eye-socket" cx="230.6" cy="189.9" r="16.5" fill="#f2f2f2"/>' +
      '<circle class="qcx-eye qcx-eye-l" cx="230.6" cy="189.9" r="13.2" fill="#0a0a0a"/>' +
      '<circle class="qcx-eye-socket" cx="294.1" cy="183.5" r="16" fill="#f2f2f2"/>' +
      '<circle class="qcx-eye qcx-eye-r" cx="294.1" cy="183.5" r="12.8" fill="#0a0a0a"/>' +
      '</g></svg></div>';
  }

  function swapBrandMarkToWebp() {
    /* PSI: 512 PNG (~200KB) shown at 64–140px — swap to 5KB WebP without waiting for theme Lưu. */
    var webp = QCX_CDN + 'qcx-brand-mark.webp';
    document.querySelectorAll('img.qcx-brand-raster, img[src*="qcx-brand-mark.png"]').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if (/qcx-brand-mark\.png/i.test(src)) {
        img.setAttribute('src', webp);
        img.setAttribute('width', img.getAttribute('width') || '72');
        img.setAttribute('height', img.getAttribute('height') || '72');
        img.setAttribute('decoding', 'async');
      }
    });
  }

  function ensureSharpBrandAvatar() {
    swapBrandMarkToWebp();
    var avatars = document.querySelectorAll('.qcx-avatar');
    Array.prototype.forEach.call(avatars, function (avatar) {
      if (avatar.querySelector('img.qcx-brand-raster')) return;
      var legacy = avatar.querySelector('.qcx-ghost-art image, image[href*="qcx-brand-mark"], image[href*="qcx-brand-mark"]');
      var hasEmbedded = !!avatar.querySelector('.qcx-ghost-art image, .qcx-brand-svg image');
      if (!hasEmbedded && !legacy) return;
      var wrap = avatar.parentNode;
      var html = brandAvatarHtml();
      var box = document.createElement('div');
      box.innerHTML = html;
      var next = box.firstChild;
      if (!next) return;
      if (wrap) wrap.replaceChild(next, avatar);
      else avatar.parentNode && avatar.parentNode.replaceChild(next, avatar);
    });
  }

  function ensureStylesheet(id, href) {
    var link = document.getElementById(id);
    if (link) {
      /* Anti-FOUC: never mid-paint swap when head already has this sheet (XML owns pin). */
      var cur = link.getAttribute('href') || '';
      if (cur === href) return;
      var file = (href.split('/').pop() || '');
      if (file && cur.indexOf('/' + file) !== -1) return;
      link.setAttribute('href', href);
      return;
    }
    /* Also respect inline/font style tags with same id. */
    if (document.querySelector('style#' + id + ', link#' + id)) return;
    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    (document.head || document.documentElement).appendChild(link);
  }

  /* Clamp post heroes so preview text sits above the fold (legacy + locked).
     Match page-skin specificity (html + body:not(#layout)) so embedded theme CSS cannot win. */
  function ensureHeroPreviewClamp() {
    var id = 'qcx-hero-preview-clamp';
    var css =
      'html:not([data-qcx-unlocked=\"1\"]) body:not(#layout) .post-body>.separator,' +
      'html:not([data-qcx-unlocked=\"1\"]) body:not(#layout) .post-body .mac-frame,' +
      'html:not([data-qcx-unlocked=\"1\"]) body:not(#layout) .post-body .mac-frame-image{' +
      'display:block!important;max-height:min(40vh,280px)!important;overflow:hidden!important}' +
      'html[data-qcx-unlocked=\"1\"] body:not(#layout) .post-body>.separator,' +
      'html[data-qcx-unlocked=\"1\"] body:not(#layout) .post-body .mac-frame,' +
      'html[data-qcx-unlocked=\"1\"] body:not(#layout) .post-body .mac-frame-image{' +
      'max-height:none!important;overflow:visible!important}';
    var st = document.getElementById(id);
    if (!st) {
      st = document.createElement('style');
      st.id = id;
      (document.head || document.documentElement).appendChild(st);
    }
    if (st.textContent !== css) st.textContent = css;
  }

  /* Force related-rail square thumb|title rows (override cached 16:9 stack). */
  function ensureRelatedRailSquareThumbs() {
    document.documentElement.setAttribute('data-qcx-rail-thumb', '80');
    var id = 'qcx-rail-square-thumbs';
    var css =
      '.qcx-related-heading{text-transform:uppercase!important;letter-spacing:.12em!important}' +
      '#PopularPosts1,.qcx-sidebar-rail,.qcx-tutorial-inline{' +
      '--qcx-latest-thumb-width:80px!important;--qcx-latest-thumb-height:80px!important}' +
      '.qcx-sidebar-rail>.widget-content,.qcx-tutorial-inline>.widget-content{' +
      'width:100%!important;box-sizing:border-box!important;overflow:visible!important;padding:0!important}' +
      '#PopularPosts1 .widget-content>ul:not(.spinner),#sidebar .qcx-sidebar-rail .qcx-latest-list,' +
      '.qcx-sidebar-rail .qcx-latest-list,.qcx-tutorial-inline .qcx-latest-list{' +
      'display:block!important;margin:0!important;padding:0!important;list-style:none!important;' +
      'width:100%!important;box-sizing:border-box!important}' +
      '#PopularPosts1 .widget-content>ul:not(.spinner)>li,#sidebar .qcx-sidebar-rail .qcx-latest-list>li,' +
      '.qcx-sidebar-rail .qcx-latest-list>li,.qcx-tutorial-inline .qcx-latest-list>li{' +
      'display:grid!important;grid-template-columns:80px minmax(0,1fr)!important;gap:12px!important;' +
      'align-items:center!important;min-height:80px!important;margin:0!important;padding:10px 0!important;' +
      'border-bottom:1px solid rgba(28,36,32,.11)!important;background:transparent!important;border-radius:0!important;' +
      'overflow:visible!important;width:100%!important;box-sizing:border-box!important}' +
      '#PopularPosts1 .item-thumbnail,#sidebar .qcx-sidebar-rail .item-thumbnail,' +
      '.qcx-sidebar-rail .item-thumbnail,.qcx-tutorial-inline .item-thumbnail{' +
      'width:80px!important;min-width:80px!important;height:80px!important;aspect-ratio:1/1!important;border-radius:10px!important;' +
      'flex-shrink:0!important;overflow:hidden!important;margin:0!important;border:1px solid rgba(28,36,32,.14)!important;' +
      'display:block!important}' +
      '#PopularPosts1 .item-thumbnail img,#sidebar .qcx-sidebar-rail .item-thumbnail img,' +
      '.qcx-sidebar-rail .item-thumbnail img,.qcx-tutorial-inline .item-thumbnail img{' +
      'width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;' +
      'object-fit:cover!important;object-position:center!important;display:block!important}' +
      '#PopularPosts1 .item-title,#sidebar .qcx-sidebar-rail .item-title,' +
      '.qcx-sidebar-rail .item-title,.qcx-tutorial-inline .item-title{padding:0!important;margin:0!important;min-width:0!important}' +
      '#PopularPosts1 .item-snippet,#sidebar .qcx-sidebar-rail .item-snippet,' +
      '.qcx-sidebar-rail .item-snippet,.qcx-tutorial-inline .item-snippet,' +
      '#sidebar .qcx-sidebar-rail .item-content,.qcx-sidebar-rail .snippet{display:none!important}' +
      '@media (min-width:861px){' +
      'html[data-page-type="post"] #sidebar,html[data-page-item="single"] #sidebar,' +
      'html[data-page-type="item"] #sidebar,' +
      'html[data-page-type="post"] #sidebar.qcx-addon-zone,html[data-page-item="single"] #sidebar.qcx-addon-zone{' +
      'position:sticky!important;top:84px!important;align-self:start!important;height:fit-content!important;' +
      'max-height:calc(100vh - 96px)!important;overflow-x:clip!important;overflow-y:auto!important;' +
      'overscroll-behavior:contain!important;scrollbar-width:none!important;z-index:5!important}' +
      'html[data-page-type="post"] #sidebar::-webkit-scrollbar,html[data-page-item="single"] #sidebar::-webkit-scrollbar{' +
      'width:0!important;height:0!important;display:none!important}' +
      'html[data-page-type="post"] .main-wrapper,html[data-page-item="single"] .main-wrapper,' +
      'html[data-page-type="post"] main.main-container,html[data-page-item="single"] main.main-container{' +
      'overflow:visible!important}' +
      /* body/html overflow-x:clip + overflow-y:auto makes sticky containing block = full content → sticky dies */
      'html[data-page-type="post"],html[data-page-item="single"],' +
      'html[data-page-type="post"] body,html[data-page-item="single"] body{' +
      'overflow:visible!important}' +
      '}' +
      '@media (max-width:860px){' +
      'html[data-page-type="post"] #sidebar,html[data-page-item="single"] #sidebar{' +
      'position:static!important;top:auto!important;max-height:none!important;overflow:visible!important;height:auto!important}' +
      '}';
    var st = document.getElementById(id);
    if (!st) {
      st = document.createElement('style');
      st.id = id;
      (document.head || document.documentElement).appendChild(st);
    }
    if (st.textContent !== css) st.textContent = css;
  }

  function ensureBreakdevFonts() {
    ensureStylesheet('qcx-breakdev-fonts', QCX_FONTS_CSS);
  }
  window.__qcxEnsureBreakdevFonts = ensureBreakdevFonts;

  /* Repair missing mac traffic lights on media frames (title stays hidden). */
  function ensureMacFrameDots(root) {
    try {
      var scope = root || document;
      scope.querySelectorAll('.mac-frame-header').forEach(function(header){
        var dots = header.querySelector('.mac-dots');
        if (!dots) {
          dots = document.createElement('div');
          dots.className = 'mac-dots';
          header.insertBefore(dots, header.firstChild);
        }
        var need = [
          { cls: 'mac-dot mac-red', color: '#ff5f56' },
          { cls: 'mac-dot mac-yellow', color: '#ffbd2e' },
          { cls: 'mac-dot mac-green', color: '#27c93f' }
        ];
        var existing = Array.prototype.slice.call(dots.querySelectorAll('.mac-dot'));
        if (existing.length < 3) {
          dots.innerHTML = '';
          need.forEach(function(spec){
            var span = document.createElement('span');
            span.className = spec.cls;
            span.style.background = spec.color;
            dots.appendChild(span);
          });
        }
        var title = header.querySelector('.mac-title');
        if (title) title.style.setProperty('display', 'none', 'important');
        var spacer = header.querySelector('.mac-spacer');
        if (spacer) spacer.style.setProperty('display', 'none', 'important');
      });
    } catch (errDots) {}
  }

  /* Blogger favicon.ico is empty — force brand default (same as apple-touch / schema logo). */
  function ensureDefaultFavicon() {
    var head = document.head || document.documentElement;
    var iconLinks = head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    if (!iconLinks.length) {
      var icon = document.createElement('link');
      icon.rel = 'icon';
      icon.type = 'image/x-icon';
      icon.href = QCX_SITE_FAVICON;
      head.appendChild(icon);
    } else {
      iconLinks.forEach(function(link) {
        if (link.getAttribute('href') !== QCX_SITE_FAVICON) {
          link.setAttribute('href', QCX_SITE_FAVICON);
          if (!link.getAttribute('type')) link.setAttribute('type', 'image/x-icon');
        }
      });
    }
    var apple = head.querySelector('link[rel="apple-touch-icon"]');
    if (!apple) {
      apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.setAttribute('sizes', '180x180');
      apple.href = QCX_SITE_FAVICON;
      head.appendChild(apple);
    } else {
      var appleHref = apple.getAttribute('href') || '';
      if (!appleHref || /blogspot\.com\/favicon\.ico/i.test(appleHref) || appleHref !== QCX_SITE_FAVICON) {
        /* Keep existing non-blogger apple-touch if already brand; else force default. */
        if (!appleHref || /blogspot\.com\/favicon\.ico/i.test(appleHref)) {
          apple.setAttribute('href', QCX_SITE_FAVICON);
        }
      }
    }
  }
  window.__qcxEnsureDefaultFavicon = ensureDefaultFavicon;

  /* Inline raised chrome — subscribe + pager + search (skip jsDelivr lag). */
  function ensureRaisedChrome() {
    var style = document.getElementById('qcx-subscribe-panel') || document.getElementById('qcx-raised-chrome');
    if (!style) {
      style = document.createElement('style');
      style.id = 'qcx-raised-chrome';
      (document.head || document.documentElement).appendChild(style);
    } else {
      style.id = 'qcx-raised-chrome';
    }
    var css =
      '.qcx-subscribe-card,.qcx-subscribe-card[data-qcx-footer="1"]{' +
      'background-color:#24352c!important;background-image:none!important;' +
      'border:1px solid rgba(0,240,163,.28)!important;border-radius:14px!important;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 0 0 1px rgba(0,0,0,.45),0 16px 42px rgba(0,0,0,.55)!important;' +
      'overflow:hidden!important;position:relative!important;isolation:isolate!important}' +
      '.qcx-subscribe-card::before{content:\"\"!important;position:absolute!important;inset:0!important;' +
      'pointer-events:none!important;z-index:0!important;' +
      'background-image:linear-gradient(90deg,rgba(0,240,163,.55) 0,rgba(0,240,163,.55) 3px,transparent 3px),' +
      'linear-gradient(180deg,rgba(255,255,255,.05),transparent 42%)!important;' +
      'background-color:transparent!important}' +
      '.qcx-subscribe-card>*{position:relative!important;z-index:1!important}' +
      'html[data-page-type="homepage"] .nav-pagination:not(.qcx-home-pager):not(.qcx-rescue-pager),' +
      'html[data-page-type="index"] .nav-pagination:not(.qcx-home-pager):not(.qcx-rescue-pager){' +
      'display:none!important}' +

      '.nav-pagination .blog-pager>a,.nav-pagination .blog-pager>button,' +
      '.blog-pager .older-link,.blog-pager .newer-link,' +
      '.qcx-pager .theme-button,.qcx-pager button.theme-button,' +
      '.qcx-rescue-pager .theme-button,.qcx-rescue-pager button.theme-button,' +
      '.qcx-home-pager .theme-button,.qcx-home-pager button.theme-button{' +
      'background-color:#24352c!important;background-image:none!important;' +
      'border:1px solid rgba(0,240,163,.28)!important;border-radius:10px!important;color:#e8efe9!important;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 8px 24px rgba(0,0,0,.4)!important;isolation:isolate!important}' +
      '.nav-pagination .blog-pager>a:hover,.nav-pagination .blog-pager>button:hover,' +
      '.blog-pager .older-link:hover,.blog-pager .newer-link:hover,' +
      '.qcx-pager .theme-button:hover,.qcx-pager button.theme-button:hover,' +
      '.qcx-rescue-pager .theme-button:hover,.qcx-rescue-pager button.theme-button:hover{' +
      'background-color:#2a3d34!important;background-image:none!important;' +
      'border-color:rgba(0,240,163,.45)!important;color:#00f0a3!important}' +
      '.qcx-results-heading{display:block!important;margin:12px 0 14px!important;padding:0 0 12px!important;' +
      'border-bottom:1px dashed var(--line,#1d2a1f)!important}' +
      '.qcx-results-heading::before{content:\"// chuyên mục\"!important;display:block!important;margin:0 0 8px!important;' +
      'color:var(--accent,#28d28c)!important;font:700 10px/1.2 var(--mono),monospace!important;' +
      'letter-spacing:.13em!important;text-transform:uppercase!important}' +
      '.qcx-inline-search,.qcx-inline-search.qcx-results-search,.qcx-inline-search.qcx-sidebar-search{' +
      'display:flex!important;align-items:center!important;gap:10px!important;' +
      'width:100%!important;max-width:720px!important;min-height:44px!important;height:auto!important;' +
      'margin:40px 0 40px!important;padding:0 14px!important;box-sizing:border-box!important;' +
      'background-color:#24352c!important;background-image:none!important;' +
      'border:1px solid rgba(0,240,163,.22)!important;border-radius:12px!important;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 8px 24px rgba(0,0,0,.4)!important;isolation:isolate!important}' +
      /* Hide sidebar/results inline search everywhere — Menu + Cmd/Ctrl+Space|/K */
      '.qcx-inline-search.qcx-results-search,.qcx-inline-search.qcx-sidebar-search,' +
      '.widget.qcx-sidebar-search,.widget.HTML.qcx-sidebar-search{display:none!important}' +
      '.qcx-inline-search:hover,.qcx-inline-search:focus-visible{border-color:rgba(0,240,163,.4)!important}' +
      '.qcx-inline-search .qcx-search-icon{display:block!important;flex:0 0 auto!important;width:18px!important;height:18px!important;' +
      'color:rgba(138,165,150,.85)!important}' +
      '.qcx-inline-search .qcx-search-text{flex:1 1 auto!important;min-width:0!important;' +
      'color:rgba(138,165,150,.72)!important;font:500 13px/1.3 var(--mono),monospace!important;text-align:left!important}' +
      '.qcx-inline-search .qcx-search-text::before{content:none!important}' +
      '.qcx-inline-search .qcx-search-shortcut{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;' +
      'background:rgba(0,0,0,.35)!important;border:1px solid rgba(0,240,163,.25)!important;' +
      'color:#00f0a3!important;border-radius:6px!important;padding:3px 7px!important}' +
      '@media (max-width:860px){.qcx-inline-search,.qcx-inline-search.qcx-results-search{display:none!important}}' +
      '.qcx-home-pager{grid-column:1/-1!important;width:100%!important;margin:40px auto 40px!important;text-align:center!important;display:flex!important;justify-content:center!important}' +'.qcx-rescue-pager{clear:both!important;float:none!important;width:100%!important;padding-top:40px!important;margin-bottom:40px!important;text-align:center!important;display:block!important}' +
      '.all_posts,[data-page-item=\"multiple\"] .all_posts{clear:both!important;margin-top:0!important}' +
      '#qcx-admin-root .gate,html[data-qcx-admin=\"1\"] #qcx-admin-root .gate{' +
      'background-color:#24352c!important;background-image:none!important;' +
      'border:1px solid rgba(0,240,163,.28)!important;border-radius:12px!important;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 0 0 1px rgba(0,0,0,.45),0 16px 42px rgba(0,0,0,.55)!important;' +
      'isolation:isolate!important}' +
      'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden))>.wrap>header,' +
      'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden)) #btnLogout{display:none!important}' +
      /* Always hide “N Nhận xét” stub and legacy Contempo .commentForm.spinner — unlock chrome owns comments UI */
      'html[data-page-type=\"post\"] #comments>h4.postAComment,' +
      'html[data-page-type=\"page\"] #comments>h4.postAComment,' +
      'html[data-page-item=\"single\"] #comments>h4.postAComment,' +
      'html[data-page-type=\"post\"] .qcx-comments-shell>h4.postAComment,' +
      'html[data-page-type=\"page\"] .qcx-comments-shell>h4.postAComment,' +
      'html[data-page-item=\"single\"] .qcx-comments-shell>h4.postAComment,' +
      '#comments .commentForm,#comments .commentForm.spinner,.qcx-comments-shell .commentForm,.qcx-comments-shell .commentForm.spinner,#comments #comment-editor-src{' +
      'display:none!important;margin:0!important;padding:0!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;' +
      'border:0!important;background:transparent!important;box-shadow:none!important}' +
      /* Keep #comments hidden on locked posts before clicking Mở khoá */
      'html:not([data-qcx-unlocked=\"1\"]) body:not(#layout):has(.qcx-lock-panel:not(.is-done)) #comments:not(.is-active):not([data-qcx-unlock-active=\"1\"]):not(:has(.qcx-inline-gate.is-open)),' +
      'html:not([data-qcx-unlocked=\"1\"]) body:not(#layout):has(.qcx-lock-panel:not(.is-done)) .qcx-comments-shell:not(.is-active):not([data-qcx-unlock-active=\"1\"]):not(:has(.qcx-inline-gate.is-open)){' +
      'display:none!important;height:0!important;max-height:0!important;min-height:0!important;overflow:hidden!important;' +
      'margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}' +
      /* Collapse empty comments shell — bare .comment-form wrappers do NOT count as content */
      'html[data-page-type=\"post\"] #comments:not(:has(iframe,textarea,.comment,#comment-editor,.qcx-comment-list,.qcx-comment-item,.comment-body,.qcx-inline-gate)),' +
      'html[data-page-type=\"page\"] #comments:not(:has(iframe,textarea,.comment,#comment-editor,.qcx-comment-list,.qcx-comment-item,.comment-body,.qcx-inline-gate)),' +
      'html[data-page-item=\"single\"] #comments:not(:has(iframe,textarea,.comment,#comment-editor,.qcx-comment-list,.qcx-comment-item,.comment-body,.qcx-inline-gate)),' +
      'html[data-page-type=\"post\"] .qcx-comments-shell:not(:has(iframe,textarea,.comment,#comment-editor,.qcx-comment-list,.qcx-comment-item,.comment-body,.qcx-inline-gate)),' +
      'html[data-page-type=\"page\"] .qcx-comments-shell:not(:has(iframe,textarea,.comment,#comment-editor,.qcx-comment-list,.qcx-comment-item,.comment-body,.qcx-inline-gate)),' +
      'html[data-page-item=\"single\"] .qcx-comments-shell:not(:has(iframe,textarea,.comment,#comment-editor,.qcx-comment-list,.qcx-comment-item,.comment-body,.qcx-inline-gate)),' +
      '#comments[data-qcx-comments-empty=\"1\"],.qcx-comments-shell[data-qcx-comments-empty=\"1\"],' +
      '#comments[data-qcx-unlock-chrome=\"1\"]:not(.is-settled):not(:has(iframe,textarea,.comment,#comment-editor,.qcx-comment-list,.qcx-comment-item,.comment-body,.qcx-inline-gate)),' +
      '.qcx-comments-shell[data-qcx-unlock-chrome=\"1\"]:not(.is-settled):not(:has(iframe,textarea,.comment,#comment-editor,.qcx-comment-list,.qcx-comment-item,.comment-body,.qcx-inline-gate)){' +
      'display:none!important;height:0!important;max-height:0!important;min-height:0!important;overflow:hidden!important;' +
      'margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}' +
      '#comments[data-qcx-unlock-chrome=\"1\"]:not(.is-settled),' +
      '.qcx-comments-shell[data-qcx-unlock-chrome=\"1\"]:not(.is-settled){' +
      'border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;margin:0!important}' +
      /* Canonical vertical order inside #comments: 1. gate (Bình luận mã) -> 2. #qcx-comment-list (Bình luận gần đây) -> 3. .comment-form (iframe) */
      '#comments,.qcx-comments-shell{display:flex!important;flex-direction:column!important;gap:12px!important}' +
      '#comments>.qcx-inline-gate,.qcx-comments-shell>.qcx-inline-gate{order:1!important;width:100%!important;margin:0!important}' +
      '#comments>#qcx-comment-list,#comments>.qcx-comment-list,.qcx-comments-shell>#qcx-comment-list,.qcx-comments-shell>.qcx-comment-list{order:2!important;width:100%!important;margin:0!important}' +
      '#comments>.comment-form,.qcx-comments-shell>.comment-form{order:3!important;width:100%!important;margin:0!important}' +
      /* Comments relocated inside rail widget */
      '#comments[data-qcx-in-rail="1"],.qcx-comments-shell[data-qcx-in-rail="1"]{' +
      'width:100%!important;margin:16px 0 0!important;padding-top:14px!important;' +
      'border-top:1px solid rgba(28,36,32,.18)!important;border-radius:0!important;' +
      'box-sizing:border-box!important}' +
      '@media (max-width:860px){.qcx-sidebar-rail.qcx-tutorial-inline,#qcx-sidebar-rail-rescue.qcx-tutorial-inline{' +
      'display:block!important;width:100%!important;margin:12px 0 16px!important;padding:12px!important;' +
      'box-sizing:border-box!important;border:1px solid rgba(28,36,32,.14)!important;border-radius:14px!important;' +
      'background:rgba(4,10,7,.72)!important;--qcx-latest-thumb-width:80px;--qcx-latest-thumb-height:80px}' +
      '.qcx-tutorial-inline .qcx-related-heading{text-transform:uppercase!important;letter-spacing:.12em!important}' +
      '.qcx-tutorial-inline .qcx-latest-list{display:block!important;margin:0!important;padding:0!important;list-style:none!important;width:100%!important;box-sizing:border-box!important}' +
      '.qcx-tutorial-inline .qcx-latest-list>li{display:grid!important;grid-template-columns:80px minmax(0,1fr)!important;' +
      'gap:12px!important;align-items:center!important;min-height:80px!important;margin:0!important;padding:10px 0!important;' +
      'border-bottom:1px solid rgba(28,36,32,.11)!important;list-style:none!important;background:transparent!important;' +
      'width:100%!important;box-sizing:border-box!important;overflow:visible!important}' +
      '.qcx-tutorial-inline .item-thumbnail{width:80px!important;min-width:80px!important;height:80px!important;aspect-ratio:1/1!important;margin:0!important;border-radius:10px!important;overflow:hidden!important;display:block!important;border:1px solid rgba(28,36,32,.14)!important}' +
      '.qcx-tutorial-inline .item-thumbnail img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}' +
      '.qcx-tutorial-inline .item-title{padding:0!important;margin:0!important;min-width:0!important}' +
      '.qcx-tutorial-inline .item-title a{display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;' +
      'overflow:hidden!important;color:#dce9df!important;font:700 13px/1.35 var(--mono),monospace!important;text-decoration:none!important}' +
      'body:not(#layout):has(#qcx-sidebar-rail-rescue) #sidebar #HTML4,' +
      'body:not(#layout):has(#qcx-sidebar-rail-rescue) #sidebar #HTML4.qcx-sidebar-rail,' +
      'body:not(#layout):has(#qcx-sidebar-rail-rescue) #HTML4,' +
      'body:not(#layout):has(#qcx-sidebar-rail-rescue) .post-body>#HTML4{' +
      'display:none!important;visibility:hidden!important;height:0!important;max-height:0!important;' +
      'overflow:hidden!important;margin:0!important;padding:0!important;border:0!important}' +
      'body:not(#layout):has(#qcx-sidebar-rail-rescue.qcx-tutorial-inline) #sidebar{' +
      'display:none!important;height:0!important;overflow:hidden!important;margin:0!important;padding:0!important}}' +
      /* P2: Follow card tidy */
      '.qcx-subscribe-card,.qcx-subscribe-card[data-qcx-footer=\"1\"]{display:flex!important;flex-wrap:wrap!important;' +
      'align-items:center!important;justify-content:space-between!important;gap:16px 20px!important;' +
      'max-width:760px!important;margin:28px auto 20px!important;padding:18px 20px!important}' +
      '.qcx-subscribe-card .qcx-sc-text{flex:1 1 220px!important;min-width:0!important}' +
      '.qcx-subscribe-card .qcx-sc-title{margin:0 0 6px!important;font:600 16px/1.35 var(--mono),monospace!important;' +
      'color:#e8efe9!important;-webkit-text-fill-color:#e8efe9!important;text-wrap:balance!important;' +
      'white-space:normal!important;word-break:normal!important;overflow-wrap:anywhere!important}' +
      '.qcx-subscribe-card .qcx-sc-desc{margin:0!important;font:400 12px/1.45 var(--mono),monospace!important;' +
      'color:rgba(190,211,198,.72)!important}' +
      '.qcx-subscribe-card .qcx-sc-actions{display:flex!important;flex-wrap:wrap!important;gap:10px!important;align-items:stretch!important}' +
      '.qcx-subscribe-card .qcx-sc-btn,a.qcx-sc-btn{display:inline-flex!important;align-items:center!important;' +
      'justify-content:center!important;min-width:132px!important;min-height:42px!important;padding:0 16px!important;' +
      'border-radius:10px!important;font:700 12px/1 var(--mono),monospace!important;text-decoration:none!important;' +
      'box-sizing:border-box!important;white-space:nowrap!important}' +
      '.qcx-subscribe-card .qcx-sc-btn:not(.qcx-sc-btn-outline),a.qcx-sc-btn:not(.qcx-sc-btn-outline){' +
      'background:#141a16!important;border:1px solid #141a16!important;color:#e8efe9!important;' +
      '-webkit-text-fill-color:#e8efe9!important;box-shadow:none!important}' +
      '.qcx-subscribe-card .qcx-sc-btn.qcx-sc-btn-outline,a.qcx-sc-btn.qcx-sc-btn-outline{' +
      'background:rgba(0,0,0,.28)!important;border:1px solid rgba(232,239,233,.28)!important;' +
      'color:#eafff4!important;-webkit-text-fill-color:#eafff4!important;box-shadow:none!important}' +
      '.qcx-subscribe-card .qcx-sc-btn.qcx-sc-btn-outline:hover,a.qcx-sc-btn.qcx-sc-btn-outline:hover{' +
      'border-color:#28d28c!important;color:#28d28c!important;-webkit-text-fill-color:#28d28c!important}' +
      '@media (max-width:860px){.qcx-subscribe-card,.qcx-subscribe-card[data-qcx-footer=\"1\"]{' +
      'flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;' +
      'margin:16px 12px 14px!important;padding:12px!important;gap:8px!important}' +
      '.qcx-subscribe-card .qcx-sc-text{flex:0 0 auto!important}' +
      '.qcx-subscribe-card .qcx-sc-actions{width:100%!important;flex-direction:column!important;gap:8px!important}' +
      '.qcx-subscribe-card .qcx-sc-btn,a.qcx-sc-btn{width:100%!important;min-width:0!important;min-height:40px!important}}' +
      /* P3: // mint, N phút đọc trắng */
      '.qcx-read-time,[data-page-type=\"post\"] .post-header .qcx-read-time,.qcx-rescue-single .post-header .qcx-read-time{' +
      'display:block!important;margin:6px 0 0!important;padding:0!important;' +
      'font:500 12px/1.35 var(--mono),monospace!important;letter-spacing:.02em!important;' +
      'color:#eaf7f0!important;-webkit-text-fill-color:#eaf7f0!important;opacity:1!important}' +
      '.qcx-read-time::before,[data-page-type=\"post\"] .post-header .qcx-read-time::before,' +
      '.qcx-rescue-single .post-header .qcx-read-time::before,.post-item .post-header .qcx-read-time::before{' +
      'content:\"// \"!important;color:#28d28c!important;-webkit-text-fill-color:#28d28c!important;' +
      'opacity:1!important;font-weight:700!important}' +
      'html[data-qcx-admin=\"1\"] .qcx-read-time{display:none!important}' +
      /* Hide code block title text — keep mac-dots + copy button only */
      '.mac-title,.mac-spacer,.post-body .mac-frame-header .mac-title,.post-body .mac-frame-header .mac-spacer{display:none!important}' +
      /* Force-visible mac traffic lights (red/yellow/green) */
      '.mac-frame-header .mac-dots,.post-body .mac-frame-header .mac-dots{' +
      'display:flex!important;align-items:center!important;gap:9px!important;' +
      'flex:0 0 auto!important;width:auto!important;min-width:54px!important;' +
      'margin:0!important;padding:0!important;opacity:1!important;visibility:visible!important}' +
      '.mac-frame-header .mac-dot,.post-body .mac-frame-header .mac-dot{' +
      'display:block!important;width:12px!important;height:12px!important;' +
      'min-width:12px!important;min-height:12px!important;' +
      'border-radius:50%!important;flex:0 0 auto!important;' +
      'opacity:1!important;visibility:visible!important;box-shadow:0 0 0 1px rgba(0,0,0,.18)!important}' +
      '.mac-frame-header .mac-dot.mac-red,.post-body .mac-frame-header .mac-dot.mac-red{background:#ff5f56!important}' +
      '.mac-frame-header .mac-dot.mac-yellow,.post-body .mac-frame-header .mac-dot.mac-yellow{background:#ffbd2e!important}' +
      '.mac-frame-header .mac-dot.mac-green,.post-body .mac-frame-header .mac-dot.mac-green{background:#27c93f!important}' +
      /* mac-frame-header: flex row, copy btn pushed to the right via margin-left:auto */
      '.mac-frame-header{display:flex!important;align-items:center!important;flex-wrap:nowrap!important}' +
      /* Copy btn in header: inline-flex, margin-left:auto pushes it right */
      '.mac-frame-header .qcx-copy-btn{' +
      'margin-left:auto!important;position:static!important;' +
      'width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;' +
      'padding:0!important;border-radius:7px!important;' +
      'background:rgba(0,240,163,0.1)!important;border:1px solid rgba(0,240,163,0.25)!important;' +
      'display:inline-flex!important;align-items:center!important;justify-content:center!important;' +
      'opacity:0.65!important;transition:opacity .15s ease,background .15s ease!important;cursor:pointer!important}' +
      '.mac-frame:hover .mac-frame-header .qcx-copy-btn{opacity:1!important;background:rgba(0,240,163,0.18)!important}' +
      '.mac-frame-header .qcx-copy-btn.copied{background:rgba(0,240,163,0.28)!important;border-color:rgba(0,240,163,0.6)!important;opacity:1!important}' +
      '.mac-frame-header .qcx-copy-btn svg{width:13px!important;height:13px!important}' +
      '.mac-frame-header .qcx-copy-btn .qcx-copy-txt{display:none!important}' +
      /* Plain code-wrap (no mac-frame): position:relative + absolute copy btn */
      '.mac-frame-content{position:relative!important}' +
      '.qcx-code-wrap{position:relative!important;display:block!important}' +
      '.qcx-code-wrap .qcx-copy-btn{' +
      'position:absolute!important;top:8px!important;right:8px!important;z-index:3!important;' +
      'width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;' +
      'padding:0!important;border-radius:7px!important;' +
      'background:rgba(0,240,163,0.1)!important;border:1px solid rgba(0,240,163,0.25)!important;' +
      'display:inline-flex!important;align-items:center!important;justify-content:center!important;' +
      'opacity:0.65!important;transition:opacity .15s ease,background .15s ease!important}' +
      '.qcx-code-wrap:hover .qcx-copy-btn{opacity:1!important;background:rgba(0,240,163,0.18)!important}' +
      '.qcx-code-wrap .qcx-copy-btn.copied{background:rgba(0,240,163,0.28)!important;border-color:rgba(0,240,163,0.6)!important;opacity:1!important}' +
      '.qcx-code-wrap .qcx-copy-btn svg{width:13px!important;height:13px!important}' +
      '.qcx-code-wrap .qcx-copy-btn .qcx-copy-txt{display:none!important}' +
      /* Padding-right only for plain code-wrap pre (not mac-frame since btn is in header) */
      '.qcx-code-wrap pre{padding-right:44px!important}' +
      /* Hide any legacy or duplicate copy button inside pre or mac-frame-content */
      'html body pre>button,html body .post-body pre>button,' +
      'html body .mac-frame-content button,html body .mac-frame-content .qcx-copy-btn,' +
      'html body .qcx-code-wrap .mac-frame~.qcx-copy-btn,html body .qcx-code-wrap:has(.mac-frame)>.qcx-copy-btn{' +
      'display:none!important;visibility:hidden!important;width:0!important;height:0!important;opacity:0!important;pointer-events:none!important}';
    if (style.textContent !== css) style.textContent = css;
  }
  function ensureSubscribeCardPanel() { ensureRaisedChrome(); }

  /* XML drawer CSS — shell + interior (links/chips); theme Lưu often drops skin rules. */
  function ensureMenuDrawer() {
    var css =
      '#qcx-menu-backdrop{display:none!important;position:fixed!important;inset:0!important;' +
      'background:rgba(0,0,0,.72)!important;z-index:99997!important}' +
      '#qcx-menu-backdrop.open{display:block!important}' +
      '#qcx-menu{position:fixed!important;inset:0!important;width:100%!important;max-width:none!important;' +
      'height:100%!important;background:#07110c!important;border:0!important;border-radius:0!important;' +
      'z-index:99998!important;display:flex!important;flex-direction:column!important;' +
      'transform:translateY(-104%)!important;transition:transform .32s cubic-bezier(.2,.8,.2,1),opacity .24s ease!important;' +
      'opacity:0!important;overflow:hidden!important;box-shadow:none!important;margin:0!important;' +
      'padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)!important;' +
      'visibility:hidden!important;pointer-events:none!important}' +
      '#qcx-menu[aria-hidden=\"true\"]:not(.open){transform:translateY(-104%)!important;opacity:0!important;' +
      'visibility:hidden!important;pointer-events:none!important}' +
      '#qcx-menu.open,#qcx-menu[aria-hidden=\"false\"]{transform:translateY(0)!important;opacity:1!important;' +
      'visibility:visible!important;pointer-events:auto!important}' +
      '#qcx-menu-header{display:flex!important;align-items:center!important;justify-content:flex-start!important;' +
      'padding:12px 14px 8px!important;flex-shrink:0!important;gap:6px!important;max-width:960px!important;' +
      'width:100%!important;margin:0 auto!important;box-sizing:border-box!important}' +
      '#qcx-menu-header .qcx-auth-slot--menu{margin-left:auto!important;margin-right:0!important;flex:0 0 auto!important;' +
      'display:inline-flex!important;align-items:center!important;max-width:min(168px,46vw)!important;' +
      'order:2!important}' +
      '#qcx-menu-header .qcx-auth-slot--menu .qcx-user-chip{height:28px!important;max-width:100%!important;' +
      'padding:0 8px 0 2px!important;gap:5px!important}' +
      '#qcx-menu-header .qcx-auth-slot--menu .qcx-user-chip::before{opacity:.55!important;inset:0 0 0 16px!important}' +
      '#qcx-menu-header .qcx-auth-slot--menu .qcx-user-avatar{width:18px!important;height:18px!important}' +
      '#qcx-menu-header .qcx-auth-slot--menu .qcx-user-name{max-width:96px!important;font-size:11.5px!important}' +
      '#qcx-menu-header .qcx-auth-slot--menu .qcx-auth-login-btn{height:28px!important;padding:0 10px!important}' +
      '#qcx-menu-header #qcx-menu-close{margin-left:0!important;flex:0 0 auto!important;order:3!important}' +
      '#qcx-menu-header #qcx-menu-logo{order:1!important;flex:0 0 auto!important;margin-right:0!important}' +
      /* Search command row — keep full green border (window padding, never clip) */
      '.qcx-mobile-search-window{overflow:visible!important;padding:10px 10px 0!important;box-sizing:border-box!important}' +
      '.qcx-mobile-search-form{margin:0!important;border:1px solid rgba(0,240,163,.42)!important;border-radius:10px!important;' +
      'background:rgba(0,0,0,.22)!important;box-shadow:inset 0 0 0 1px rgba(0,240,163,.08)!important}' +
      '@media (max-width:860px){.qcx-mobile-search-window{padding:8px 8px 0!important}}' +
      '#qcx-menu-logo{display:inline-flex!important;align-items:center!important;gap:8px!important;' +
      'font:800 14px/1.2 system-ui,-apple-system,sans-serif!important;color:#fff!important;cursor:pointer!important;' +
      'letter-spacing:.02em!important;text-transform:none!important;-webkit-text-fill-color:#fff!important}' +
      '#qcx-menu-logo .qcx-menu-logo-mark{height:16px!important;width:auto!important;display:block!important;flex:0 0 auto!important;overflow:visible!important}' +
      '#qcx-menu-logo .qcx-menu-logo-mark path{fill:#fff!important}' +
      '#qcx-menu-logo .qcx-menu-logo-mark .logo-eyes,#qcx-menu-logo .qcx-menu-logo-mark .logo-eye-left,#qcx-menu-logo .qcx-menu-logo-mark .logo-eye-right{transform-box:fill-box;transform-origin:center}' +
      '#qcx-menu-logo .qcx-menu-logo-text{color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:800!important}' +
      '.qcx-brand-svg .qcx-ghost-art image,.qcx-brand-mark .qcx-ghost-art image{filter:none!important}' +
      '.qcx-avatar{position:relative!important;overflow:visible!important}' +
      '.qcx-avatar .qcx-brand-raster{width:100%!important;height:100%!important;display:block!important;' +
      'object-fit:contain!important;object-position:center!important;image-rendering:-webkit-optimize-contrast;' +
      'image-rendering:auto!important;filter:none!important;-webkit-backface-visibility:hidden}' +
      '.qcx-avatar .qcx-brand-svg.qcx-brand-eyes-only{position:absolute!important;inset:0!important;' +
      'width:100%!important;height:100%!important;pointer-events:auto!important;z-index:2!important}' +
      '.qcx-brand-svg .qcx-eye-socket{fill:#f2f2f2!important}' +
      '.qcx-brand-svg .qcx-eye{fill:#0a0a0a!important}' +
      '#qcx-menu-close{width:34px!important;height:34px!important;display:grid!important;place-items:center!important;' +
      'background:transparent!important;border:0!important;border-radius:10px!important;cursor:pointer!important;' +
      'flex-shrink:0!important;line-height:1!important;color:rgba(190,211,198,.72)!important;font-size:18px!important;' +
      'padding:0!important;box-shadow:none!important;transition:color .15s ease!important}' +
      '#qcx-menu-close:hover,#qcx-menu-close:focus-visible{background:transparent!important;border:0!important;' +
      'box-shadow:none!important;color:#4a5f54!important;outline:none!important}' +
      '#qcx-menu-close:active{color:#2f3f38!important;background:transparent!important}' +
      '#qcx-menu-search.qcx-menu-search-row,.qcx-menu-search-row{display:flex!important;align-items:center!important;' +
      'gap:10px!important;width:calc(100% - 32px)!important;max-width:none!important;margin:0 16px 14px!important;' +
      'min-height:48px!important;padding:0 14px!important;border:1px solid rgba(0,240,163,.42)!important;' +
      'border-radius:12px!important;background:rgba(0,240,163,.08)!important;color:#e8fff2!important;' +
      'font:600 14px/1.2 var(--mono,ui-monospace,Menlo,Consolas,monospace)!important;text-align:left!important;' +
      'cursor:pointer!important;flex-shrink:0!important;box-sizing:border-box!important;' +
      'box-shadow:0 0 0 1px rgba(0,240,163,.12),0 8px 22px rgba(0,0,0,.35)!important}' +
      '#qcx-menu-search.qcx-menu-search-row>span{flex:1 1 auto!important;min-width:0!important;' +
      'overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}' +
      '#qcx-menu-search svg{color:#00f0a3!important;width:18px!important;height:18px!important;flex-shrink:0!important}' +
      '#qcx-menu-search .qcx-menu-search-hint,.qcx-menu-search-row .qcx-menu-search-hint{display:inline-flex!important;' +
      'align-items:center!important;margin-left:auto!important;padding:3px 8px!important;' +
      'border:1px solid rgba(255,255,255,.12)!important;border-radius:6px!important;background:rgba(0,0,0,.28)!important;' +
      'color:rgba(190,211,198,.78)!important;font:600 10px/1.2 var(--mono,ui-monospace,monospace)!important;' +
      'letter-spacing:.02em!important;white-space:nowrap!important;flex-shrink:0!important}' +
      '@media (max-width:860px),(pointer:coarse){' +
      '#qcx-menu-search .qcx-menu-search-hint,.qcx-menu-search-row .qcx-menu-search-hint{display:none!important}}' +
      '#qcx-menu-search.qcx-menu-search-row:hover,.qcx-menu-search-row:hover,' +
      '#qcx-menu-search.qcx-menu-search-row:active,.qcx-menu-search-row:active,' +
      '#qcx-menu .qcx-menu-search-row:hover{' +
      'border-color:rgba(0,240,163,.65)!important;color:#fff!important;background:rgba(0,240,163,.14)!important}' +
      '#qcx-menu-nav{flex:1!important;padding:0 16px 10px!important;overflow-y:auto!important;' +
      'overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;' +
      'max-width:960px!important;width:100%!important;margin:0 auto!important;box-sizing:border-box!important}' +
      '.qcx-menu-section{padding:10px 0 6px!important;font-size:11px!important;font-weight:600!important;' +
      'color:rgba(138,165,150,.85)!important;letter-spacing:.05em!important;text-transform:none!important;' +
      'border:0!important;margin:0!important}' +
      '.qcx-menu-card-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;' +
      'gap:8px!important;margin:0 0 4px!important;padding:0!important}' +
      '@media (min-width:861px){.qcx-menu-card-grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))!important;gap:10px!important}}' +
      '.qcx-menu-card{display:flex!important;align-items:center!important;gap:12px!important;' +
      'min-height:0!important;padding:12px!important;margin:0!important;border-radius:16px!important;' +
      'background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.08)!important;' +
      'box-shadow:0 1px 2px rgba(0,0,0,0)!important;text-decoration:none!important;color:inherit!important;' +
      'cursor:pointer!important;box-sizing:border-box!important;font:inherit!important;text-align:left!important;' +
      'width:100%!important;-webkit-tap-highlight-color:transparent;' +
      'transition:border-color 0.15s,box-shadow 0.15s!important}' +
      '.qcx-menu-card:hover,.qcx-menu-card:focus-visible,.qcx-menu-card:active,.qcx-menu-card.is-hover{' +
      'background:rgba(255,255,255,.05)!important;border-color:rgba(255,255,255,.12)!important;' +
      'box-shadow:0 1px 2px rgba(0,0,0,.03)!important;outline:none!important}' +
      '.qcx-menu-card:hover .qcx-menu-card-icon,.qcx-menu-card:focus-visible .qcx-menu-card-icon,' +
      '.qcx-menu-card:active .qcx-menu-card-icon,.qcx-menu-card.is-hover .qcx-menu-card-icon,' +
      '.qcx-menu-card.qcx-menu-current .qcx-menu-card-icon{' +
      '--color-1:var(--active-color-1)!important;--color-2:var(--active-color-2)!important;' +
      '--color-3:var(--active-color-3)!important;--color-4:var(--active-color-4)!important}' +
      '.qcx-menu-card:hover .qcx-menu-card-ext,.qcx-menu-card:focus-visible .qcx-menu-card-ext,' +
      '.qcx-menu-card:active .qcx-menu-card-ext,.qcx-menu-card.is-hover .qcx-menu-card-ext{' +
      'transform:translate(1px,-1px)!important;color:rgb(175,175,175)!important}' +
      '.qcx-menu-card.qcx-menu-current{' +
      'background:rgba(40,210,140,.08)!important;border-color:rgba(40,210,140,.28)!important;outline:none!important}' +
      '.qcx-menu-card-icon-wrap{flex:0 0 auto!important;width:40px!important;height:40px!important;display:block!important}' +
      '.qcx-menu-card-icon{display:block!important;width:40px!important;height:40px!important;' +
      '--color-1:#bcbbbb;--color-2:#a9a8a8;--color-3:#9c9b9b;--color-4:#8f8e8e;' +
      '--active-color-1:#28d28c;--active-color-2:#3ee09a;--active-color-3:#7dffc4;--active-color-4:#7dffc4}' +
      '.qcx-menu-card-icon *{transition:fill 0.2s,stroke 0.2s!important}' +
      '.qcx-menu-card-content{flex:1 1 auto!important;min-width:0!important;display:flex!important;flex-direction:column!important;gap:2px!important}' +
      '.qcx-menu-card-title-row{display:flex!important;align-items:center!important;gap:5px!important;min-width:0!important}' +
      '.qcx-menu-card-title{font:700 13px/1.2 system-ui,-apple-system,sans-serif!important;color:#eaf7f0!important;' +
      'white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}' +
      '.qcx-menu-card-desc{font:500 11px/1.25 system-ui,-apple-system,sans-serif!important;color:rgba(190,211,198,.65)!important;' +
      'white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;' +
      'display:block!important;-webkit-line-clamp:unset!important}' +
      '@media (max-width:380px){.qcx-menu-card-desc{display:none!important}}' +
      '.qcx-menu-card-badge{display:inline-flex!important;align-items:center!important;padding:1px 6px!important;' +
      'border-radius:999px!important;background:rgba(40,210,140,.18)!important;color:#28d28c!important;' +
      'font:700 9px/1.2 system-ui,sans-serif!important}' +
      '.qcx-menu-card-ext{margin-left:auto!important;color:rgba(190,211,198,.5)!important;display:inline-flex!important;' +
      'flex-shrink:0!important;transition:transform 0.15s,color 0.15s!important}' +
      '.qcx-menu-link{display:none!important}' +
      '.qcx-menu-labels-cloud{display:flex!important;flex-wrap:wrap!important;gap:6px!important;padding:2px 0 8px!important}' +
      '.qcx-menu-chip{display:inline-flex!important;align-items:center!important;max-width:100%!important;' +
      'min-height:28px!important;padding:0 10px!important;border:1px solid rgba(255,255,255,.08)!important;' +
      'border-radius:999px!important;background:rgba(255,255,255,.03)!important;color:rgba(210,230,216,.88)!important;' +
      'font-size:11px!important;font-weight:600!important;text-decoration:none!important;white-space:nowrap!important}' +
      '#qcx-menu-footer{display:none!important}' + 'html[data-page-type="post"] #footer,' +'html[data-page-type="post"] footer.footer,' +'html[data-page-type="page"] #footer,' +'html[data-page-type="page"] footer.footer,' +'html[data-page-item="single"] #footer,' +'html[data-page-item="single"] footer.footer{display:none!important}' +'html:not(#layout) body{min-height:100vh!important;display:flex!important;flex-direction:column!important}' +'html:not(#layout) body > *{flex-shrink:0!important}' +      '#footer,footer.footer{margin-top:0!important;padding-bottom:0!important}' +

      'html body footer.footer,html body footer.footer.footer,' +
      'html body footer.footer #footer,html body footer.footer #footer.qcx-footer-gadgets,' +
      'html body footer.footer .qcx-addon-zone{' +
        'margin:0!important;margin-top:0!important;margin-bottom:0!important;' +
        'padding:0!important;min-height:0!important;height:auto!important;' +
        'background:#060d08!important;border:0!important;box-shadow:none!important}' +
      'html body footer.footer #footer,html body footer.footer #footer.qcx-footer-gadgets,' +
      'html body footer.footer .qcx-addon-zone{background:transparent!important}' +
      'html body footer.footer > .main-container:not(.qcx-footer-gadgets){display:none!important;height:0!important;padding:0!important;margin:0!important}' +
      '.qcx-pager,.qcx-pager .blog-pager,#blog-pager,.blog-pager{margin-bottom:0!important}' +
      '.qcx-footer-widget,.qcx-footer-widget .widget-content{width:100%!important;float:none!important;padding:0!important;margin:0!important}' +
      '.footer .widget.qcx-footer-widget{width:100%!important;max-width:100%!important;display:block!important;float:none!important}' +
      '.footer .widget:nth-of-type(1).qcx-footer-widget,.footer .widget:nth-child(1).qcx-footer-widget{width:100%!important}' +

      'html body footer.footer .qcx-footer-social,.qcx-footer-social{' +
        'width:100%!important;margin:0!important;padding:8px 16px!important;' +
        'padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;' +
        'border:0!important;border-top:1px solid rgba(76,175,130,0.16)!important;' +
        'border-radius:0!important;background:#060d08!important;box-sizing:border-box!important;' +
        'min-height:0!important;height:auto!important}' +
      'html body footer.footer .qcx-footer-inner,.qcx-footer-inner{' +
        'width:100%!important;max-width:1080px!important;margin:0 auto!important;padding:0!important;' +
        'display:flex!important;align-items:center!important;justify-content:space-between!important;' +
        'gap:10px!important;min-width:0!important;min-height:0!important;box-sizing:border-box!important}' +
      'html body footer.footer .qcx-footer-logo,.qcx-footer-logo{' +
        'font:800 11px/1 var(--qcx-article-mono,ui-monospace,monospace)!important;' +
        'color:#6dd9a4!important;letter-spacing:.1em!important;text-transform:uppercase!important;' +
        'white-space:nowrap!important;flex:0 0 auto!important;margin:0!important;padding:0!important}' +
      'html body footer.footer .qcx-footer-copy,.qcx-footer-copy{' +
        'font:500 11px/1 var(--qcx-article-mono,ui-monospace,monospace)!important;' +
        'color:rgba(158,196,176,0.55)!important;margin:0!important;padding:0!important;' +
        'white-space:nowrap!important;flex:1 1 auto!important;text-align:center!important;' +
        'min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important}' +
      'html body footer.footer .qcx-footer-tg-btn,.qcx-footer-tg-btn{' +
        'appearance:none!important;display:inline-flex!important;align-items:center!important;gap:5px!important;' +
        'height:26px!important;min-height:26px!important;max-height:26px!important;' +
        'padding:0 10px!important;margin:0!important;line-height:1!important;' +
        'border:1px solid rgba(76,175,130,0.28)!important;border-radius:999px!important;' +
        'background:transparent!important;box-shadow:none!important;' +
        'color:#9ec4b0!important;-webkit-text-fill-color:#9ec4b0!important;' +
        'font:600 11px/1 var(--qcx-article-mono,ui-monospace,monospace)!important;' +
        'text-decoration:none!important;letter-spacing:.03em!important;white-space:nowrap!important;flex:0 0 auto!important}' +
      'html body footer.footer .qcx-footer-tg-btn:hover,.qcx-footer-tg-btn:hover{' +
        'color:#6dd9a4!important;-webkit-text-fill-color:#6dd9a4!important;border-color:rgba(109,217,164,0.45)!important;background:rgba(76,175,130,0.08)!important}' +
      'html body footer.footer .qcx-footer-tg-btn svg,.qcx-footer-tg-btn svg{width:12px!important;height:12px!important;flex-shrink:0!important}' +
      '@media(max-width:860px){' +
        'html body footer.footer .qcx-footer-social,.qcx-footer-social{' +
          'padding:8px 14px calc(58px + env(safe-area-inset-bottom,0px))!important}' +
        'html body footer.footer .qcx-footer-inner,.qcx-footer-inner{gap:8px!important}' +
        'html body footer.footer .qcx-footer-copy,.qcx-footer-copy{display:none!important}' +
        'html body footer.footer .qcx-footer-tg-btn,.qcx-footer-tg-btn{height:26px!important;min-height:26px!important;max-height:26px!important;padding:0 9px!important;font-size:10.5px!important}' +
        'html body .scroll--top{display:none!important}' +
      '}' +
      '@media(min-width:861px){' +
        'html body .scroll--top{bottom:52px!important;right:16px!important;width:32px!important;height:32px!important}' +
      '}' +
      '#qcx-menu-nav{padding-bottom:calc(14px + env(safe-area-inset-bottom,0px))!important}' +
      '#qcx-menu .qcx-mobile-menu-hidden{display:none!important}' +
      'body.qcx-menu-open{overflow:hidden!important}' +
      '#qcx-pc-menu-btn{display:none!important}' +
      'body#layout #qcx-pc-menu-btn,html[data-qcx-admin=\"1\"] #qcx-pc-menu-btn,' +
      'html[data-qcx-admin=\"1\"] #qcx-native-tabbar,html[data-qcx-admin=\"1\"] .footer-navigation-bar{display:none!important}';
    var style = document.getElementById('qcx-menu-drawer');
    if (!style) {
      style = document.createElement('style');
      style.id = 'qcx-menu-drawer';
      (document.head || document.documentElement).appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }

  window.__qcxEnsureMenuDrawer = ensureMenuDrawer;

  function setMenuFocusable(menu, focusable) {
    /* When menu is hidden (aria-hidden=true), remove all focusable descendants from tab order */
    try {
      var focusEls = menu.querySelectorAll('a,button,input,select,textarea,[tabindex]');
      Array.prototype.forEach.call(focusEls, function(el) {
        if (focusable) {
          var saved = el.getAttribute('data-qcx-saved-tabindex');
          if (saved !== null) { el.setAttribute('tabindex', saved); el.removeAttribute('data-qcx-saved-tabindex'); }
          else el.removeAttribute('tabindex');
        } else {
          var current = el.getAttribute('tabindex');
          if (current !== '-1') { el.setAttribute('data-qcx-saved-tabindex', current || '0'); el.setAttribute('tabindex', '-1'); }
        }
      });
    } catch (ignore) {}
  }

  function setMenuOpenState(open) {
    var menu = document.getElementById('qcx-menu');
    var backdrop = document.getElementById('qcx-menu-backdrop');
    var pcBtn = document.getElementById('qcx-pc-menu-btn');
    if (!menu) return;
    if (open) {
      menu.classList.add('open');
      menu.setAttribute('aria-hidden', 'false');
      setMenuFocusable(menu, true);
      if (backdrop) {
        backdrop.classList.add('open');
        backdrop.setAttribute('aria-hidden', 'false');
      }
      document.body.classList.add('qcx-menu-open', 'qcx-panel-open');
      bindMenuCloseControls();
    } else {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      setMenuFocusable(menu, false);
      if (backdrop) {
        backdrop.classList.remove('open');
        backdrop.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.remove('qcx-menu-open', 'qcx-panel-open');
    }
    if (pcBtn) {
      pcBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      pcBtn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    }
  }

  function closeMenuDrawer(ev) {
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
    setMenuOpenState(false);
  }
  window.__qcxCloseMenu = closeMenuDrawer;
  window.__qcxSetMenuOpen = setMenuOpenState;

  function bindMenuCloseControls() {
    var close = document.getElementById('qcx-menu-close');
    var backdrop = document.getElementById('qcx-menu-backdrop');
    if (close && close.getAttribute('data-qcx-close-bound') !== '2') {
      close.setAttribute('data-qcx-close-bound', '2');
      close.addEventListener('click', closeMenuDrawer);
      close.addEventListener('pointerup', closeMenuDrawer);
    }
    if (backdrop && backdrop.getAttribute('data-qcx-close-bound') !== '2') {
      backdrop.setAttribute('data-qcx-close-bound', '2');
      backdrop.addEventListener('click', closeMenuDrawer);
    }
  }

  /* Open search even when runtime lost window.qcxOpenSearch after boot. */
  function openSearchFallback() {
    if (typeof window.qcxOpenSearch === 'function') {
      window.qcxOpenSearch();
      return;
    }
    var overlay = document.getElementById('qcx-mobile-search');
    var input = overlay && overlay.querySelector('.qcx-mobile-search-input');
    setMenuOpenState(false);
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('qcx-panel-open');
    if (input) {
      try { input.focus(); } catch (ignoreFocus) {}
    }
  }
  window.__qcxOpenSearchFallback = openSearchFallback;

  function repairQcxOpenSearch() {
    if (typeof window.qcxOpenSearch === 'function') return true;
    if (typeof window.__qcxInitMobileNav !== 'function') return false;
    try {
      ['qcx-menu', 'qcx-menu-backdrop', 'qcx-mobile-search', 'qcx-mobile-toast'].forEach(function (id) {
        var node = document.getElementById(id);
        if (node && node.parentNode) node.parentNode.removeChild(node);
      });
      document.documentElement.removeAttribute('data-qcx-nav-ready');
      window.__qcxInitMobileNav();
    } catch (ignoreRepair) {}
    return typeof window.qcxOpenSearch === 'function';
  }

  /* Capture-phase: survives menu rebuilds that drop runtime listeners. */
  if (!window.__qcxMenuCloseDelegated) {
    window.__qcxMenuCloseDelegated = true;
    document.addEventListener(
      'click',
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('#qcx-menu-search')) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.qcxOpenSearch !== 'function') repairQcxOpenSearch();
          openSearchFallback();
          return;
        }
        if (t.closest('#qcx-menu-close')) {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpenState(false);
          return;
        }
        if (t.id === 'qcx-menu-backdrop' || (t.closest && t.closest('#qcx-menu-backdrop') === t)) {
          setMenuOpenState(false);
        }
      },
      true
    );
    document.addEventListener(
      'keydown',
      function (e) {
        if (e.key !== 'Escape') return;
        var menu = document.getElementById('qcx-menu');
        var search = document.getElementById('qcx-mobile-search');
        if (search && search.classList.contains('open')) {
          search.classList.remove('open');
          search.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('qcx-panel-open');
          return;
        }
        if (menu && (menu.classList.contains('open') || menu.getAttribute('aria-hidden') === 'false')) {
          setMenuOpenState(false);
        }
      },
      true
    );
  }

  /* XML native mobile tabbar — live theme often drops #qcx-native-tabbar. */
  function ensureNativeTabbarCss() {
    var css =
      '@media (min-width:861px){.footer-navigation-bar,#qcx-native-tabbar{display:none!important}}' +
      '@media (max-width:860px){' +
      '.footer-navigation-bar,#qcx-native-tabbar{display:block!important;position:fixed!important;' +
      'bottom:0!important;left:0!important;right:0!important;width:100%!important;z-index:9500!important;' +
      'background:rgba(8,12,9,.92)!important;border-top:1px solid rgba(28,36,32,.18)!important;' +
      'box-shadow:0 -8px 28px rgba(0,0,0,.45)!important;backdrop-filter:blur(18px) saturate(1.2)!important;' +
      '-webkit-backdrop-filter:blur(18px) saturate(1.2)!important;box-sizing:border-box!important;' +
      'padding-bottom:env(safe-area-inset-bottom,0px)!important;transform:none!important;overflow:visible!important}' +
      '.footer-navigation-bar>div,#qcx-native-tabbar>div{display:flex!important;width:100%!important;align-items:stretch!important}' +
      '.footer-navigation-bar>div>ul,#qcx-native-tabbar>div>ul{display:flex!important;width:100%!important;' +
      'min-height:56px!important;margin:0!important;padding:4px 0 2px!important;list-style:none!important}' +
      '.footer-navigation-bar>div>ul>li,#qcx-native-tabbar>div>ul>li{width:20%!important;flex:1 1 0!important;' +
      'display:flex!important;align-items:center!important;justify-content:center!important}' +
      '.footer-navigation-bar>div>ul>li>a,#qcx-native-tabbar>div>ul>li>a{display:flex!important;flex-direction:column!important;' +
      'align-items:center!important;justify-content:center!important;width:100%!important;min-height:48px!important;' +
      'padding:4px 2px!important;font-family:var(--mono)!important;font-size:10px!important;font-weight:700!important;' +
      'text-decoration:none!important;gap:2px!important;color:#9ecbb8!important;fill:#9ecbb8!important;' +
      'box-sizing:border-box!important;-webkit-tap-highlight-color:transparent;touch-action:manipulation}' +
      '.footer-navigation-bar>div>ul>li>a>.icon,#qcx-native-tabbar>div>ul>li>a>.icon{width:24px!important;height:24px!important;' +
      'display:flex!important;align-items:center!important;justify-content:center!important}' +
      '.footer-navigation-bar>div>ul>li>a>.icon>svg,#qcx-native-tabbar>div>ul>li>a>.icon>svg{width:22px!important;height:22px!important;fill:currentColor!important;stroke:currentColor!important}' +
      '.footer-navigation-bar>div>ul>li>a>.icon>svg [stroke],#qcx-native-tabbar>div>ul>li>a>.icon>svg [stroke]{stroke-width:2.4!important}' +
      '.footer-navigation-bar>div>ul>li>a>.title,#qcx-native-tabbar>div>ul>li>a>.title{font-size:10px!important;line-height:1.1!important;' +
      'white-space:nowrap!important;overflow:hidden!important;max-width:100%!important;text-overflow:ellipsis!important}' +
      '.footer-navigation-bar>div>ul>li>a:hover,#qcx-native-tabbar>div>ul>li>a:hover,' +
      '.footer-navigation-bar>div>ul>li>a:focus-visible,#qcx-native-tabbar>div>ul>li>a:focus-visible,' +
      '.footer-navigation-bar>div>ul>li>a:active,#qcx-native-tabbar>div>ul>li>a:active,' +
      '.footer-navigation-bar>div>ul>li>a.qcx-nav-active,#qcx-native-tabbar>div>ul>li>a.qcx-nav-active,' +
      '.footer-navigation-bar>div>ul>li>a[aria-current=\"page\"],#qcx-native-tabbar>div>ul>li>a[aria-current=\"page\"]{' +
      'color:#28d28c!important;fill:#28d28c!important;opacity:1!important}' +
      /* Beat smart-media svg{color/fill:var(--accent)} which paints icons near-black */
      '.footer-navigation-bar>div>ul>li>a:hover>.icon>svg,#qcx-native-tabbar>div>ul>li>a:hover>.icon>svg,' +
      '.footer-navigation-bar>div>ul>li>a:focus-visible>.icon>svg,#qcx-native-tabbar>div>ul>li>a:focus-visible>.icon>svg,' +
      '.footer-navigation-bar>div>ul>li>a:active>.icon>svg,#qcx-native-tabbar>div>ul>li>a:active>.icon>svg,' +
      '.footer-navigation-bar>div>ul>li>a.qcx-nav-active>.icon>svg,#qcx-native-tabbar>div>ul>li>a.qcx-nav-active>.icon>svg,' +
      '.footer-navigation-bar>div>ul>li>a[aria-current=\"page\"]>.icon>svg,#qcx-native-tabbar>div>ul>li>a[aria-current=\"page\"]>.icon>svg,' +
      '.footer-navigation-bar>div>ul>li>a:hover>.icon>svg path,#qcx-native-tabbar>div>ul>li>a:hover>.icon>svg path,' +
      '.footer-navigation-bar>div>ul>li>a.qcx-nav-active>.icon>svg path,#qcx-native-tabbar>div>ul>li>a.qcx-nav-active>.icon>svg path,' +
      '.footer-navigation-bar>div>ul>li>a[aria-current=\"page\"]>.icon>svg path,#qcx-native-tabbar>div>ul>li>a[aria-current=\"page\"]>.icon>svg path,' +
      '#qcx-native-tabbar a.qcx-nav-active svg,#qcx-native-tabbar a.qcx-nav-active svg path,' +
      '#qcx-native-tabbar a:hover svg,#qcx-native-tabbar a:hover svg path,' +
      '.footer-navigation-bar a.qcx-nav-active svg,.footer-navigation-bar a.qcx-nav-active svg path,' +
      '.footer-navigation-bar a:hover svg,.footer-navigation-bar a:hover svg path{' +
      'color:#28d28c!important;fill:#28d28c!important;stroke:none!important}' +
      'body{padding-bottom:calc(60px + env(safe-area-inset-bottom,0px))!important}' +
      '.centered-top .hamburger-menu,button.hamburger-menu{display:none!important}' +
      /* Beat skin forcing signal visible on mobile */
      'body:not(#layout) .qcx-signal-header,body:not(#layout) .qcx-topbar,' +
      '.qcx-signal-header,.qcx-topbar{display:none!important;height:0!important;min-height:0!important;' +
      'margin:0!important;padding:0!important;overflow:hidden!important;visibility:hidden!important;border:0!important}' +
      'body:not(#layout) .qcx-hero,.qcx-hero{padding-top:8px!important;margin-top:0!important;' +
      'width:100%!important;max-width:100%!important;box-sizing:border-box!important;' +
      'grid-template-columns:80px minmax(0,1fr)!important;gap:6px 16px!important}' +
      'body:not(#layout) .qcx-avatar,.qcx-avatar{width:80px!important;height:80px!important;min-width:80px!important}' +
      'body:not(#layout) .qcx-hero-title,.qcx-hero-title{font-size:20px!important;line-height:1.2!important}' +
      'body:not(#layout) .qcx-bio,.qcx-bio{font-size:13px!important;line-height:1.4!important}' +
      'body:not(#layout) main.main-container,main.main-container{padding-top:12px!important}' +
      '}' +
      'body:not(#layout) .qcx-avatar,body:not(#layout) .qcx-avatar-wrap,body:not(#layout) .qcx-brand-svg,' +
      '.qcx-avatar,.qcx-avatar-wrap,.qcx-brand-svg{transition:transform .22s ease,filter .22s ease!important}' +
      'body:not(#layout) .qcx-avatar:hover,body:not(#layout) .qcx-avatar:active,' +
      'body:not(#layout) .qcx-avatar-wrap:hover .qcx-avatar,body:not(#layout) .qcx-avatar-wrap:active .qcx-avatar,' +
      'body:not(#layout) .qcx-brand-svg:hover,body:not(#layout) .qcx-brand-svg:active,' +
      '.qcx-avatar:hover,.qcx-avatar:active,.qcx-avatar-wrap:hover .qcx-avatar,.qcx-avatar-wrap:active .qcx-avatar,' +
      '.qcx-brand-svg:hover,.qcx-brand-svg:active{' +
      'transform:none!important;' +
      'filter:none!important}' +
      '.qcx-ghost-eyes,.qcx-eye-socket{pointer-events:none!important}' +
      '.qcx-eye{transform-box:fill-box;transform-origin:center;will-change:transform}' +
      '@keyframes qcx-ghost-blink{0%,100%{transform:scaleY(1)}40%,60%{transform:scaleY(.08)}}' +
      '.qcx-brand-svg.is-blinking .qcx-eye{animation:qcx-ghost-blink .18s ease-in-out 1}' +
      'body#layout .footer-navigation-bar,body#layout #qcx-native-tabbar{display:none!important}';
    var style = document.getElementById('qcx-native-tabbar-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'qcx-native-tabbar-css';
      (document.head || document.documentElement).appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }

  function bindNativeTabbarActions(nav) {
    if (!nav) return;
    var scrollTop = nav.querySelector('.scroll-top');
    if (scrollTop && !scrollTop.getAttribute('data-qcx-bound')) {
      scrollTop.setAttribute('data-qcx-bound', '1');
      scrollTop.addEventListener('click', function(event) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    var openMenu = nav.querySelector('.open-menu');
    if (openMenu && !openMenu.getAttribute('data-qcx-bound')) {
      openMenu.setAttribute('data-qcx-bound', '1');
      openMenu.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!document.getElementById('qcx-menu')) ensureMobileNavReady();
        setMenuOpenState(true);
      }, true);
    }
    var openSearch = nav.querySelector('.open-search');
    if (openSearch && !openSearch.getAttribute('data-qcx-bound')) {
      openSearch.setAttribute('data-qcx-bound', '1');
      openSearch.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (typeof window.qcxOpenSearch === 'function') window.qcxOpenSearch();
        else if (typeof window.__qcxInitMobileNav === 'function') {
          try { window.__qcxInitMobileNav(); } catch (ignoreInit) {}
          if (typeof window.qcxOpenSearch === 'function') window.qcxOpenSearch();
        }
      }, true);
    }
    var share = nav.querySelector('.share-post');
    if (share && !share.getAttribute('data-qcx-bound')) {
      share.setAttribute('data-qcx-bound', '1');
      share.addEventListener('click', function(event) {
        event.preventDefault();
        var url = share.getAttribute('data-share-url') || location.href;
        if (navigator.share) {
          try { navigator.share({ url: url, title: document.title }); } catch (ignoreShare) {}
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).catch(function(){});
        }
      }, true);
    }
  }

  /* Tabbar: Home | Menu | Search | Top/Share | Chat */
  function ensureNativeTabbar() {
    if (isAdminPath()) return;
    ensureNativeTabbarCss();
    var searchLiHtml =
      '<li><a aria-label=\"Tìm kiếm\" class=\"open-search\" href=\"javascript:void(0)\" role=\"button\" title=\"Tìm kiếm\">' +
      '<div class=\"icon\"><svg height=\"22\" viewBox=\"0 0 24 24\" width=\"22\" fill=\"none\"><circle cx=\"11\" cy=\"11\" r=\"7\" stroke=\"currentColor\" stroke-width=\"2.4\"/><path d=\"M16.5 16.5L21 21\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\"/></svg></div>' +
      '<div class=\"title\">Search</div></a></li>';
    var existing = document.getElementById('qcx-native-tabbar') || document.querySelector('.footer-navigation-bar');
    if (existing) {
      /* Ensure Search tab sits between Menu and Top/Share. */
      if (!existing.querySelector('a.open-search')) {
        var menuLi = existing.querySelector('a.open-menu') && existing.querySelector('a.open-menu').closest('li');
        var ul = existing.querySelector('ul');
        if (ul) {
          var holder = document.createElement('div');
          holder.innerHTML = searchLiHtml;
          var searchLi = holder.firstChild;
          if (menuLi && menuLi.nextSibling) ul.insertBefore(searchLi, menuLi.nextSibling);
          else ul.appendChild(searchLi);
        }
      }
      bindNativeTabbarActions(existing);
      return;
    }
    var isHome = location.pathname === '/' || document.documentElement.getAttribute('data-page-type') === 'homepage';
    var isSingle = isSingleArticlePage();
    var homeHref = ((document.querySelector('link[rel=\"canonical\"]') || {}).href) || (location.origin + '/');
    try {
      var u = new URL(homeHref);
      homeHref = u.origin + '/';
    } catch (ignoreUrl) {
      homeHref = location.origin + '/';
    }
    var homeLink = isHome
      ? '<a aria-current=\"page\" class=\"qcx-nav-active\" aria-label=\"Trang chủ\" href=\"' + homeHref + '\" role=\"button\" title=\"Trang chủ\"><div class=\"icon\"><svg height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z\"/></svg></div><div class=\"title\">Home</div></a>'
      : '<a aria-label=\"Trang chủ\" href=\"' + homeHref + '\" role=\"button\" title=\"Trang chủ\"><div class=\"icon\"><svg height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z\"/></svg></div><div class=\"title\">Home</div></a>';
    var thirdFourth = isSingle
      ? '<li><a aria-label=\"Chia sẻ\" class=\"share-post\" data-share-url=\"' + location.href + '\" href=\"javascript:void(0)\" role=\"button\" title=\"Chia sẻ\"><div class=\"icon\"><svg height=\"22\" viewBox=\"0 0 24 24\" width=\"22\"><path d=\"M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z\"/></svg></div><div class=\"title\">Share</div></a></li>' +
        '<li><a aria-label=\"Telegram\" href=\"https://t.me/superkhung\" rel=\"noopener noreferrer\" target=\"_blank\" title=\"Telegram\"><div class=\"icon\"><svg height=\"22\" viewBox=\"0 0 24 24\" width=\"22\"><path d=\"M9.78,18.65L10.06,14.42L17.74,7.5C18.08,7.19 17.67,7.04 17.22,7.31L7.74,13.3L3.64,12C2.76,11.75 2.75,11.14 3.84,10.7L19.81,4.54C20.54,4.21 21.24,4.72 20.96,5.84L18.24,18.65C18.05,19.56 17.5,19.78 16.74,19.36L12.6,16.3L10.61,18.23C10.38,18.46 10.19,18.65 9.78,18.65Z\"/></svg></div><div class=\"title\">Chat</div></a></li>'
      : '<li><a aria-label=\"Lên đầu trang\" class=\"scroll-top\" href=\"javascript:void(0)\" role=\"button\" title=\"Lên đầu\"><div class=\"icon\"><svg height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z\"/></svg></div><div class=\"title\">Top</div></a></li>' +
        '<li><a aria-label=\"Telegram\" href=\"https://t.me/superkhung\" rel=\"noopener noreferrer\" target=\"_blank\" title=\"Telegram\"><div class=\"icon\"><svg height=\"22\" viewBox=\"0 0 24 24\" width=\"22\"><path d=\"M9.78,18.65L10.06,14.42L17.74,7.5C18.08,7.19 17.67,7.04 17.22,7.31L7.74,13.3L3.64,12C2.76,11.75 2.75,11.14 3.84,10.7L19.81,4.54C20.54,4.21 21.24,4.72 20.96,5.84L18.24,18.65C18.05,19.56 17.5,19.78 16.74,19.36L12.6,16.3L10.61,18.23C10.38,18.46 10.19,18.65 9.78,18.65Z\"/></svg></div><div class=\"title\">Chat</div></a></li>';
    var nav = document.createElement('nav');
    nav.id = 'qcx-native-tabbar';
    nav.className = 'footer-navigation-bar qcx-native-tabbar';
    nav.setAttribute('aria-label', 'Điều hướng mobile');
    nav.innerHTML =
      '<div><ul>' +
      '<li>' + homeLink + '</li>' +
      '<li><a aria-label=\"Menu\" class=\"open-menu\" href=\"javascript:void(0)\" role=\"button\" title=\"Menu\"><div class=\"icon\"><svg height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z\"/></svg></div><div class=\"title\">Menu</div></a></li>' +
      searchLiHtml +
      thirdFourth +
      '</ul></div>';
    document.body.appendChild(nav);
    bindNativeTabbarActions(nav);
  }
  window.__qcxEnsureNativeTabbar = ensureNativeTabbar;

  /* Footer nav often missing from live theme — rebuild drawer + wire hamburger. */
  function ensureMobileNavReady() {
    ensureMenuDrawer();
    ensureNativeTabbar();
    var menu = document.getElementById('qcx-menu');
    var menuSearch = document.getElementById('qcx-menu-search');
    /* Refresh search label in-place so users see the mint Search row without full rebuild. */
    if (menuSearch) {
      var searchLabel = menuSearch.querySelector('span:not(.qcx-menu-search-hint)');
      if (!searchLabel) searchLabel = menuSearch.querySelector('span');
      if (searchLabel && !searchLabel.classList.contains('qcx-menu-search-hint')) {
        searchLabel.textContent = 'Tìm kiếm bài viết…';
      }
      menuSearch.setAttribute('aria-label', 'Mở tìm kiếm');
      menuSearch.setAttribute('type', 'button');
      menuSearch.onclick = function (event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        if (typeof window.qcxOpenSearch !== 'function') repairQcxOpenSearch();
        openSearchFallback();
      };
    }
    if (typeof window.qcxOpenSearch !== 'function') repairQcxOpenSearch();
    /* Stale drawer without Search row — tear down and rebuild. */
    if (menu && !menuSearch) {
      try {
        var staleMenu = document.getElementById('qcx-menu');
        var staleBd = document.getElementById('qcx-menu-backdrop');
        if (staleMenu && staleMenu.parentNode) staleMenu.parentNode.removeChild(staleMenu);
        if (staleBd && staleBd.parentNode) staleBd.parentNode.removeChild(staleBd);
      } catch (ignoreStale) {}
      document.documentElement.removeAttribute('data-qcx-nav-ready');
      menu = null;
    }
    if (!menu) {
      if (typeof window.__qcxInitMobileNav === 'function') {
        document.documentElement.removeAttribute('data-qcx-nav-ready');
        try { window.__qcxInitMobileNav(); } catch (ignoreInit) {}
        menu = document.getElementById('qcx-menu');
      }
      if (!menu && !document.getElementById('qcx-mobile-nav-rescue') &&
          !document.querySelector('script[src*="qcx-mobile-nav-runtime.js"]')) {
        document.documentElement.removeAttribute('data-qcx-nav-ready');
        var script = document.createElement('script');
        script.id = 'qcx-mobile-nav-rescue';
        script.src = QCX_CDN + 'qcx-mobile-nav-runtime.js';
        script.async = true;
        (document.head || document.documentElement).appendChild(script);
      }
    }
    /* Desktop: no PC menu FAB — strip leftover button if present. */
    ensureDesktopMenuButton();
    bindMenuCloseControls();
    if (typeof window.__qcxRenderAuthSlots === 'function') {
      try { window.__qcxRenderAuthSlots(); } catch (ignoreAuth) {}
    }
  }

  function ensureDesktopMenuButton() {
    var btn = document.getElementById('qcx-pc-menu-btn');
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
  }
  window.__qcxEnsureMobileNavReady = ensureMobileNavReady;

  /* Mark empty #comments shells so CSS can collapse the leftover pill card. */
  function syncEmptyCommentsShell() {
    var box = document.getElementById('comments') || document.querySelector('.qcx-comments-shell');
    if (!box) return;
    if (box.getAttribute('data-qcx-unlock-chrome') === '1' || box.classList.contains('has-gate') || box.querySelector('.qcx-inline-gate')) {
      box.removeAttribute('data-qcx-comments-empty');
      return;
    }
    var hasReal = !!box.querySelector(
      'iframe, textarea, .comment, #comment-editor, .qcx-comment-list, .qcx-comment-item, .comment-body, .qcx-inline-gate'
    );
    if (hasReal) box.removeAttribute('data-qcx-comments-empty');
    else box.setAttribute('data-qcx-comments-empty', '1');
  }
  window.__qcxSyncEmptyCommentsShell = syncEmptyCommentsShell;

  /* Remove tabindex from any aria-hidden SVG/element to prevent a11y failure */
  function fixAriaHiddenTabindex() {
    try {
      var hiddenEls = document.querySelectorAll('[aria-hidden="true"]');
      Array.prototype.forEach.call(hiddenEls, function(el) {
        if (el.getAttribute('tabindex') === '0') {
          el.setAttribute('tabindex', '-1');
        }
        var focusChildren = el.querySelectorAll('[tabindex="0"]');
        Array.prototype.forEach.call(focusChildren, function(child) {
          child.setAttribute('tabindex', '-1');
        });
      });
    } catch (ignore) {}
  }
  window.__qcxFixAriaHiddenTabindex = fixAriaHiddenTabindex;

  /* Theme often drops .qcx-backdrop / scanline / ghost-blink CSS — restore.
     Skip atmosphere.css on homepage/index — PSI unused-CSS ~42KiB. */
  function ensureAtmosphere() {
    if (!isHomepageView()) {
      ensureStylesheet('qcx-atmosphere', QCX_ATMOSPHERE_CSS);
    }
    ensureRaisedChrome();
    ensureMenuDrawer();
    ensureMobileNavReady();
    polishHeroCta();
    syncEmptyCommentsShell();
    fixAriaHiddenTabindex();
    if (!document.querySelector('.qcx-backdrop')) {
      var backdrop = document.createElement('div');
      backdrop.className = 'qcx-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(backdrop, document.body.firstChild);
    }
    if (!document.querySelector('.qcx-scanline')) {
      var scan = document.createElement('div');
      scan.className = 'qcx-scanline';
      scan.setAttribute('aria-hidden', 'true');
      var after = document.querySelector('.qcx-backdrop');
      if (after && after.nextSibling) document.body.insertBefore(scan, after.nextSibling);
      else document.body.insertBefore(scan, document.body.firstChild);
    }
  }
  window.__qcxEnsureAtmosphere = ensureAtmosphere;

  function ensureGhostEyeSockets(svg) {
    if (!svg) return;
    var eyes = svg.querySelectorAll('.qcx-eye');
    Array.prototype.forEach.call(eyes, function (eye) {
      var prev = eye.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains('qcx-eye-socket')) return;
      var cx = eye.getAttribute('cx');
      var cy = eye.getAttribute('cy');
      var r = parseFloat(eye.getAttribute('r') || '13');
      if (!cx || !cy || !isFinite(r)) return;
      var socket = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      socket.setAttribute('class', 'qcx-eye-socket');
      socket.setAttribute('cx', cx);
      socket.setAttribute('cy', cy);
      socket.setAttribute('r', String(Math.round((r + 3.3) * 10) / 10));
      socket.setAttribute('fill', '#f2f2f2');
      if (eye.parentNode) eye.parentNode.insertBefore(socket, eye);
    });
  }

  function ensureGhostBlink() {
    try {
      if (typeof window.qcxBootGhostBlink === 'function') {
        window.qcxBootGhostBlink();
        document.querySelectorAll('.qcx-brand-svg').forEach(ensureGhostEyeSockets);
        return;
      }
    } catch (ignore) {}
    /* Minimal fallback if carrd-motion/runtime not ready yet. Hover/click only — no auto blink. */
    var nodes = document.querySelectorAll('.qcx-brand-svg');
    if (!nodes.length) return;
    Array.prototype.forEach.call(nodes, function (svg) {
      ensureGhostEyeSockets(svg);
      if (svg.getAttribute('data-qcx-blink-bound')) return;
      svg.setAttribute('data-qcx-blink-bound', '1');
      /* If SVG is aria-hidden, it must NOT be focusable */
      if (svg.getAttribute('aria-hidden') === 'true') {
        svg.removeAttribute('tabindex');
        svg.setAttribute('tabindex', '-1');
      }
      var blinkOnce = function () {
        if (svg.classList.contains('is-blinking')) return;
        svg.classList.remove('is-blinking');
        void svg.offsetWidth;
        svg.classList.add('is-blinking');
        window.setTimeout(function () { svg.classList.remove('is-blinking'); }, 280);
      };
      svg.addEventListener('click', function (e) {
        e.preventDefault();
        blinkOnce();
      });
      svg.addEventListener('pointerenter', blinkOnce);
      var host = svg.closest ? (svg.closest('.qcx-avatar') || svg.closest('.qcx-avatar-wrap')) : null;
      if (host && !host.getAttribute('data-qcx-blink-host')) {
        host.setAttribute('data-qcx-blink-host', '1');
        host.addEventListener('pointerenter', blinkOnce);
      }
    });
  }
  window.__qcxEnsureGhostBlink = ensureGhostBlink;

  /* Related posts rail — 9 items to match homepage batch size. */
  var QCX_TUTORIAL_COUNT = 9;
  var QCX_RELATED_HEADING = 'BÀI VIẾT LIÊN QUAN';

  function isAdminPath() {
    try {
      if (/\/p\/admin\.html$/i.test(location.pathname || '')) return true;
      if (document.documentElement.getAttribute('data-qcx-admin') === '1') return true;
      if (document.getElementById('qcx-admin-root')) return true;
    } catch (ignore) {}
    return false;
  }

  function isSingleArticlePage() {
    var pageType = document.documentElement.getAttribute('data-page-type') || '';
    var pageItem = document.documentElement.getAttribute('data-page-item') || '';
    if (isAdminPath()) return false;
    if (pageType === 'homepage' || pageType === 'index') return false;
    if (pageItem === 'multiple') return false;
    return pageType === 'post' || pageType === 'page' || pageItem === 'single' ||
      !!document.querySelector('.post-body, .item-page');
  }

  /* Blogger Layout often strips theme-added sidebar gadgets. Inject a visible
     Tutorial rail on single posts/pages only — never on homepage. */
  function hideSidebarOnFeed() {
    var sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;
    sidebar.style.setProperty('display', 'none', 'important');
    sidebar.setAttribute('hidden', 'hidden');
    sidebar.setAttribute('aria-hidden', 'true');
    var wrap = document.querySelector('.main-wrapper');
    if (wrap) wrap.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important');
  }

  function showSidebarBesideArticle() {
    var sidebar = document.querySelector('#sidebar');
    var wrap = document.querySelector('.main-wrapper');
    var desktop = false;
    try { desktop = window.matchMedia('(min-width: 861px)').matches; } catch (ignoreMq) {}
    if (wrap) {
      /* Always set both ways — leftover inline 2-col from desktop resize crushes mobile. */
      wrap.style.setProperty(
        'grid-template-columns',
        desktop ? 'minmax(0, 1fr) minmax(220px, 280px)' : 'minmax(0, 1fr)',
        'important'
      );
    }
    if (sidebar) {
      sidebar.style.removeProperty('display');
      sidebar.removeAttribute('hidden');
      sidebar.removeAttribute('aria-hidden');
    }
  }

  /* Mobile: park Tutorial ABOVE #comments (replaces stub “N Nhận xét” slot).
     Settle-once — skip DOM moves when already correct to avoid layout thrash. */
  function placeTutorialBesideLock(rail, sidebar) {
    if (!rail) return;
    var lock = document.querySelector('.qcx-lock-panel:not(.is-done)');
    if (!lock) lock = document.querySelector('.qcx-lock-panel');
    var mobile = false;
    try { mobile = window.matchMedia('(max-width: 860px)').matches; } catch (ignoreMq) {}
    if (mobile) {
      rail.classList.add('qcx-tutorial-inline');
      try {
        var comments = document.getElementById('comments') || document.querySelector('.qcx-comments-shell');
        var postBody = (lock && lock.closest && lock.closest('.post-body')) ||
          document.querySelector('.post-body');
        if (comments && comments.parentNode) {
          /* Prefer: …content/lock → Tutorial → #comments */
          var alreadyAbove = rail.nextElementSibling === comments &&
            rail.parentNode === comments.parentNode;
          if (alreadyAbove) {
            rail.setAttribute('data-qcx-layout-settled', '1');
            return;
          }
          comments.parentNode.insertBefore(rail, comments);
          rail.setAttribute('data-qcx-layout-settled', '1');
        } else if (postBody) {
          if (rail.parentNode === postBody && postBody.lastElementChild === rail) {
            rail.setAttribute('data-qcx-layout-settled', '1');
            return;
          }
          postBody.appendChild(rail);
          rail.setAttribute('data-qcx-layout-settled', '1');
        } else if (lock && lock.parentNode) {
          lock.parentNode.appendChild(rail);
          rail.removeAttribute('data-qcx-layout-settled');
        }
      } catch (ignoreIns) {}
      return;
    }
    rail.classList.remove('qcx-tutorial-inline');
    rail.removeAttribute('data-qcx-layout-settled');
    if (sidebar && rail.parentNode !== sidebar) {
      try { sidebar.appendChild(rail); } catch (ignoreBack) {}
    }
  }

  /* Keep #comments under the article (lock panel + Bình luận mã + form).
     Never park comments inside the related-posts sidebar rail — that shoved
     the white Blogger iframe to the right and hid unlock chrome from view. */
  function placeCommentsInRail(rail) {
    var cmt = document.getElementById('comments') || document.querySelector('.qcx-comments-shell');
    if (!cmt) return;
    if (isAdminPath() || !isSingleArticlePage()) return;
    var stuckInRail = false;
    try {
      stuckInRail =
        cmt.getAttribute('data-qcx-in-rail') === '1' ||
        !!(cmt.closest && cmt.closest('#sidebar, .qcx-sidebar-rail, #qcx-sidebar-rail-rescue, .qcx-tutorial-inline')) ||
        !!(rail && rail.contains && rail.contains(cmt));
    } catch (ignoreStuck) {}
    if (!stuckInRail) return;
    try {
      cmt.removeAttribute('data-qcx-in-rail');
      var end = document.querySelector('.qcx-article-end');
      var theArticle = document.querySelector('#the-article, .the-article');
      var postBody = document.querySelector('.post-body');
      var host =
        (end && end.parentNode) ||
        (theArticle && theArticle.parentNode) ||
        postBody ||
        null;
      if (!host) return;
      if (end && end.parentNode === host) {
        if (end.nextSibling) host.insertBefore(cmt, end.nextSibling);
        else host.appendChild(cmt);
      } else if (theArticle && theArticle.parentNode === host) {
        if (theArticle.nextSibling) host.insertBefore(cmt, theArticle.nextSibling);
        else host.appendChild(cmt);
      } else {
        host.appendChild(cmt);
      }
      cmt.setAttribute('data-qcx-layout-settled', '1');
    } catch (ignorePlaceCmt) {}
  }

  function ensureSidebarRail() {
    /* Admin: never show Tutorial rail — full-width login/composer. */
    if (isAdminPath() || !isSingleArticlePage()) {
      var homeRail = document.querySelector('#qcx-sidebar-rail-rescue, #sidebar .qcx-sidebar-rail, #sidebar #HTML4');
      if (homeRail && homeRail.id === 'qcx-sidebar-rail-rescue' && homeRail.parentNode) {
        homeRail.parentNode.removeChild(homeRail);
      } else if (homeRail && homeRail.classList && homeRail.classList.contains('qcx-sidebar-rail') && homeRail.id === 'qcx-sidebar-rail-rescue') {
        try { homeRail.parentNode.removeChild(homeRail); } catch (ignoreRail) {}
      }
      document.querySelectorAll('#qcx-sidebar-rail-rescue').forEach(function(node){
        try { node.parentNode.removeChild(node); } catch (ignore2) {}
      });
      hideSidebarOnFeed();
      return;
    }
    var sidebar = document.querySelector('#sidebar');
    var wrap = document.querySelector('.main-wrapper') || document.querySelector('main.main-container');
    if (!sidebar && wrap) {
      sidebar = el('aside', 'sidebar qcx-addon-zone qcx-rescue-sidebar');
      sidebar.id = 'sidebar';
      wrap.appendChild(sidebar);
    }
    if (!sidebar) return;
    showSidebarBesideArticle();

    /* Prefer #qcx-sidebar-rail-rescue only — never adopt #HTML4 (causes triple Tutorial on mobile). */
    var mobileRail = false;
    try { mobileRail = window.matchMedia('(max-width: 860px)').matches; } catch (ignoreMq0) {}
    var rail = null;
    var existingRails = document.querySelectorAll('#qcx-sidebar-rail-rescue');
    if (existingRails.length) {
      rail = existingRails[0];
      for (var ri = 1; ri < existingRails.length; ri += 1) {
        try { if (existingRails[ri].parentNode) existingRails[ri].parentNode.removeChild(existingRails[ri]); } catch (ignoreDup0) {}
      }
    }
    if (!rail) {
      /* PC: reuse Layout #HTML4 shell (heading+empty list) and fill feed — do not early-return. */
      if (!mobileRail) {
        var nativeShell = sidebar.querySelector('#HTML4.qcx-sidebar-rail, #HTML4');
        if (nativeShell) {
          var ncs = window.getComputedStyle(nativeShell);
          if (ncs.display !== 'none' && ncs.visibility !== 'hidden') {
            rail = nativeShell;
            if (!rail.classList.contains('qcx-sidebar-rail')) rail.classList.add('qcx-sidebar-rail');
            if (!rail.querySelector('.qcx-latest-list')) {
              var shell = rail.querySelector('.widget-content') || rail;
              if (!rail.querySelector('.qcx-related-heading')) {
                shell.insertAdjacentHTML('afterbegin',
                  '<div aria-level="2" class="qcx-related-heading" role="heading">' + QCX_RELATED_HEADING + '</div>');
              }
              shell.insertAdjacentHTML('beforeend',
                '<ul class="qcx-latest-list" aria-busy="true" aria-label="' + QCX_RELATED_HEADING + '"></ul>');
            }
          }
        }
        if (!rail) {
          var nativeOther = sidebar.querySelector('#PopularPosts2, .widget.PopularPosts');
          if (nativeOther) {
            var ocs = window.getComputedStyle(nativeOther);
            if (ocs.display !== 'none' && ocs.visibility !== 'hidden') return;
          }
        }
      }
      if (!rail) {
        rail = el('div', 'widget HTML qcx-sidebar-rail');
        rail.id = 'qcx-sidebar-rail-rescue';
        rail.innerHTML =
          '<div class="widget-content">' +
          '<div aria-level="2" class="qcx-related-heading" role="heading">' + QCX_RELATED_HEADING + '</div>' +
          '<ul class="qcx-latest-list" aria-busy="true" aria-label="' + QCX_RELATED_HEADING + '"></ul>' +
          '</div>';
        sidebar.appendChild(rail);
      }
    }
    /* Scrub duplicate rescue ids + stray inline clones (not the chosen rail). */
    document.querySelectorAll('#qcx-sidebar-rail-rescue, .post-body > .qcx-sidebar-rail.qcx-tutorial-inline').forEach(function(node) {
      if (node === rail) return;
      try { if (node.parentNode) node.parentNode.removeChild(node); } catch (ignoreDup) {}
    });
    /* Bug#3 fix: dedup ALL sidebar rails — keep only the chosen rail. */
    try {
      document.querySelectorAll(
        '#HTML4, #qcx-sidebar-rail-runtime, [id^="qcx-sidebar-rail-"], .widget.HTML.qcx-sidebar-rail'
      ).forEach(function(node) {
        if (node === rail) return;
        node.style.setProperty('display', 'none', 'important');
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('hidden', 'hidden');
      });
    } catch (ignoreDedupHTML4) {}
    /* Normalize related heading/aria (Tutorial legacy + title-case → uppercase). */
    document.querySelectorAll('.qcx-related-heading').forEach(function(node){
      var cur = text(node.textContent);
      if (!cur || /^tutorial$/i.test(cur) || /bài\s*viết\s*liên\s*quan/i.test(cur)) {
        node.textContent = QCX_RELATED_HEADING;
      }
    });
    document.querySelectorAll('.qcx-latest-list[aria-label]').forEach(function(node){
      var label = node.getAttribute('aria-label') || '';
      if (!label || /^tutorial$/i.test(label) || /bài\s*viết\s*liên\s*quan/i.test(label)) {
        node.setAttribute('aria-label', QCX_RELATED_HEADING);
      }
    });
    /* Mobile: always hide Layout HTML4 / other Tutorial clones when rescue exists.
       Theme skin forces `#sidebar #HTML4{display:block!important}` — reassert inline hide. */
    function hideMobileTutorialClones() {
      try {
        if (!window.matchMedia('(max-width: 860px)').matches) {
          if (sidebar) {
            sidebar.style.removeProperty('display');
            sidebar.removeAttribute('aria-hidden');
          }
          return;
        }
        document.querySelectorAll('#HTML4, #sidebar .qcx-sidebar-rail, .post-body > .qcx-sidebar-rail').forEach(function(node) {
          if (node === rail || node.id === 'qcx-sidebar-rail-rescue') return;
          node.style.setProperty('display', 'none', 'important');
          node.style.setProperty('visibility', 'hidden', 'important');
          node.style.setProperty('height', '0', 'important');
          node.style.setProperty('max-height', '0', 'important');
          node.style.setProperty('overflow', 'hidden', 'important');
          node.style.setProperty('margin', '0', 'important');
          node.style.setProperty('padding', '0', 'important');
          node.setAttribute('hidden', 'hidden');
          node.setAttribute('aria-hidden', 'true');
          node.classList.remove('qcx-tutorial-inline');
          var cloneList = node.querySelector('.qcx-latest-list');
          if (cloneList) {
            cloneList.innerHTML = '';
            cloneList.removeAttribute('data-qcx-rail-ready');
          }
        });
        if (rail && rail.classList.contains('qcx-tutorial-inline') && sidebar) {
          sidebar.style.setProperty('display', 'none', 'important');
          sidebar.setAttribute('aria-hidden', 'true');
        }
      } catch (ignoreHtml4) {}
    }
    if (mobileRail) hideMobileTutorialClones();

    if (window.matchMedia('(min-width: 861px)').matches) {
      var relatedDup = document.querySelector('.qcx-related-smart');
      if (relatedDup) relatedDup.hidden = true;
    }

    /* Mobile: Tutorial above #comments (stub slot). PC: keep in #sidebar.
       Settle-once — short boot reassert only; no MutationObserver thrash. */
    function settleTutorialLayout() {
      showSidebarBesideArticle();
      placeTutorialBesideLock(rail, sidebar);
      hideMobileTutorialClones();
      placeCommentsInRail(rail);
    }
    settleTutorialLayout();
    if (!rail.getAttribute('data-qcx-tutorial-reassert')) {
      rail.setAttribute('data-qcx-tutorial-reassert', '1');
      [300, 1200].forEach(function(ms) {
        window.setTimeout(settleTutorialLayout, ms);
      });
      try {
        var lastMobile = null;
        try { lastMobile = window.matchMedia('(max-width: 860px)').matches; } catch (ignoreMq1) {}
        window.addEventListener('resize', function() {
          var nowMobile = false;
          try { nowMobile = window.matchMedia('(max-width: 860px)').matches; } catch (ignoreMq2) {}
          if (nowMobile === lastMobile) return;
          lastMobile = nowMobile;
          rail.removeAttribute('data-qcx-layout-settled');
          settleTutorialLayout();
        });
        window.addEventListener('qcx:content-unlocked', function() {
          rail.removeAttribute('data-qcx-layout-settled');
          window.setTimeout(settleTutorialLayout, 50);
        });
      } catch (ignoreResize) {}
    }

    var list = rail.querySelector('.qcx-latest-list');
    if (!list || list.getAttribute('data-qcx-rail-ready') === 'true') return;
    list.setAttribute('data-qcx-rail-ready', 'true');

    function normalizeUrl(value) {
      try {
        var parsed = new URL(value || '', location.href);
        parsed.hash = '';
        parsed.search = '';
        return (parsed.origin + parsed.pathname).replace(/\/$/, '').toLowerCase();
      } catch (ignore) {
        return String(value || '').split(/[?#]/)[0].replace(/\/$/, '').toLowerCase();
      }
    }
    function entryHref(entry) {
      var href = '';
      (entry.link || []).forEach(function(link) {
        if (!href && link.rel === 'alternate') href = link.href || '';
      });
      return href;
    }
    function entryTitle(entry) {
      return displayPostTitle(String((entry.title && entry.title.$t) || '').replace(/\s+/g, ' ').trim());
    }
    function entryImage(entry) {
      /* Reuse homepage extractor: body img first, then media$thumbnail. */
      var meta = entryThumbMeta(entry);
      var url = meta && meta.url ? String(meta.url) : '';
      if (!url) return { url: '', raw: '' };
      var raw = url;
      try {
        if (entry['media$thumbnail'] && entry['media$thumbnail'].url) {
          raw = String(entry['media$thumbnail'].url);
        }
      } catch (ignoreRaw) {}
      /* Rail size: square crop (CSS 72×72, object-fit cover). */
      var compact = url
        .replace(/\/w\d+-h\d+-c\//i, '/w320-h320-c/')
        .replace(/=w\d+-h\d+-c(?=$|[/?#])/i, '=w320-h320-c')
        .replace(/\/s\d+-c\//i, '/w320-h320-c/')
        .replace(/=s\d+-c(?=$|[/?#])/i, '=w320-h320-c')
        .replace(/\/s\d+\//i, '/w320-h320-c/')
        .replace(/=s\d+(?=$|[/?#])/i, '=w320-h320-c');
      return { url: compact || url, raw: raw };
    }
    function renderItems(entries) {
      var current = normalizeUrl((document.querySelector('link[rel="canonical"]') || {}).href || location.href);
      var fragment = document.createDocumentFragment();
      var shown = 0;
      entries.forEach(function(entry) {
        if (shown >= QCX_TUTORIAL_COUNT) return;
        var title = entryTitle(entry);
        var href = entryHref(entry);
        if (!title || !href) return;
        if (normalizeUrl(href) === current) return;
        var li = document.createElement('li');
        var thumb = document.createElement('div');
        thumb.className = 'item-thumbnail';
        var thumbLink = document.createElement('a');
        thumbLink.href = href;
        thumbLink.title = title;
        thumbLink.setAttribute('aria-label', title);
        var imageInfo = entryImage(entry);
        var imageUrl = imageInfo.url;
        if (imageUrl) {
          var image = document.createElement('img');
          image.alt = '';
          image.src = imageUrl;
          image.loading = 'lazy';
          image.decoding = 'async';
          image.width = 96;
          image.height = 96;
          image.addEventListener('error', function onThumbErr() {
            var fallback = imageInfo.raw && imageInfo.raw !== image.src ? imageInfo.raw : '';
            if (fallback && !image.getAttribute('data-qcx-thumb-retry')) {
              image.setAttribute('data-qcx-thumb-retry', '1');
              image.src = fallback;
              return;
            }
            image.removeEventListener('error', onThumbErr);
            image.remove();
            thumb.classList.add('no-img');
          });
          thumbLink.appendChild(image);
        } else {
          thumb.classList.add('no-img');
        }
        thumb.appendChild(thumbLink);
        li.appendChild(thumb);
        var titleWrap = document.createElement('div');
        titleWrap.className = 'item-title';
        var titleLink = document.createElement('a');
        titleLink.href = href;
        titleLink.title = title;
        titleLink.textContent = title;
        titleWrap.appendChild(titleLink);
        li.appendChild(titleWrap);
        fragment.appendChild(li);
        shown += 1;
      });
      if (!shown) {
        list.innerHTML = '<li class="qcx-latest-empty">Chưa có bài viết liên quan</li>';
      } else {
        list.innerHTML = '';
        list.appendChild(fragment);
        try { sharpenCardImages(list); } catch (ignoreSharp) {}
      }
      list.removeAttribute('aria-busy');
    }
    function loadFeed(url, done) {
      fetch(url, { credentials: 'same-origin' })
        .then(function(response) {
          if (!response.ok) throw new Error('feed');
          return response.json();
        })
        .then(function(data) {
          done(data && data.feed && data.feed.entry ? data.feed.entry : []);
        })
        .catch(function() { done([]); });
    }
    /* Defer Tutorial feed so it never races the post feed / first paint. */
    function startTutorialFeed() {
      var max = QCX_TUTORIAL_COUNT + 3;
      loadFeed('/feeds/posts/default/-/Tutorial?alt=json&max-results=' + max + '&orderby=published', function(labeled) {
        if (labeled.length) {
          renderItems(labeled);
          return;
        }
        loadFeed('/feeds/posts/default?alt=json&max-results=' + max + '&orderby=published', function(posts) {
          if (posts.length) {
            renderItems(posts);
            return;
          }
          loadFeed('/feeds/pages/default?alt=json&max-results=' + max + '&orderby=published', function(pages) {
            renderItems(pages);
          });
        });
      });
    }
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(startTutorialFeed, { timeout: 1800 });
    } else {
      window.setTimeout(startTutorialFeed, 700);
    }

    /* Prefetch Tutorial targets on hover/touch so the next post opens faster. */
    if (!rail.getAttribute('data-qcx-prefetch')) {
      rail.setAttribute('data-qcx-prefetch', 'true');
      var warmed = Object.create(null);
      function warmLink(href) {
        if (!href || warmed[href]) return;
        warmed[href] = true;
        try {
          var link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = href;
          link.as = 'document';
          document.head.appendChild(link);
        } catch (ignore) {}
      }
      rail.addEventListener('pointerenter', function(event) {
        var a = event.target && event.target.closest ? event.target.closest('a[href]') : null;
        if (a) warmLink(a.href);
      }, true);
      rail.addEventListener('touchstart', function(event) {
        var a = event.target && event.target.closest ? event.target.closest('a[href]') : null;
        if (a) warmLink(a.href);
      }, { capture: true, passive: true });
    }
  }

  /* Noise labels never become topic chips; price noise still feeds the award. */
  var QCX_LABEL_NOISE = /^(bca|themeblogspot)$/i;
  var QCX_LABEL_PRICE = /^(?:\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:đ|d|vnd|k|đồng)?$/i;

  function formatAwardPrice(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    var lower = s.toLowerCase().replace(/\s+/g, '');
    var kMatch = lower.match(/^(\d+(?:[.,]\d+)?)k$/i);
    if (kMatch) {
      var kn = parseFloat(kMatch[1].replace(',', '.'));
      if (!isNaN(kn)) s = String(Math.round(kn * 1000));
    } else {
      s = s.replace(/\s*(đ|d|vnd|đồng)\s*$/i, '');
    }
    var digits = s.replace(/[^\d]/g, '');
    if (!digits) return String(raw || '').trim();
    var n = parseInt(digits, 10);
    if (isNaN(n)) return String(raw || '').trim();
    var withDots = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return withDots + 'đ';
  }

  function parseAwardFromLabel(name) {
    var t = String(name || '').trim();
    if (!t) return null;
    if (/^free$/i.test(t)) return { kind: 'free', text: 'FREE' };
    if (/^vip$/i.test(t)) return { kind: 'vip', text: 'VIP' };
    if (QCX_LABEL_PRICE.test(t) || /^50[.,]?000$/i.test(t)) {
      return { kind: 'price', text: formatAwardPrice(t) };
    }
    return null;
  }

  function isAwardLabelText(name) {
    return !!parseAwardFromLabel(name);
  }

  function pickAward(a, b) {
    /* Priority: free > vip > price (VIP beats price when both paid markers exist). */
    if (!a) return b || null;
    if (!b) return a;
    var rank = { free: 3, vip: 2, price: 1 };
    return (rank[b.kind] || 0) > (rank[a.kind] || 0) ? b : a;
  }

  function cardLabelsWithTutorial(allLabels) {
    var list = (allLabels || []).filter(Boolean);
    var award = null;
    var others = [];
    var hasTutorial = false;
    list.forEach(function(label){
      var name = String(label || '').trim();
      if (!name || QCX_LABEL_NOISE.test(name)) return;
      if (/^tutorial$/i.test(name)) { hasTutorial = true; return; }
      var parsed = parseAwardFromLabel(name);
      if (parsed) {
        award = pickAward(award, parsed);
        return;
      }
      others.push(name);
    });
    var topics = others.slice();
    if (hasTutorial) topics.push('Tutorial');
    /* award = top-left GSAP pill; topics = bottom plugins (+N). */
    return { award: award, topics: topics };
  }

  function awardFromHeader(header) {
    if (!header) return null;
    var el = header.querySelector(':scope > .qcx-card-award');
    if (!el) return null;
    var text = (el.textContent || '').trim();
    if (/qcx-card-award--free/i.test(el.className) || /^free$/i.test(text)) {
      return { kind: 'free', text: text || 'FREE' };
    }
    if (/qcx-card-award--vip/i.test(el.className)) {
      if (/^vip$/i.test(text)) return { kind: 'vip', text: 'VIP' };
      return { kind: 'price', text: text || 'VIP' };
    }
    return parseAwardFromLabel(text);
  }

  function ensureCardAward(header, award) {
    if (!header || !award || !award.kind) return;
    var existing = header.querySelector(':scope > .qcx-card-award');
    var variant = award.kind === 'free' ? 'free' : 'vip'; /* vip + price share SOTW green */
    var cls = 'qcx-card-award qcx-card-award--' + variant;
    var text = award.text || (award.kind === 'free' ? 'FREE' : (award.kind === 'vip' ? 'VIP' : ''));
    if (!text) return;
    if (existing) {
      existing.className = cls;
      existing.textContent = text;
      existing.setAttribute('data-qcx-award', award.kind);
      return;
    }
    var node = document.createElement('span');
    node.className = cls;
    node.textContent = text;
    node.setAttribute('data-qcx-award', award.kind);
    node.setAttribute('aria-hidden', 'true');
    var labels = header.querySelector('.qcx-card-labels');
    if (labels) header.insertBefore(node, labels);
    else header.appendChild(node);
  }

  function ensureCardLabelsWithTutorial(root) {
    try {
      (root || document).querySelectorAll('.qcx-card-labels').forEach(function(wrap){
        /* After GSAP reshape, skip — fit/hover owns the DOM. */
        if (wrap.getAttribute('data-qcx-gsap-labels') === '1') return;
        var links = Array.prototype.slice.call(wrap.querySelectorAll('a'));
        if (!links.length) return;
        var tutorial = null;
        var others = [];
        links.forEach(function(a){
          if (/^tutorial$/i.test((a.textContent || '').trim()) || /\/label\/Tutorial(?:\?|$)/i.test(a.getAttribute('href') || '')) {
            tutorial = a;
          } else {
            others.push(a);
          }
        });
        if (!tutorial) return;
        var more = wrap.querySelector('.qcx-label-more');
        wrap.innerHTML = '';
        /* Keep full label list for +N; CSS still caps visible links at 3. */
        others.forEach(function(a){ wrap.appendChild(a); });
        wrap.appendChild(tutorial);
        if (more) wrap.appendChild(more);
      });
    } catch (err) {}
  }

  /* Beat theme touch-target; keep topic chips + award size stable (GSAP measured). */
  function ensureGsapChipSizeCss() {
    if (document.getElementById('qcx-gsap-chip-size')) return;
    var st = document.createElement('style');
    st.id = 'qcx-gsap-chip-size';
    st.textContent =
      '.card-header .qcx-card-award{' +
      'position:absolute!important;top:.4rem!important;left:.4rem!important;z-index:2!important;' +
      'display:block!important;' +
      'padding:2.4px 8px!important;border-radius:99px!important;border:0!important;' +
      'font-size:11px!important;font-weight:500!important;line-height:14.85px!important;' +
      'letter-spacing:.11px!important;white-space:nowrap!important;' +
      'min-height:0!important;min-width:0!important;margin:0!important;pointer-events:none!important;' +
      'box-shadow:none!important}' +
      '.card-header .qcx-card-award--free{background:rgba(14,16,15,.55)!important;color:rgba(255,252,225,.92)!important;' +
      '-webkit-backdrop-filter:blur(8px)!important;backdrop-filter:blur(8px)!important;' +
      'background-image:none!important}' +
      '.card-header .qcx-card-award--vip{background-image:linear-gradient(114.41deg,rgb(10,228,72) 20.74%,rgb(171,255,132) 65.5%)!important;' +
      'background-color:transparent!important;color:#0e100f!important;' +
      '-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' +
      '.card-header .qcx-card-labels,.all_posts .card-header .qcx-card-labels{' +
      'display:flex!important;flex-wrap:nowrap!important;align-items:center!important;gap:0!important}' +
      '.card-header .qcx-card-labels .qcx-label-mask{align-self:center!important;margin:0!important;padding:0!important}' +
      '.card-header .qcx-card-labels a[rel=tag],' +
      '.card-header .qcx-card-labels .qcx-label-secondary a{' +
      'min-height:0!important;min-width:0!important;height:auto!important;' +
      'padding:.25rem .7rem!important;margin:0!important;' +
      'display:inline-flex!important;align-items:center!important;line-height:1.1!important}' +
      '.card-header .qcx-card-labels .qcx-label-more{' +
      'min-height:0!important;min-width:0!important;height:auto!important;' +
      'padding:.25rem .7rem!important;margin:0 0 0 .35rem!important;' +
      'display:inline-flex!important;align-items:center!important;line-height:1.1!important}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* GSAP filtered-gallery plugins: primary + mask(secondary) + +N; fit never wraps. */
  function ensureGsapCardLabels(root) {
    try {
      ensureGsapChipSizeCss();
      (root || document).querySelectorAll('.card-header .qcx-card-labels, .all_posts .qcx-card-labels').forEach(function(wrap){
        reshapeGsapLabelDom(wrap);
        var card = wrap.closest ? wrap.closest('.card') : null;
        var expanded = !!(card && card.matches && card.matches(':hover'));
        fitGsapLabelMask(wrap, expanded);
      });
    } catch (errMore) {}
  }
  function ensureCardLabelMore(root) { ensureGsapCardLabels(root); }

  function reshapeGsapLabelDom(wrap) {
    if (!wrap) return;
    var header = wrap.closest ? wrap.closest('.card-header') : null;

    function peelAwardLinks(links) {
      var award = null;
      var topics = [];
      var drop = [];
      links.forEach(function(a){
        var t = (a.textContent || '').trim();
        if (QCX_LABEL_NOISE.test(t)) { drop.push(a); return; }
        var parsed = parseAwardFromLabel(t);
        if (parsed) {
          award = pickAward(award, parsed);
          drop.push(a);
          return;
        }
        topics.push(a);
      });
      return { award: award, topics: topics, drop: drop };
    }

    /* Already reshaped: peel leftover FREE/VIP/price chips into top award. */
    if (wrap.getAttribute('data-qcx-gsap-labels') === '1') {
      if (!wrap.querySelector('.qcx-label-more')) {
        var m0 = document.createElement('span');
        m0.className = 'qcx-label-more';
        m0.setAttribute('hidden', 'hidden');
        m0.setAttribute('aria-hidden', 'true');
        wrap.appendChild(m0);
      }
      var peeled0 = peelAwardLinks(Array.prototype.slice.call(wrap.querySelectorAll('a')));
      peeled0.drop.forEach(function(a){ if (a.parentNode) a.parentNode.removeChild(a); });
      ensureCardAward(header, peeled0.award || awardFromHeader(header));
      if (peeled0.drop.length) {
        wrap.removeAttribute('data-qcx-gsap-labels');
        /* fall through and rebuild from remaining topic links */
      } else {
        return;
      }
    }

    var peeled = peelAwardLinks(Array.prototype.slice.call(wrap.querySelectorAll('a')));
    ensureCardAward(header, peeled.award || awardFromHeader(header));
    var topicLinks = peeled.topics;

    if (!topicLinks.length) {
      wrap.innerHTML = '';
      wrap.setAttribute('data-qcx-gsap-labels', '1');
      return;
    }

    var more = wrap.querySelector('.qcx-label-more');
    if (!more) {
      more = document.createElement('span');
      more.className = 'qcx-label-more';
      more.setAttribute('hidden', 'hidden');
      more.setAttribute('aria-hidden', 'true');
    }
    var primary = topicLinks[0];
    var secondaryLinks = topicLinks.slice(1);
    wrap.innerHTML = '';
    wrap.appendChild(primary);
    var mask = document.createElement('div');
    mask.className = 'qcx-label-mask';
    var secondary = document.createElement('div');
    secondary.className = 'qcx-label-secondary';
    secondaryLinks.forEach(function(a){ secondary.appendChild(a); });
    mask.appendChild(secondary);
    wrap.appendChild(mask);
    wrap.appendChild(more);
    wrap.setAttribute('data-qcx-gsap-labels', '1');
  }

  function fitGsapLabelMask(wrap, expanded) {
    var primary = wrap.querySelector(':scope > a');
    var mask = wrap.querySelector(':scope > .qcx-label-mask') || wrap.querySelector('.qcx-label-mask');
    var secondary = mask && mask.querySelector('.qcx-label-secondary');
    var more = wrap.querySelector(':scope > .qcx-label-more') || wrap.querySelector('.qcx-label-more');
    if (!mask || !secondary || !more) return;
    if (!primary) {
      mask.style.setProperty('width', '0px', 'important');
      more.textContent = '';
      more.setAttribute('hidden', 'hidden');
      more.setAttribute('aria-hidden', 'true');
      return;
    }

    var secLinks = Array.prototype.slice.call(secondary.querySelectorAll('a'));
    if (!secLinks.length) {
      mask.style.width = '0px';
      more.textContent = '';
      more.setAttribute('hidden', 'hidden');
      more.setAttribute('aria-hidden', 'true');
      return;
    }

    /* Rest: primary + +N only (matches GSAP showcase). Hover: expand all, hide +. */
    /* Must use setProperty(...'important') — CSS sets width:0 !important on .qcx-label-mask. */
    if (expanded) {
      mask.style.setProperty('width', 'auto', 'important');
      var full = secondary.scrollWidth;
      mask.style.setProperty('width', full + 'px', 'important');
      more.textContent = '';
      more.setAttribute('hidden', 'hidden');
      more.setAttribute('aria-hidden', 'true');
      return;
    }

    mask.style.setProperty('width', '0px', 'important');
    more.textContent = '+' + secLinks.length;
    more.removeAttribute('hidden');
    more.setAttribute('aria-hidden', 'false');
  }

  function bindCardLabelMoreResize() {
    if (document.documentElement.getAttribute('data-qcx-label-fit') === '1') return;
    document.documentElement.setAttribute('data-qcx-label-fit', '1');
    var raf = 0;
    function onResize() {
      if (raf) return;
      raf = window.requestAnimationFrame(function(){
        raf = 0;
        ensureGsapCardLabels(document);
      });
    }
    window.addEventListener('resize', onResize, { passive: true });

    /* Desktop hover: expand secondary mask like GSAP (whole card; skip coarse pointers). */
    if (!window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      function cardOf(node) {
        return node && node.closest ? node.closest('.all_posts .card, .card-header') : null;
      }
      function wrapOf(card) {
        if (!card) return null;
        if (card.classList && card.classList.contains('card-header')) {
          return card.querySelector('.qcx-card-labels');
        }
        var header = card.querySelector('.card-header');
        return (header && header.querySelector('.qcx-card-labels')) || card.querySelector('.qcx-card-labels');
      }
      document.addEventListener('pointerover', function(ev){
        var card = cardOf(ev.target);
        var from = cardOf(ev.relatedTarget);
        if (!card || card === from) return;
        var wrap = wrapOf(card);
        if (!wrap) return;
        reshapeGsapLabelDom(wrap);
        fitGsapLabelMask(wrap, true);
      }, true);
      document.addEventListener('pointerout', function(ev){
        var card = cardOf(ev.target);
        var to = cardOf(ev.relatedTarget);
        if (!card || card === to) return;
        var wrap = wrapOf(card);
        if (!wrap) return;
        fitGsapLabelMask(wrap, false);
      }, true);
    }
  }

  function cardFromEntry(entry, index) {
    var fullTitle = (entry.title && entry.title.$t) || 'Bài viết';
    var title = displayPostTitle(fullTitle);
    var href = entryLink(entry) || '/';
    var packed = cardLabelsWithTutorial(entryLabels(entry));
    var award = packed && packed.award;
    var topics = (packed && packed.topics) || [];
    var meta = entryThumbMeta(entry);
    var thumb = meta.url;
    var highPrio = index === 0;
    var col = el('div', 'col-md-4');
    var media = thumb
      ? ('<img class="qcx-card-media' + (highPrio ? ' qcx-card-lcp' : '') + '" alt="' + escapeHtml(title) + '"' +
        (meta.anim ? ' data-qcx-anim="1"' : '') +
        (highPrio
          ? ' loading="eager" fetchpriority="high" decoding="async"'
          : ' loading="lazy" decoding="async" fetchpriority="low"') +
        ' src="' + escapeHtml(thumb) + '" width="720" height="405" sizes="(max-width:820px) 100vw, 33vw"/>')
      : '<span class="qcx-card-noimg" aria-hidden="true">// no image</span>';
    var awardHtml = '';
    if (award && award.kind && award.text) {
      var awardVariant = award.kind === 'free' ? 'free' : 'vip';
      awardHtml =
        '<span class="qcx-card-award qcx-card-award--' + awardVariant +
        '" data-qcx-award="' + escapeHtml(award.kind) +
        '" aria-hidden="true">' + escapeHtml(award.text) + '</span>';
    }
    var labelHtml = '';
    if (topics.length) {
      var primary = '<a href="/search/label/' + encodeURIComponent(topics[0]) + '" rel="tag">' + escapeHtml(topics[0]) + '</a>';
      var sec = topics.slice(1).map(function(label){
        return '<a href="/search/label/' + encodeURIComponent(label) + '" rel="tag">' + escapeHtml(label) + '</a>';
      }).join('');
      labelHtml =
        '<div class="qcx-card-labels" data-qcx-gsap-labels="1">' + primary +
        '<div class="qcx-label-mask"><div class="qcx-label-secondary">' + sec + '</div></div>' +
        '<span class="qcx-label-more" hidden="hidden" aria-hidden="true"></span></div>';
    }
    col.innerHTML =
      '<article class="card">' +
      '<div class="card-header">' +
      '<a href="' + escapeHtml(href) + '" title="' + escapeHtml(fullTitle) + '">' + media + '</a>' +
      awardHtml +
      labelHtml +
      '</div>' +
      '<div class="card-content">' +
      '<h2 class="title"><a href="' + escapeHtml(href) + '" title="' + escapeHtml(fullTitle) + '">' + escapeHtml(title) + '</a></h2>' +
      '</div><div class="card-footer"></div></article>';
    return col;
  }

  function updateMacPath(title) {
    var path = document.querySelector('.qcx-mt-path');
    if (!path) return;
    var slug = text(title).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-').slice(0, 4).join('-') || 'article';
    path.textContent = 'post/' + slug;
    path.title = title || 'article';
  }

  function renderSinglePost(main, entry) {
    var fullTitle = (entry.title && entry.title.$t) || document.title || 'Bài viết';
    var title = displayPostTitle(fullTitle);
    var labels = entryLabels(entry);
    var published = (entry.published && entry.published.$t) || '';
    var sanitized = sanitizePostHtml((entry.content && entry.content.$t) || (entry.summary && entry.summary.$t) || '');
    var content = (sanitized && typeof sanitized === 'object') ? (sanitized.html || '') : String(sanitized || '');
    var adminScripts = (sanitized && typeof sanitized === 'object') ? (sanitized.scripts || []) : [];
    var isAdmin = !!(sanitized && sanitized.isAdmin) || /\/p\/admin\.html$/i.test(pathOf(location.href));
    var labelHtml = labels.map(function(label){
      return '<a href="/search/label/' + encodeURIComponent(label) + '" rel="tag">' + escapeHtml(label) + '</a>';
    }).join('');
    var shell = el('div', 'widget Blog qcx-rescue-blog qcx-rescue-single qcx-feed-in' + (isAdmin ? ' qcx-admin-rescue' : ''));
    shell.id = 'Blog1';
    var article = el('article', 'post-item');
    var entryPostId = postIdOf(entry);
    if (entryPostId) article.setAttribute('data-post-id', entryPostId);
    article.innerHTML =
      '<div class="the-article" id="the-article"' + (entryPostId ? ' data-post-id="' + escapeHtml(entryPostId) + '"' : '') + '>' +
      '<header class="post-header"' + (published ? ' data-published="' + escapeHtml(published) + '"' : '') + '>' +
      '<h1 class="post-title">' + escapeHtml(title) + '</h1>' +
      '</header>' +
      (labelHtml ? '<div class="post-labels" style="display:none!important">' + labelHtml + '</div>' : '') +
      '<div class="post-body">' + content + '</div>' +
      '</div>';
    shell.appendChild(article);
    main.appendChild(shell);
    updateMacPath(fullTitle);
    document.title = fullTitle;

    /* Clean any legacy .commentForm.spinner stub; qcx-secure-resource mounts #comments cleanly. */
    if (!isAdmin) {
      try {
        var existingCmt = document.getElementById('comments');
        if (existingCmt) {
          if (!existingCmt.classList.contains('qcx-comments-shell')) {
            existingCmt.classList.add('qcx-comments-shell');
          }
          Array.prototype.slice.call(existingCmt.querySelectorAll('.commentForm, .spinner, #comment-editor-src')).forEach(function(n){
            try { if (n.parentNode) n.parentNode.removeChild(n); } catch (ignoreRm) {}
          });
        }
      } catch (ignoreCmt) {}
    }

    if (isAdmin) {
      try {
        document.documentElement.setAttribute('data-qcx-admin', '1');
        document.documentElement.setAttribute('data-qcx-unlocked', '1');
        /* Unwrap any lock shell that may be baked into the pages feed HTML. */
        article.querySelectorAll('.qcx-lock-panel').forEach(function(node){
          try { node.remove(); } catch (err) { node.style.display = 'none'; }
        });
        article.querySelectorAll('.qcx-content-unlock, [data-qcx-unhidden]').forEach(function(node){
          node.hidden = false;
          node.classList.add('is-open');
          node.style.removeProperty('display');
          node.style.setProperty('display', 'block', 'important');
        });
      } catch (ignoreAdmin) {}
    }
    if (adminScripts.length) {
      window.setTimeout(function(){ rehydrateAdminScripts(adminScripts); }, 0);
    }
  }

  var QCX_HOME_PAGE_SIZE = 9;
  var QCX_HOME_FEED_BATCH = 27;

  function isStrictHomepage() {
    var pageType = document.documentElement.getAttribute('data-page-type') || '';
    if (pageType === 'homepage' || pageType === 'index') return true;
    var path = location.pathname || '/';
    return path === '/' || path === '';
  }

  var __qcxCardRevealObs = null;

  function ensureHomepageCardReveal(root) {
    try {
      if (document.documentElement.getAttribute('data-page-item') === 'single') return;
      var pageType = document.documentElement.getAttribute('data-page-type') || '';
      if (pageType === 'post' || pageType === 'page') return;
      var scope = root || document;
      var cards = scope.querySelectorAll(
        '.qcx-rescue-blog .all_posts .card, .all_posts .card, [data-page-item="multiple"] .card'
      );
      if (!cards.length) return;

      var reduce = false;
      try {
        reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      } catch (ignoreMq) {}

      if (reduce) {
        Array.prototype.forEach.call(cards, function(card){
          card.classList.add('qcx-reveal', 'is-in');
        });
        return;
      }

      if (!__qcxCardRevealObs && typeof IntersectionObserver === 'function') {
        __qcxCardRevealObs = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if (!entry.isIntersecting) return;
            var node = entry.target;
            node.classList.add('is-in');
            try { __qcxCardRevealObs.unobserve(node); } catch (ignoreUn) {}
          });
        }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      }

      /* Avoid sync layout reads (PSI forced-reflow) — first 3 cards paint in; rest via IO.
         Never put qcx-reveal (opacity:0) on the LCP card — delayed LCP paint ~3s. */
      Array.prototype.forEach.call(cards, function(card, idx){
        if (card.classList.contains('is-in')) return;
        if (idx === 0 || card.querySelector('img.qcx-card-lcp')) {
          card.classList.add('is-in');
          card.classList.remove('qcx-reveal');
          return;
        }
        card.classList.add('qcx-reveal');
        if (idx < 3 || !__qcxCardRevealObs) {
          card.classList.add('is-in');
        } else {
          __qcxCardRevealObs.observe(card);
        }
      });
    } catch (ignoreReveal) {}
  }

  function prioritizeHomepageLcpImages(row) {
    try {
      /* Only hide leftover shells — absorbed SSR is already #Blog1.qcx-rescue-blog (LCP tree intact). */
      removeSsrLcpShell();
      /* Always rank against the real homepage grid — never per-card (that made every img LCP/eager).
         #Blog1 may BE .all_posts (SSR absorb) OR wrap .all_posts (fresh rescue). */
      var scope = (row && row.querySelectorAll) ? row : document;
      var imgs = scope.querySelectorAll(
        '#Blog1 .card-header img.qcx-card-media, #Blog1 .card-header img, #Blog1 img.qcx-card-media,' +
        '#Blog1 .all_posts .card-header img.qcx-card-media, #Blog1 .all_posts .card-header img,' +
        '.widget.Blog.qcx-rescue-blog .card-header img.qcx-card-media, .widget.Blog.qcx-rescue-blog .card-header img,' +
        '.widget.Blog.qcx-rescue-blog .all_posts .card-header img, .widget.Blog.qcx-rescue-blog .all_posts img.qcx-card-media'
      );
      if (!imgs.length) {
        imgs = document.querySelectorAll(
          '.all_posts .card-header img.qcx-card-media, .all_posts .card-header img, .all_posts img.qcx-card-media'
        );
      }
      Array.prototype.forEach.call(imgs, function(img, index){
        /* Absorbed SSR keeps id Blog1 — do not skip its LCP img. */
        var dataSrc = img.getAttribute('data-src') || '';
        var srcAttr = img.getAttribute('src') || '';
        /* Rewrite legacy wsrv.nl / catbox full JPGs before ranking. */
        if (/wsrv\.nl|files\.catbox\.moe/i.test(srcAttr + dataSrc)) {
          var proxied = toCardWebp(srcAttr || dataSrc);
          if (proxied) {
            srcAttr = proxied;
            dataSrc = '';
            img.removeAttribute('data-src');
            img.src = proxied;
          }
        }
        var raw = (dataSrc && dataSrc.indexOf('data:') !== 0) ? dataSrc
          : ((srcAttr && srcAttr.indexOf('data:') !== 0) ? srcAttr : '');
        var anim = img.getAttribute('data-qcx-anim') === '1' || isLikelyAnimatedUrl(raw || srcAttr || dataSrc);
        var next = raw ? upgradeThumb(raw, { anim: anim, card: true }) : '';
        img.setAttribute('decoding', 'async');
        img.setAttribute('width', img.getAttribute('width') || '720');
        img.setAttribute('height', img.getAttribute('height') || '405');
        if (!img.getAttribute('sizes')) {
          img.setAttribute('sizes', '(max-width:820px) 100vw, 33vw');
        }
        /* Only the first card competes for LCP — rest stay lazy to cut mobile payload. */
        if (index === 0) {
          img.setAttribute('loading', 'eager');
          img.setAttribute('fetchpriority', 'high');
          try { img.fetchPriority = 'high'; } catch (ignoreFpHigh) {}
          img.classList.add('qcx-card-lcp');
          /* Never involve lazysizes on LCP — opacity:0/.lazyloaded fade delayed LCP ~300ms+ and CLS. */
          try {
            img.classList.remove('lazyload', 'lazyloading', 'lazyloaded');
            img.removeAttribute('data-src');
            img.removeAttribute('data-sizes');
          } catch (ignoreCls) {}
          var curSrc = img.getAttribute('src') || img.currentSrc || '';
          /* Keep preloaded SSR hero WebP — swapping src invalidates head preload + delays LCP. */
          if (next && !/\/images\/hero\/card\/[^/?#]+\.webp/i.test(curSrc)) {
            img.src = next;
            curSrc = next;
          }
          try {
            var href = curSrc || next || '';
            if (href && href.indexOf('data:') !== 0) {
              var old = document.getElementById('qcx-lcp-preload');
              if (old) {
                var oldHref = old.getAttribute('href') || '';
                if (oldHref === href) return;
                /* Update href in place — do not delete/recreate (LCP discovery churn). */
                old.setAttribute('href', href);
                old.setAttribute('fetchpriority', 'high');
                if (/\.webp(?:$|[?#])/i.test(href)) old.type = 'image/webp';
              } else {
                var link = document.createElement('link');
                link.id = 'qcx-lcp-preload';
                link.rel = 'preload';
                link.as = 'image';
                link.href = href;
                link.setAttribute('fetchpriority', 'high');
                if (/\.webp(?:$|[?#])/i.test(href)) link.type = 'image/webp';
                (document.head || document.documentElement).appendChild(link);
              }
            }
          } catch (ignorePre) {}
          return;
        }
        img.setAttribute('loading', 'lazy');
        img.setAttribute('fetchpriority', 'low');
        img.classList.remove('qcx-card-lcp');
        if (!raw || raw.indexOf('data:') === 0) return;
        if (next && next !== raw) {
          if (dataSrc && dataSrc.indexOf('data:') !== 0) {
            img.setAttribute('data-src', next);
            if (srcAttr && srcAttr.indexOf('data:') !== 0) {
              img.setAttribute('src', next);
            }
          } else if (srcAttr && srcAttr.indexOf('data:') !== 0) {
            img.setAttribute('src', next);
          }
        }
      });
    } catch (ignoreLcp) {}
  }

  function polishHomepageCards(row) {
    cleanCardSnippets(row);
    stripDomPostTitles(row);
    ensureCardLabelsWithTutorial(row);
    ensureGsapCardLabels(row);
    prioritizeHomepageLcpImages(row || document);
    /* Re-scrub after theme applyImages (may inject legacy wsrv/catbox late). */
    try {
      [700, 1600, 3600].forEach(function(ms){
        window.setTimeout(function(){ prioritizeHomepageLcpImages(document); }, ms);
      });
    } catch (ignoreScrub) {}
    ensureHomepageCardReveal(row || document);
    var scope = row || document;
    var needsLabelFit = false;
    try {
      needsLabelFit = !!scope.querySelector(
        '.qcx-card-labels:not([data-qcx-gsap-labels=\"1\"]), .card-content a[rel=tag]'
      ) && !scope.querySelector('.qcx-card-labels[data-qcx-gsap-labels=\"1\"] .qcx-label-mask');
    } catch (ignoreNeed) {}
    if (!needsLabelFit) return;
    window.setTimeout(function(){
      ensureCardLabelsWithTutorial(row);
      ensureGsapCardLabels(row);
      try {
        var cards = scope.querySelectorAll('.card');
        cards.forEach(function(card){ card.style.minHeight = ''; card.style.height = ''; });
      } catch (err) {}
    }, 40);
  }

  function fetchHomepageFeedPage(startIndex, maxResults) {
    var start = Math.max(1, startIndex | 0);
    var max = Math.max(1, maxResults | 0);
    return fetchJson('/feeds/posts/summary?alt=json&max-results=' + max + '&start-index=' + start).then(function(payload){
      var feed = payload && payload.feed;
      return {
        entries: (feed && feed.entry) || [],
        total: parseInt((feed && feed['openSearch$totalResults'] && feed['openSearch$totalResults'].$t) || '0', 10) || 0
      };
    });
  }

  function mountHomeLoadMore(pager, pagerInner, opts) {
    var loading = false;
    function paintButton() {
      pagerInner.innerHTML = '';
      if (!opts.hasMore()) {
        try { pager.style.setProperty('display', 'none', 'important'); } catch (err) { pager.style.display = 'none'; }
        return;
      }
      try { pager.style.removeProperty('display'); } catch (err2) { pager.style.display = ''; }
      var more = el('button', 'older-link theme-button qcx-load-more', 'Xem thêm');
      more.type = 'button';
      more.disabled = loading;
      more.addEventListener('click', function(){
        if (loading) return;
        loading = true;
        more.disabled = true;
        more.textContent = 'Đang tải…';
        Promise.resolve(opts.loadMore()).catch(function(){ return false; }).then(function(){
          loading = false;
          paintButton();
        });
      });
      pagerInner.appendChild(more);
    }
    paintButton();
    return { refresh: paintButton };
  }

  function renderHomepage(main, entries) {
    var PAGE_SIZE = QCX_HOME_PAGE_SIZE;
    ensureHero(main);
    /* SSR absorb: rename id + append sibling cards only.
       NEVER rebuild .all_posts/.row around the LCP <img> (that was LCP 3.6s + CLS 0.12). */
    var ssr = document.getElementById('qcx-ssr-lcp-shell');
    var existing = document.getElementById('Blog1');
    var shell = null;
    var row = null;
    var keptFirstCol = null;
    var keptLcpImg = null;
    var absorbed = false;

    function adoptShell(node) {
      if (!node) return false;
      shell = node;
      if (shell.id !== 'Blog1') shell.id = 'Blog1';
      /* Keep .all_posts if present — only add rescue markers (no className wipe). */
      shell.classList.add('widget', 'Blog', 'qcx-rescue-blog');
      shell.removeAttribute('data-qcx-ssr');
      row = shell.querySelector(':scope > .row');
      if (!row) {
        var ap = shell.querySelector(':scope > .all_posts') || shell.querySelector('.all_posts');
        row = ap ? (ap.querySelector(':scope > .row') || ap.querySelector('.row')) : null;
      }
      if (!row) {
        row = el('div', 'row');
        shell.insertBefore(row, shell.firstChild);
      }
      keptFirstCol = row.querySelector(':scope > .col-md-4, :scope > div');
      keptLcpImg = keptFirstCol && keptFirstCol.querySelector(
        'img.qcx-card-lcp, .card-header img, img.qcx-card-media'
      );
      Array.prototype.slice.call(row.children).forEach(function(child){
        if (child !== keptFirstCol) {
          try { child.remove(); } catch (ignoreChild) {}
        }
      });
      shell.querySelectorAll('.nav-pagination, .qcx-pager, .qcx-rescue-pager').forEach(function(p){
        try { p.remove(); } catch (ignorePager) {}
      });
      document.querySelectorAll('#Blog1, .qcx-rescue-blog, #qcx-ssr-lcp-shell').forEach(function(node2){
        if (node2 !== shell) {
          try { node2.remove(); } catch (ignoreDup) {}
        }
      });
      absorbed = true;
      return true;
    }

    if (ssr) {
      adoptShell(ssr);
    } else if (existing && existing.classList && existing.classList.contains('qcx-rescue-blog')) {
      adoptShell(existing);
    }

    if (!shell) {
      shell = el('div', 'widget Blog qcx-rescue-blog');
      shell.id = 'Blog1';
      var allPosts = el('div', 'all_posts');
      row = el('div', 'row');
      allPosts.appendChild(row);
      shell.appendChild(allPosts);
      main.appendChild(shell);
    }

    var pagerHost = row.parentNode || shell;
    var pager = el('div', 'nav-pagination qcx-pager qcx-rescue-pager');
    pager.style.cssText = 'clear:both!important;float:none!important;width:100%!important;padding-top:40px!important;margin-bottom:40px!important;text-align:center!important;display:block!important;';
    var pagerInner = el('div', 'blog-pager');
    pager.appendChild(pagerInner);
    pagerHost.appendChild(pager);
    if (!absorbed && shell.parentNode !== main) main.appendChild(shell);

    if (!entries.length) {
      if (!keptFirstCol) row.appendChild(el('p', 'qcx-rescue-status', 'Chưa có bài viết để hiển thị.'));
      pager.style.display = 'none';
      return;
    }

    var pool = entries.slice();
    var shown = 0;
    var totalResults = Math.max(pool.length, 0);
    var exhausted = false;
    var controls = null;

    function syncKeptFirstCard(entry) {
      if (!keptFirstCol || !entry) return;
      try {
        var fullTitle = (entry.title && entry.title.$t) || '';
        var title = displayPostTitle(fullTitle) || fullTitle;
        var href = entryLink(entry) || '/';
        keptFirstCol.querySelectorAll('a[href]').forEach(function(a){
          a.setAttribute('href', href);
          if (fullTitle) a.setAttribute('title', fullTitle);
        });
        var titleA = keptFirstCol.querySelector('.title a, h2 a');
        if (titleA) titleA.textContent = title;
        if (keptLcpImg) {
          keptLcpImg.classList.add('qcx-card-media', 'qcx-card-lcp');
          keptLcpImg.setAttribute('loading', 'eager');
          keptLcpImg.setAttribute('fetchpriority', 'high');
          keptLcpImg.setAttribute('decoding', 'sync');
          try { keptLcpImg.fetchPriority = 'high'; } catch (ignoreFp) {}
          if (title) keptLcpImg.alt = title;
          /* Never swap LCP src on absorb — head preload + SSR bytes already won. */
        }
      } catch (ignoreSync) {}
      keptFirstCol = null;
      keptLcpImg = null;
    }

    function pathKey(u) {
      try {
        var a = document.createElement('a');
        a.href = u || '';
        return (a.pathname || '').replace(/\/+$/, '') || '/';
      } catch (ignorePk) {
        return String(u || '');
      }
    }

    function findEntryForKeptCard() {
      if (!keptFirstCol || !pool.length) return pool[0] || null;
      var anchor = keptFirstCol.querySelector('a[href]');
      var want = pathKey(anchor && anchor.getAttribute('href'));
      if (!want || want === '/') return pool[0] || null;
      for (var i = 0; i < pool.length; i++) {
        if (pathKey(entryLink(pool[i])) === want) return pool[i];
      }
      return pool[0] || null;
    }

    function appendNext() {
      var slice = pool.slice(shown, shown + PAGE_SIZE);
      var matched = null;
      var matchedId = '';
      if (shown === 0 && (keptFirstCol || keptLcpImg)) {
        matched = findEntryForKeptCard();
        matchedId = (matched && matched.id && matched.id.$t) || '';
        syncKeptFirstCard(matched);
      }
      slice.forEach(function(entry, i){
        var index = shown + i;
        var id = (entry && entry.id && entry.id.$t) || '';
        if (matchedId && id && id === matchedId) return;
        if (index === 0 && matched && !matchedId) return;
        row.appendChild(cardFromEntry(entry, index === 0 && matched ? 1 : index));
      });
      shown += slice.length;
      polishHomepageCards(row);
      return slice.length;
    }

    function hasMore() {
      if (shown < pool.length) return true;
      if (exhausted) return false;
      if (totalResults > 0) return shown < totalResults;
      return true;
    }

    function loadMore() {
      if (shown < pool.length) {
        appendNext();
        return Promise.resolve(true);
      }
      return fetchHomepageFeedPage(shown + 1, PAGE_SIZE).then(function(page){
        totalResults = Math.max(totalResults, page.total || 0);
        if (!page.entries.length) {
          exhausted = true;
          return false;
        }
        var known = {};
        pool.forEach(function(entry){ known[(entry && entry.id && entry.id.$t) || ''] = true; });
        page.entries.forEach(function(entry){
          var id = (entry && entry.id && entry.id.$t) || '';
          if (id && known[id]) return;
          known[id] = true;
          pool.push(entry);
        });
        if (!appendNext()) exhausted = true;
        if (page.entries.length < PAGE_SIZE || (totalResults > 0 && shown >= totalResults)) exhausted = true;
        return true;
      }).catch(function(){
        exhausted = true;
        return false;
      });
    }

    appendNext();
    controls = mountHomeLoadMore(pager, pagerInner, { hasMore: hasMore, loadMore: loadMore });
    fetchHomepageFeedPage(1, 1).then(function(page){
      totalResults = Math.max(totalResults, page.total || 0);
      if (totalResults > 0 && shown >= totalResults) exhausted = true;
      if (controls && controls.refresh) controls.refresh();
    }).catch(function(){});
  }

  function removeSsrLcpShell() {
    try {
      /* After renderHomepage, SSR node becomes #Blog1 — do not touch it.
         Any true leftover shell: hide without collapsing siblings (visibility). */
      document.querySelectorAll('#qcx-ssr-lcp-shell, .qcx-ssr-lcp-shell').forEach(function(node){
        if (!node || !node.parentNode) return;
        if (node.id === 'Blog1' || (node.classList && node.classList.contains('qcx-rescue-blog'))) return;
        try {
          node.classList.add('is-done');
          node.setAttribute('aria-hidden', 'true');
          node.style.cssText =
            'visibility:hidden!important;pointer-events:none!important;' +
            'position:absolute!important;inset:0!important;z-index:0!important;' +
            'width:100%!important;height:auto!important;overflow:hidden!important;margin:0!important';
        } catch (ignoreHide) {
          try { node.setAttribute('hidden', 'hidden'); } catch (ignoreDup) {}
        }
      });
      var early = document.getElementById('qcx-early-lcp-img');
      if (early && early.parentNode) early.parentNode.removeChild(early);
    } catch (ignoreShell) {}
  }

  function adoptSsrLcpIntoNative(row) {
    /* Move SSR LCP <img> into Blog1 first card — replaceChild keeps node in the document. */
    try {
      var ssr = document.getElementById('qcx-ssr-lcp-shell');
      if (!ssr || !row) return;
      var ssrImg = ssr.querySelector('img.qcx-card-lcp, .card-header img, img.qcx-card-media');
      var nativeImg = row.querySelector('.col-md-4 img.qcx-card-media, .col-md-4 .card-header img, .card-header img, img.qcx-card-media');
      if (!ssrImg || !nativeImg || !nativeImg.parentNode || ssrImg === nativeImg) return;
      ssrImg.classList.add('qcx-card-media', 'qcx-card-lcp');
      ssrImg.setAttribute('loading', 'eager');
      ssrImg.setAttribute('fetchpriority', 'high');
      try { ssrImg.fetchPriority = 'high'; } catch (ignoreFp) {}
      if (nativeImg.alt) ssrImg.alt = nativeImg.alt;
      nativeImg.parentNode.replaceChild(ssrImg, nativeImg);
    } catch (ignoreAdopt) {}
  }

  function enhanceNativeHomepageFeed() {
    if (!isStrictHomepage()) return;
    var native = document.querySelector('.widget.Blog:not(.qcx-rescue-blog):not(.qcx-rescue-skel)');
    if (!native || native.getAttribute('data-qcx-home-more') === '1') return;
    var row = native.querySelector('.all_posts > .row');
    if (!row) return;
    var cols = Array.prototype.slice.call(row.children).filter(function(node){
      return node && node.nodeType === 1 && (
        (node.classList && node.classList.contains('col-md-4')) ||
        (node.querySelector && node.querySelector('.card, .title'))
      );
    });
    if (!cols.length) return;
    adoptSsrLcpIntoNative(row);
    removeSsrLcpShell();
    clearReloadHide();
    native.setAttribute('data-qcx-home-more', '1');
    polishHomepageCards(row);

    var PAGE_SIZE = QCX_HOME_PAGE_SIZE;
    var hidden = [];
    cols.forEach(function(col, index){
      if (index < PAGE_SIZE) return;
      hidden.push(col);
      try { col.remove(); } catch (err) { col.style.display = 'none'; }
    });

    native.querySelectorAll('.nav-pagination, .blog-pager').forEach(function(node){
      try { node.style.setProperty('display', 'none', 'important'); } catch (ignorePager) {}
    });

    var pager = el('div', 'nav-pagination qcx-pager qcx-home-pager');
    pager.style.cssText = 'grid-column:1/-1!important;width:100%!important;margin:40px 0 40px!important;text-align:center!important;';
    var pagerInner = el('div', 'blog-pager');
    pager.appendChild(pagerInner);
    (native.querySelector('.all_posts') || native).appendChild(pager);

    var shown = Math.min(cols.length, PAGE_SIZE);
    var exhausted = false;
    var totalResults = 0;
    var controls = null;

    function hasMore() {
      if (hidden.length) return true;
      if (exhausted) return false;
      if (totalResults > 0) return shown < totalResults;
      return true;
    }

    function revealHidden() {
      var n = 0;
      while (n < PAGE_SIZE && hidden.length) {
        row.appendChild(hidden.shift());
        n += 1;
        shown += 1;
      }
      polishHomepageCards(row);
      return n;
    }

    function loadMore() {
      if (hidden.length) {
        revealHidden();
        return Promise.resolve(true);
      }
      return fetchHomepageFeedPage(shown + 1, PAGE_SIZE).then(function(page){
        totalResults = Math.max(totalResults, page.total || 0);
        if (!page.entries.length) {
          exhausted = true;
          return false;
        }
        page.entries.forEach(function(entry, i){
          row.appendChild(cardFromEntry(entry, shown + i));
        });
        shown += page.entries.length;
        polishHomepageCards(row);
        if (page.entries.length < PAGE_SIZE || (totalResults > 0 && shown >= totalResults)) exhausted = true;
        return true;
      }).catch(function(){
        exhausted = true;
        return false;
      });
    }

    controls = mountHomeLoadMore(pager, pagerInner, { hasMore: hasMore, loadMore: loadMore });
    function syncTotals() {
      return fetchHomepageFeedPage(1, 1).then(function(page){
        totalResults = Math.max(totalResults, page.total || 0);
        if (totalResults > 0 && shown >= totalResults) exhausted = true;
        if (controls && controls.refresh) controls.refresh();
      }).catch(function(){});
    }
    function fillInitialPage() {
      if (shown >= PAGE_SIZE || exhausted) return Promise.resolve();
      var need = PAGE_SIZE - shown;
      return fetchHomepageFeedPage(shown + 1, need).then(function(page){
        totalResults = Math.max(totalResults, page.total || 0);
        if (!page.entries.length) {
          exhausted = true;
          return;
        }
        page.entries.forEach(function(entry, i){
          row.appendChild(cardFromEntry(entry, shown + i));
        });
        shown += page.entries.length;
        polishHomepageCards(row);
        if (page.entries.length < need || (totalResults > 0 && shown >= totalResults)) exhausted = true;
      }).catch(function(){});
    }
    syncTotals().then(fillInitialPage).then(function(){
      if (controls && controls.refresh) controls.refresh();
    });
  }

  function postIdOf(entry) {
    var id = (entry && entry.id && entry.id.$t) || '';
    var match = id.match(/post-(\d+)/);
    return match ? match[1] : '';
  }

  function fetchJson(url) {
    /* no-store: hide/unlock markers in post HTML must not stick behind stale feed cache */
    return fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(function(res){
      if (!res.ok) throw new Error('feed ' + res.status);
      return res.json();
    });
  }

  function readFeedCache(key) {
    try {
      var raw = sessionStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.t || !parsed.d) return null;
      /* 30m — cold feed is expensive; keep first paint instant across navigates. */
      if (Date.now() - parsed.t > 30 * 60 * 1000) return null;
      return parsed.d;
    } catch (err) { return null; }
  }

  function writeFeedCache(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (err) {}
  }

  /* F5/reload must not trust sessionStorage — instant paintRescue then feed re-paint = flash. */
  function isReloadNavigation() {
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (nav && nav.type) return nav.type === 'reload';
    } catch (ignore) {}
    try {
      return performance.navigation && performance.navigation.type === 1;
    } catch (ignore2) {}
    return false;
  }

  function loadHomepageEntries() {
    var cacheKey = 'qcx:feed:summary:' + QCX_HOME_FEED_BATCH;
    /* Always network; rescuePosts paints sessionStorage cache first for F5. */
    return fetchJson('/feeds/posts/summary?alt=json&max-results=' + QCX_HOME_FEED_BATCH).then(function(payload){
      var entries = (payload.feed && payload.feed.entry) || [];
      writeFeedCache(cacheKey, entries);
      return entries;
    });
  }

  function readEmbeddedPostId() {
    try {
      var html = document.documentElement && document.documentElement.innerHTML;
      if (!html) return '';
      var m = html.match(/['\"]postId['\"]\s*:\s*['\"]?(\d{6,})/) ||
        html.match(/\bpostId['\"]?\s*[:=]\s*['\"]?(\d{6,})/) ||
        html.match(/data-post-id=['\"](\d{6,})['\"]/);
      return m ? m[1] : '';
    } catch (err) { return ''; }
  }

  function loadSingleEntry() {
    var current = pathOf(location.href);
    var slug = (location.pathname.split('/').pop() || '').replace(/\.html$/i, '').replace(/-/g, ' ');
    var pageType = document.documentElement.getAttribute('data-page-type') || '';
    var isStaticPage = pageType === 'page' || /\/p\//i.test(location.pathname);
    var cacheKey = (isStaticPage ? 'qcx:page:' : 'qcx:post:') + current;
    var skipPageCache =
      (isStaticPage && /\/p\/admin\.html$/i.test(current)) || isReloadNavigation();
    var cached = skipPageCache ? null : readFeedCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    if (skipPageCache) {
      try { sessionStorage.removeItem(cacheKey); } catch (e) {}
    }
    var embeddedId = !isStaticPage ? readEmbeddedPostId() : '';

    function findInList(entries) {
      return (entries || []).filter(function(entry){
        return pathOf(entryLink(entry)) === current;
      })[0] || null;
    }

    function loadFromPagesFeed() {
      return fetchJson('/feeds/pages/default?alt=json&max-results=50').then(function(payload){
        var match = findInList((payload.feed && payload.feed.entry) || []);
        if (!match) throw new Error('page-not-found');
        return match;
      });
    }

    function loadFromPostsFeed() {
      /* Prefer one full-feed hop (recent posts include content). Avoid slow
         q=slug → summary → by-id waterfall that added ~3–5s on cold load. */
      function fullById(hit) {
        var id = postIdOf(hit);
        if (!id) return Promise.resolve(hit);
        return fetchJson('/feeds/posts/default/' + id + '?alt=json').then(function(full){
          return full.entry || hit;
        });
      }

      function fromSummary() {
        return fetchJson('/feeds/posts/summary?alt=json&max-results=50').then(function(summaryPayload){
          var hit = findInList((summaryPayload.feed && summaryPayload.feed.entry) || []);
          if (!hit) throw new Error('post-not-found');
          return fullById(hit);
        });
      }

      return fetchJson('/feeds/posts/default?alt=json&max-results=30')
        .then(function(payload){
          var match = findInList((payload.feed && payload.feed.entry) || []);
          if (match) return match;
          return fromSummary();
        })
        .catch(function(){
          /* If full feed fails/timeouts, still try summary path. */
          return fromSummary();
        });
    }

    function loadByEmbeddedId() {
      if (!embeddedId) return Promise.reject(new Error('no-embedded-id'));
      return fetchJson('/feeds/posts/default/' + embeddedId + '?alt=json').then(function(full){
        var entry = full && full.entry;
        if (!entry) throw new Error('embedded-miss');
        /* Confirm path when possible — avoid wrong post if theme embeds stale id. */
        var link = pathOf(entryLink(entry));
        if (link && link !== current) throw new Error('embedded-path-mismatch');
        return entry;
      });
    }

    function loadByPrefetch() {
      var p = window.__qcxPostPrefetch;
      if (!p || typeof p.then !== 'function') return Promise.reject(new Error('no-prefetch'));
      return p.then(function(full){
        var entry = full && full.entry;
        if (!entry) throw new Error('prefetch-miss');
        var link = pathOf(entryLink(entry));
        if (link && link !== current) throw new Error('prefetch-path-mismatch');
        return entry;
      });
    }

    if (!embeddedId && window.__qcxPostId) embeddedId = String(window.__qcxPostId);

    var loader = isStaticPage
      ? loadFromPagesFeed().catch(function(){ return loadFromPostsFeed(); })
      : loadByPrefetch().catch(function(){
          return loadByEmbeddedId().catch(function(){
            return loadFromPostsFeed().catch(function(){ return loadFromPagesFeed(); });
          });
        });

    return loader.then(function(entry){
      if (!skipPageCache) writeFeedCache(cacheKey, entry);
      return entry;
    });
  }

  function skelCard() {
    var col = el('div', 'col-md-4 qcx-skel-col');
    col.innerHTML =
      '<article class="card qcx-skel-card" aria-hidden="true">' +
      '<div class="card-header"><span class="qcx-skel-media"></span></div>' +
      '<div class="card-content">' +
      '<span class="qcx-skel-line qcx-skel-w40"></span>' +
      '<span class="qcx-skel-line qcx-skel-w90"></span>' +
      '<span class="qcx-skel-line qcx-skel-w70"></span>' +
      '</div><div class="card-footer"></div></article>';
    return col;
  }

  function ensureSkeletonCss() {
    if (document.getElementById('qcx-skel-css')) return;
    var st = document.createElement('style');
    st.id = 'qcx-skel-css';
    st.textContent =
      '.qcx-rescue-skel{background:transparent!important;min-height:240px}' +
      '.qcx-skel-block,.qcx-skel-line,.qcx-skel-media{display:block;border-radius:10px;' +
      'background:linear-gradient(90deg,rgba(0,240,163,.06),rgba(0,240,163,.14),rgba(0,240,163,.06));' +
      'background-size:200% 100%;animation:qcxSkel 1.1s ease-in-out infinite}' +
      '.qcx-skel-block{height:18px;margin:0 0 12px}.qcx-skel-w90{width:90%}.qcx-skel-w40{width:40%}' +
      '.qcx-skel-body{height:180px;width:100%;margin-top:18px}' +
      '.qcx-skel-media{height:140px;width:100%;margin:0 0 10px}.qcx-skel-line{height:12px;margin:0 0 8px}' +
      '@keyframes qcxSkel{0%{background-position:100% 0}100%{background-position:-100% 0}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function mountSkeleton(main, isSingle) {
    ensureSkeletonCss();
    if (!isSingle) ensureHero(main);
    var shell = el('div', 'widget Blog qcx-rescue-blog qcx-rescue-skel');
    shell.id = 'Blog1';
    shell.setAttribute('aria-busy', 'true');
    shell.setAttribute('aria-live', 'polite');
    if (isSingle) {
      shell.innerHTML =
        '<article class="post-item qcx-skel-post" aria-hidden="true">' +
        '<span class="qcx-skel-block qcx-skel-w90"></span>' +
        '<span class="qcx-skel-block qcx-skel-w40"></span>' +
        '<span class="qcx-skel-block qcx-skel-body"></span>' +
        '</article>';
    } else {
      var allPosts = el('div', 'all_posts');
      var row = el('div', 'row');
      for (var i = 0; i < QCX_HOME_PAGE_SIZE; i++) row.appendChild(skelCard());
      allPosts.appendChild(row);
      shell.appendChild(allPosts);
    }
    main.appendChild(shell);
    return shell;
  }

  function clearRescuePaint(main) {
    /* Keep homepage SSR/Blog1 shell for in-place reuse — wiping it reintroduced LCP delay + CLS. */
    main.querySelectorAll('.qcx-hero, .qcx-rule, .qcx-section-head, .qcx-rescue-status').forEach(function(node){
      try { node.remove(); } catch (ignoreRm) {}
    });
    var keep = document.getElementById('qcx-ssr-lcp-shell') ||
      document.querySelector('#Blog1.qcx-rescue-blog, .qcx-rescue-blog');
    main.querySelectorAll('.qcx-rescue-blog').forEach(function(node){
      if (keep && node === keep) return;
      if (node.id === 'Blog1' && node.querySelector && node.querySelector('img.qcx-card-lcp')) return;
      try { node.remove(); } catch (ignoreRm2) {}
    });
  }

  function clearReloadHide() {
    try {
      document.documentElement.removeAttribute('data-qcx-reload');
      var st = document.getElementById('qcx-reload-hide-ssr');
      if (st && st.parentNode) st.parentNode.removeChild(st);
    } catch (e) {}
  }

  function paintRescue(main, isSingle, result) {
    clearRescuePaint(main);
    if (isSingle) renderSinglePost(main, result);
    else {
      /* renderHomepage absorbs #qcx-ssr-lcp-shell in-place (CLS-safe). */
      renderHomepage(main, result || []);
      removeSsrLcpShell();
      ensureSidebarSearch();
      hideSidebarOnFeed();
      ensureSidebarRail();
    }
    clearReloadHide();
    try {
      var adminNow = /\/p\/admin\.html$/i.test(pathOf(location.href)) ||
        !!document.getElementById('qcx-admin-root') ||
        document.documentElement.getAttribute('data-qcx-admin') === '1';
      if (adminNow) {
        document.documentElement.setAttribute('data-qcx-admin', '1');
        document.documentElement.setAttribute('data-qcx-unlocked', '1');
        if (typeof window.__qcxSecureRefresh === 'function') {
          window.setTimeout(function () { window.__qcxSecureRefresh(true); }, 0);
        }
        return;
      }
      /* Force re-attach lock UI — second feed paint often wipes the panel inside the old debounce window. */
      if (document.documentElement.getAttribute('data-qcx-unlocked') === '1') {
        /* already open */
      } else if (typeof window.__qcxSecureRefresh === 'function') {
        window.setTimeout(function () { window.__qcxSecureRefresh(true); }, 0);
      } else if (typeof window.__qcxSecureBoot === 'function') {
        window.setTimeout(window.__qcxSecureBoot, 0);
      }
    } catch (ignore) {}
  }

  function hasUsableNativeBlog() {
    var native = document.querySelector('.widget.Blog:not(.qcx-rescue-blog):not(.qcx-rescue-skel)');
    if (!native) return false;
    return !!native.querySelector('.post-body, .all_posts .card, .post-item, .blog-posts');
  }

  function rescuePosts() {
    var main = document.querySelector('#main');
    if (!main) return;

    var pageType = document.documentElement.getAttribute('data-page-type') || '';
    var currentPath = pathOf(location.href);
    var isStaticPage = pageType === 'page' || /\/p\//i.test(location.pathname);
    var isAdminPage = /\/p\/admin\.html$/i.test(currentPath);
    var isSingle = document.documentElement.getAttribute('data-page-item') === 'single' || pageType === 'post' || pageType === 'page';

    /* Admin: never trust native SSR or sessionStorage — always feed rehydrate. */
    if (isAdminPage) {
      try {
        sessionStorage.removeItem('qcx:page:' + currentPath);
        sessionStorage.removeItem('qcx:post:' + currentPath);
      } catch (e) {}
      ensureHeaderSearch();
      main.classList.remove('no-items');
      /* Kill native Blog SSR immediately — it is the F5 old-layout flash. */
      main.querySelectorAll('.widget.Blog:not(.qcx-rescue-blog):not(.qcx-rescue-skel)').forEach(function(node){
        try { node.remove(); } catch (err) { node.style.display = 'none'; }
      });
      clearRescuePaint(main);
      var adminSkel = mountSkeleton(main, true);
      loadSingleEntry().then(function(result){
        paintRescue(main, true, result);
      }).catch(function(){
        if (adminSkel) adminSkel.remove();
        clearRescuePaint(main);
        main.appendChild(el('p', 'qcx-rescue-status', 'Không tải được Admin. Thử F5 hoặc mở lại /p/admin.html'));
      });
      return;
    }

    /* Keep Blog SSR for LCP discovery (PSI). enhanceNative refreshes feed without blank skeleton. */
    if (!isSingle && hasUsableNativeBlog()) {
      enhanceNativeHomepageFeed();
      return;
    }

    ensureHeaderSearch();
    main.classList.remove('no-items');

    /* Pages use qcx:page:; posts use qcx:post: — must match loadSingleEntry. */
    var cacheKey = isSingle
      ? ((isStaticPage ? 'qcx:page:' : 'qcx:post:') + currentPath)
      : 'qcx:feed:summary:' + QCX_HOME_FEED_BATCH;
    /* F5: still use sessionStorage for instant paint (empty dark-grid flash is worse than
       a one-frame stale feed). Soft navigate uses the same path. */
    var cached = readFeedCache(cacheKey);
    var skel = null;

    if (cached) {
      paintRescue(main, isSingle, cached);
    } else if (hasUsableNativeBlog() || document.getElementById('qcx-ssr-lcp-shell')) {
      /* Keep SSR/shell on screen while feed loads — no blank skeleton wipe. */
      clearReloadHide();
    } else {
      clearRescuePaint(main);
      skel = mountSkeleton(main, isSingle);
    }

    var loader = isSingle ? loadSingleEntry() : loadHomepageEntries();
    loader.then(function(result){
      if (cached && !isSingle) {
        try {
          var same = JSON.stringify((cached || []).map(function(e){ return (e && e.id && e.id.$t) || ''; })) ===
            JSON.stringify((result || []).map(function(e){ return (e && e.id && e.id.$t) || ''; }));
          if (same) return;
        } catch (ignore) {}
      } else if (cached && isSingle) {
        try {
          var cachedUpdated = (cached.updated && cached.updated.$t) || '';
          var resultUpdated = (result && result.updated && result.updated.$t) || '';
          var cachedId = (cached.id && cached.id.$t) || '';
          var resultId = (result && result.id && result.id.$t) || '';
          var cachedHtml = (cached.content && cached.content.$t) || '';
          var resultHtml = (result && result.content && result.content.$t) || '';
          /* Prefer updated timestamp — HTML length flaps between feed endpoints and caused a
             second paint that wiped the lock panel on every first reload. */
          if (cachedId && cachedId === resultId && cachedUpdated && cachedUpdated === resultUpdated) {
            return;
          }
          if (cachedId && cachedId === resultId && cachedHtml && cachedHtml === resultHtml) {
            return;
          }
        } catch (ignore) {}
      }
      paintRescue(main, isSingle, result);
    }).catch(function(){
      if (cached) return;
      if (skel) skel.remove();
      clearRescuePaint(main);
      var err = el('p', 'qcx-rescue-status', isSingle
        ? 'Không tải được nội dung bài. Vào Blogger → Layout → thêm gadget “Bài đăng trên Blog” vào Main, rồi mở lại bài.'
        : 'Không tải được danh sách bài. Vào Blogger → Layout → thêm gadget “Bài đăng trên Blog” vào Main.');
      main.appendChild(err);
    });
  }

  function bootSnippetClean() {
    cleanCardSnippets();
    stripDomPostTitles();
    window.setTimeout(cleanCardSnippets, 80);
    window.setTimeout(stripDomPostTitles, 80);
    window.setTimeout(cleanCardSnippets, 400);
    window.setTimeout(stripDomPostTitles, 400);
    window.setTimeout(cleanCardSnippets, 1200);
    window.setTimeout(stripDomPostTitles, 1200);
  }

  function bootRescue() {
    var main = document.querySelector('#main');
    if (!main) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootRescue, { once: true });
      return;
    }
    /* Drop stale admin page cache before any paint. */
    try {
      var ap = pathOf(location.href);
      if (/\/p\/admin\.html$/i.test(ap)) {
        sessionStorage.removeItem('qcx:page:' + ap);
        sessionStorage.removeItem('qcx:post:' + ap);
      }
    } catch (e) {}
    /* Admin must not wait for native Blog — it would flash SSR/old HTML. */
    if (/\/p\/admin\.html$/i.test(pathOf(location.href))) {
      rescuePosts();
      return;
    }
    var pageTypeBoot = document.documentElement.getAttribute('data-page-type') || '';
    var pageItemBoot = document.documentElement.getAttribute('data-page-item') || '';
    var isSingleBoot = pageItemBoot === 'single' || pageTypeBoot === 'post' || pageTypeBoot === 'page';
    /* F5 homepage: keep SSR Blog for LCP; enhanceNative refreshes without blanking. */
    var nativeBlog = document.querySelector('.widget.Blog:not(.qcx-rescue-blog)');
    /* Empty #main (Blog1 missing in Layout) → rescue immediately, no 120ms wait. */
    if (!nativeBlog) {
      rescuePosts();
      return;
    }
    /* Chờ Blog native ~120ms nếu widget đã có nhưng chưa kịp render card. */
    if (!hasUsableNativeBlog()) {
      window.setTimeout(function(){
        if (hasUsableNativeBlog()) {
          enhanceNativeHomepageFeed();
          return;
        }
        rescuePosts();
      }, 120);
      return;
    }
    /* Do not chain rescuePosts() after enhance — that raced SSR LCP on homepage. */
    enhanceNativeHomepageFeed();
  }

  function isHomepageView() {
    var pageType = document.documentElement.getAttribute('data-page-type') || '';
    var pageItem = document.documentElement.getAttribute('data-page-item') || '';
    if (pageType === 'homepage' || pageType === 'index') return true;
    if (pageItem === 'multiple' && !/^\/\d{4}\//.test(location.pathname || '')) return true;
    return (location.pathname || '/') === '/' || /\/search\/label\//i.test(location.pathname || '');
  }

  /* Homepage/index only — “Drops” section title is leftover AIHUB chrome. */
  function hideDropsOnHome() {
    var pageType = document.documentElement.getAttribute('data-page-type') || '';
    if (pageType === 'post' || pageType === 'page') return;
    if (!isHomepageView() && pageType && pageType !== 'homepage' && pageType !== 'index') return;
    document.querySelectorAll('.qcx-section-head').forEach(function(node){
      if (!/Drops/i.test(node.textContent || '')) return;
      var next = node.nextElementSibling;
      try { node.remove(); } catch (err) { node.style.display = 'none'; }
      if (next && next.classList && next.classList.contains('qcx-rule')) {
        try { next.remove(); } catch (err2) { next.style.display = 'none'; }
      }
    });
  }

  function ensureAdminChrome() {
    if (!isAdminPath()) return;
    try { document.documentElement.setAttribute('data-qcx-admin', '1'); } catch (ignore) {}
    hideSidebarOnFeed();
    document.querySelectorAll('#qcx-sidebar-rail-rescue').forEach(function(node){
      try { node.parentNode.removeChild(node); } catch (ignoreRail) {}
    });
    /* Strip post chrome + homepage footer so login sits centered.
       Re-run every pass — smart-runtime may inject .qcx-read-time after first paint. */
    document.querySelectorAll(
      '.post-title, .qcx-read-time, .post-header, .qcx-subscribe-card, .qcx-footer-links-row, #HTML5.qcx-footer-links'
    ).forEach(function(node){
      try {
        if (node.classList && node.classList.contains('qcx-read-time')) {
          try { node.remove(); } catch (ignoreRm) { node.style.setProperty('display', 'none', 'important'); }
          return;
        }
        if (node.classList && node.classList.contains('qcx-subscribe-card') && node.getAttribute('data-qcx-footer') === '1') {
          node.remove();
          return;
        }
        if (node.id === 'HTML5' || (node.classList && node.classList.contains('qcx-footer-links-row'))) {
          var w = node.closest ? node.closest('.widget') : null;
          if (w) { w.style.setProperty('display', 'none', 'important'); return; }
        }
        node.style.setProperty('display', 'none', 'important');
      } catch (ignoreHide) {}
    });
    var wrap = document.querySelector('.main-wrapper');
    if (wrap) wrap.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important');
    var adminCss =
        'html[data-qcx-admin=\"1\"] #sidebar,' +
        'html[data-qcx-admin=\"1\"] .qcx-sidebar-rail,' +
        'html[data-qcx-admin=\"1\"] #HTML4,' +
        'html[data-qcx-admin=\"1\"] .post-header,' +
        'html[data-qcx-admin=\"1\"] .post-header .post-title,' +
        'html[data-qcx-admin=\"1\"] .qcx-read-time,' +
        'html[data-qcx-admin=\"1\"] .post-header .qcx-read-time,' +
        'html[data-qcx-admin=\"1\"][data-page-type] .post-header .qcx-read-time,' +
        'html[data-qcx-admin=\"1\"] .qcx-subscribe-card,' +
        'html[data-qcx-admin=\"1\"] #footer .widget.HTML.qcx-footer-links,' +
        'html[data-qcx-admin=\"1\"] #HTML5{display:none!important}' +
        'html[data-qcx-admin=\"1\"] .main-wrapper{grid-template-columns:minmax(0,1fr)!important}' +
        'html[data-qcx-admin=\"1\"] #main,' +
        'html[data-qcx-admin=\"1\"] .centered-bottom,' +
        'html[data-qcx-admin=\"1\"] .post-body{max-width:100%!important;width:100%!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden)){' +
        'position:fixed!important;inset:0!important;z-index:40!important;' +
        'min-height:0!important;height:auto!important;display:flex!important;' +
        'align-items:center!important;justify-content:center!important;' +
        'padding:24px 16px!important;box-sizing:border-box!important;' +
        'max-width:none!important;margin:0!important;width:auto!important;background:transparent!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden)) .wrap{' +
        'width:100%!important;max-width:320px!important;margin:0 auto!important;padding:0!important;' +
        'display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden))>.wrap>header,' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden)) #btnLogout{display:none!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate{' +
        'width:100%!important;max-width:320px!important;margin:0 auto!important;' +
        'padding:16px!important;box-sizing:border-box!important;' +
        'border:1px solid rgba(0,240,163,.28)!important;border-radius:12px!important;' +
        'background-color:#24352c!important;background-image:none!important;' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 0 0 1px rgba(0,0,0,.45),0 16px 42px rgba(0,0,0,.55)!important;' +
        'isolation:isolate!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate .field{width:100%!important;margin:0 0 12px!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate .actions{width:100%!important;display:flex!important;margin:4px 0 0!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate input,' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate button,' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate .actions .primary{' +
        'width:100%!important;box-sizing:border-box!important;min-height:44px!important;' +
        'margin:0!important;padding:12px 14px!important;border-radius:8px!important;' +
        'font-family:var(--mono)!important;font-size:14px!important;line-height:1.2!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate input{' +
        'display:block!important;background:#0b120c!important;color:#e6f5ec!important;' +
        'border:1px solid rgba(0,240,163,.28)!important;font-weight:600!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate input::placeholder{color:#8aa596!important;opacity:1!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate button.primary,' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate .actions .primary{' +
        'display:inline-flex!important;align-items:center!important;justify-content:center!important;' +
        'background:#7dcea0!important;color:#06110a!important;border:1px solid transparent!important;' +
        'font-weight:700!important;cursor:pointer!important}' +
        /* Keep boot img loadable even if theme skin sets display:none */
        'html[data-qcx-admin=\"1\"] #qcx-admin-boot{' +
        'display:block!important;position:absolute!important;width:1px!important;height:1px!important;' +
        'opacity:0!important;pointer-events:none!important;left:-9999px!important;overflow:hidden!important}';
    /* Failsafe: full cockpit controls when page #qcx-admin-ui never injected */
    if (!document.getElementById('qcx-admin-ui')) {
      adminCss +=
        '#qcx-admin-root{--qcx-admin-radius:8px;--qcx-admin-ok:#7dcea0;--qcx-admin-warn:#e0b35a;' +
        '--qcx-admin-fill:#141a16;--qcx-admin-hover:#1c2420;--qcx-admin-mint:#7dcea0;' +
        '--qcx-admin-mint-ink:#06110a;--qcx-admin-input:#0b120c;' +
        '--sans:\"IBM Plex Sans\",\"Segoe UI\",sans-serif;' +
        '--mono:\"JetBrains Mono\",ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;' +
        'color:var(--fg,#e6f5ec);font:13px/1.4 var(--sans)}' +
        '#qcx-admin-root,#qcx-admin-root *{box-sizing:border-box}' +
        '#qcx-admin-root header{display:flex!important;position:relative!important;height:auto!important;' +
        'overflow:visible!important;visibility:visible!important;opacity:1!important;' +
        'align-items:center;justify-content:space-between;gap:8px 12px;' +
        'margin:0 0 8px!important;padding:2px 0 6px!important;' +
        'border:0!important;border-bottom:1px solid var(--line,#1d2a1f)!important;background:transparent!important}' +
        '#qcx-admin-root header h1{margin:0;font:700 13px/1.2 var(--mono);letter-spacing:.04em;' +
        'text-transform:uppercase;color:var(--fg,#e6f5ec)}' +
        '#qcx-admin-root header h1 span{color:var(--qcx-admin-mint)}' +
        '#qcx-admin-root .panel{' +
        'background:linear-gradient(180deg,#101a12 0%,var(--card,#0e170f) 100%);' +
        'border:1px solid var(--line,#1d2a1f);border-radius:var(--qcx-admin-radius);' +
        'padding:12px;box-shadow:0 6px 20px rgba(0,0,0,.22)}' +
        '#qcx-admin-root .grid{display:grid!important;' +
        'grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)!important;gap:14px!important}' +
        '#qcx-admin-root .grid.hidden,#qcx-admin-root .hidden{display:none!important}' +
        '#qcx-admin-root .compose-col{display:flex;flex-direction:column;gap:12px;min-width:0;overflow:visible}' +
        '#qcx-admin-root .compose-title{margin:0;padding-bottom:4px;border-bottom:0;align-items:center}' +
        '#qcx-admin-root .compose-nav{position:sticky;top:8px;z-index:6;display:grid;' +
        'grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:6px;border:1px solid #2a3830;' +
        'border-radius:var(--qcx-admin-radius);background:rgba(12,18,14,.94);backdrop-filter:blur(10px)}' +
        '#qcx-admin-root .compose-nav button{min-height:32px;width:100%;border-color:transparent;' +
        'background:transparent;color:var(--fg-dim,#8aa596);font-size:10px;letter-spacing:.04em;text-transform:uppercase}' +
        '#qcx-admin-root .compose-nav button.active{background:rgba(125,206,160,.16);' +
        'color:var(--qcx-admin-mint);box-shadow:inset 0 -2px 0 var(--qcx-admin-mint)}' +
        '#qcx-admin-root .compose-panes{min-width:0}' +
        '#qcx-admin-root .compose-panes>[data-section-pane][hidden],' +
        '#qcx-admin-root .compose-panes>[data-section-pane].hidden,' +
        '#qcx-admin-root .body-pane[hidden],#qcx-admin-root .body-pane.hidden,' +
        '#qcx-admin-root input[type=\"file\"][hidden],#qcx-admin-root input[type=\"file\"].hidden{display:none!important}' +
        '#qcx-admin-root .compose-actions{position:sticky;bottom:8px;z-index:5;margin:0;padding:10px 12px;' +
        'border:1px solid #2a3830;border-radius:var(--qcx-admin-radius);background:rgba(12,18,14,.94);backdrop-filter:blur(10px)}' +
        '#qcx-admin-root .card{margin:0;padding:14px;border:1px solid var(--line,#1d2a1f);' +
        'border-radius:var(--qcx-admin-radius);background:rgba(14,20,16,.72)}' +
        '#qcx-admin-root .card-ai{padding:10px 12px;border-color:rgba(125,206,160,.28);' +
        'background:rgba(125,206,160,.05)}' +
        '#qcx-admin-root .ai-strip{display:grid;grid-template-columns:auto minmax(0,1fr) auto;' +
        'gap:8px;align-items:center}' +
        '#qcx-admin-root .ai-brief-wrap[hidden],#qcx-admin-root .ai-brief-wrap.hidden{display:none!important}' +
        '#qcx-admin-root .card-vault{border-color:#2a3830}' +
        '#qcx-admin-root .vault-actions{display:grid;grid-template-columns:1.4fr 1fr 1fr auto;gap:8px;margin-top:0}' +
        '#qcx-admin-root .more-menu{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
        '#qcx-admin-root .more-menu[hidden],#qcx-admin-root .more-menu.hidden{display:none!important}' +
        '#qcx-admin-root .checklist{list-style:none;margin:0 0 10px;padding:0;display:flex;flex-direction:column;gap:6px}' +
        '#qcx-admin-root .checklist .check{display:grid;grid-template-columns:18px minmax(0,1fr) auto;' +
        'gap:8px;align-items:baseline;padding:7px 9px;border-radius:7px;border:1px solid var(--line,#1d2a1f);' +
        'background:rgba(0,0,0,.18);font:500 11px/1.3 var(--mono)}' +
        '#qcx-admin-root .checklist .check.pass{border-color:rgba(125,206,160,.35);color:var(--qcx-admin-ok)}' +
        '#qcx-admin-root .checklist .check.fail{border-color:rgba(255,84,112,.35);color:var(--danger,#ff5470)}' +
        '#qcx-admin-root .html-out.hidden,#qcx-admin-root .html-out[hidden]{display:none!important}' +
        '#qcx-admin-root .panel-rail{position:sticky;top:10px}' +
        '#qcx-admin-root label{display:block;margin:0 0 4px;color:var(--fg-dim,#8aa596);' +
        'font:600 10px/1.15 var(--mono);letter-spacing:.06em;text-transform:uppercase}' +
        '#qcx-admin-root .field{margin-bottom:10px}' +
        '#qcx-admin-root .row{display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px}' +
        '#qcx-admin-root .row.row-meta{grid-template-columns:auto 1fr 1.2fr!important;gap:12px;align-items:end}' +
        '#qcx-admin-root input,#qcx-admin-root select,#qcx-admin-root textarea{' +
        'width:100%;min-height:34px;background:var(--qcx-admin-input);' +
        'border:1px solid #243328;border-radius:7px;color:var(--fg,#e6f5ec);' +
        'padding:7px 10px;font:500 12.5px/1.35 var(--mono);appearance:none}' +
        '#qcx-admin-root textarea{min-height:72px;resize:vertical;padding-top:8px}' +
        '#qcx-admin-root textarea.tall{min-height:260px}' +
        '#qcx-admin-root .input-sans{font-family:var(--sans)!important;font-weight:600}' +
        '#qcx-admin-root input::placeholder,#qcx-admin-root textarea::placeholder{' +
        'color:#6f8576;opacity:1;font-weight:400}' +
        '#qcx-admin-root input:focus,#qcx-admin-root select:focus,#qcx-admin-root textarea:focus{' +
        'outline:none;border-color:var(--qcx-admin-mint);' +
        'box-shadow:0 0 0 2px rgba(125,206,160,.16);background:#0d1610}' +
        '#qcx-admin-root input:disabled,#qcx-admin-root textarea:disabled{' +
        'opacity:.45;cursor:not-allowed;background:#0a100b}' +
        '#qcx-admin-root .actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}' +
        '#qcx-admin-root button,#qcx-admin-root .btn{' +
        'appearance:none;display:inline-flex;align-items:center;justify-content:center;' +
        'gap:6px;min-height:34px;border:1px solid #2a3830;background:var(--qcx-admin-fill);' +
        'color:#e8efe9;border-radius:7px;padding:6px 11px;font:700 11px/1 var(--mono);' +
        'letter-spacing:.03em;cursor:pointer}' +
        '#qcx-admin-root button:hover{background:var(--qcx-admin-hover);border-color:#3a4a40}' +
        '#qcx-admin-root button.primary{background:var(--qcx-admin-mint);' +
        'color:var(--qcx-admin-mint-ink);border-color:var(--qcx-admin-mint)}' +
        '#qcx-admin-root button.ghost{background:transparent;border-color:#2a3830;' +
        'color:var(--fg-dim,#8aa596);min-height:30px;padding:4px 9px;font-size:10px}' +
        '#qcx-admin-root button:disabled{opacity:.4;cursor:not-allowed}' +
        '#qcx-admin-root .status{margin-top:8px;padding:7px 10px;border-radius:7px;' +
        'border:1px solid var(--line,#1d2a1f);color:var(--fg-dim,#8aa596);' +
        'font:11px/1.4 var(--mono);white-space:pre-wrap;background:rgba(10,15,10,.7)}' +
        '#qcx-admin-root .status.ok{border-color:rgba(125,206,160,.45);color:var(--qcx-admin-ok);' +
        'background:rgba(125,206,160,.06)}' +
        '#qcx-admin-root .status.err{border-color:rgba(255,84,112,.45);color:var(--danger,#ff5470);' +
        'background:rgba(255,84,112,.06)}' +
        '#qcx-admin-root .status.warn{border-color:rgba(224,179,90,.45);color:var(--qcx-admin-warn);' +
        'background:rgba(224,179,90,.06)}' +
        '#qcx-admin-root .seg{display:inline-flex;width:100%;border:1px solid #243328;' +
        'border-radius:7px;overflow:hidden;background:var(--qcx-admin-input);min-height:34px}' +
        '#qcx-admin-root .seg button{flex:1;border:0;border-radius:0;min-height:34px;' +
        'background:transparent;padding:6px 8px;color:var(--fg-dim,#8aa596);font-size:10px}' +
        '#qcx-admin-root .seg button.active{background:rgba(125,206,160,.16);' +
        'color:var(--qcx-admin-mint);box-shadow:inset 0 -2px 0 var(--qcx-admin-mint)}' +
        '#qcx-admin-root .html-out{margin:0;max-height:360px;overflow:auto;background:#080d08;' +
        'border:1px solid var(--line,#1d2a1f);border-radius:7px;padding:10px;' +
        'font:11px/1.4 var(--mono);white-space:pre-wrap;word-break:break-word;color:#9bb5a4}' +
        '#qcx-admin-root .hint{color:var(--fg-dim,#8aa596);font-size:11px;margin:3px 0 0}' +
        '#qcx-admin-root code{font-family:var(--mono);color:var(--qcx-admin-mint);font-size:.92em}';
      ensureAdminBootFromFeed();
    }
    var st = document.getElementById('qcx-admin-chrome-css');
    if (!st) {
      st = document.createElement('style');
      st.id = 'qcx-admin-chrome-css';
      (document.head || document.documentElement).appendChild(st);
    }
    if (st.textContent !== adminCss) st.textContent = adminCss;
  }

  function ensureAdminBootFromFeed() {
    if (!isAdminPath()) return;
    if (document.getElementById('qcx-admin-ui')) return;
    if (window.__qcxAdminBooted || window.__qcxAdminCdnBooting) return;
    window.__qcxAdminCdnBooting = 1;
    try {
      fetch('/feeds/pages/default/6068260621348294270?alt=json')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var h = (d.entry && d.entry.content && d.entry.content.$t) || '';
          var parts = h.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
          var raw = '';
          for (var i = 0; i < parts.length; i++) {
            if (parts[i].indexOf('qcx-admin-boot-script') >= 0) {
              raw = parts[i].replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
              break;
            }
          }
          if (!raw) return;
          window.__qcxAdminBooted = 1;
          var s = document.createElement('script');
          s.text = raw;
          (document.body || document.documentElement).appendChild(s);
        })
        .catch(function () {})
        .then(function () { window.__qcxAdminCdnBooting = 0; });
    } catch (ignoreBoot) {
      window.__qcxAdminCdnBooting = 0;
    }
  }

  function flushFooterTopGap() {
    /* Live a11y often re-applies margin:40px on footer+#footer — kill via inline */
    var shell = document.querySelector('footer.footer');
    var zone = document.getElementById('footer');
    var social = document.querySelector('.qcx-footer-social');
    var btn = document.querySelector('.qcx-footer-tg-btn');
    var a11y = document.getElementById('qcx-a11y-fixes');
    if (a11y && /margin:\s*40px/.test(a11y.textContent || '')) {
      a11y.textContent = (a11y.textContent || '')
        .replace(/margin:\s*40px[^;]*!important;/g, 'margin:0!important;')
        .replace(/margin-top:\s*40px\s*!important;/g, 'margin-top:0!important;')
        .replace(/padding:\s*18px 24px\s*!important;/g, 'padding:8px 16px!important;')
        .replace(/min-height:\s*38px\s*!important;/g, 'min-height:26px!important;');
    }
    if (shell) {
      shell.style.setProperty('margin', '0', 'important');
      shell.style.setProperty('margin-top', '0', 'important');
      shell.style.setProperty('padding', '0', 'important');
      shell.style.setProperty('min-height', '0', 'important');
      shell.style.setProperty('background', '#060d08', 'important');
    }
    if (zone) {
      zone.style.setProperty('margin', '0', 'important');
      zone.style.setProperty('margin-top', '0', 'important');
      zone.style.setProperty('padding', '0', 'important');
      zone.style.setProperty('min-height', '0', 'important');
      zone.style.setProperty('background', 'transparent', 'important');
    }
    if (social) {
      social.style.setProperty('margin', '0', 'important');
      social.style.setProperty('margin-top', '0', 'important');
      /* Prefer stylesheet media query for mobile tabbar pad — only clear bad margins inline */
      social.style.removeProperty('padding');
    }
    if (btn) {
      btn.style.setProperty('height', '26px', 'important');
      btn.style.setProperty('min-height', '26px', 'important');
      btn.style.setProperty('max-height', '26px', 'important');
    }
  }
  function ensureSiteFooter() {
    if (isAdminPath()) return;
    /* v3: MMO TEAM footer — homepage only */
    var pageType = document.documentElement.getAttribute('data-page-type') || '';
    var pageItem = document.documentElement.getAttribute('data-page-item') || '';
    var path = location.pathname;
    var isHome = pageType === 'homepage' ||
                 (path === '/' && pageItem !== 'single') ||
                 (pageType === 'index' && path === '/');
    var footerSection = document.getElementById('footer') || document.querySelector('footer.footer');
    if (!footerSection) return;
    if (!isHome) {
      /* Non-homepage: hide entire footer section */
      footerSection.style.setProperty('display', 'none', 'important');
      footerSection.setAttribute('data-qcx-footer-hidden', '1');
      return;
    }
    flushFooterTopGap();
    if (footerSection.querySelector('.qcx-footer-social, #HTML5')) return;
    var widget = el('div', 'widget HTML qcx-footer-widget');
    widget.id = 'HTML5';
    widget.innerHTML =
      '<div class="widget-content"><div class="qcx-footer-social">' +
      '<div class="qcx-footer-inner">' +
      '<span class="qcx-footer-logo">MMO TEAM</span>' +
      '<p class="qcx-footer-copy">&copy; 2026 MMO TEAM</p>' +
      '<a class="qcx-footer-tg-btn" href="https://t.me/superkhung" target="_blank" rel="noopener">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 6.57l-1.68 7.92c-.12.56-.46.7-.93.43l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.52.26l.18-2.62 4.74-4.28c.2-.18-.05-.28-.32-.1L7.6 14.5l-2.52-.79c-.55-.17-.56-.55.12-.82l9.86-3.8c.45-.17.86.1.87.68z"/></svg>' +
      'Telegram' +
      '</a>' +
      '</div>' +
      '</div></div>';
    widget.setAttribute('style', 'width:100%!important;max-width:100%!important;float:none!important;display:block!important;box-sizing:border-box!important');
    footerSection.classList.add('qcx-footer-gadgets');
    footerSection.style.setProperty('width', '100%', 'important');
    footerSection.style.setProperty('max-width', 'none', 'important');
    footerSection.style.setProperty('display', 'block', 'important');
    footerSection.appendChild(widget);
  }

  function healLiveUtf8Mojibake() {
    try {
      var rx = /[\u0393\u251c\u00df\u255e\u252c\u2500]/;
      var homeTitle = 'MMO TEAM \u2013 C\u00f4ng c\u1ee5 AI \u00b7 H\u01b0\u1edbng d\u1eabn th\u1ef1c chi\u1ebfn \u00b7 T\u00e0i nguy\u00ean mi\u1ec5n ph\u00ed';
      var homeDesc = 'MMO TEAM \u2014 Kho c\u00f4ng c\u1ee5 AI, h\u01b0\u1edbng d\u1eabn th\u1ef1c chi\u1ebfn v\u00e0 t\u00e0i nguy\u00ean mi\u1ec5n ph\u00ed cho ng\u01b0\u1eddi Vi\u1ec7t. ChatGPT, Claude, Gemini, VPS mi\u1ec5n ph\u00ed, automation n8n v\u00e0 nhi\u1ec1u h\u01a1n n\u1eef\u0061.';
      var homeKw = 'c\u00f4ng c\u1ee5 AI mi\u1ec5n ph\u00ed, AI tools Vietnam, ChatGPT mi\u1ec5n ph\u00ed, Claude AI, Gemini AI, VPS mi\u1ec5n ph\u00ed, n8n self-host, t\u1ef1 \u0111\u1ed9ng h\u00f3a AI, t\u00e0i nguy\u00ean AI, th\u1ee7 thu\u1eadt c\u00f4ng ngh\u1ec7, MMO, MMO TEAM';
      if (rx.test(document.title || '')) {
        var h1 = document.querySelector('.post-header .post-title, h1.post-title');
        if (h1 && h1.textContent && h1.textContent.trim()) {
          document.title = h1.textContent.trim() + ' | MMO TEAM';
        } else {
          document.title = homeTitle;
        }
      }
      var metas = document.querySelectorAll('meta[content]');
      for (var i = 0; i < metas.length; i++) {
        var m = metas[i];
        var c = m.getAttribute('content') || '';
        if (!rx.test(c)) continue;
        var nm = (m.getAttribute('name') || m.getAttribute('property') || '').toLowerCase();
        if (nm === 'keywords') {
          if (c.indexOf('AI tools Vietnam') !== -1) m.setAttribute('content', homeKw);
          else m.setAttribute('content', c.replace(/h[\s\S]*?mi[\s\S]*?ph[\s\S]*?, MMO TEAM/, 'h\u01b0\u1edbng d\u1eabn AI, c\u00f4ng c\u1ee5 AI mi\u1ec5n ph\u00ed, MMO TEAM'));
        } else if (nm.indexOf('title') !== -1) {
          m.setAttribute('content', document.title || homeTitle);
        } else if (nm.indexOf('description') !== -1) {
          m.setAttribute('content', homeDesc);
        }
      }
      var skip = document.querySelector('a.qcx-skip-link');
      if (skip && rx.test(skip.textContent || '')) skip.textContent = 'B\u1ecf qua \u0111\u1ebfn n\u1ed9i dung';
      var sigStatus = document.querySelector('a.qcx-signal-status');
      if (sigStatus && rx.test(sigStatus.getAttribute('aria-label') || '')) sigStatus.setAttribute('aria-label', 'V\u1ec1 trang ch\u1ee7 MMO');
      var sigX = document.querySelector('a.qcx-signal-x');
      if (sigX && rx.test(sigX.getAttribute('aria-label') || '')) sigX.setAttribute('aria-label', '\u0110\u0103ng nh\u1eadp b\u1eb1ng Gmail');
      var mobNav = document.querySelector('nav.footer-navigation-bar, #qcx-native-tabbar');
      if (mobNav && rx.test(mobNav.getAttribute('aria-label') || '')) mobNav.setAttribute('aria-label', '\u0110i\u1ec1u h\u01b0\u1edbng mobile');
      var scrTop = document.querySelector('a.scroll-top');
      if (scrTop) {
        if (rx.test(scrTop.getAttribute('aria-label') || '')) scrTop.setAttribute('aria-label', 'L\u00ean \u0111\u1ea7u trang');
        if (rx.test(scrTop.getAttribute('title') || '')) scrTop.setAttribute('title', 'L\u00ean \u0111\u1ea7u');
      }
      var secMap = {
        'brand': 'Th\u01b0\u01a1ng hi\u1ec7u MMO',
        'header': 'T\u00ecm ki\u1ebfm & Header',
        'menu': 'Menu \u0111i\u1ec1u h\u01b0\u1edbng',
        'homepage-widgets': 'Th\u00eam banner trang ch\u1ee7',
        'main': 'B\u00e0i vi\u1ebft ch\u00ednh (Blog)',
        'sidebar': 'Thanh b\u00ean (B\u00e0i vi\u1ebft)',
        'below-main': 'Th\u00eam d\u01b0\u1edbi b\u00e0i (H\u1ed7 tr\u1ee3 & C\u1ed9ng \u0111\u1ed3ng)',
        'footer': 'Th\u00eam footer'
      };
      Object.keys(secMap).forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.hasAttribute('name')) el.setAttribute('name', secMap[id]);
      });
    } catch (e) {}
  }

  /* Admin path used to `return` early — that left theme-inline FAT menu
     (18 Pro FX swatches) unopposed and broke Role FX / compose clicks.
     Bind a slim override only; do not run full GSI engine on admin. */
  function ensureAdminSlimUserDropdown() {
    var cssId = 'qcx-admin-slim-ud-css';
    if (!document.getElementById(cssId)) {
      var st = document.createElement('style');
      st.id = cssId;
      st.textContent =
        'html[data-qcx-admin="1"] #qcx-user-dropdown .qcx-ud-styles,' +
        'html[data-qcx-admin="1"] #qcx-user-dropdown .qcx-ud-swatches,' +
        'html[data-qcx-admin="1"] #qcx-user-dropdown [data-pick-style],' +
        'html[data-qcx-admin="1"] #qcx-user-dropdown #qcx-ud-vip,' +
        'html[data-qcx-admin="1"] #qcx-user-dropdown #qcx-ud-sync{display:none!important}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin{width:236px;max-width:calc(100vw - 16px);border-radius:10px;border:1px solid #24302a;background:#0e1612;color:#e6f5ec;box-shadow:0 12px 32px rgba(0,0,0,.65);padding:8px;font-family:var(--qcx-article-sans,system-ui,sans-serif)}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin .qcx-ud-btn{width:100%;text-align:left;padding:6px 7px;border-radius:6px;border:0;background:transparent;color:#c5d9cd;font:600 11.5px/1.25 var(--qcx-article-sans,system-ui,sans-serif);cursor:pointer;display:flex;align-items:center;gap:7px;text-decoration:none;box-sizing:border-box}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin .qcx-ud-btn:hover{background:rgba(255,255,255,.05);color:#fff}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin .qcx-ud-btn.is-danger{color:#d9928e}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin .qcx-ud-head{display:flex;align-items:center;gap:8px;padding:2px 2px 8px}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin .qcx-ud-head img{width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid #3a4a42}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin .qcx-ud-name{margin:0;font:700 12.5px/1.2 sans-serif}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin:not([data-name-style]) .qcx-ud-name{color:#f4faf6}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin .qcx-ud-email{margin:0;font:500 10px/1.3 monospace;color:#6f8378}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin .qcx-ud-divider{height:1px;background:#1e2823;margin:0 2px 4px}' +
        '#qcx-user-dropdown.qcx-ud-slim-admin .qcx-ud-status{display:none!important}';
      (document.head || document.documentElement).appendChild(st);
    }
    if (window.__qcxSlimUserMenuBound) return;
    window.__qcxSlimUserMenuBound = true;
    function readAdminEntUser() {
      var keys = ['qcx_payos_entitlement_v1', 'qcx_ent_v1', 'qcx_auth_ent'];
      for (var i = 0; i < keys.length; i++) {
        try {
          var raw = localStorage.getItem(keys[i]);
          if (!raw) continue;
          var j = JSON.parse(raw);
          var u = (j && j.user) || j;
          if (u && u.email) return u;
        } catch (e) {}
      }
      var chip = document.querySelector('.qcx-user-chip:not([hidden])');
      if (!chip) return null;
      var nm = chip.querySelector('.qcx-user-name');
      var av = chip.querySelector('.qcx-user-avatar');
      return {
        name: nm ? (nm.textContent || '').trim() : 'Admin',
        email: (chip.getAttribute('data-email') || '').trim() || 'admin',
        picture: av ? av.getAttribute('src') : '',
        role: (chip.getAttribute('data-role') || 'admin').toLowerCase()
      };
    }
    function openAdminSlimDropdown(anchorBtn) {
      var dd = document.getElementById('qcx-user-dropdown');
      if (!dd) {
        dd = document.createElement('div');
        dd.id = 'qcx-user-dropdown';
        document.body.appendChild(dd);
        document.addEventListener('click', function (ev) {
          if (!dd.classList.contains('is-open')) return;
          if (dd.contains(ev.target) || (ev.target.closest && ev.target.closest('.qcx-user-chip'))) return;
          dd.classList.remove('is-open');
        });
      }
      if (dd.classList.contains('is-open')) {
        dd.classList.remove('is-open');
        return;
      }
      var u = readAdminEntUser();
      if (!u) return;
      var role = String(u.role || 'admin').toLowerCase();
      var avUrl = u.picture || '';
      var ICO_OUT = '<svg class="qcx-ud-ico" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 2.5H3.5v11H6M10.5 5l3 3-3 3M13.5 8H6.5"/></svg>';
      var ICO_FX = '<svg class="qcx-ud-ico" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M9.6 1L2.6 9.2h4.4L6.2 15l7.2-8.2H9L9.6 1z"/></svg>';
      dd.className = 'qcx-ud-slim-admin is-open';
      dd.setAttribute('data-role', role);
      try {
        var nsSlim = (typeof window.__qcxGetUserNameStyle === 'function')
          ? window.__qcxGetUserNameStyle(u.email, role, u)
          : (u.nameStyle || 'crimson');
        dd.setAttribute('data-name-style', nsSlim);
        if (u.email) dd.setAttribute('data-qcx-user', String(u.email).toLowerCase());
      } catch (eNs) {
        dd.setAttribute('data-name-style', 'crimson');
      }
      dd.innerHTML =
        '<div class="qcx-ud-head"><img src="' + String(avUrl).replace(/"/g, '') + '" alt=""/>' +
          '<div><p class="qcx-ud-name">' + String(u.name || u.email).replace(/</g, '&lt;') + '</p>' +
          '<p class="qcx-ud-email">' + String(u.email || '').replace(/</g, '&lt;') + '</p></div></div>' +
        '<div class="qcx-ud-divider"></div>' +
        '<a class="qcx-ud-btn" href="/p/admin.html#role-fx">' + ICO_FX + '<span>Quản lý Style Role (tab Role FX)</span></a>' +
        '<button type="button" class="qcx-ud-btn is-danger" id="qcx-ud-logout">' + ICO_OUT + '<span>Đăng xuất</span></button>';
      var rect = anchorBtn.getBoundingClientRect();
      dd.style.position = 'fixed';
      dd.style.zIndex = '999998';
      dd.style.top = Math.min(window.innerHeight - 160, Math.max(8, rect.bottom + 6)) + 'px';
      dd.style.left = Math.min(window.innerWidth - 252, Math.max(8, rect.right - 236)) + 'px';
      dd.style.display = 'block';
      var logoutBtn = document.getElementById('qcx-ud-logout');
      if (logoutBtn) {
        logoutBtn.onclick = function () {
          dd.classList.remove('is-open');
          dd.style.display = 'none';
          try {
            ['qcx_payos_entitlement_v1', 'qcx_ent_v1', 'qcx_auth_ent'].forEach(function (k) {
              localStorage.removeItem(k);
            });
          } catch (e) {}
          location.reload();
        };
      }
    }
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      var chip = t && t.closest ? t.closest('.qcx-user-chip') : null;
      if (!chip || chip.hidden || chip.getAttribute('hidden') != null) return;
      if (ev.target.closest && ev.target.closest('#qcx-user-dropdown')) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      openAdminSlimDropdown(chip);
    }, true);
  }

  function ensureGmailAuthEngine() {
    healLiveUtf8Mojibake();
    if (isAdminPath()) {
      ensureAdminSlimUserDropdown();
    }
    /* Public surfaces get full Gmail CSS/slots; admin still boots name-style sync below. */
    if (!isAdminPath()) {
    var cssId = 'qcx-gmail-auth-css';
    var st = document.getElementById(cssId);
    if (!st) {
      st = document.createElement('style');
      st.id = cssId;
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = '.qcx-auth-slot{display:inline-flex!important;align-items:center!important;position:relative!important;z-index:120!important}.qcx-mac-topbar .qcx-mt-right{display:inline-flex!important;align-items:center!important;gap:8px!important;flex-wrap:nowrap!important;white-space:nowrap!important}html[data-page-type=post] .qcx-mac-topbar .qcx-auth-slot,html[data-page-type=page] .qcx-mac-topbar .qcx-auth-slot,html[data-page-item=single] .qcx-mac-topbar .qcx-auth-slot,.qcx-auth-slot--sidebar,.qcx-sidebar-vip-card,#HTML8.widget.HTML:has(.qcx-sidebar-vip-card),.qcx-community-support,#HTML10.widget.HTML:has(.qcx-community-support){display:none!important}.qcx-auth-login-btn{appearance:none;border:1px solid rgba(52,230,160,.32)!important;background:rgba(9,20,14,.88)!important;color:#e6f5ec!important;cursor:pointer!important;font:600 11px/1 var(--qcx-article-mono,monospace)!important;display:inline-flex!important;align-items:center!important;gap:5px!important;height:28px!important;padding:0 10px!important;border-radius:999px!important;white-space:nowrap!important;transition:border-color .18s,background .18s,transform .18s!important}.qcx-auth-slot--topbar .qcx-auth-login-btn{height:26px!important;padding:0 8px!important;font-size:10.5px!important;gap:4px!important}.qcx-auth-login-btn:hover{border-color:#34e6a0!important;background:rgba(52,230,160,.14)!important;transform:translateY(-1px)}.qcx-auth-login-btn[hidden],.qcx-user-chip[hidden],html.qcx-authed .qcx-auth-login-btn,.qcx-auth-slot.is-authed .qcx-auth-login-btn{display:none!important;visibility:hidden!important;pointer-events:none!important}.qcx-google-ico{flex:0 0 auto;display:block;width:14px!important;height:14px!important}.qcx-user-chip{appearance:none;box-sizing:border-box!important;position:relative!important;overflow:hidden!important;isolation:isolate!important;cursor:pointer;display:inline-flex!important;align-items:center!important;gap:6px!important;height:28px!important;padding:0 11px 0 3px!important;border-radius:999px!important;border:1px solid rgba(52,230,160,.35)!important;background-color:#08120c!important;color:#e8fff2!important;font:700 11.5px/1 var(--qcx-article-sans,system-ui,sans-serif)!important;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease!important;max-width:198px!important;white-space:nowrap!important}.qcx-user-avatar{box-sizing:border-box!important;position:relative!important;z-index:3!important;width:20px!important;height:20px!important;border-radius:50%!important;object-fit:cover!important;flex:0 0 auto!important;border:1.5px solid #34e6a0!important;background:#07120c!important;display:block!important}.qcx-user-name{position:relative!important;z-index:1!important;display:inline-block!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:142px!important;padding:1px 3px!important;border-radius:4px!important;font-weight:800!important;line-height:1.25!important}.qcx-user-chip[data-name-style=mint]{border-color:rgba(52,230,160,.5)!important;background:rgba(12,36,24,.88)!important}.qcx-user-chip[data-name-style=mint] .qcx-user-name{color:#34e6a0!important}#qcx-user-dropdown{position:fixed;z-index:999998;width:236px;max-width:calc(100vw - 16px);border-radius:10px;border:1px solid #24302a;background:#0e1612;color:#e6f5ec;box-shadow:0 12px 32px rgba(0,0,0,.65);padding:8px;display:none;font-family:var(--qcx-article-sans,system-ui,sans-serif);box-sizing:border-box}#qcx-user-dropdown.is-open{display:block}.qcx-ud-head{display:flex;align-items:center;gap:8px;padding:2px 2px 8px;min-width:0}.qcx-ud-meta{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px}.qcx-ud-head img{width:28px!important;height:28px!important;border-radius:50%!important;object-fit:cover!important;border:1px solid #3a4a42!important;flex-shrink:0!important}.qcx-ud-name{margin:0!important;font:700 12.5px/1.2 var(--qcx-article-sans,system-ui,sans-serif)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.qcx-ud-sub{margin:0!important;display:flex!important;align-items:center!important;gap:5px!important;font:500 10px/1.3 var(--qcx-article-mono,ui-monospace,monospace)!important;color:#6f8378!important}.qcx-ud-divider{height:1px;background:#1e2823;margin:0 2px 4px}.qcx-ud-actions{display:flex;flex-direction:column;gap:0;margin:0}.qcx-ud-btn{width:100%;text-align:left;padding:6px 7px;border-radius:6px;border:0;background:transparent;color:#c5d9cd;font:600 11.5px/1.25 var(--qcx-article-sans,system-ui,sans-serif);cursor:pointer;display:flex;align-items:center;gap:7px}.qcx-ud-btn:hover{background:rgba(255,255,255,.05);color:#fff}.qcx-ud-btn.is-danger{color:#d9928e}';
    /* Rank FX CSS deferred until authed — cuts ~95KiB from guest-home JS parse */
    (function ensureAuthRankCss(){
      var loaded = false;
      function load(){
        if (loaded || document.getElementById('qcx-gmail-auth-rank-css')) return;
        loaded = true;
        var link = document.createElement('link');
        link.id = 'qcx-gmail-auth-rank-css';
        link.rel = 'stylesheet';
        link.href = QCX_CDN + 'qcx-auth-rank.css';
        (document.head || document.documentElement).appendChild(link);
      }
      function maybe(){
        if (document.documentElement.classList.contains('qcx-authed') ||
            document.querySelector('.qcx-user-chip[data-name-style]:not([data-name-style="mint"])')) {
          load();
        }
      }
      maybe();
      try {
        new MutationObserver(maybe).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class']
        });
      } catch (eObs) {
        document.addEventListener('qcx:authed', load, { once: true });
      }
    })();

    var GOOGLE_G_SVG =
      '<svg aria-hidden="true" class="qcx-google-ico" height="14" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg">' +
        '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>' +
        '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>' +
        '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>' +
        '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>' +
      '</svg>';
    var slotMarkup =
      '<button aria-label="Đăng nhập bằng Gmail" class="qcx-signal-x qcx-auth-login-btn" type="button">' +
        GOOGLE_G_SVG +
        '<span class="qcx-signal-x-label">Đăng nhập</span>' +
        '<span aria-hidden="true" class="qcx-signal-x-arrow">&#8594;</span>' +
      '</button>' +
      '<button aria-expanded="false" aria-haspopup="menu" class="qcx-user-chip" data-role="member" data-tier="MEMBER" hidden="hidden" type="button">' +
        '<img alt="" class="qcx-user-avatar" decoding="async" height="20" loading="lazy" width="20"/>' +
        '<span class="qcx-user-name"></span>' +
        '<span class="qcx-user-role-badge">MEMBER</span>' +
      '</button>';

    /* Upgrade legacy a.qcx-signal-x (@superkhung ->) in .qcx-signal-header if XML not yet re-uploaded */
    var sigRow = document.querySelector('.qcx-signal-header .qcx-signal-row');
    if (sigRow && !sigRow.querySelector('.qcx-auth-slot')) {
      var oldLink = sigRow.querySelector('a.qcx-signal-x');
      var hSlot = document.createElement('div');
      hSlot.id = 'qcx-header-auth-slot';
      hSlot.className = 'qcx-auth-slot';
      hSlot.setAttribute('data-qcx-auth-slot', 'header');
      hSlot.innerHTML = slotMarkup;
      if (oldLink && oldLink.parentNode === sigRow) {
        sigRow.replaceChild(hSlot, oldLink);
      } else {
        sigRow.appendChild(hSlot);
      }
    }

    /* Post/page mac-topbar: back-to-home only — auth chip lives on homepage signal header */
    try {
      var postAuthSlots = document.querySelectorAll('.qcx-mac-topbar .qcx-auth-slot');
      for (var pai = 0; pai < postAuthSlots.length; pai++) {
        if (postAuthSlots[pai].parentNode) postAuthSlots[pai].parentNode.removeChild(postAuthSlots[pai]);
      }
    } catch (ePa) {}

    var mh = document.getElementById('qcx-menu-header');
    if (mh && !mh.querySelector('.qcx-auth-slot')) {
      var mSlot = document.createElement('div');
      mSlot.className = 'qcx-auth-slot qcx-auth-slot--menu';
      mSlot.setAttribute('data-qcx-auth-slot', 'menu');
      mSlot.style.cssText = 'margin-left:auto;margin-right:0;flex:0 0 auto;';
      mSlot.innerHTML = slotMarkup;
      var closeBtn = document.getElementById('qcx-menu-close');
      if (closeBtn && closeBtn.parentNode === mh) mh.insertBefore(mSlot, closeBtn);
      else mh.appendChild(mSlot);
    }

    /* Remove legacy VIP PASS sidebar promo + auth chip inside posts */
    try {
      var staleVip = document.querySelectorAll('.qcx-sidebar-vip-card, #HTML8 .qcx-sidebar-vip-card, .qcx-auth-slot--sidebar');
      for (var vi = 0; vi < staleVip.length; vi++) {
        var vipNode = staleVip[vi];
        var vipHost = vipNode.closest ? vipNode.closest('#HTML8.widget, .widget.HTML') : null;
        if (vipHost && vipHost.parentNode) vipHost.parentNode.removeChild(vipHost);
        else if (vipNode.parentNode) vipNode.parentNode.removeChild(vipNode);
      }
    } catch (eVip) {}

    /* Remove legacy community support banner (Telegram / Đồng bộ Gmail) */
    try {
      var staleComm = document.querySelectorAll('.qcx-community-support, #HTML10 .qcx-community-support');
      for (var ci = 0; ci < staleComm.length; ci++) {
        var cNode = staleComm[ci];
        var cHost = cNode.closest ? cNode.closest('#HTML10.widget, .widget.HTML') : null;
        if (cHost && cHost.parentNode) cHost.parentNode.removeChild(cHost);
        else if (cNode.parentNode) cNode.parentNode.removeChild(cNode);
      }
    } catch (eComm) {}
    } /* end !isAdminPath public CSS/slots */

    if (!window.__qcxGmailAuthV9) {
      window.__qcxGmailAuthV9 = true;
      (function initRescueAuthFallback() {
        var API_BASE = 'https://timkiem-store-api.kkymljnk.workers.dev';
        var ENT_KEY = 'qcx_payos_entitlement_v1';
        var AUTH_CFG_KEY = 'qcx_google_auth_cfg_v1';
        var AVATAR_CACHE_KEY = 'qcx_google_avatar_cache_v1';
        var SAVED_POSTS_KEY = 'qcx_saved_posts_v1';
        var PENDING_SAVE_KEY = 'qcx_pending_save_post_v1';
        var PENDING_SAVE_INTENT_KEY = 'qcx_pending_save_intent_v1';
        var PENDING_SAVE_MAX_AGE_MS = 10 * 60 * 1000;
        // Fixed sole ADMIN — never expand from widget/KV/localStorage.
        var FIXED_ADMIN_EMAIL = 'kkymljnk@gmail.com';
        var DEFAULT_ADMIN_EMAILS = [FIXED_ADMIN_EMAIL];
        var KNOWN_GOOGLE_AVATARS = {
          'kkymljnk@gmail.com': 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.3/images/avatars/kkymljnk-google.png',
          'superkhung@gmail.com': 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.3/images/avatars/kkymljnk-google.png'
        };
        var DEFAULT_GOOGLE_CLIENT_ID = '94419988478-0os3sguo1jbe06ob9fi5vusb969vpmil.apps.googleusercontent.com';
        var googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
        var adminEmailsList = DEFAULT_ADMIN_EMAILS.slice();
        var gsiScriptLoading = false;
        var pendingProbes = {};
        function killAuthModal() {
          var m = document.getElementById('qcx-google-auth-modal');
          if (m) {
            m.classList.remove('is-open');
            m.style.display = 'none';
            m.setAttribute('hidden', 'hidden');
            try { m.remove(); } catch (e) {}
          }
        }

        function isPlaceholderAvatar(url) {
          if (!url) return true;
          var s = String(url);
          return s.indexOf('ui-avatars.com') !== -1 ||
                 s.indexOf('unavatar.io/google/') !== -1 ||
                 s.indexOf('favicon.svg') !== -1 ||
                 s.indexOf('b16-rounded.gif') !== -1;
        }
        function readAvatarCache() {
          try { return JSON.parse(localStorage.getItem(AVATAR_CACHE_KEY) || '{}') || {}; } catch (e) { return {}; }
        }
        function saveAvatarCache(email, url) {
          if (!email || !url || isPlaceholderAvatar(url)) return;
          try {
            var c = readAvatarCache();
            c[String(email).trim().toLowerCase()] = url;
            localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(c));
          } catch (e) {}
        }
        function getFallbackInitialsAvatar(name, email, role) {
          var bgHex = role === 'admin' ? '2b0907' : (role === 'vip' ? '261c05' : (role === 'pro' ? '061d2b' : '0d261a'));
          var fgHex = role === 'admin' ? 'ff6b6b' : (role === 'vip' ? 'ffd166' : (role === 'pro' ? '38bdf8' : '34e6a0'));
          return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || email || 'U') + '&background=' + bgHex + '&color=' + fgHex + '&bold=true&size=96';
        }
        function getPreferredGoogleAvatar(email, name, existingPic, role) {
          var em = String(email || '').trim().toLowerCase();
          if (em && KNOWN_GOOGLE_AVATARS[em]) return KNOWN_GOOGLE_AVATARS[em];
          if (existingPic && !isPlaceholderAvatar(existingPic)) return existingPic;
          var cache = readAvatarCache();
          if (em && cache[em] && !isPlaceholderAvatar(cache[em])) return cache[em];
          return getFallbackInitialsAvatar(name, em, role);
        }
        function sha256Hex(str) {
          if (!(window.crypto && window.crypto.subtle && window.TextEncoder)) return Promise.resolve('');
          return window.crypto.subtle.digest('SHA-256', new window.TextEncoder().encode(str)).then(function (buf) {
            return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('00' + b.toString(16)).slice(-2); }).join('');
          }).catch(function () { return ''; });
        }
        function testImageLoad(url) {
          return new Promise(function (resolve) {
            if (!url || isPlaceholderAvatar(url)) { resolve(''); return; }
            var img = new Image();
            var done = false;
            var t = setTimeout(function () { if (!done) { done = true; resolve(''); } }, 3500);
            img.onload = function () {
              if (done) return;
              done = true;
              clearTimeout(t);
              resolve(img.naturalWidth > 1 ? url : '');
            };
            img.onerror = function () {
              if (done) return;
              done = true;
              clearTimeout(t);
              resolve('');
            };
            img.src = url;
          });
        }
        function probeRealAvatarAsync(email, name, onResolved) {
          var em = String(email || '').trim().toLowerCase();
          if (!em || em.indexOf('@') === -1) return;
          if (KNOWN_GOOGLE_AVATARS[em]) {
            if (onResolved) onResolved(KNOWN_GOOGLE_AVATARS[em]);
            return;
          }
          var cached = readAvatarCache()[em];
          if (cached && !isPlaceholderAvatar(cached)) {
            if (onResolved) onResolved(cached);
            return;
          }
          if (pendingProbes[em]) return;
          pendingProbes[em] = true;
          var prefix = em.split('@')[0];
          sha256Hex(em).then(function (hash) {
            var gravUrl = hash ? ('https://www.gravatar.com/avatar/' + hash + '?s=96&d=404') : '';
            return testImageLoad(gravUrl);
          }).then(function (found) {
            if (found) return found;
            return fetch('https://unavatar.io/' + encodeURIComponent(em) + '?json').then(function (r) { return r.json(); }).then(function (j) {
              return (j && j.url && !isPlaceholderAvatar(j.url)) ? testImageLoad(j.url) : '';
            }).catch(function () { return ''; });
          }).then(function (found) {
            if (found) return found;
            return fetch('https://unavatar.io/github/' + encodeURIComponent(prefix) + '?json').then(function (r) { return r.json(); }).then(function (j) {
              return (j && j.url && !isPlaceholderAvatar(j.url)) ? testImageLoad(j.url) : '';
            }).catch(function () { return ''; });
          }).then(function (found) {
            delete pendingProbes[em];
            if (found && !isPlaceholderAvatar(found)) {
              saveAvatarCache(em, found);
              var ent = readEnt();
              if (ent && ent.user && String(ent.user.email || '').toLowerCase() === em) {
                ent.user.picture = found;
                try { localStorage.setItem(ENT_KEY, JSON.stringify(ent)); } catch (e) {}
                rememberGoogleAccount(ent.user);
                renderAuthSlots();
              }
              if (onResolved) onResolved(found);
            }
          });
        }

        function loadLocalAuthCfg() {
          try {
            var raw = JSON.parse(localStorage.getItem(AUTH_CFG_KEY) || '{}') || {};
            if (raw.googleClientId) googleClientId = String(raw.googleClientId).trim();
            // Admin list is fixed to kkymljnk only — ignore widget/KV expansions.
            adminEmailsList = [FIXED_ADMIN_EMAIL];
            var domCfg = document.querySelector('.qcx-layout-auth-config');
            if (domCfg) {
              var domCid = String(domCfg.getAttribute('data-google-client-id') || '').trim();
              if (domCid) googleClientId = domCid;
            }
          } catch (e) {}
        }
        function persistLocalAuthCfg() {
          try {
            localStorage.setItem(AUTH_CFG_KEY, JSON.stringify({
              googleClientId: googleClientId || '',
              adminEmails: [FIXED_ADMIN_EMAIL]
            }));
          } catch (e) {}
        }
        function fetchAuthConfig() {
          loadLocalAuthCfg();
          return fetch(API_BASE + '/api/auth/config', { method: 'GET' })
            .then(function (r) { return r.json(); })
            .then(function (res) {
              if (res && res.googleClientId) {
                googleClientId = String(res.googleClientId).trim();
                persistLocalAuthCfg();
              }
              return googleClientId;
            })
            .catch(function () { return googleClientId || ''; });
        }
        function isClientAdminEmail(email) {
          return String(email || '').trim().toLowerCase() === FIXED_ADMIN_EMAIL;
        }
        function readEnt() {
          try { return JSON.parse(localStorage.getItem(ENT_KEY) || '{}') || {}; } catch (e) { return {}; }
        }
        function readSavedPostsCache(email) {
          try {
            var all = JSON.parse(localStorage.getItem(SAVED_POSTS_KEY) || '{}') || {};
            var key = String(email || '').trim().toLowerCase();
            var list = key && Array.isArray(all[key]) ? all[key] : [];
            return list.slice(0, 50);
          } catch (e) { return []; }
        }
        function writeSavedPostsCache(email, list) {
          try {
            var key = String(email || '').trim().toLowerCase();
            if (!key) return;
            var all = JSON.parse(localStorage.getItem(SAVED_POSTS_KEY) || '{}') || {};
            all[key] = (Array.isArray(list) ? list : []).slice(0, 50);
            localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(all));
          } catch (e) {}
        }
        function normalizePostUrl(url) {
          var s = String(url || '').trim();
          if (!s) return '';
          try {
            var u = new URL(s, location.origin);
            return (u.origin + u.pathname).replace(/\/+$/, '') || u.origin;
          } catch (e) {
            return s.split('#')[0].split('?')[0].replace(/\/+$/, '');
          }
        }
        function isSameSavedPost(a, b) {
          if (!a || !b) return false;
          var aid = String(a.id || '').trim();
          var bid = String(b.id || '').trim();
          if (aid && bid && aid === bid) return true;
          var au = normalizePostUrl(a.url);
          var bu = normalizePostUrl(b.url);
          return !!(au && bu && au === bu);
        }
        function syncSavedCountBadge(list) {
          try {
            var n = Array.isArray(list) ? list.length : 0;
            var countEl = document.getElementById('qcx-ud-saved-count');
            if (!countEl) return;
            countEl.textContent = String(n);
            countEl.hidden = n < 1;
          } catch (e) {}
        }
        function getCurrentPostMeta() {
          var url = normalizePostUrl(location.href || '');
          var titleEl = document.querySelector('h1.post-title, .post-header .post-title, .item-title');
          var title = titleEl ? String(titleEl.textContent || '').trim() : (document.title || '').trim();
          /* Strip bookmark button text if nested in h1 */
          title = title.replace(/\s*(Lưu bài|Đã lưu)\s*$/i, '').trim();
          var id = '';
          try {
            var ds = document.documentElement && document.documentElement.dataset;
            id = String((ds && (ds.postId || ds.blogPostId)) || '').trim();
          } catch (e) {}
          if (!id) {
            var body = document.body;
            id = String((body && (body.getAttribute('data-post-id') || body.getAttribute('data-blog-post-id'))) || '').trim();
          }
          if (!id) {
            var art = document.querySelector('article[data-post-id], .post-item[data-post-id], #the-article[data-post-id]');
            if (art) id = String(art.getAttribute('data-post-id') || '').trim();
          }
          if (!id) {
            try { id = new URL(url || location.href).pathname.replace(/\/+$/, '') || url; } catch (e2) { id = url; }
          }
          var thumbEl = document.querySelector('.post-body img, .post-header img, meta[property="og:image"]');
          var thumb = '';
          if (thumbEl) {
            thumb = thumbEl.getAttribute('content') || thumbEl.getAttribute('src') || '';
          }
          return { id: id, url: url, title: title || id, thumb: String(thumb || '').trim() };
        }
        function isItemPostPage() {
          var b = document.body;
          if (!b) return false;
          if (b.classList.contains('item-page') || b.classList.contains('item')) return true;
          if (document.querySelector('.item-page, body[data-blog-page="item"]')) return true;
          return !!(document.querySelector('h1.post-title, .post-header .post-title') && document.querySelector('.post-body'));
        }
        function authHeaders() {
          var ent = readEnt();
          var token = (ent && ent.sessionToken) || '';
          var h = { 'Content-Type': 'application/json' };
          if (token) h.Authorization = 'Bearer ' + token;
          return h;
        }
        function fetchSavedPosts(force) {
          var ent = readEnt();
          var email = ent && ent.user && ent.user.email;
          if (!email || !ent.sessionToken) return Promise.resolve(readSavedPostsCache(email));
          if (!force) {
            var cached = readSavedPostsCache(email);
            if (cached.length) {
              // Background refresh; return cache immediately via separate callers.
            }
          }
          return fetch(API_BASE + '/api/auth/saved-posts', { method: 'GET', headers: authHeaders() })
            .then(function (r) { return r.json(); })
            .then(function (res) {
              var list;
              if (res && res.ok && Array.isArray(res.savedPosts)) {
                list = res.savedPosts;
                writeSavedPostsCache(email, list);
              } else {
                list = readSavedPostsCache(email);
              }
              updatePostSaveButtonState();
              syncSavedCountBadge(list);
              return list;
            })
            .catch(function () {
              var list = readSavedPostsCache(email);
              updatePostSaveButtonState();
              syncSavedCountBadge(list);
              return list;
            });
        }
        function apiSavePost(meta) {
          var ent = readEnt();
          var email = ent && ent.user && ent.user.email;
          if (!email || !ent.sessionToken || !meta || !meta.url) {
            return Promise.reject(new Error('NO_AUTH'));
          }
          return fetch(API_BASE + '/api/auth/saved-posts', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              id: meta.id,
              url: meta.url,
              title: meta.title,
              thumb: meta.thumb || ''
            })
          }).then(function (r) { return r.json(); }).then(function (res) {
            if (!(res && res.ok)) throw new Error((res && res.error) || 'SAVE_FAIL');
            var list = res.savedPosts || [];
            writeSavedPostsCache(email, list);
            updatePostSaveButtonState();
            syncSavedCountBadge(list);
            return list;
          });
        }
        function apiUnsavePost(idOrMeta) {
          var ent = readEnt();
          var email = ent && ent.user && ent.user.email;
          var id = '';
          var postUrl = '';
          if (idOrMeta && typeof idOrMeta === 'object') {
            id = String(idOrMeta.id || '').trim();
            postUrl = String(idOrMeta.url || '').trim();
          } else {
            id = String(idOrMeta || '').trim();
          }
          if (!email || !ent.sessionToken || (!id && !postUrl)) {
            return Promise.reject(new Error('NO_AUTH'));
          }
          var body = {};
          if (id) body.id = id;
          if (postUrl) body.url = postUrl;
          return fetch(API_BASE + '/api/auth/saved-posts', {
            method: 'DELETE',
            headers: authHeaders(),
            body: JSON.stringify(body)
          }).then(function (r) { return r.json(); }).then(function (res) {
            if (!(res && res.ok)) throw new Error((res && res.error) || 'UNSAVE_FAIL');
            var list = res.savedPosts || [];
            /* Drop every row matching id OR url — vault can hold duplicate ids for one post. */
            var dropMeta = { id: id, url: postUrl };
            list = list.filter(function (p) { return !isSameSavedPost(p, dropMeta); });
            writeSavedPostsCache(email, list);
            updatePostSaveButtonState();
            syncSavedCountBadge(list);
            return list;
          });
        }
        function setPendingSave(meta) {
          try {
            localStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(meta || getCurrentPostMeta()));
            localStorage.setItem(PENDING_SAVE_INTENT_KEY, String(Date.now()));
          } catch (e) {}
        }
        function clearPendingSave() {
          try {
            localStorage.removeItem(PENDING_SAVE_KEY);
            localStorage.removeItem(PENDING_SAVE_INTENT_KEY);
          } catch (e) {}
        }
        function consumePendingSave() {
          try {
            var raw = localStorage.getItem(PENDING_SAVE_KEY);
            clearPendingSave();
            if (!raw) return null;
            return JSON.parse(raw);
          } catch (e) {
            clearPendingSave();
            return null;
          }
        }
        function hasFreshSaveIntent() {
          try {
            var raw = localStorage.getItem(PENDING_SAVE_INTENT_KEY);
            if (!raw) return false;
            var ts = parseInt(raw, 10);
            if (!ts || isNaN(ts)) return false;
            return (Date.now() - ts) <= PENDING_SAVE_MAX_AGE_MS;
          } catch (e) { return false; }
        }
        function flushPendingSaveAfterLogin() {
          /* Only flush when bookmark click set intent — never on casual login. */
          if (!hasFreshSaveIntent()) {
            clearPendingSave();
            return;
          }
          var pending = consumePendingSave();
          if (!pending || !pending.url) return;
          apiSavePost(pending).then(function (list) {
            updatePostSaveButtonState();
            syncSavedCountBadge(list);
          }).catch(function () {});
        }
        function postSaveIconHtml() {
          return '<svg class="qcx-post-save-ico" viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2.5h8v11l-4-2.4L4 13.5v-11z"/></svg>';
        }
        function paintPostSaveButton(btn, saved) {
          if (!btn) return;
          btn.classList.toggle('is-saved', !!saved);
          btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
          var label = btn.querySelector('.qcx-post-save-label');
          if (label) label.parentNode.removeChild(label);
          if (!btn.querySelector('.qcx-post-save-ico, svg')) {
            btn.innerHTML = postSaveIconHtml();
          }
          btn.title = saved ? 'Bỏ lưu' : 'Lưu bài';
          btn.setAttribute('aria-label', saved ? 'Bỏ lưu' : 'Lưu bài');
        }
        function bindPostSaveClick(btn) {
          if (!btn || btn.getAttribute('data-qcx-save-bound') === '1') return;
          btn.setAttribute('data-qcx-save-bound', '1');
          btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var ent = readEnt();
            var meta = getCurrentPostMeta();
            if (!(ent && ent.user && ent.user.email && ent.sessionToken)) {
              setPendingSave(meta);
              triggerGoogleSignIn({ fromSave: true });
              return;
            }
            var email = ent.user.email;
            var list = readSavedPostsCache(email);
            var hit = null;
            for (var i = 0; i < list.length; i++) {
              if (isSameSavedPost(list[i], meta)) { hit = list[i]; break; }
            }
            /* Optimistic UI: flip color immediately, rollback on API fail. */
            var nextList;
            if (hit) {
              nextList = list.filter(function (p) { return !isSameSavedPost(p, meta); });
              writeSavedPostsCache(email, nextList);
              paintPostSaveButton(btn, false);
              syncSavedCountBadge(nextList);
              apiUnsavePost({
                id: String((hit && hit.id) || meta.id || '').trim(),
                url: String((hit && hit.url) || meta.url || '').trim()
              }).catch(function () {
                writeSavedPostsCache(email, list);
                paintPostSaveButton(btn, true);
                syncSavedCountBadge(list);
              });
            } else {
              nextList = [{ id: meta.id, url: meta.url, title: meta.title, thumb: meta.thumb || '' }].concat(list);
              writeSavedPostsCache(email, nextList);
              paintPostSaveButton(btn, true);
              syncSavedCountBadge(nextList);
              apiSavePost(meta).catch(function () {
                writeSavedPostsCache(email, list);
                paintPostSaveButton(btn, false);
                syncSavedCountBadge(list);
              });
            }
          });
        }
        function updatePostSaveButtonState() {
          var btn = document.getElementById('qcx-post-save-btn');
          if (!btn) return;
          var ent = readEnt();
          var email = ent && ent.user && ent.user.email;
          var meta = getCurrentPostMeta();
          var list = readSavedPostsCache(email);
          var saved = list.some(function (p) { return isSameSavedPost(p, meta); });
          paintPostSaveButton(btn, !!saved);
          syncSavedCountBadge(list);
        }
        function ensurePostSaveButton() {
          if (!isItemPostPage()) return;
          var titleEl = document.querySelector('.post-header h1.post-title, h1.post-title');
          if (!titleEl) return;
          var existing = document.getElementById('qcx-post-save-btn');
          /* Relocate from topbar / under header into end of title */
          if (existing && existing.parentNode !== titleEl) {
            existing.parentNode && existing.parentNode.removeChild(existing);
            existing = null;
          }
          if (existing) {
            if (existing.querySelector('.qcx-post-save-label') || /Lưu bài|Đã lưu/i.test((existing.textContent || '').replace(/\s+/g, ' '))) {
              existing.innerHTML = postSaveIconHtml();
            }
            bindPostSaveClick(existing);
            updatePostSaveButtonState();
            return;
          }
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.id = 'qcx-post-save-btn';
          btn.className = 'qcx-post-save-btn';
          btn.setAttribute('aria-label', 'Lưu bài');
          btn.title = 'Lưu bài';
          btn.innerHTML = postSaveIconHtml();
          bindPostSaveClick(btn);
          titleEl.appendChild(btn);
          updatePostSaveButtonState();
          var ent = readEnt();
          if (ent && ent.user && ent.sessionToken) {
            fetchSavedPosts(true).then(function () { updatePostSaveButtonState(); });
          }
        }
        var NAME_STYLE_KEY = 'qcx_name_style_v1';
        var ADMIN_ROLE_STYLES_KEY = 'qcx_admin_role_styles_v1';
        var ROLE_DEFAULT_STYLE = { admin: 'crimson', vip: 'gold', pro: 'thunder', member: 'mint' };
        var NAME_STYLE_CATALOG = [
          { id: 'crimson',      label: 'Đỏ Lửa',       dot: '#ff1e27', tier: 'admin' },
          { id: 'gold',         label: 'Hoàng Kim',    dot: '#ffd700', tier: 'vip' },
          { id: 'thunder',      label: 'Sét Xanh',     dot: '#00d5ff', tier: 'pro' },
          { id: 'mint',         label: 'Ngọc Mint',    dot: '#34e6a0', tier: 'member' },
          { id: 'thunder-red',  label: 'Sét Đỏ',       dot: '#ff384c', tier: 'extra' },
          { id: 'thunder-gold', label: 'Sét Vàng',     dot: '#ffd030', tier: 'extra' },
          { id: 'thunder-purple', label: 'Sét Tím',    dot: '#c084fc', tier: 'extra' },
          { id: 'dragon-fire',  label: 'Lửa Rồng',     dot: '#ff6a00', tier: 'extra' },
          { id: 'inferno',      label: 'Inferno',      dot: '#ff6b35', tier: 'extra' },
          { id: 'liquid-gold',  label: 'Vàng Lỏng',    dot: '#ffe270', tier: 'extra' },
          { id: 'hologram',     label: 'Hologram',     dot: '#ff66ee', tier: 'extra' },
          { id: 'galaxy',       label: 'Thiên Hà',     dot: '#c084fc', tier: 'extra' },
          { id: 'diamond',      label: 'Kim Cương',    dot: '#bae6fd', tier: 'extra' },
          { id: 'glitch',       label: 'Glitch RGB',   dot: '#00ffcc', tier: 'extra' },
          { id: 'rainbow',      label: 'Rainbow',      dot: '#f472b6', tier: 'extra' },
          { id: 'purple',       label: 'Tím Neon',     dot: '#d8b4fe', tier: 'extra' },
          { id: 'emerald',      label: 'Matrix Rain',  dot: '#00ff88', tier: 'extra' },
          { id: 'verdant',      label: 'Verdant',      dot: '#34e6a0', tier: 'extra' },
          { id: 'cyan',         label: 'Cyan Pulse',   dot: '#00d9ff', tier: 'extra' },
          { id: 'sakura',       label: 'Anh Đào',      dot: '#ff9ecd', tier: 'extra' },
          { id: 'hearts',       label: 'Tim Hồng',     dot: '#ff5e99', tier: 'extra' }
        ];
        function readAdminRoleStyles() {
          try {
            var raw = JSON.parse(localStorage.getItem(ADMIN_ROLE_STYLES_KEY) || 'null');
            if (raw && typeof raw === 'object') {
              return {
                roleDefaults: Object.assign({}, ROLE_DEFAULT_STYLE, raw.roleDefaults || {}),
                userOverrides: raw.userOverrides && typeof raw.userOverrides === 'object' ? raw.userOverrides : {},
                allowSelfSwitch: typeof raw.allowSelfSwitch === 'boolean' ? raw.allowSelfSwitch : true
              };
            }
          } catch (e) {}
          return {
            roleDefaults: Object.assign({}, ROLE_DEFAULT_STYLE),
            userOverrides: {},
            allowSelfSwitch: true
          };
        }
        var roleStylesFetched = false;
        function clearStalePersonalNameStyles(userOverrides) {
          try {
            var overrides = userOverrides && typeof userOverrides === 'object'
              ? userOverrides
              : (readAdminRoleStyles().userOverrides || {});
            var map = JSON.parse(localStorage.getItem(NAME_STYLE_KEY) || '{}') || {};
            var next = {};
            var keys = Object.keys(map);
            for (var i = 0; i < keys.length; i++) {
              var em = keys[i];
              if (overrides[em]) next[em] = map[em];
            }
            localStorage.setItem(NAME_STYLE_KEY, JSON.stringify(next));
          } catch (eClear) {}
        }
        function fetchAdminRoleStyles(force) {
          if (roleStylesFetched && !force) return;
          roleStylesFetched = true;
          try {
            fetch(API_BASE + '/api/role-styles', { method: 'GET' })
              .then(function (r) { return r.json(); })
              .then(function (res) {
                if (!res || !res.ok) return;
                var next = {
                  roleDefaults: Object.assign({}, ROLE_DEFAULT_STYLE, res.roleDefaults || {}),
                  userOverrides: res.userOverrides && typeof res.userOverrides === 'object' ? res.userOverrides : {},
                  allowSelfSwitch: typeof res.allowSelfSwitch === 'boolean' ? res.allowSelfSwitch : true,
                  updatedAt: res.updatedAt || new Date().toISOString()
                };
                try { localStorage.setItem(ADMIN_ROLE_STYLES_KEY, JSON.stringify(next)); } catch (e) {}
                clearStalePersonalNameStyles(next.userOverrides);
                renderAuthSlots();
                applyNameStylesAll();
              }).catch(function () {});
          } catch (e) {}
        }
        function getUserNameStyle(email, role, userObj) {
          var r = String(role || 'member').toLowerCase();
          var key = String(email || '').trim().toLowerCase();
          var cfg = readAdminRoleStyles();
          if (key && cfg.userOverrides && cfg.userOverrides[key]) {
            return cfg.userOverrides[key];
          }
          if (userObj && userObj.styleSource === 'admin_user_override' && userObj.nameStyle) {
            return userObj.nameStyle;
          }
          /* ADMIN always follows roleDefaults (not personal self-style cache). */
          if (r !== 'admin' && r !== 'member' && cfg.allowSelfSwitch !== false) {
            try {
              var map = JSON.parse(localStorage.getItem(NAME_STYLE_KEY) || '{}') || {};
              if (key && map[key]) return map[key];
            } catch (e) {}
          }
          return (cfg.roleDefaults && cfg.roleDefaults[r]) || (userObj && userObj.nameStyle) || ROLE_DEFAULT_STYLE[r] || 'mint';
        }
        function resolveStyleForSurface(el) {
          if (!el) return 'mint';
          var email = (el.getAttribute('data-qcx-user') || el.getAttribute('data-email') || '').trim().toLowerCase();
          var role = (el.getAttribute('data-role') || el.getAttribute('data-tier') || 'member').toLowerCase();
          var nameHint = (el.getAttribute('data-qcx-user-name') || '').trim().toLowerCase();
          var cfg = readAdminRoleStyles();
          /* Blogger Atom often stamps noreply@blogger.com — not a real Role FX identity. */
          if (email && (email.indexOf('noreply@') === 0 || email === 'noreply@blogger.com')) {
            email = '';
          }
          if (email && email.indexOf('@') !== -1) {
            return getUserNameStyle(email, role, null);
          }
          if (nameHint) {
            var overrides = cfg.userOverrides || {};
            var oKeys = Object.keys(overrides);
            for (var oi = 0; oi < oKeys.length; oi++) {
              var em = oKeys[oi];
              var local = em.split('@')[0] || '';
              if (local && (nameHint === local || nameHint.indexOf(local) !== -1 || local.indexOf(nameHint) !== -1)) {
                return overrides[em];
              }
            }
            var ent = null;
            try { ent = readEnt(); } catch (eEnt) {}
            var u = ent && ent.user;
            if (u && u.name && String(u.name).trim().toLowerCase() === nameHint) {
              return getUserNameStyle(u.email, u.role || role, u);
            }
            if (nameHint === "k'" || nameHint === 'nguyễn văn cần' || nameHint === 'nguyen van can' || nameHint === 'cần nguyễn văn') {
              return (cfg.roleDefaults && cfg.roleDefaults.admin) || 'crimson';
            }
          }
          return (cfg.roleDefaults && cfg.roleDefaults[role]) || ROLE_DEFAULT_STYLE[role] || 'mint';
        }
        function applyNameStylesAll() {
          /* Real identity surfaces only — never stomp admin Role FX previews (.qcx-fx-preview). */
          var nodes = document.querySelectorAll(
            '.qcx-auth-slot .qcx-user-chip, #qcx-user-dropdown, [data-qcx-user], .qcx-comment-chip, .qcx-comment-item[data-qcx-user], .qcx-comment-item[data-qcx-user-name]'
          );
          for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (el.classList && el.classList.contains('qcx-fx-preview')) continue;
            if (el.closest && (el.closest('.rfx-prev-slot') || el.closest('#memberStylePreview') || el.closest('.rfx-ov-list') || el.closest('.qcx-fx-preview'))) continue;
            var styleId = resolveStyleForSurface(el);
            if (styleId) el.setAttribute('data-name-style', styleId);
          }
          var dd = document.getElementById('qcx-user-dropdown');
          if (dd && !dd.getAttribute('data-name-style')) {
            try {
              var ent2 = readEnt();
              var u2 = ent2 && ent2.user;
              if (u2) {
                dd.setAttribute('data-name-style', getUserNameStyle(u2.email, u2.role, u2));
                if (u2.email) dd.setAttribute('data-qcx-user', String(u2.email).toLowerCase());
              }
            } catch (e2) {}
          }
        }
        function broadcastRoleStylesRefresh() {
          try {
            if (typeof BroadcastChannel === 'undefined') return;
            var ch = new BroadcastChannel('qcx-role-styles');
            ch.postMessage({ type: 'role-styles-updated', at: Date.now() });
            ch.close();
          } catch (e) {}
        }
        if (!window.__qcxRoleStylesBcBound) {
          window.__qcxRoleStylesBcBound = true;
          try {
            if (typeof BroadcastChannel !== 'undefined') {
              var bc = new BroadcastChannel('qcx-role-styles');
              bc.onmessage = function () {
                fetchAdminRoleStyles(true);
              };
            }
          } catch (eBc) {}
          window.addEventListener('storage', function (ev) {
            if (ev && ev.key === ADMIN_ROLE_STYLES_KEY) {
              clearStalePersonalNameStyles();
              renderAuthSlots();
              applyNameStylesAll();
            }
          });
          try {
            if (!window.__qcxNameStyleMo && typeof MutationObserver !== 'undefined') {
              window.__qcxNameStyleMo = new MutationObserver(function (muts) {
                var need = false;
                for (var mi = 0; mi < muts.length; mi++) {
                  var nodes = muts[mi].addedNodes;
                  for (var ni = 0; ni < nodes.length; ni++) {
                    var n = nodes[ni];
                    if (n.nodeType !== 1) continue;
                    if ((n.matches && n.matches('[data-qcx-user], [data-qcx-user-name], .qcx-comment-item, .qcx-comment-chip')) ||
                        (n.querySelector && n.querySelector('[data-qcx-user], [data-qcx-user-name], .qcx-comment-item, .qcx-comment-chip'))) {
                      need = true;
                      break;
                    }
                  }
                  if (need) break;
                }
                if (need) applyNameStylesAll();
              });
              window.__qcxNameStyleMo.observe(document.documentElement, { childList: true, subtree: true });
            }
          } catch (eMo) {}
        }
        function setUserNameStyle(email, styleId, isAdminUser) {
          var key = String(email || '').trim().toLowerCase();
          try {
            /* Personal self-switch is VIP/PRO only; admin follows roleDefaults. */
            if (!isAdminUser && key) {
              var map = JSON.parse(localStorage.getItem(NAME_STYLE_KEY) || '{}') || {};
              map[key] = styleId;
              localStorage.setItem(NAME_STYLE_KEY, JSON.stringify(map));
            }
            if (isAdminUser && key) {
              var cfg = readAdminRoleStyles();
              if (cfg.userOverrides && cfg.userOverrides[key]) {
                cfg.userOverrides[key] = styleId;
                localStorage.setItem(ADMIN_ROLE_STYLES_KEY, JSON.stringify(cfg));
              }
            }
          } catch (e) {}
          applyNameStylesAll();
          broadcastRoleStylesRefresh();
        }
        window.__qcxGetUserNameStyle = getUserNameStyle;
        window.__qcxApplyNameStylesAll = applyNameStylesAll;
        window.__qcxBroadcastRoleStyles = broadcastRoleStylesRefresh;
        window.__qcxFetchAdminRoleStyles = fetchAdminRoleStyles;
        window.__qcxClearStalePersonalNameStyles = clearStalePersonalNameStyles;
        function roleBadgeHtml(role) {
          if (role === 'admin') {
            return '<svg class="qcx-urb-ico" viewBox="0 0 16 16" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M9.8 1L2.6 9.3h4.5L6.1 15l7.3-8.3H8.9L9.8 1z"/></svg><span class="qcx-urb-txt">ADMIN</span>';
          }
          if (role === 'vip') {
            return '<svg class="qcx-urb-ico" viewBox="0 0 16 16" width="9" height="9" fill="currentColor" aria-hidden="true"><path d="M2 12.2h12v1.6H2v-1.6zm0-8l3 3.1L8 3l3 4.3 3-3.1-1 6.8H3L2 4.2z"/></svg><span class="qcx-urb-txt">VIP</span>';
          }
          if (role === 'pro') {
            return '<svg class="qcx-urb-ico" viewBox="0 0 16 16" width="9" height="9" fill="currentColor" aria-hidden="true"><path d="M4.2 2.4h7.6l2.7 3.8L8 14 1.5 6.2l2.7-3.8z"/></svg><span class="qcx-urb-txt">PRO</span>';
          }
          return '<span class="qcx-urb-txt">MEMBER</span>';
        }
        function computeClientRole(email, vipExp, items) {
          if (isClientAdminEmail(email)) return 'admin';
          if (vipExp && new Date(vipExp).getTime() > Date.now()) return 'vip';
          var cnt = Array.isArray(items) ? items.length : (items && typeof items === 'object' ? Object.keys(items).length : 0);
          if (cnt > 0) return 'pro';
          return 'member';
        }
        function saveEnt(next) {
          try {
            var cur = readEnt();
            var merged = {
              sessionToken: next.sessionToken || cur.sessionToken || '',
              vipExpiresAt: next.vipExpiresAt || (next.user && next.user.vipExpiresAt) || cur.vipExpiresAt || null,
              unlockedItems: cur.unlockedItems || {},
              user: next.user || cur.user || null
            };
            if (Array.isArray(next.unlockedItems)) {
              next.unlockedItems.forEach(function (id) { merged.unlockedItems[id] = true; });
            }
            if (merged.user) {
              merged.user.role = computeClientRole(merged.user.email, merged.vipExpiresAt, merged.unlockedItems);
              merged.user.picture = getPreferredGoogleAvatar(merged.user.email, merged.user.name, merged.user.picture, merged.user.role);
              if (!isPlaceholderAvatar(merged.user.picture)) {
                saveAvatarCache(merged.user.email, merged.user.picture);
              }
            }
            localStorage.setItem(ENT_KEY, JSON.stringify(merged));
            renderAuthSlots();
            return merged;
          } catch (e) { return next; }
        }
        function clearEnt() {
          try { localStorage.removeItem(ENT_KEY); } catch (e) {}
          renderAuthSlots();
        }
        function renderAuthSlots() {
          var ent = readEnt();
          var u = ent && ent.user && ent.user.email ? ent.user : null;
          if (u) {
            var bestPic = getPreferredGoogleAvatar(u.email, u.name, u.picture, u.role);
            if (bestPic !== u.picture) {
              u.picture = bestPic;
              try { localStorage.setItem(ENT_KEY, JSON.stringify(ent)); } catch (e) {}
            }
            if (isPlaceholderAvatar(u.picture)) {
              probeRealAvatarAsync(u.email, u.name);
            }
          }
          var slots = document.querySelectorAll('.qcx-auth-slot');
          for (var i = 0; i < slots.length; i++) {
            var slot = slots[i];
            var loginBtn = slot.querySelector('.qcx-auth-login-btn');
            var chip = slot.querySelector('.qcx-user-chip');
            if (!loginBtn || !chip) {
              slot.innerHTML = slotMarkup;
              loginBtn = slot.querySelector('.qcx-auth-login-btn');
              chip = slot.querySelector('.qcx-user-chip');
            }
            if (!loginBtn || !chip) continue;
            var ico = loginBtn.querySelector('.qcx-google-ico');
            if (!ico || String(ico.innerHTML || '').indexOf('M22.56') === -1) {
              var wrap = document.createElement('div');
              wrap.innerHTML = GOOGLE_G_SVG;
              var fresh = wrap.firstChild;
              if (ico && ico.parentNode) ico.parentNode.replaceChild(fresh, ico);
              else if (loginBtn.firstChild) loginBtn.insertBefore(fresh, loginBtn.firstChild);
              else loginBtn.appendChild(fresh);
            }
            var lbl = loginBtn.querySelector('.qcx-signal-x-label');
            if (lbl && lbl.textContent !== 'Đăng nhập') lbl.textContent = 'Đăng nhập';
            if (!loginBtn.getAttribute('data-qcx-bound')) {
              loginBtn.setAttribute('data-qcx-bound', '1');
              loginBtn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
                triggerGoogleSignIn(null);
              }, true);
            }
            if (!chip.getAttribute('data-qcx-bound')) {
              chip.setAttribute('data-qcx-bound', '1');
              chip.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
                toggleUserDropdown(this);
              }, true);
            }
            if (u) {
              loginBtn.hidden = true;
              loginBtn.setAttribute('hidden', '');
              loginBtn.setAttribute('aria-hidden', 'true');
              try { loginBtn.style.setProperty('display', 'none', 'important'); } catch (eHide) {}
              chip.hidden = false;
              chip.removeAttribute('hidden');
              try { chip.style.removeProperty('display'); } catch (eShow) {}
              slot.classList.add('is-authed');
              var r = (u.role || 'member').toLowerCase();
              var ns = getUserNameStyle(u.email, r, u);
              chip.setAttribute('data-role', r);
              chip.setAttribute('data-tier', r.toUpperCase());
              chip.setAttribute('data-name-style', ns);
              if (u.email) chip.setAttribute('data-qcx-user', String(u.email).toLowerCase());
              chip.setAttribute('data-qcx-user-name', String(u.name || u.email.split('@')[0] || '').toLowerCase());
              var av = chip.querySelector('.qcx-user-avatar');
              var nm = chip.querySelector('.qcx-user-name');
              var bg = chip.querySelector('.qcx-user-role-badge');
              if (av) {
                av.src = getPreferredGoogleAvatar(u.email, u.name, u.picture, r);
                av.alt = u.name || u.email;
              }
              if (nm) nm.textContent = u.name || u.email.split('@')[0];
              if (bg) bg.innerHTML = roleBadgeHtml(r);
            } else {
              loginBtn.hidden = false;
              loginBtn.removeAttribute('hidden');
              loginBtn.removeAttribute('aria-hidden');
              try { loginBtn.style.removeProperty('display'); } catch (eShow2) {}
              chip.hidden = true;
              chip.setAttribute('hidden', '');
              try { chip.style.setProperty('display', 'none', 'important'); } catch (eHide2) {}
              slot.classList.remove('is-authed');
            }
          }
          try {
            if (u) {
              document.documentElement.classList.add('qcx-authed');
              try { document.dispatchEvent(new CustomEvent('qcx:authed')); } catch (eEv) {}
            } else document.documentElement.classList.remove('qcx-authed');
          } catch (eAuthed) {}
          applyNameStylesAll();
          var extraTriggers = document.querySelectorAll('[data-qcx-google-login]');
          for (var j = 0; j < extraTriggers.length; j++) {
            var trg = extraTriggers[j];
            if (!trg.getAttribute('data-qcx-bound')) {
              trg.setAttribute('data-qcx-bound', '1');
              trg.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
                triggerGoogleSignIn(null);
              }, true);
            }
          }
          // Override theme-inline login entry (theme script often re-assigns these later).
          window.__qcxTriggerGoogleSignIn = triggerGoogleSignIn;
          window.__qcxStartGoogleOAuthPopup = startGoogleOAuthPopup;
          try { window.triggerGoogleSignIn = triggerGoogleSignIn; } catch (e) {}
          if (!window.__qcxGisLoginCapture) {
            window.__qcxGisLoginCapture = true;
            document.addEventListener('click', function (ev) {
              var t = ev.target && ev.target.closest
                ? ev.target.closest('.qcx-auth-login-btn,[data-qcx-google-login]')
                : null;
              if (!t) return;
              ev.preventDefault();
              ev.stopPropagation();
              if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
              triggerGoogleSignIn(null);
            }, true);
          }
        }
        function buildClientAuthResponse(profile, recoverRes) {
          var cur = readEnt();
          var email = String(profile.email || '').trim().toLowerCase();
          var rawName = String(profile.name || '').trim();
          var name = rawName || (email === 'kkymljnk@gmail.com' ? 'Nguyễn Văn Cần' : (email === 'superkhung@gmail.com' ? 'SuperKhung' : (email.split('@')[0] || 'Member')));
          var vipExp = (recoverRes && recoverRes.vipExpiresAt) || cur.vipExpiresAt || null;
          var itemsArr = (recoverRes && Array.isArray(recoverRes.unlockedItems))
            ? recoverRes.unlockedItems.slice()
            : Object.keys(cur.unlockedItems || {});
          var role = computeClientRole(email, vipExp, itemsArr);
          var pic = getPreferredGoogleAvatar(email, name, profile.picture, role);
          var sess = (recoverRes && recoverRes.sessionToken) || cur.sessionToken || ('qcx_gmail_' + encodeURIComponent(email));
          return {
            ok: true,
            sessionToken: sess,
            vipExpiresAt: vipExp,
            unlockedItems: itemsArr,
            user: {
              email: email,
              name: name,
              picture: pic,
              role: role,
              vipActive: !!(vipExp && new Date(vipExp).getTime() > Date.now()),
              vipUntil: vipExp ? new Date(vipExp).getTime() : 0,
              items: itemsArr,
              itemCount: itemsArr.length
            }
          };
        }
        var SAVED_ACCS_KEY = 'qcx_saved_google_accounts_v1';
        function getSavedGoogleAccounts() {
          try {
            var arr = JSON.parse(localStorage.getItem(SAVED_ACCS_KEY) || '[]');
            return Array.isArray(arr) ? arr : [];
          } catch (e) { return []; }
        }
        function rememberGoogleAccount(userObj) {
          if (!userObj || !userObj.email) return;
          try {
            var list = getSavedGoogleAccounts().filter(function (a) {
              return a && a.email && a.email.toLowerCase() !== userObj.email.toLowerCase();
            });
            var role = userObj.role || (isClientAdminEmail(userObj.email) ? 'admin' : 'member');
            var pic = getPreferredGoogleAvatar(userObj.email, userObj.name, userObj.picture, role);
            list.unshift({
              email: userObj.email,
              name: userObj.name || userObj.email.split('@')[0],
              picture: pic,
              role: role
            });
            localStorage.setItem(SAVED_ACCS_KEY, JSON.stringify(list.slice(0, 4)));
          } catch (e) {}
        }
        function finishAuthSuccess(res, email, name) {
          if (isClientAdminEmail(email) && res.user) res.user.role = 'admin';
          if (res.user) {
            res.user.picture = getPreferredGoogleAvatar(email, res.user.name || name, res.user.picture, res.user.role);
            rememberGoogleAccount(res.user);
          }
          saveEnt(res);
          probeRealAvatarAsync(email, name);
          flushPendingSaveAfterLogin();
          fetchSavedPosts(true).then(function () { updatePostSaveButtonState(); });
          killAuthModal();
          return true;
        }
        function authenticateWithIdToken(idToken) {
          return fetch(API_BASE + '/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: idToken })
          }).then(function (r) { return r.json(); }).then(function (res) {
            if (res && res.ok && res.sessionToken && res.user && res.user.email) {
              var email = String(res.user.email).trim().toLowerCase();
              var name = String(res.user.name || email.split('@')[0]).trim();
              return finishAuthSuccess(res, email, name);
            }
            return Promise.reject(new Error('ID_TOKEN_AUTH_FAILED'));
          });
        }
        function authenticateGmailProfile(profile, accessToken) {
          var email = String((profile && profile.email) || '').trim().toLowerCase();
          var rawName = String((profile && profile.name) || '').trim();
          var name = rawName || (email === 'kkymljnk@gmail.com' ? 'Nguyễn Văn Cần' : (email === 'superkhung@gmail.com' ? 'SuperKhung' : (email.split('@')[0] || '')));
          var bestPic = getPreferredGoogleAvatar(email, name, profile && profile.picture, isClientAdminEmail(email) ? 'admin' : 'member');
          return fetch(API_BASE + '/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accessToken ? { accessToken: accessToken, fallbackProfile: { email: email, name: name, picture: bestPic } } : { fallbackProfile: { email: email, name: name, picture: bestPic } })
          }).then(function (r) { return r.json(); }).then(function (res) {
            if (res && res.ok && res.sessionToken) {
              return finishAuthSuccess(res, email, name);
            }
            return Promise.reject(new Error('FALLBACK'));
          }).catch(function () {
            return fetch(API_BASE + '/api/recover', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: email })
            }).then(function (r) { return r.json(); }).catch(function () { return null; }).then(function (rec) {
              var built = buildClientAuthResponse({ email: email, name: name, picture: bestPic }, rec && rec.ok ? rec : null);
              if (built && built.user) rememberGoogleAccount(built.user);
              saveEnt(built);
              probeRealAvatarAsync(email, name);
              flushPendingSaveAfterLogin();
              fetchSavedPosts(true).then(function () { updatePostSaveButtonState(); });
              killAuthModal();
              return true;
            });
          });
        }
        function loadGsiScript(cb) {
          if (window.google && window.google.accounts && window.google.accounts.id) {
            if (cb) cb();
            return;
          }
          if (gsiScriptLoading) {
            if (cb) setTimeout(function () { loadGsiScript(cb); }, 120);
            return;
          }
          gsiScriptLoading = true;
          var s = document.createElement('script');
          s.src = 'https://accounts.google.com/gsi/client';
          s.async = true;
          s.defer = true;
          s.onload = function () { gsiScriptLoading = false; if (cb) cb(); };
          s.onerror = function () { gsiScriptLoading = false; if (cb) cb(); };
          (document.head || document.documentElement).appendChild(s);
        }
        function buildGoogleOAuthRedirectUrl() {
          if (!googleClientId) googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
          // Same-tab redirect avoids blank accounts.google.com/gsi/transform popups
          // (GSI token popup breaks when opener/COOP is lost in embedded browsers).
          var redirectUri = location.origin + '/';
          try {
            sessionStorage.setItem('qcx_oauth_return', location.href.split('#')[0]);
            sessionStorage.setItem('qcx_oauth_pending', '1');
          } catch (e) {}
          return 'https://accounts.google.com/o/oauth2/v2/auth?' + [
            'client_id=' + encodeURIComponent(googleClientId),
            'redirect_uri=' + encodeURIComponent(redirectUri),
            'response_type=token',
            'scope=' + encodeURIComponent('openid email profile'),
            'prompt=select_account',
            'include_granted_scopes=true',
            'state=' + encodeURIComponent('qcx_oauth1')
          ].join('&');
        }
        function consumeOAuthRedirectHash() {
          var hash = String(location.hash || '');
          if (hash.indexOf('access_token=') === -1) return false;
          var params = new URLSearchParams(hash.replace(/^#/, ''));
          var token = params.get('access_token');
          var state = params.get('state') || '';
          if (!token) return false;
          try {
            history.replaceState(null, '', location.pathname + location.search);
          } catch (e) {}
          try { sessionStorage.removeItem('qcx_oauth_pending'); } catch (e2) {}
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': 'Bearer ' + token }
          }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (gInfo) {
            if (!(gInfo && gInfo.email)) return;
            if (gInfo.picture) saveAvatarCache(gInfo.email, gInfo.picture);
            return authenticateGmailProfile({ email: gInfo.email, name: gInfo.name, picture: gInfo.picture }, token);
          }).then(function () {
            var ret = '';
            try { ret = sessionStorage.getItem('qcx_oauth_return') || ''; sessionStorage.removeItem('qcx_oauth_return'); } catch (e3) {}
            if (ret && ret.indexOf(location.origin) === 0 && ret.split('#')[0] !== location.href.split('#')[0]) {
              location.replace(ret);
            }
          });
          return true;
        }
        function startGoogleOAuthPopup(statusEl) {
          // Same-tab OAuth only. Never open GIS popup / gsi/transform (blank + no return).
          killAuthModal();
          loadLocalAuthCfg();
          if (!googleClientId) googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
          if (statusEl) {
            try {
              statusEl.classList.remove('is-err');
              statusEl.textContent = 'Đang chuyển tới Google...';
            } catch (eSt) {}
          }
          location.assign(buildGoogleOAuthRedirectUrl());
        }
        function renderSavedAccountsPicker() {
          var box = document.getElementById('qcx-ga-saved-list');
          if (!box) return;
          var list = getSavedGoogleAccounts().slice();
          var hasOwner = list.some(function (a) { return a && String(a.email || '').toLowerCase() === 'kkymljnk@gmail.com'; });
          if (!hasOwner) {
            list.push({ email: 'kkymljnk@gmail.com', name: 'Nguyễn Văn Cần', role: 'admin', picture: KNOWN_GOOGLE_AVATARS['kkymljnk@gmail.com'] });
          }
          box.style.display = 'block';
          var html = '<div style="font-size:10.5px;color:#7ca690;margin:0 0 6px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Tài khoản Google gợi ý / đã lưu</div>';
          list.forEach(function (acc, idx) {
            var r = acc.role || (isClientAdminEmail(acc.email) ? 'admin' : 'member');
            var av = getPreferredGoogleAvatar(acc.email, acc.name, acc.picture, r);
            html +=
              '<button type="button" class="qcx-ga-saved-item" data-idx="' + idx + '" style="display:flex;align-items:center;gap:9px;width:100%;padding:7px 10px;margin-bottom:6px;border-radius:10px;border:1px solid rgba(52,230,160,.25);background:rgba(12,30,22,.82);color:#ecfdf5;cursor:pointer;text-align:left;transition:all .16s">' +
                '<img src="' + escapeHtml(av) + '" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid #34e6a0"/>' +
                '<span style="flex:1;min-width:0">' +
                  '<strong style="display:block;font-size:12.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(acc.name || acc.email) + '</strong>' +
                  '<small style="display:block;font-size:11px;color:#8ab8a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(acc.email) + '</small>' +
                '</span>' +
                '<span style="font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:999px;background:rgba(52,230,160,.16);color:#34e6a0">1-Click</span>' +
              '</button>';
          });
          box.innerHTML = html;
          var items = box.querySelectorAll('.qcx-ga-saved-item');
          for (var i = 0; i < items.length; i++) {
            items[i].addEventListener('click', function () {
              var ix = parseInt(this.getAttribute('data-idx') || '0', 10);
              var picked = list[ix];
              if (!picked) return;
              var st = document.getElementById('qcx-ga-status');
              if (st) { st.classList.remove('is-err'); st.textContent = 'Đang đăng nhập ' + picked.email + '...'; }
              authenticateGmailProfile(picked, '');
            });
          }
        }
        function ensureGoogleAuthModal() {
          var m = document.getElementById('qcx-google-auth-modal');
          if (m && m.getAttribute('data-qcx-v3') === '1') return m;
          if (!m) {
            m = document.createElement('div');
            m.id = 'qcx-google-auth-modal';
            m.setAttribute('role', 'dialog');
            m.setAttribute('aria-modal', 'true');
            document.body.appendChild(m);
          }
          m.setAttribute('data-qcx-v3', '1');
          m.innerHTML =
            '<div class="qcx-payos-dialog">' +
              '<div class="qcx-payos-head">' +
                '<div><span class="qcx-payos-badge">GOOGLE IDENTITY</span><h3 class="qcx-payos-title">Đăng nhập bằng Gmail</h3></div>' +
                '<button type="button" class="qcx-payos-close" id="qcx-ga-close" aria-label="Đóng">&#215;</button>' +
              '</div>' +
              '<div id="qcx-ga-saved-list" style="display:none;margin-bottom:9px"></div>' +
              '<button type="button" class="qcx-google-oauth-btn" id="qcx-ga-popup-btn" style="display:none">' +
                '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
                '<span>Mở cửa sổ Google OAuth Popup</span>' +
              '</button>' +
              '<div style="display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(52,230,160,.18);margin-bottom:9px">' +
                '<img id="qcx-ga-live-av" src="' + KNOWN_GOOGLE_AVATARS['kkymljnk@gmail.com'] + '" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid #34e6a0"/>' +
                '<span style="font-size:11.5px;color:#cde7d8;line-height:1.35">Nhập <strong>Gmail</strong> để tự động tải Avatar Google, phân quyền Role Color &amp; khôi phục VIP</span>' +
              '</div>' +
              '<input type="email" class="qcx-payos-input" id="qcx-ga-email" placeholder="Địa chỉ Gmail của bạn (VD: tenban@gmail.com)" autocomplete="email"/>' +
              '<input type="text" class="qcx-payos-input" id="qcx-ga-name" placeholder="Họ và tên hiển thị (Để trống sẽ tự nhận theo Gmail)" autocomplete="name"/>' +
              '<button type="button" class="qcx-payos-btn" id="qcx-ga-submit">Tiếp tục với Gmail &amp; Đồng bộ Role</button>' +
              '<div class="qcx-payos-status" id="qcx-ga-status">Tự động nhận diện Admin / VIP / PRO / Member &amp; mở khóa bài viết trên mọi thiết bị</div>' +
            '</div>';
          document.getElementById('qcx-ga-close').addEventListener('click', function () { m.classList.remove('is-open'); });
          document.getElementById('qcx-ga-popup-btn').addEventListener('click', function () {
            startGoogleOAuthPopup(document.getElementById('qcx-ga-status'));
          });
          var emField = document.getElementById('qcx-ga-email');
          var nmField = document.getElementById('qcx-ga-name');
          var liveAv = document.getElementById('qcx-ga-live-av');
          if (emField && nmField) {
            emField.addEventListener('input', function () {
              var v = (emField.value || '').trim().toLowerCase();
              if (v === 'kkymljnk@gmail.com' && !nmField.value) nmField.value = 'Nguyễn Văn Cần';
              else if (v === 'superkhung@gmail.com' && !nmField.value) nmField.value = 'SuperKhung';
              if (liveAv && v.indexOf('@') !== -1) {
                liveAv.src = getPreferredGoogleAvatar(v, nmField.value || v.split('@')[0], '', isClientAdminEmail(v) ? 'admin' : 'member');
                probeRealAvatarAsync(v, nmField.value, function (resolvedUrl) {
                  if (liveAv && resolvedUrl) liveAv.src = resolvedUrl;
                });
              }
            });
          }
          function submitDirect() {
            var name = (document.getElementById('qcx-ga-name').value || '').trim();
            var email = (document.getElementById('qcx-ga-email').value || '').trim().toLowerCase();
            var st = document.getElementById('qcx-ga-status');
            if (!email || email.indexOf('@') === -1) {
              st.textContent = 'Vui lòng nhập đúng địa chỉ Gmail của bạn!';
              st.classList.add('is-err');
              return;
            }
            st.classList.remove('is-err');
            st.textContent = 'Đang kết nối Gmail & đồng bộ quyền...';
            authenticateGmailProfile({ email: email, name: name }, '');
          }
          document.getElementById('qcx-ga-submit').addEventListener('click', submitDirect);
          ['qcx-ga-name', 'qcx-ga-email'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); submitDirect(); } });
          });
          return m;
        }
        function openFallbackAuthModal() {
          // Custom Gmail modal removed — always go straight to Google.
          killAuthModal();
          startGoogleOAuthPopup(null);
        }
        function triggerGoogleSignIn(opts) {
          /* Casual login (chip/menu) must not inherit a stale bookmark pending-save. */
          if (!(opts && opts.fromSave)) clearPendingSave();
          killAuthModal();
          loadLocalAuthCfg();
          if (!googleClientId) googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
          // GIS ID-token button / One Tap — never theme initTokenClient (gsi/transform).
          startGoogleOAuthPopup(null);
          fetchAuthConfig().then(function () { /* warm/refresh client id for next time */ });
        }
        // Keep beating theme-inline re-assignments after boot.
        window.__qcxTriggerGoogleSignIn = triggerGoogleSignIn;
        window.__qcxStartGoogleOAuthPopup = startGoogleOAuthPopup;
        try { window.triggerGoogleSignIn = triggerGoogleSignIn; } catch (eBind) {}
        var _gisReassert = 0;
        var _gisReassertTimer = window.setInterval(function () {
          window.__qcxTriggerGoogleSignIn = triggerGoogleSignIn;
          window.__qcxStartGoogleOAuthPopup = startGoogleOAuthPopup;
          try { window.triggerGoogleSignIn = triggerGoogleSignIn; } catch (e2) {}
          _gisReassert += 1;
          if (_gisReassert >= 20) window.clearInterval(_gisReassertTimer);
        }, 250);
        var SAVED_PAGE_SIZE = 5;
        var _savedModalList = [];
        var _savedModalShown = SAVED_PAGE_SIZE;
        function renderSavedModalBody(list, shown) {
          var items = Array.isArray(list) ? list.slice(0, 50) : [];
          _savedModalList = items;
          var limit = Math.max(SAVED_PAGE_SIZE, Number(shown) || SAVED_PAGE_SIZE);
          if (limit > items.length) limit = items.length;
          _savedModalShown = limit || SAVED_PAGE_SIZE;
          if (!items.length) {
            return '<p class="qcx-saved-empty">Chưa có bài nào' +
              '<span class="qcx-saved-hint">Mở một bài viết và bấm Lưu bài</span></p>';
          }
          var visible = items.slice(0, limit);
          var rows = visible.map(function (p, i) {
            var href = escapeHtml(String((p && p.url) || '#'));
            var title = escapeHtml(String((p && p.title) || (p && p.id) || 'Bài viết'));
            var id = escapeHtml(String((p && p.id) || ''));
            var idx = String(i + 1).padStart(2, '0');
            return '<li class="qcx-saved-item" data-id="' + id + '">' +
              '<span class="qcx-saved-idx" aria-hidden="true">' + idx + '</span>' +
              '<a class="qcx-saved-link" href="' + href + '" title="' + title + '">' + title + '</a>' +
              '<button type="button" class="qcx-saved-del" data-id="' + id + '" aria-label="Xóa">×</button>' +
              '</li>';
          }).join('');
          var remain = items.length - visible.length;
          var more = remain > 0
            ? ('<button type="button" class="qcx-saved-more" id="qcx-saved-more">' +
                'Xem tiếp (' + remain + ')</button>')
            : '';
          return '<ul class="qcx-saved-list">' + rows + '</ul>' + more;
        }
        function paintSavedModal(list, shown) {
          var body = document.getElementById('qcx-saved-body');
          var countEl = document.getElementById('qcx-saved-count');
          var items = Array.isArray(list) ? list : [];
          if (body) body.innerHTML = renderSavedModalBody(items, shown);
          if (countEl) {
            var shownN = Math.min(_savedModalShown, items.length);
            countEl.textContent = items.length
              ? (shownN + ' / ' + items.length)
              : '0';
          }
        }
        function closeSavedPostsModal() {
          var m = document.getElementById('qcx-saved-modal');
          if (m) m.classList.remove('is-open');
        }
        function bindSavedModalActions(modal) {
          if (!modal || modal.getAttribute('data-bound') === '1') return;
          modal.setAttribute('data-bound', '1');
          modal.addEventListener('click', function (ev) {
            var t = ev.target;
            if (t === modal || (t && t.id === 'qcx-saved-close')) {
              closeSavedPostsModal();
              return;
            }
            var moreBtn = t && t.closest ? t.closest('#qcx-saved-more,.qcx-saved-more') : null;
            if (moreBtn) {
              ev.preventDefault();
              ev.stopPropagation();
              paintSavedModal(_savedModalList, _savedModalShown + SAVED_PAGE_SIZE);
              return;
            }
            var del = t && t.closest ? t.closest('.qcx-saved-del') : null;
            if (!del) return;
            ev.preventDefault();
            ev.stopPropagation();
            var id = del.getAttribute('data-id');
            if (!id) return;
            apiUnsavePost(id).then(function (list) {
              paintSavedModal(list, _savedModalShown);
              updatePostSaveButtonState();
              var countEl = document.getElementById('qcx-ud-saved-count');
              if (countEl) {
                var n = Array.isArray(list) ? list.length : 0;
                countEl.textContent = String(n);
                countEl.hidden = n < 1;
              }
            }).catch(function () {});
          });
          document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') closeSavedPostsModal();
          });
        }
        function openSavedPostsModal() {
          var ent = readEnt();
          var u = (ent && ent.user) || null;
          if (!u) return;
          var modal = document.getElementById('qcx-saved-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'qcx-saved-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-label', 'Các bài viết đã lưu');
            document.body.appendChild(modal);
            bindSavedModalActions(modal);
          }
          var cached = readSavedPostsCache(u.email);
          _savedModalShown = SAVED_PAGE_SIZE;
          modal.innerHTML =
            '<div class="qcx-saved-dialog">' +
              '<div class="qcx-saved-head">' +
                '<h3 class="qcx-saved-title">Bài đã lưu</h3>' +
                '<button type="button" class="qcx-saved-close" id="qcx-saved-close" aria-label="Đóng">×</button>' +
              '</div>' +
              '<div class="qcx-saved-meta">' +
                '<p class="qcx-saved-label">Danh sách</p>' +
                '<span class="qcx-saved-count" id="qcx-saved-count">0</span>' +
              '</div>' +
              '<div class="qcx-saved-body" id="qcx-saved-body"></div>' +
            '</div>';
          paintSavedModal(cached, SAVED_PAGE_SIZE);
          modal.classList.add('is-open');
          fetchSavedPosts(true).then(function (list) {
            if (!modal.classList.contains('is-open')) return;
            paintSavedModal(list, _savedModalShown);
            updatePostSaveButtonState();
          }).catch(function () {});
        }
        function toggleUserDropdown(anchorBtn) {
          var dd = document.getElementById('qcx-user-dropdown');
          if (!dd) {
            dd = document.createElement('div');
            dd.id = 'qcx-user-dropdown';
            document.body.appendChild(dd);
            document.addEventListener('click', function (ev) {
              if (!dd.classList.contains('is-open')) return;
              if (dd.contains(ev.target) || (ev.target.closest && ev.target.closest('.qcx-user-chip'))) return;
              dd.classList.remove('is-open');
            });
          }
          if (dd.classList.contains('is-open')) { dd.classList.remove('is-open'); return; }
          var ent = readEnt();
          var u = (ent && ent.user) || null;
          if (!u) return;
          var role = (u.role || 'member').toLowerCase();
          var activeStyle = getUserNameStyle(u.email, role, u);
          dd.setAttribute('data-role', role);
          dd.setAttribute('data-name-style', activeStyle);
          var ICO_OUT = '<svg class="qcx-ud-ico qcx-ud-ico--stroke" viewBox="0 0 16 16" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2.5H3.5v11H6M10.5 5l3 3-3 3M13.5 8H6.5"/></svg>';
          var ICO_GEAR = '<svg class="qcx-ud-ico qcx-ud-ico--stroke" viewBox="0 0 16 16" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.4M8 13.1v1.4M1.5 8h1.4M13.1 8h1.4M3.1 3.1l1 1M11.9 11.9l1 1M12.9 3.1l-1 1M4.1 11.9l-1 1"/></svg>';
          var ICO_BOOK = '<svg class="qcx-ud-ico qcx-ud-ico--stroke" viewBox="0 0 16 16" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2.5h8v11l-4-2.4L4 13.5v-11z"/></svg>';
          var badgeLabel = role === 'admin' ? 'ADMIN' : (role === 'vip' ? 'VIP' : (role === 'pro' ? 'PRO' : 'MEMBER'));
          var avUrl = getPreferredGoogleAvatar(u.email, u.name, u.picture, role);
          var cachedSaved = readSavedPostsCache(u.email);
          var savedN = Array.isArray(cachedSaved) ? cachedSaved.length : 0;
          var adminLinkHtml = (role === 'admin' && isClientAdminEmail(u.email))
            ? ('<a class="qcx-ud-btn is-admin" id="qcx-ud-admin" href="/p/admin.html">' + ICO_GEAR + '<span>Trang quản trị</span></a>')
            : '';
          // Hierarchy: identity → actions (saved modal + admin + logout).
          dd.innerHTML =
            '<div class="qcx-ud-head"><img src="' + avUrl + '" alt=""/>' +
              '<div class="qcx-ud-meta">' +
                '<p class="qcx-ud-name">' + escapeHtml(u.name || u.email) + '</p>' +
                '<p class="qcx-ud-sub">' +
                  '<span class="qcx-ud-role" data-role="' + role + '">' + badgeLabel + '</span>' +
                  '<span class="qcx-ud-dot" aria-hidden="true">·</span>' +
                  '<span class="qcx-ud-email">' + escapeHtml(u.email) + '</span>' +
                '</p>' +
              '</div></div>' +
            '<div class="qcx-ud-divider"></div>' +
            '<div class="qcx-ud-actions">' +
              '<button type="button" class="qcx-ud-btn" id="qcx-ud-saved">' + ICO_BOOK +
                '<span>Bài đã lưu</span>' +
                '<span class="qcx-ud-count" id="qcx-ud-saved-count"' + (savedN ? '' : ' hidden') + '>' + savedN + '</span></button>' +
              adminLinkHtml +
              '<button type="button" class="qcx-ud-btn is-danger" id="qcx-ud-logout">' + ICO_OUT + '<span>Đăng xuất</span></button>' +
            '</div>';
          var rect = anchorBtn.getBoundingClientRect();
          dd.style.top = Math.min(window.innerHeight - 200, Math.max(8, rect.bottom + 6)) + 'px';
          dd.style.left = Math.min(window.innerWidth - 252, Math.max(8, rect.right - 236)) + 'px';
          dd.classList.add('is-open');
          var savedBtn = document.getElementById('qcx-ud-saved');
          if (savedBtn) savedBtn.onclick = function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            dd.classList.remove('is-open');
            openSavedPostsModal();
          };
          var logoutBtn = document.getElementById('qcx-ud-logout');
          if (logoutBtn) logoutBtn.onclick = function () {
            dd.classList.remove('is-open');
            clearEnt();
            updatePostSaveButtonState();
          };
          fetchSavedPosts(true).then(function (list) {
            if (!dd.classList.contains('is-open')) return;
            var countEl = document.getElementById('qcx-ud-saved-count');
            if (!countEl) return;
            var n = Array.isArray(list) ? list.length : 0;
            countEl.textContent = String(n);
            countEl.hidden = n < 1;
            updatePostSaveButtonState();
          });
        }
        // Capture-phase: win over theme-inline fat menu (FX / VIP / sync / admin links).
        if (!window.__qcxSlimUserMenuBound) {
          window.__qcxSlimUserMenuBound = true;
          document.addEventListener('click', function (ev) {
            var t = ev.target;
            var chip = t && t.closest ? t.closest('.qcx-user-chip') : null;
            if (!chip || chip.hidden || chip.getAttribute('hidden') != null) return;
            if (ev.target.closest && ev.target.closest('#qcx-user-dropdown')) return;
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
            toggleUserDropdown(chip);
          }, true);
        }
        fetchAdminRoleStyles();
        fetchAuthConfig().then(function () { /* warm GSI client id for native chooser */ });
        consumeOAuthRedirectHash();
        ensurePostSaveButton();
        window.__qcxRenderAuthSlots = renderAuthSlots;
        window.__qcxTriggerGoogleSignIn = triggerGoogleSignIn;
        window.__qcxEnsurePostSaveButton = ensurePostSaveButton;
      })();
    }

    if (typeof window.__qcxRenderAuthSlots === 'function') {
      try { window.__qcxRenderAuthSlots(); } catch (ignore) {}
    }
    if (typeof window.__qcxEnsurePostSaveButton === 'function') {
      try { window.__qcxEnsurePostSaveButton(); } catch (ignore) {}
    }
  }
  window.__qcxEnsureGmailAuthEngine = ensureGmailAuthEngine;

  /* Re-entry after CDN bump: refresh atmosphere/fonts/menu/ghost + Gmail Auth & UTF-8 healer. */
  if (already) {
    ensureBreakdevFonts();
    ensureDefaultFavicon();
    ensureAtmosphere();
    ensureGmailAuthEngine();
    ensureRelatedRailSquareThumbs();
    ensureHeroPreviewClamp();
    ensureMenuDrawer();
    ensureMobileNavReady();
    ensureSharpBrandAvatar();
    ensureGhostBlink();
    scheduleSharpenCardImages();
    window.setTimeout(ensureGmailAuthEngine, 100);
    window.setTimeout(ensureGhostBlink, 400);
    window.setTimeout(ensureSharpBrandAvatar, 200);
    scheduleSharpenCardImages(null, 400);
    return;
  }

  bootRescue();
  ensureBreakdevFonts();
  ensureDefaultFavicon();
  ensureAtmosphere();
  ensureGmailAuthEngine();
  ensureRelatedRailSquareThumbs();
  ensureHeroPreviewClamp();
  ensureSidebarSearch();
  ensureSidebarRail();
  /* relocateHero deferred/boot removed — SSR hero before .main-wrapper is final. */
  hideDropsOnHome();
  polishHeroBrand();
  ensureCardLabelsWithTutorial(document);
  ensureCardLabelMore(document);
  bindCardLabelMoreResize();
  ensureMacFrameDots(document);
  ensureHomepageCardReveal(document);
  ensureAdminChrome();
  ensureSiteFooter();
  swapBrandMarkToWebp();
  ensureSharpBrandAvatar();
  ensureGhostBlink();
  scheduleSharpenCardImages();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      ensureBreakdevFonts();
      ensureDefaultFavicon();
      ensureAtmosphere();
      ensureGmailAuthEngine();
      ensureRelatedRailSquareThumbs();
      ensureHeroPreviewClamp();
      ensureSidebarSearch();
      ensureSidebarRail();
      hideDropsOnHome();
      polishHeroBrand();
      ensureCardLabelsWithTutorial(document);
      ensureCardLabelMore(document);
      bindCardLabelMoreResize();
      ensureMacFrameDots(document);
      ensureHomepageCardReveal(document);
      ensureAdminChrome();
      ensureSiteFooter();
      swapBrandMarkToWebp();
      ensureSharpBrandAvatar();
      ensureGhostBlink();
      scheduleSharpenCardImages();
    }, { once: true });
  }
  /* Deferred polish only when chrome is still missing (anti-FOUC: no spare re-paint on F5). */
  function qcxNeedChromePolish() {
    var needsAtm = !isHomepageView() && !document.getElementById('qcx-atmosphere');
    return needsAtm ||
      !document.querySelector('.qcx-sidebar-rail, #PopularPosts1, .qcx-site-footer, #qcx-menu');
  }
  function qcxDeferredPolish(fn, ms) {
    window.setTimeout(function () {
      if (!qcxNeedChromePolish() && fn !== ensureGmailAuthEngine && fn !== syncEmptyCommentsShell &&
          fn !== ensureGhostBlink && fn !== sharpenCardImages && fn !== ensureSharpBrandAvatar) {
        return;
      }
      try { fn(); } catch (ignoreDefer) {}
    }, ms);
  }
  window.setTimeout(ensureGmailAuthEngine, 100);
  window.setTimeout(ensureGmailAuthEngine, 500);
  window.setTimeout(function(){
    polishHeroBrand();
    ensureCardLabelsWithTutorial(document);
    ensureCardLabelMore(document);
    ensureMacFrameDots(document);
    ensureHomepageCardReveal(document);
  }, 80);
  window.setTimeout(function(){
    ensureMacFrameDots(document);
    ensureHomepageCardReveal(document);
  }, 400);
  window.setTimeout(function(){
    if (qcxNeedChromePolish() || !document.querySelector('.qcx-card-labels, .card-content a[rel=tag]')) {
      polishHeroBrand();
      ensureCardLabelsWithTutorial(document);
      ensureCardLabelMore(document);
    } else {
      ensureCardLabelMore(document);
    }
  }, 400);
  qcxDeferredPolish(ensureSidebarRail, 80);
  qcxDeferredPolish(ensureSidebarRail, 400);
  /* Do not deferred-relocate hero — SSR slot is final; late move = CLS. */
  qcxDeferredPolish(hideDropsOnHome, 80);
  qcxDeferredPolish(hideDropsOnHome, 400);
  qcxDeferredPolish(ensureAdminChrome, 60);
  qcxDeferredPolish(ensureAdminChrome, 300);
  window.setTimeout(ensureAdminChrome, 800);
  qcxDeferredPolish(ensureSiteFooter, 100);
  qcxDeferredPolish(ensureSiteFooter, 500);
  /* Atmosphere already in head — only inject if truly missing. */
  window.setTimeout(function(){
    if (!document.getElementById('qcx-atmosphere')) ensureAtmosphere();
  }, 80);
  window.setTimeout(syncEmptyCommentsShell, 120);
  window.setTimeout(syncEmptyCommentsShell, 600);
  qcxDeferredPolish(ensureMobileNavReady, 120);
  qcxDeferredPolish(ensureMobileNavReady, 500);
  window.setTimeout(ensureGhostBlink, 200);
  window.setTimeout(ensureGhostBlink, 800);
  window.setTimeout(ensureSharpBrandAvatar, 80);
  window.setTimeout(ensureSharpBrandAvatar, 400);
  scheduleSharpenCardImages(null, 120);

  /* Always scrub native Blog1 snippets (CSS leak), even when rescue skips. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSnippetClean, { once: true });
  else bootSnippetClean();
})();
