(function(){
  var already = document.documentElement.getAttribute('data-qcx-rescue') === 'true';
  document.documentElement.setAttribute('data-qcx-rescue', 'true');

  /* F5 homepage: hide Blog SSR immediately so stale cards never flash before rescue. */
  (function hideSsrOnReload() {
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      var reload = (nav && nav.type === 'reload') ||
        (typeof performance.navigation !== 'undefined' && performance.navigation.type === 1);
      if (!reload) return;
      var item = document.documentElement.getAttribute('data-page-item') || '';
      var type = document.documentElement.getAttribute('data-page-type') || '';
      if (item === 'single' || type === 'post' || type === 'page') return;
      document.documentElement.setAttribute('data-qcx-reload', '1');
      if (document.getElementById('qcx-reload-hide-ssr')) return;
      var st = document.createElement('style');
      st.id = 'qcx-reload-hide-ssr';
      st.textContent =
        'html[data-qcx-reload="1"] .widget.Blog:not(.qcx-rescue-blog):not(.qcx-rescue-skel){' +
        'visibility:hidden!important;opacity:0!important;pointer-events:none!important;' +
        'min-height:240px!important}';
      (document.head || document.documentElement).appendChild(st);
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

  function upgradeThumb(url, opts) {
    if (!url) return '';
    var anim = !!(opts && opts.anim) || isLikelyAnimatedUrl(url);
    var u = String(url);
    /* External featured images via Blogger proxy default to ~512px — force full res. */
    if (/blogger_img_proxy/i.test(u)) {
      u = u
        .replace(/=s\d+(?:-[^?&#]*)?(?=$|[?#])/i, '')
        .replace(/=w\d+-h\d+(?:-[^?&#]*)?(?=$|[?#])/i, '');
      return u + (anim ? '=w800-h450-c' : '=s0');
    }
    /* Retina card targets: ~390–700 CSS px × 2–3 DPR needs ≥1200–1600 source. */
    var crop = anim ? 'w640-h360-c' : 'w1600-h900-c';
    var bare = anim ? 's640' : 's1600';
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
      var next = upgradeThumb(raw, { anim: anim });
      if (!next) return;
      if (dataSrc && dataSrc.indexOf('data:') !== 0 && dataSrc !== next) {
        img.setAttribute('data-src', next);
      }
      try {
        var live = img.currentSrc || img.src || '';
        var soft = /blogger_img_proxy/i.test(live) && img.naturalWidth > 0 && img.naturalWidth < 900;
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
    /* Prefer direct body assets (catbox/etc) over soft feed proxy thumbs. */
    if (bodyUrl && !bodyAnim) {
      return { url: upgradeThumb(bodyUrl), anim: false, source: 'body' };
    }
    try {
      if (entry.media$thumbnail && entry.media$thumbnail.url) {
        var feedUrl = entry.media$thumbnail.url;
        return {
          url: upgradeThumb(feedUrl, { anim: isLikelyAnimatedUrl(feedUrl) }),
          anim: isLikelyAnimatedUrl(feedUrl),
          source: 'feed'
        };
      }
    } catch (ignore) {}
    if (bodyUrl) {
      return { url: upgradeThumb(bodyUrl, { anim: bodyAnim }), anim: bodyAnim, source: bodyAnim ? 'body-gif' : 'body' };
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

    if (cta.getAttribute('data-qcx-cta-pro') === '1') return;
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
  var QCX_CDN = 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.25/theme/';
  var QCX_FONTS_CSS = QCX_CDN + 'qcx-breakdev-fonts.css';
  var QCX_ATMOSPHERE_CSS = QCX_CDN + 'qcx-atmosphere.css';
  var QCX_SITE_FAVICON = 'https://www.mmo.team/favicon.ico';

  function brandAvatarHtml() {
    var src1 = QCX_CDN + 'qcx-brand-mark.png';
    return '<div class="qcx-avatar" aria-label="MMO">' +
      '<img class="qcx-brand-raster" src="' + src1 + '" ' +
      'width="64" height="64" decoding="async" alt="MMO"/>' +
      '<svg xmlns="http://www.w3.org/2000/svg" class="qcx-brand-mark qcx-brand-svg qcx-brand-eyes-only" ' +
      'viewBox="0 0 512 512" width="300" height="300" role="img" aria-hidden="true">' +
      '<g class="qcx-ghost-eyes">' +
      '<circle class="qcx-eye-socket" cx="230.6" cy="189.9" r="16.5" fill="#f2f2f2"/>' +
      '<circle class="qcx-eye qcx-eye-l" cx="230.6" cy="189.9" r="13.2" fill="#0a0a0a"/>' +
      '<circle class="qcx-eye-socket" cx="294.1" cy="183.5" r="16" fill="#f2f2f2"/>' +
      '<circle class="qcx-eye qcx-eye-r" cx="294.1" cy="183.5" r="12.8" fill="#0a0a0a"/>' +
      '</g></svg></div>';
  }

  function ensureSharpBrandAvatar() {
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
      /* CDN bump: refresh href so atmosphere/fonts pick up new tag without full reload race. */
      if (link.getAttribute('href') !== href) link.setAttribute('href', href);
      return;
    }
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
      '#sidebar .qcx-sidebar-rail .item-content,.qcx-sidebar-rail .snippet{display:none!important}';
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
      /* Allow old labels + added Tutorial (3 chips). */ +
      '.all_posts .qcx-card-labels a:nth-child(n+4),' +
      '[data-page-item=\"multiple\"] .qcx-card-labels a:nth-child(n+4){display:none!important}' +
      '.all_posts .qcx-card-labels a:nth-child(-n+3),' +
      '[data-page-item=\"multiple\"] .qcx-card-labels a:nth-child(-n+3){display:inline-flex!important}' +
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
      '.mac-title{display:none!important}' +
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
      '#qcx-menu-header{display:flex!important;align-items:center!important;justify-content:space-between!important;' +
      'padding:10px 16px 6px!important;flex-shrink:0!important;gap:10px!important;max-width:960px!important;' +
      'width:100%!important;margin:0 auto!important;box-sizing:border-box!important}' +
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
      '#qcx-menu-footer{display:none!important}' + 'html[data-page-type="post"] #footer,' +'html[data-page-type="post"] footer.footer,' +'html[data-page-type="page"] #footer,' +'html[data-page-type="page"] footer.footer,' +'html[data-page-item="single"] #footer,' +'html[data-page-item="single"] footer.footer{display:none!important}' +'html:not(#layout) body{min-height:100vh!important;display:flex!important;flex-direction:column!important}' +'html:not(#layout) body > *{flex-shrink:0!important}' +'#footer,footer.footer{margin-top:auto!important;padding-bottom:0!important}' +'.qcx-footer-widget,.qcx-footer-widget .widget-content{width:100%!important;float:none!important;padding:0!important;margin:0!important}' + '.footer .widget.qcx-footer-widget{width:100%!important;max-width:100%!important;display:block!important;float:none!important}' + '.footer .widget:nth-of-type(1).qcx-footer-widget,.footer .widget:nth-child(1).qcx-footer-widget{width:100%!important}' + /* ── PRO FOOTER v4 ultra-minimal ── */
      '.qcx-footer-social{padding:16px 20px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))!important;border-top:1px solid rgba(76,175,130,0.1);background:#060d08;width:100%!important;box-sizing:border-box}' +
      '@media(max-width:860px){.qcx-footer-social{padding-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}}' +
      '.qcx-footer-inner{max-width:860px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}' +
      '.qcx-footer-logo{font-size:11px!important;font-weight:800!important;color:rgba(109,217,164,0.8)!important;letter-spacing:.12em!important;text-transform:uppercase!important;white-space:nowrap!important;flex-shrink:0!important}' +
      '.qcx-footer-copy{font-size:11px!important;color:rgba(150,190,165,0.3)!important;margin:0!important;white-space:nowrap!important;flex:1 1 auto!important;text-align:center!important}' +
      '@media(max-width:480px){.qcx-footer-copy{display:none!important}}' +
      '.qcx-footer-tg-btn{display:inline-flex!important;align-items:center!important;gap:5px!important;color:rgba(109,217,164,0.6)!important;-webkit-text-fill-color:rgba(109,217,164,0.6)!important;font-size:11px!important;font-weight:600!important;text-decoration:none!important;letter-spacing:.04em!important;transition:color .15s,-webkit-text-fill-color .15s!important;white-space:nowrap!important;flex-shrink:0!important}' +
      '.qcx-footer-tg-btn:hover{color:#6dd9a4!important;-webkit-text-fill-color:#6dd9a4!important}' +
      '.qcx-footer-tg-btn svg{width:12px!important;height:12px!important;flex-shrink:0!important}' +
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
      if (!menu && !document.getElementById('qcx-mobile-nav-rescue')) {
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

  /* Theme often drops .qcx-backdrop / scanline / ghost-blink CSS — restore. */
  function ensureAtmosphere() {
    ensureStylesheet('qcx-atmosphere', QCX_ATMOSPHERE_CSS);
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

  /* Move #comments into the rail widget so it appears directly below
     "BÀI VIẾT LIÊN QUAN" on both desktop and mobile. */
  function placeCommentsInRail(rail) {
    if (!rail) return;
    var cmt = document.getElementById('comments') || document.querySelector('.qcx-comments-shell');
    if (!cmt) return;
    /* Avoid double-insert */
    if (rail.contains(cmt)) return;
    /* Don't move on admin pages or non-article pages */
    if (isAdminPath() || !isSingleArticlePage()) return;
    try {
      /* On mobile the rail is .qcx-tutorial-inline; on desktop it's in #sidebar.
         Either way: append #comments as last child of the rail widget-content wrapper. */
      var railContent = rail.querySelector('.widget-content') || rail;
      railContent.appendChild(cmt);
      cmt.setAttribute('data-qcx-in-rail', '1');
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

  function cardLabelsWithTutorial(allLabels) {
    var list = (allLabels || []).filter(Boolean);
    var skip = /^(50\.?000|bca|themeblogspot)$/i;
    var mode = null;
    var others = [];
    var hasTutorial = false;
    list.forEach(function(label){
      var name = String(label || '').trim();
      if (!name || skip.test(name)) return;
      if (/^tutorial$/i.test(name)) { hasTutorial = true; return; }
      if (/^(free|vip)$/i.test(name)) {
        if (!mode) mode = /^vip$/i.test(name) ? 'VIP' : 'FREE';
        return;
      }
      others.push(name);
    });
    /* Compact: ≤2 topic chips + optional FREE/VIP + Tutorial (CSS caps at 3 visible). */
    var out = others.slice(0, 2);
    if (mode && out.length < 2) out.unshift(mode);
    else if (mode && out.length >= 2) out = [mode].concat(out.slice(0, 1));
    if (hasTutorial) out.push('Tutorial');
    return out.slice(0, 3);
  }

  function ensureCardLabelsWithTutorial(root) {
    try {
      (root || document).querySelectorAll('.qcx-card-labels').forEach(function(wrap){
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
        wrap.innerHTML = '';
        others.slice(0, 2).forEach(function(a){ wrap.appendChild(a); });
        wrap.appendChild(tutorial);
      });
    } catch (err) {}
  }

  function cardFromEntry(entry, index) {
    var fullTitle = (entry.title && entry.title.$t) || 'Bài viết';
    var title = displayPostTitle(fullTitle);
    var href = entryLink(entry) || '/';
    var labels = cardLabelsWithTutorial(entryLabels(entry));
    var meta = entryThumbMeta(entry);
    var thumb = meta.url;
    var eager = index === 0;
    var col = el('div', 'col-md-4');
    var media = thumb
      ? ('<img class="qcx-card-media" alt="' + escapeHtml(title) + '"' +
        (meta.anim ? ' data-qcx-anim="1"' : '') +
        (eager
          ? ' loading="eager" fetchpriority="high" decoding="async"'
          : ' loading="lazy" decoding="async"') +
        ' src="' + escapeHtml(thumb) + '" width="1200" height="675"/>')
      : '<span class="qcx-card-noimg" aria-hidden="true">// no image</span>';
    var labelHtml = labels.map(function(label){
      return '<a href="/search/label/' + encodeURIComponent(label) + '" rel="tag">' + escapeHtml(label) + '</a>';
    }).join('');
    col.innerHTML =
      '<article class="card">' +
      '<div class="card-header">' +
      '<a href="' + escapeHtml(href) + '" title="' + escapeHtml(fullTitle) + '">' + media + '</a>' +
      (labelHtml ? '<div class="qcx-card-labels">' + labelHtml + '</div>' : '') +
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

  function polishHomepageCards(row) {
    cleanCardSnippets(row);
    stripDomPostTitles(row);
    ensureCardLabelsWithTutorial(row);
    window.setTimeout(function(){
      cleanCardSnippets(row);
      stripDomPostTitles(row);
      ensureCardLabelsWithTutorial(row);
      try {
        var cards = row.querySelectorAll('.card');
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
    var shell = el('div', 'widget Blog qcx-rescue-blog qcx-feed-in');
    shell.id = 'Blog1';
    var allPosts = el('div', 'all_posts');
    var row = el('div', 'row');
    var pager = el('div', 'nav-pagination qcx-pager qcx-rescue-pager');
    pager.style.cssText = 'clear:both!important;float:none!important;width:100%!important;padding-top:40px!important;margin-bottom:40px!important;text-align:center!important;display:block!important;';
    var pagerInner = el('div', 'blog-pager');
    pager.appendChild(pagerInner);
    allPosts.appendChild(row);
    shell.appendChild(allPosts);
    shell.appendChild(pager);
    main.appendChild(shell);
    if (!entries.length) {
      row.appendChild(el('p', 'qcx-rescue-status', 'Chưa có bài viết để hiển thị.'));
      pager.style.display = 'none';
      return;
    }

    var pool = entries.slice();
    var shown = 0;
    var totalResults = Math.max(pool.length, 0);
    var exhausted = false;
    var controls = null;

    function appendNext() {
      var slice = pool.slice(shown, shown + PAGE_SIZE);
      slice.forEach(function(entry, i){ row.appendChild(cardFromEntry(entry, shown + i)); });
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
    /* F5: never return stale summary — that re-paints after skeleton/native and flashes. */
    if (isReloadNavigation()) {
      try { sessionStorage.removeItem(cacheKey); } catch (e) {}
    } else {
      var cached = readFeedCache(cacheKey);
      if (cached) return Promise.resolve(cached);
    }
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
    main.querySelectorAll('.qcx-hero, .qcx-rule, .qcx-section-head, .qcx-rescue-blog, .qcx-rescue-status').forEach(function(node){ node.remove(); });
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
      renderHomepage(main, result || []);
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

    /* F5 homepage: kill Blog SSR — enhanceNative keeps stale cards visible until feed refresh. */
    if (!isSingle && isReloadNavigation()) {
      main.querySelectorAll('.widget.Blog:not(.qcx-rescue-blog):not(.qcx-rescue-skel)').forEach(function(node){
        try { node.remove(); } catch (err) { node.style.display = 'none'; }
      });
    } else if (hasUsableNativeBlog()) {
      enhanceNativeHomepageFeed();
      return;
    }

    ensureHeaderSearch();
    main.classList.remove('no-items');

    /* Pages use qcx:page:; posts use qcx:post: — must match loadSingleEntry. */
    var cacheKey = isSingle
      ? ((isStaticPage ? 'qcx:page:' : 'qcx:post:') + currentPath)
      : 'qcx:feed:summary:' + QCX_HOME_FEED_BATCH;
    /* Reload: skip sessionStorage instant paint (F5 stale flash) on home + single. Soft navigate keeps cache. */
    var skipInstantCache = isReloadNavigation();
    if (skipInstantCache) {
      try { sessionStorage.removeItem(cacheKey); } catch (e) {}
    }
    var cached = skipInstantCache ? null : readFeedCache(cacheKey);
    var skel = null;

    /* Cache hit → paint ngay (navigate only). Reload always skeleton → fresh feed. */
    if (cached) {
      paintRescue(main, isSingle, cached);
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
    /* F5 homepage: skip enhanceNative — rebuild from feed so stale SSR never shows. */
    if (!isSingleBoot && isReloadNavigation()) {
      rescuePosts();
      return;
    }
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
    enhanceNativeHomepageFeed();
    rescuePosts();
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

  function ensureGmailAuthEngine() {
    healLiveUtf8Mojibake();
    if (isAdminPath()) return;
    var cssId = 'qcx-gmail-auth-css';
    var st = document.getElementById(cssId);
    if (!st) {
      st = document.createElement('style');
      st.id = cssId;
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent =
      '.qcx-auth-slot{display:inline-flex!important;align-items:center!important;position:relative!important;z-index:120!important}' +
      '.qcx-mac-topbar .qcx-mt-right{display:inline-flex!important;align-items:center!important;gap:8px!important;flex-wrap:nowrap!important;white-space:nowrap!important}' +
      /* Auth chip only on homepage signal header — hide on post/page topbar + sidebar */ +
      'html[data-page-type="post"] .qcx-mac-topbar .qcx-auth-slot,' +
      'html[data-page-type="page"] .qcx-mac-topbar .qcx-auth-slot,' +
      'html[data-page-item="single"] .qcx-mac-topbar .qcx-auth-slot,' +
      '.qcx-auth-slot--sidebar,.qcx-sidebar-vip-card,#HTML8.widget.HTML:has(.qcx-sidebar-vip-card),' +
      '.qcx-community-support,#HTML10.widget.HTML:has(.qcx-community-support){display:none!important}' +
      '.qcx-auth-login-btn{appearance:none;border:1px solid rgba(52,230,160,0.32)!important;background:rgba(9,20,14,0.88)!important;color:#e6f5ec!important;cursor:pointer!important;font:600 11px/1 var(--qcx-article-mono,monospace)!important;display:inline-flex!important;align-items:center!important;gap:5px!important;height:28px!important;padding:0 10px!important;border-radius:999px!important;white-space:nowrap!important;transition:border-color .18s,background .18s,transform .18s!important}' +
      '.qcx-auth-slot--topbar .qcx-auth-login-btn{height:26px!important;padding:0 8px!important;font-size:10.5px!important;gap:4px!important}' +
      '.qcx-auth-login-btn:hover{border-color:#34e6a0!important;background:rgba(52,230,160,0.14)!important;transform:translateY(-1px)}' +
      '.qcx-auth-login-btn[hidden],.qcx-user-chip[hidden]{display:none!important}' +
      '.qcx-google-ico{flex:0 0 auto;display:block;width:14px!important;height:14px!important;overflow:visible!important;flex-shrink:0!important}' +
      '.qcx-auth-login-btn .qcx-google-ico{width:14px!important;height:14px!important}' +
      '@keyframes SuperiorRankAnimate{0%{background-position:0% 50%}100%{background-position:300% 50%}}@keyframes qcxGradFlow{0%{background-position:0% 50%}100%{background-position:200% 50%}}@keyframes qcxFireFlicker{0%{filter:drop-shadow(0 0 3px rgba(255,69,0,0.85)) drop-shadow(0 -1px 5px rgba(255,160,0,0.65))}100%{filter:drop-shadow(0 0 7px rgba(255,50,0,1)) drop-shadow(0 -2px 10px rgba(255,220,40,0.95))}}@keyframes qcxPlasmaPulse{0%{filter:drop-shadow(0 0 3px rgba(255,215,0,0.72)) drop-shadow(0 0 7px rgba(255,0,234,0.48))}100%{filter:drop-shadow(0 0 6px rgba(0,255,255,0.92)) drop-shadow(0 0 12px rgba(255,0,234,0.68))}}@keyframes qcxGlitchShift{0%,88%,100%{text-shadow:-1.5px 0 #ff0055,1.5px 0 #00e1ff,0 0 8px rgba(0,255,204,0.78);transform:translate(0,0)}90%{text-shadow:-2.5px 0 #ff0055,2.5px 0 #00e1ff,0 0 10px #00ffcc;transform:translate(-0.8px,0.4px)}93%{text-shadow:2.5px 0 #ff0055,-2px 0 #00e1ff,0 0 10px #ff0055;transform:translate(0.8px,-0.4px)}96%{text-shadow:-1.5px 0 #00e1ff,1.5px 0 #ff0055,0 0 8px #00ffcc;transform:translate(0,0)}}.qcx-user-chip{appearance:none;box-sizing:border-box !important;position:relative !important;overflow:hidden !important;isolation:isolate !important;cursor:pointer;display:inline-flex !important;align-items:center !important;gap:6px !important;height:28px !important;padding:0 11px 0 3px !important;border-radius:999px !important;border:1px solid rgba(52,230,160,0.35) !important;background-color:#08120c !important;color:#e8fff2 !important;font:700 11.5px/1 var(--qcx-article-sans,system-ui,sans-serif) !important;transition:border-color 0.18s ease,box-shadow 0.18s ease,transform 0.18s ease !important;max-width:198px !important;white-space:nowrap !important}.qcx-user-chip::before{content:"";position:absolute;inset:0 0 0 18px;pointer-events:none;z-index:0;background-repeat:repeat;background-position:center center;opacity:0.96}.qcx-user-chip::after{content:none;position:absolute;inset:0 0 0 18px;pointer-events:none;z-index:2;mix-blend-mode:screen}.qcx-auth-slot--topbar .qcx-user-chip{height:26px !important;padding:0 10px 0 3px !important;gap:5.5px !important;font-size:11.5px !important;max-width:184px !important}.qcx-user-avatar{box-sizing:border-box !important;position:relative !important;z-index:3 !important;width:20px !important;height:20px !important;border-radius:50% !important;object-fit:cover !important;flex:0 0 auto !important;border:1.5px solid #34e6a0 !important;background:#07120c !important;display:block !important}.qcx-auth-slot--topbar .qcx-user-avatar{width:18px !important;height:18px !important;border-width:1.5px !important}.qcx-user-name{position:relative !important;z-index:1 !important;display:inline-block !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;max-width:142px !important;padding:1px 3px !important;border-radius:4px !important;font-weight:800 !important;line-height:1.25 !important;letter-spacing:0.015em !important;background-color:transparent !important}.qcx-auth-slot--topbar .qcx-user-name{max-width:132px !important;font-size:11.5px !important}.qcx-user-role-badge{display:none !important}.qcx-user-chip[data-name-style="mint"]{border-color:rgba(52,230,160,0.50) !important;background:rgba(12,36,24,0.88) !important;box-shadow:0 0 10px rgba(52,230,160,0.16) !important}.qcx-user-chip[data-name-style="mint"]::before{content:none}.qcx-user-chip[data-name-style="mint"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="mint"] .qcx-ud-head img{border-color:#34e6a0 !important}.qcx-user-chip[data-name-style="mint"] .qcx-user-name,#qcx-user-dropdown[data-name-style="mint"] .qcx-ud-name{color:#34e6a0 !important;font-weight:700 !important;text-shadow:#0f764c 1px 1px 8px,0 0 6px rgba(52,230,160,0.55) !important}.qcx-user-chip[data-name-style="thunder"]{border-color:rgba(0,213,255,0.78) !important;background:linear-gradient(135deg,rgba(0,72,148,0.52),rgba(4,24,58,0.90)) !important;box-shadow:0 0 15px rgba(0,213,255,0.36) !important}.qcx-user-chip[data-name-style="thunder"]::before,.qcx-user-chip[data-name-style="thunder"]::after{content:"";background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/thunder_rank.webp") !important;background-size:100% 105% !important;background-position:center center !important;background-repeat:no-repeat !important;filter:brightness(1.25) contrast(1.15)}.qcx-user-chip[data-name-style="thunder"]::after{opacity:0.85}.qcx-user-chip[data-name-style="thunder"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="thunder"] .qcx-ud-head img{border-color:#00d5ff !important;box-shadow:0 0 7px rgba(0,213,255,0.8) !important}.qcx-user-chip[data-name-style="thunder"] .qcx-user-name,#qcx-user-dropdown[data-name-style="thunder"] .qcx-ud-name{background-image:linear-gradient(123deg,#008cff 0%,#00d5ff 20%,#064fa2 27%,#0065d9 35%,#b5fffe 49%,#d4ecff 57%,#00d5ff 68%,#008cff 78%,#00d5ff 92%,#008cff 100%) !important;background-size:300% 100% !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;letter-spacing:0.02em !important;font-weight:800 !important;animation:SuperiorRankAnimate 4s linear infinite !important;filter:drop-shadow(0 0 5px rgba(0,213,255,0.65)) !important}.qcx-user-chip[data-name-style="gold"]{border-color:rgba(255,215,0,0.72) !important;background:linear-gradient(135deg,rgba(130,88,0,0.42),rgba(32,22,4,0.90)) !important;box-shadow:0 0 14px rgba(255,215,0,0.30) !important}.qcx-user-chip[data-name-style="gold"]::before{background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/spark.gif") !important;background-size:90px 68px !important}.qcx-user-chip[data-name-style="gold"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="gold"] .qcx-ud-head img{border-color:#ffd700 !important;box-shadow:0 0 7px rgba(255,215,0,0.7) !important}.qcx-user-chip[data-name-style="gold"] .qcx-user-name,#qcx-user-dropdown[data-name-style="gold"] .qcx-ud-name{color:#ffd700 !important;font-weight:800 !important;text-shadow:#c98600 1px 1px 10px,0 0 8px rgba(255,215,0,0.85) !important}.qcx-user-chip[data-name-style="crimson"]{border-color:rgba(255,36,36,0.76) !important;background:linear-gradient(135deg,rgba(140,12,24,0.48),rgba(34,6,10,0.90)) !important;box-shadow:0 0 14px rgba(255,30,39,0.34) !important}.qcx-user-chip[data-name-style="crimson"]::before{background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/spark.gif") !important;background-size:90px 68px !important}.qcx-user-chip[data-name-style="crimson"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="crimson"] .qcx-ud-head img{border-color:#ff2424 !important;box-shadow:0 0 7px rgba(255,30,39,0.78) !important}.qcx-user-chip[data-name-style="crimson"] .qcx-user-name,#qcx-user-dropdown[data-name-style="crimson"] .qcx-ud-name{color:#ff2630 !important;font-weight:800 !important;text-shadow:#b52231 1px 1px 10px,0 0 8px rgba(255,30,39,0.9) !important}.qcx-user-chip[data-name-style="thunder-red"]{border-color:rgba(255,56,76,0.78) !important;background:linear-gradient(135deg,rgba(155,14,34,0.52),rgba(40,5,14,0.92)) !important;box-shadow:0 0 15px rgba(255,36,56,0.38) !important}.qcx-user-chip[data-name-style="thunder-red"]::before,.qcx-user-chip[data-name-style="thunder-red"]::after{content:"";background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/thunder_rank.webp") !important;background-size:100% 105% !important;background-position:center center !important;background-repeat:no-repeat !important;filter:hue-rotate(155deg) saturate(2.4) brightness(1.25)}.qcx-user-chip[data-name-style="thunder-red"]::after{opacity:0.85}.qcx-user-chip[data-name-style="thunder-red"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="thunder-red"] .qcx-ud-head img{border-color:#ff384c !important;box-shadow:0 0 7px rgba(255,36,56,0.8) !important}.qcx-user-chip[data-name-style="thunder-red"] .qcx-user-name,#qcx-user-dropdown[data-name-style="thunder-red"] .qcx-ud-name{background-image:linear-gradient(123deg,#ff1e34 0%,#ff6b7a 22%,#990018 32%,#ff2e44 45%,#ffd6dc 55%,#ff4d63 72%,#ff1e34 100%) !important;background-size:300% 100% !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;letter-spacing:0.02em !important;font-weight:800 !important;animation:SuperiorRankAnimate 4s linear infinite !important;filter:drop-shadow(0 0 5px rgba(255,42,64,0.72)) !important}.qcx-user-chip[data-name-style="thunder-gold"]{border-color:rgba(255,208,48,0.78) !important;background:linear-gradient(135deg,rgba(145,92,0,0.50),rgba(38,22,4,0.92)) !important;box-shadow:0 0 15px rgba(255,200,32,0.36) !important}.qcx-user-chip[data-name-style="thunder-gold"]::before,.qcx-user-chip[data-name-style="thunder-gold"]::after{content:"";background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/thunder_rank.webp") !important;background-size:100% 105% !important;background-position:center center !important;background-repeat:no-repeat !important;filter:hue-rotate(210deg) saturate(2.2) brightness(1.32)}.qcx-user-chip[data-name-style="thunder-gold"]::after{opacity:0.85}.qcx-user-chip[data-name-style="thunder-gold"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="thunder-gold"] .qcx-ud-head img{border-color:#ffd030 !important;box-shadow:0 0 7px rgba(255,208,48,0.8) !important}.qcx-user-chip[data-name-style="thunder-gold"] .qcx-user-name,#qcx-user-dropdown[data-name-style="thunder-gold"] .qcx-ud-name{background-image:linear-gradient(123deg,#e68a00 0%,#ffd23f 24%,#8f5400 34%,#ffae00 46%,#fff8c9 56%,#ffd23f 74%,#e68a00 100%) !important;background-size:300% 100% !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;letter-spacing:0.02em !important;font-weight:800 !important;animation:SuperiorRankAnimate 3.8s linear infinite !important;filter:drop-shadow(0 0 5px rgba(255,204,0,0.72)) !important}.qcx-user-chip[data-name-style="dragon-fire"]{border-color:rgba(255,108,12,0.78) !important;background:linear-gradient(135deg,rgba(165,42,0,0.50),rgba(38,10,2,0.92)) !important;box-shadow:0 0 15px rgba(255,85,0,0.38) !important}.qcx-user-chip[data-name-style="dragon-fire"]::before{background-image:url("data:image/gif;base64,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") !important;background-size:120px 34px !important;background-repeat:repeat-x !important}.qcx-user-chip[data-name-style="dragon-fire"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="dragon-fire"] .qcx-ud-head img{border-color:#ff6a00 !important;box-shadow:0 0 8px rgba(255,106,0,0.85) !important}.qcx-user-chip[data-name-style="dragon-fire"] .qcx-user-name,#qcx-user-dropdown[data-name-style="dragon-fire"] .qcx-ud-name{background-image:linear-gradient(0deg,#ff2a00 0%,#ff8000 48%,#fff066 100%) !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;font-weight:800 !important;animation:qcxFireFlicker 1.4s ease-in-out infinite alternate !important}.qcx-user-chip[data-name-style="inferno"]{border-color:rgba(255,107,53,0.74) !important;background:linear-gradient(135deg,rgba(155,38,36,0.45),rgba(45,8,28,0.90)) !important;box-shadow:0 0 14px rgba(255,90,95,0.32) !important}.qcx-user-chip[data-name-style="inferno"]::before{background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/spark-pink.gif") !important;background-size:90px 68px !important}.qcx-user-chip[data-name-style="inferno"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="inferno"] .qcx-ud-head img{border-color:#ff6b35 !important;box-shadow:0 0 6px rgba(255,107,53,0.72) !important}.qcx-user-chip[data-name-style="inferno"] .qcx-user-name,#qcx-user-dropdown[data-name-style="inferno"] .qcx-ud-name{background-image:linear-gradient(90deg,#ff9f1c,#ff4d4d,#ff2e93,#ff9f1c) !important;background-size:200% 100% !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;animation:qcxGradFlow 2.6s linear infinite !important;filter:drop-shadow(0 0 6px rgba(255,77,77,0.68)) !important}.qcx-user-chip[data-name-style="liquid-gold"]{border-color:rgba(255,224,112,0.78) !important;background:linear-gradient(135deg,rgba(145,102,0,0.46),rgba(34,22,2,0.92)) !important;box-shadow:0 0 16px rgba(255,215,0,0.36) !important}.qcx-user-chip[data-name-style="liquid-gold"]::before{background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/spark-gold.gif") !important;background-size:90px 68px !important}.qcx-user-chip[data-name-style="liquid-gold"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="liquid-gold"] .qcx-ud-head img{border-color:#ffe270 !important;box-shadow:0 0 8px rgba(255,215,0,0.8) !important}.qcx-user-chip[data-name-style="liquid-gold"] .qcx-user-name,#qcx-user-dropdown[data-name-style="liquid-gold"] .qcx-ud-name{background-image:linear-gradient(110deg,#b87b00 0%,#ffd700 22%,#fff8c9 38%,#ffae00 55%,#fff5b8 72%,#ffd700 88%,#b87b00 100%) !important;background-size:300% 100% !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;animation:SuperiorRankAnimate 3.2s linear infinite !important;filter:drop-shadow(0 0 6px rgba(255,215,0,0.75)) !important}.qcx-user-chip[data-name-style="hologram"]{border-color:rgba(255,102,238,0.76) !important;background:linear-gradient(135deg,rgba(130,12,120,0.44),rgba(8,72,96,0.44),rgba(32,14,42,0.92)) !important;box-shadow:0 0 16px rgba(255,0,234,0.34) !important}.qcx-user-chip[data-name-style="hologram"]::before{background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/spark.gif") !important;background-size:90px 68px !important}.qcx-user-chip[data-name-style="hologram"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="hologram"] .qcx-ud-head img{border-color:#ff66ee !important;box-shadow:0 0 8px rgba(0,255,255,0.8) !important}.qcx-user-chip[data-name-style="hologram"] .qcx-user-name,#qcx-user-dropdown[data-name-style="hologram"] .qcx-ud-name{background-image:linear-gradient(135deg,#ffe600 0%,#ff00ea 33%,#00ffff 66%,#ffe600 100%) !important;background-size:300% 100% !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;animation:SuperiorRankAnimate 4.5s linear infinite,qcxPlasmaPulse 2.4s ease-in-out infinite alternate !important}.qcx-user-chip[data-name-style="galaxy"]{border-color:rgba(168,85,247,0.78) !important;background:linear-gradient(135deg,rgba(76,20,128,0.62),rgba(22,40,108,0.62),rgba(24,10,44,0.94)) !important;box-shadow:0 0 16px rgba(168,85,247,0.40) !important}.qcx-user-chip[data-name-style="galaxy"]::before{background-image:url("data:image/gif;base64,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") !important;background-size:120px 34px !important;background-repeat:repeat-x !important}.qcx-user-chip[data-name-style="galaxy"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="galaxy"] .qcx-ud-head img{border-color:#c084fc !important;box-shadow:0 0 8px rgba(168,85,247,0.85) !important}.qcx-user-chip[data-name-style="galaxy"] .qcx-user-name,#qcx-user-dropdown[data-name-style="galaxy"] .qcx-ud-name{background-image:linear-gradient(90deg,#e879f9,#60a5fa,#c084fc,#f472b6,#38bdf8,#e879f9) !important;background-size:200% 100% !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;animation:qcxGradFlow 3.5s linear infinite !important;filter:drop-shadow(0 0 7px rgba(192,132,252,0.78)) !important}.qcx-user-chip[data-name-style="diamond"]{border-color:rgba(186,230,253,0.82) !important;background:linear-gradient(135deg,rgba(14,110,168,0.48),rgba(6,28,48,0.92)) !important;box-shadow:0 0 15px rgba(125,211,252,0.38) !important}.qcx-user-chip[data-name-style="diamond"]::before{background-image:url("data:image/gif;base64,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") !important;background-size:120px 34px !important;background-repeat:repeat-x !important}.qcx-user-chip[data-name-style="diamond"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="diamond"] .qcx-ud-head img{border-color:#e0f2fe !important;box-shadow:0 0 8px rgba(186,230,253,0.88) !important}.qcx-user-chip[data-name-style="diamond"] .qcx-user-name,#qcx-user-dropdown[data-name-style="diamond"] .qcx-ud-name{background-image:linear-gradient(110deg,#bae6fd 0%,#ffffff 28%,#38bdf8 50%,#ffffff 74%,#bae6fd 100%) !important;background-size:200% 100% !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;animation:qcxGradFlow 2.8s linear infinite !important;filter:drop-shadow(0 0 6px rgba(186,230,253,0.85)) !important}.qcx-user-chip[data-name-style="glitch"]{border-color:rgba(0,255,204,0.76) !important;background:linear-gradient(135deg,rgba(135,0,52,0.42),rgba(0,96,128,0.42),rgba(6,18,24,0.92)) !important;box-shadow:-2px 0 10px rgba(255,0,85,0.34),2px 0 10px rgba(0,225,255,0.34) !important}.qcx-user-chip[data-name-style="glitch"]::before{background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/spark-cyan.gif") !important;background-size:90px 68px !important}.qcx-user-chip[data-name-style="glitch"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="glitch"] .qcx-ud-head img{border-color:#00ffcc !important;box-shadow:-2px 0 6px #ff0055,2px 0 6px #00e1ff !important}.qcx-user-chip[data-name-style="glitch"] .qcx-user-name,#qcx-user-dropdown[data-name-style="glitch"] .qcx-ud-name{color:#00ffcc !important;font-weight:800 !important;animation:qcxGlitchShift 2.4s infinite !important}.qcx-user-chip[data-name-style="rainbow"]{border-color:rgba(244,114,182,0.72) !important;background:linear-gradient(135deg,rgba(145,22,42,0.38),rgba(92,32,138,0.38),rgba(8,76,110,0.42)) !important;box-shadow:0 0 14px rgba(192,132,252,0.32) !important}.qcx-user-chip[data-name-style="rainbow"]::before{background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/spark.gif") !important;background-size:90px 68px !important}.qcx-user-chip[data-name-style="rainbow"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="rainbow"] .qcx-ud-head img{border-color:#f472b6 !important;box-shadow:0 0 6px rgba(244,114,182,0.72) !important}.qcx-user-chip[data-name-style="rainbow"] .qcx-user-name,#qcx-user-dropdown[data-name-style="rainbow"] .qcx-ud-name{background-image:linear-gradient(90deg,#ff3b3b,#ffd700,#34e6a0,#00d9ff,#c084fc,#ff3b3b) !important;background-size:200% 100% !important;-webkit-text-fill-color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;animation:qcxGradFlow 3s linear infinite !important;filter:drop-shadow(0 0 6px rgba(244,114,182,0.62)) !important}.qcx-user-chip[data-name-style="purple"]{border-color:rgba(192,132,252,0.72) !important;background:linear-gradient(135deg,rgba(112,34,178,0.46),rgba(26,8,46,0.92)) !important;box-shadow:0 0 14px rgba(168,85,247,0.34) !important}.qcx-user-chip[data-name-style="purple"]::before{background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/spark-purple.gif") !important;background-size:90px 68px !important}.qcx-user-chip[data-name-style="purple"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="purple"] .qcx-ud-head img{border-color:#c084fc !important;box-shadow:0 0 6px rgba(192,132,252,0.72) !important}.qcx-user-chip[data-name-style="purple"] .qcx-user-name,#qcx-user-dropdown[data-name-style="purple"] .qcx-ud-name{color:#e9d5ff !important;font-weight:800 !important;text-shadow:#9333ea 1px 1px 10px,0 0 9px rgba(192,132,252,0.95) !important}.qcx-user-chip[data-name-style="emerald"]{border-color:rgba(0,255,136,0.74) !important;background:linear-gradient(135deg,rgba(0,88,44,0.52),rgba(3,22,12,0.94)) !important;box-shadow:0 0 14px rgba(0,255,136,0.32) !important}.qcx-user-chip[data-name-style="emerald"]::before{background-image:url("data:image/gif;base64,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") !important;background-size:120px 34px !important;background-repeat:repeat-x !important}.qcx-user-chip[data-name-style="emerald"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="emerald"] .qcx-ud-head img{border-color:#00ff88 !important;box-shadow:0 0 7px rgba(0,255,136,0.78) !important}.qcx-user-chip[data-name-style="emerald"] .qcx-user-name,#qcx-user-dropdown[data-name-style="emerald"] .qcx-ud-name{color:#00ff88 !important;font-weight:800 !important;text-shadow:#059669 1px 1px 10px,0 0 9px rgba(0,255,136,0.92) !important}.qcx-user-chip[data-name-style="sakura"]{border-color:rgba(255,158,205,0.76) !important;background:linear-gradient(135deg,rgba(168,42,102,0.46),rgba(40,10,26,0.92)) !important;box-shadow:0 0 14px rgba(255,130,185,0.34) !important}.qcx-user-chip[data-name-style="sakura"]::before{background-image:url("data:image/gif;base64,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") !important;background-size:120px 34px !important;background-repeat:repeat-x !important}.qcx-user-chip[data-name-style="sakura"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="sakura"] .qcx-ud-head img{border-color:#ff9ecd !important;box-shadow:0 0 7px rgba(255,158,205,0.78) !important}.qcx-user-chip[data-name-style="sakura"] .qcx-user-name,#qcx-user-dropdown[data-name-style="sakura"] .qcx-ud-name{color:#ffc8e6 !important;font-weight:800 !important;text-shadow:#db2777 1px 1px 10px,0 0 8px rgba(255,145,195,0.9) !important}.qcx-user-chip[data-name-style="hearts"]{border-color:rgba(255,77,141,0.78) !important;background:linear-gradient(135deg,rgba(165,18,72,0.48),rgba(42,6,20,0.92)) !important;box-shadow:0 0 14px rgba(255,55,125,0.36) !important}.qcx-user-chip[data-name-style="hearts"]::before{background-image:url("data:image/gif;base64,R0lGODlheAAiAKIAAAAAAMMZVf9Bh/+Muf/r9QAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJBwAAACwAAAAAeAAiAAAD0Qi63P7wjQjGFDTrzbvfAzFJIoF9aKqu0QhNQXOxdG3Tgnk72Ln/MoCvE2P0ajnBYAj8JXGmJS0gqBabzeuKaq1Rtdgw63sDi88ps2aGbrshz7d8rp7b75kj/sa2J6V7SDp3XAJ1gR+HbWSIjV6OkJGSk5SVkHqWmQt/TE2Yb31ZS4ZnnB0uK3FhqhmhHIWKDCGoKrE2YK4KrAq0D4wcvT+5NrsLZrMatnPFZR/BmsbQ0hJCiJ/TRoOg1UJRz9PKToNcyNiOWl/f5ojh6+7v8CgJACH5BAkHAAAALAAAAAB4ACIAAAPOCLrc/vCNCGZoU9DNu/+gMxCTRDoCoYWdtrJwzAzDK0LX4sq6WvPAUMrGGv54AYEyF2xymLHkMpiEOq9YRtVpzXqv3U7mSy7LhhKzet0Ij0rsuFwBj+zm2TEeYCTueWh7UgJhf1GGAFuIi1yMjo+QkZKTlDp8lZgNfWZ3cXplATWEZZtxgZwqYpchg4VkrllWnz1+HYoedV+zV6daMrAiJ6SpX8AYumvGbG+ZqrWeCp3NmsRyn6XTbXunrdmQVrfelMri5ebn6Bu76Yi9zQkAIfkECQcAAAAsAAAAAHgAIgAAA9IIutz+8I0IZhNE0L215mAoQgNhOeW5BIw3RpgwfG9tO3GkPvF8MwGBkPUr2oi34NCoCCKZ0CjFKX1Kr9jmbULLer+/HHhMFlkXu7J6rUh1AF12lPtNXzI+uVSsBygFZ30/gWxUgodZhIiLjI2Oj5CRHC6SlRA9cVeUa3RkM0temGx8YDGKaHA1f6eJawFPnS0ZR4CRsZqzDqxTL3a4mVG7niZkwmq+RshYt3puqcCWCqScqRai0Q/GWKSr2JFnht7e2uLl5ufoTMzpjdPsjUjrjwkAIfkECQcAAAAsAAAAAHgAIgAAA88Iutz+8A0i4IhA0FGxV4EgBl9pntF0ScT6hCMahaTsuHaO3x6dQ7WfQiUs/oK2S8fY2DGfUIdmGa1arwAkdsvtPipU71W5dTamHPF2iiXORAKtOiqPmhu+uX5f3/v/gIGCg4SFUhmGiTJoYVFgemRqHDFXjHNsalN9C5EoMHF6m1gBQZ0LmDJ5iaaOFC9CooCoVrGKRrW2uQysgo+6EbNzZCuWv0CyGy1ZcLjGfEMLqs7TzdPW19jZY4jaucHdhqXc4InfT77avBhB6EXFOQkAIfkECQcAAAAsAAAAAHgAIgAAA9IIutz+8A0Qog0iV8sV3l0ojtFATCTzpRHINuj7xrKbToJcnnrvvwJC7gcjGo8tpHLJ9OWGzSgAJ+UEBQNoVXmN0h4YzbZpQ5q+jtWYiJa202s2L05fv+v4vH4PePL/TkJZUX5bVGsBWQJlRleDVV1xkSV9L2GLY4xVIIcMkylqgFOVS58LmiKoeaZHqqJGrq+yEJ1FeIWzEKxTc0y1fYJauQ2od0Sml7HDeIyhy88q0NLT1NWAv9avu9mAnKTcsts9uNzYSQrkMo7C1eIR6z7JPQkAIfkECQcAAAAsAAAAAHgAIgAAA9IIutz+MMoJAo0DiMu7/2DYCMQmYmeqntbaDETmznSt3Y5s15m5cyTBwPcrBoucgGDZQhabzokSGq3adBKqdbuCYbnOb1QM/nnL6NOG+CCn35Lg0IirsqtD5k9+v5bKQVoMPSFKek4CglUBLYQjf4WJcDl1NUcOikmTDpc7mZs2n6CjFI6kN32nC51lpgp8qhGfbjOsFUuSsR9nSIJTuiG0UaLAxcbHyJuuybG2zKpNy8+kzipr0y+VUqvaILDYr5Ae3yKGueAVkYcs5+jsxBfwFAkAIfkECQcAAAAsAAAAAHgAIgAAA9gIutz+MMpJpyCi6s27/04ATsNoniiYZcxAlGnclKz8XcJQK7Bt475PQEAUBY8LI5IzVC6f0IozSq1ar9hsrKftblYSF9dLhuB0YRM4uqPqishz2+eaQ3HTGcAuJQryP4BRAUY0DkAgTWULhkGIDYIbkVmPPpOLMpeYmxGNnGucZhhangtyoRGacaOQfqqoDmOWEIobsphiWq88L7AAt77AvsPEdHvFyJXIvkqltstUyhW5D6DQenwhpsfTojnZyaxfGGgjQ3DX2h3nfye16SnvJrvwUiPOJwkAIfkECQcAAAAsAAAAAHgAIgAAA+kIutz+MMpJa6g46827lwIQMsNnZuUolSclEMKgDgTb3s6rQrSNOwGB8LLw/TrGBXGSPCoFS+epJ5VGq6Ymdsvter/gsLgT2j2043RFJ4tQP2Wv2Ssbrkzs+Y+m5+quJCImQXZYUGoBRCkNOidBgGqLUo0NkByWaZRWammYnJ8fkqCMgqNrMGmiDHmmFmqaDIRQaK2jmI9vtRy0XIoYvJy5ug7CusC1x8Meqsp7hqjNR8U/S8zRSF+wbg1acde/pRNL3tw1ReaMMG3fLtAYrMTcD7Ke7Eob9IOH9lWPLfX8BmUJF1CZNhMJAAAh+QQJBwAAACwAAAAAeAAiAAAD3gi63P4wyjaAmDhrQcS4WiiKHDieWSCsAeq+S5tVsKbKda4zA0HvERwQ+EMVh8gkz6dsOmHHp3R6MU2vWEXpI612s4oPSxIdba3DHpraEfIAvXJINVYK3NhAq4Le5m5gD3x2HQ54L4eBJU2JgVONjpE7g5IQXpUhi4GUDWeYc5GaDXR3n6YTjYCnqycycqywgkyxtGQar7UunGmzuTqiSLi+rRQWw7pYwDWXlXFQxhgyzCiemMIYyhLVxW+GK6XH0SKkeM5hvQyq4Ujq3AuvkOsw8Ri78qzZ96f0+v3MCQAh+QQJBwAAACwAAAAAeAAiAAAD3Ai63P4wyiaImDhrEIQPWyhq4GhuXXmubDa0oQrP9EC8dK67LL7/wIXNFywaH5dLg3hsGiuCgbKYPE6dAOnnaZEGbVcnVCYEhE+dLVBAxgYCrzCUlsJC4muLo83i2816QH5/ToOEhzt4iBFViyFzf4oOUF6OKIeQex5slp0YhnWeomijpStMpql3N6qIkhuod606mYmss3QOr6e4XGcrjZaxIbsQJcEmlL92Qyy1E8oraZzCMIaaakvaD6G9gtREzQrie95GJeRZ27pm5k3DGM/uptfz9hTt7sWO0QkAIfkECQcAAAAsAAAAAHgAIgAAA9wIutz+MMpJq6Xh6s27/2AoLsNonig1EGXqmgIQN61Xv7gnEMIwK6vbKPZ7FXMMn0CQSaZ2vaNpJUXKeE2azBRYMo1ZayMQKB2hp25Y7KwOeY61SM5WoHH0uj6v71vNfhNEgTpweoAPUD6EHXw4d3FejoyUcRJqlZkjk5qdnp+goSiIGkKiepAWQaeEdKQOpqWsKKkggwCrsxGvl3ZbhVFAuhK1gjyLjZKZsRucY8oemJW5fdIfzmLMYnnaWm7DKTfUxIbgOePdY+bZjLfDvJmK35/FlV1L2Jn5e18JACH5BAkHAAAALAAAAAB4ACIAAAPiCLrc/jDGIau9OOstB6FcKI7kBoZnqa6VALis4qVxvQqEMMAMbT4unk0hHDp2AkGgMavhdEWWJ2pcPJfHVyyQVBq91UggQCk+a1xseKIdnhvq7bqVq8bneMk9z+/32n4RQYEkb3hlgjk7hCN7YYYOXEmOjJV6FWmWmnKbnZ6foKGMiKKliVQWPqZ5lACkTB+roJB/GYMyshWvFli3HE+LTbkQtLrAqJhdWKrDC60PM8oimZvMaxTU053ChM8Xu6Oi1g7FzTYp3Lzm17EL406AueDujMfN5ZaSYMPejNnrorAkAAAh+QQJBwAAACwAAAAAeAAiAAAD1Ai63P7wjQgmvTjrzfcglvOFXWmeaDQJEJm+cBwJhDCwMsXiObP2lEFAQAwAHzQbD5g8QpICY+OXGxadCinWYaQumr2hdisBLHNgxrhK1tWw67Y8Ep/b7z4zXqffp9JtXg1JN34pdViAakRRho4liFmNj5QykZWYmZqbnIF9naBPb6GkXBeCpaSKJjupGqgXRq2sNYUVrjOjG4RnGlaNI7gQlxK/xHSTt8IwI2KHy0cWxxiw0Jir1pjT2R0ueDu9ndXBfoTbj9jKfr/C53jO3Jvu8XYJACH5BAkHAAAALAAAAAB4ACIAAAPVCLrc/tCJIeKIOOvNu5cEQT2D+GVVdXaXurLBJATQ9T4CId9a7vIo3YwE+AEBMcHwGKExNbQWyHiMOZ8cKXbhe1y3322Q+gyLzzczer2ysRXad6+ILbnZXTkgzvCNnndvamh5DUlLeolog0iIio+KjJCTlJWWl5hrfJmcJ4WdoB6Se3ShphufNymnJ5sZTqsrfmSsEamoOn8fh6O1hiu8L1ZwvoKOJ052xWJuvRlSgctAyky30kfRPM7X3DhFtKGumX7bl9aYh9zlkMPdtevu8fLz9C8JACH5BAkHAAAALAAAAAB4ACIAAAPQCLrc/pAJIoaII2p97/5a5oHkYw1EZqblN1VjS75yDbyqk+W2EwjAQI8kHLYCAZGDZvQJik2ZMrqkPKDUBTYLYnK13/B3Ky6bw9PzpoNWS6zu9AIXa6J4anLZqwU+v3huggp6AD+Fg4luiIqNjo+QkZKKcpOWPXyXmjKMC5WboGtwRmyhNZ8bRaUydKasoy2tnH6drj49P0E2h7aKvLievYK1ITd3wm1ZNIHIRsdZxM2nmx11tqiSONGTmZa51r3bvn/SwuLl6Onq6+wNq+0OCQAh+QQJBwAAACwAAAAAeAAiAAAD0gggJPowyjmZCIPmTLsPQhh4ZKmMZkoFGDE4EeOqJojSOAdlMF4OjQnGV7oRTUCdwnIsNp9QkvJhjFqv2CYv63P0uGAJM7xbiBsvspq6fowhIFF22q6fVpf5zM4nVa10fYKDhIWGh1JmiItQb4yPPn8TW5CVKo5NXpY5ijQ3ml1oX5skmDQWaThxeaQpkiqrr36srXY2TbK1YbmJo7qtpr+kvMJHgYVevqRbSYyoxM5BAMeDq8V3m7fXtdDb3t/g4eJmyuODqOVkoGqUZC9yfOhkCQAh+QQJBwAAACwAAAAAeAAiAAAD1QgKsf4wSkYHEFAQPLsMQuONJGRxZTkQWySm5AvPgPVoKN0Nsu7/o5XN0QMaj8gg7JSkYXLNqAcnNV1umwG0yiV2HVSiYFz8ms9lUNk4PLtjVeF7rmi77fSvPM+XMhd4fYI/YYOGTWsPf4eMQIVGT406izAvkTo4WpIzj05ZWzFjIZsziSUgZD5qpH2rP6asX7A7V7G2E52GgbcPs3N7vFVPoJNmlIyZvo25hqjEt8p0rsHUFNXX2Nna21yX3JKZz8K1Z8dNPKLRkJ9uzEg4oxLmr+lfCQAh+QQJBwAAACwAAAAAeAAiAAAD0Ai6KyQsyklVqDjrzTu4XiiOJDmEJ1SWkLq+0UCcnePCUxrZw42/NA/oN7FFAoLkkMhslpYLJNRJrZKm1qx2m+N6vwxZEEzULcZbNBlnVIjXcCJUDTDH7782G+DDd+xCDXwsDz1+InojPH0cSEqHIlhCSQKSG1KQcJgrlplanRmAnqMYiaSnE6Coq4p8jCN0TKJ3PKobb1amd46vsFu2X5uswx/ExsfIycpULcuei2DNXLM4PY9e0Fu6bA+d1FeUwDDikSCz20+VcN8v2+SNWgkAIfkECQcAAAAsAAAAAHgAIgAAA9IIuhz8MMpJq7045wGE/pTngeT2CcRYXpzapYO7zsxAcJpDW6gbCEDdbgjAEY8A4eKnRDqfxyZ0Sq1ar9isltbaeq+92neMVNqMiy55TUIvwkQRu90pCeWlXmx+StH0Mhk/QXwfUiCDAocYTIVjjTOLjleSFmqTmDx+mZwUlZ2gJHihEJdrgEduUHArqohAikRnlFw3O5CypGJDn7q+v8DBwiujWa7DCqjGtsZ1TzGEWCgDe9KbTj2VppGwvVFUATrbL4EruF7jQ6wNTt5T62XIEwkAIfkECQcAAAAsAAAAAHgAIgAAA+sIutw9QLhJq11S3s27bwKhfSQAjaEwjGW7QWTgkukSCLj8zLxJwL3gRGcTEBeDn7AFXM6alSMD6qxaHUnqdctldr9gzylMLjtq5nRZqh2r38HsWVTNwF1uixZAtM9SK3claDyALDE4RoIlUi43OTw3jYtmkkGTlJV4EZmdLoSeoR2YoqVOfqZ6nBN7V4apFqBISmGPik6tVaS5U5e3S3Kws7wcpE/CO8jKpsTLi8EbqM5kzREigV1AEtXAq1YrkFxyIdBhskspxibeJTCPA+pW8TMBOnkM5y2Wd/endENO5nXJJ0TgtCgHFyUAACH5BAkHAAAALAAAAAB4ACIAAAPVCLrcHi7KGQURK4gNqf9gKI4k0GXCWa5s64oqM7x0bbMDMd98T+04n3CoyAGJyOTHglE6nw/PrAmtKpk9DNVamoKOGYbWxRxsuSKsVEcpn0caDnoVm4Afm5RLU59b+TR9fn8rXoOHL2qIi3SMjlVjjyGGc26SIIpocXqXH4J3RICdOGxPgqOTqairRaWsqKCvAJGyT7EOllezVpQfRl95pze5T5m+IUzCRbuFJnm3Q8p7J70LxpNsGr9z1TbXCtJ2YdBXF9G1L+Hoj91OtOti5kmUxIcJACH5BAkHAAAALAAAAAB4ACIAAAPdCLrc/jBKF1gQderNu/8gkIVkaZ7lgK5s6w2E6s70owqkXO80TOC8oJAzGNkAwKFyyRD8ZrgkM4csGaMmp2AgnX60Ky3XKigbvZ8z2Wy6qNFwN+oNj4Nu9bwLrO/P/YB1WIEfeII/Y4QdfHFlGIoedExykCg6Q5KVHTCXmp4LnRGhn5qcpBGDeqOnSIhdO6lLhkREjpksYq9BjBqmGlq3CrMgF2xTwQ2rDwFGwwu8mwpuyrJVNNALyACXvgG+h7or2qIxDJ3US+Nw6J/OS7GsD9g1hrnxEupZTyK2gQkAIfkECQcAAAAsAAAAAHgAIgAAA9kIutz+MMpJq7046827/9kACJwInignEKQ2EGYqz9EQ1CNO7zzwxo5VS0Ya9lAiIwP4uC2KH+FAefQIQVIqJiDoOqunr4fr/XDF4HTlHFa7L2hL8k0HX+t4XjzP50P7HnN4WYAdd3VkAnuFFotqbIyRGo6SlZZVTJeaSzCbKH87mRiilYRVoBQ/IIIzU2VHphWkGYdELJQLrBmJuDu9DbMOAWK6TywdkIXFCqobtQy/EtFpz7ljNMF803VAzZ7MOYMj3j7fDNU8glnZ39tRxwC85pViyfOa7kcJACH5BAkHAAAALAAAAAB4ACIAAAPeCLrc/jDGIau9OOstBxkCJ45kuXkhR5ls2wYPlcafa9/Y+gjEHI8hHw4no+kcsEWQxROAhtAm5ChpPksBgTYJxXFJ2S0r++2aR2RX+czerC/FtnzekNLv8zd+z4cs+yxxe1ZCgBx2e2ECeoYZjHJpjZJYk5WWl5iZFVSaTACFLR6cnUA9V0RKnxqjKqpQIGJmhDk1Jog4TY8LggysC4q6vWpnAV+8Sj0OohWRkse7JbcMer7TltIKy2CkN4zVfN+Vz3RLR9rc2GdFVucA4ZXBuMnA79x3XM32nfH6/XIJADs=") !important;background-size:120px 34px !important;background-repeat:repeat-x !important}.qcx-user-chip[data-name-style="hearts"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="hearts"] .qcx-ud-head img{border-color:#ff4d8d !important;box-shadow:0 0 7px rgba(255,77,141,0.8) !important}.qcx-user-chip[data-name-style="hearts"] .qcx-user-name,#qcx-user-dropdown[data-name-style="hearts"] .qcx-ud-name{color:#ff70a6 !important;font-weight:800 !important;text-shadow:#be123c 1px 1px 10px,0 0 8px rgba(255,77,141,0.9) !important}.qcx-user-chip[data-name-style="cyan"]{border-color:rgba(0,217,255,0.68) !important;background:linear-gradient(135deg,rgba(2,102,152,0.44),rgba(4,22,36,0.90)) !important;box-shadow:0 0 13px rgba(0,217,255,0.28) !important}.qcx-user-chip[data-name-style="cyan"]::before{background-image:url("https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.6/images/fx/spark-cyan.gif") !important;background-size:90px 68px !important}.qcx-user-chip[data-name-style="cyan"] .qcx-user-avatar,#qcx-user-dropdown[data-name-style="cyan"] .qcx-ud-head img{border-color:#00d9ff !important;box-shadow:0 0 6px rgba(0,217,255,0.68) !important}.qcx-user-chip[data-name-style="cyan"] .qcx-user-name,#qcx-user-dropdown[data-name-style="cyan"] .qcx-ud-name{color:#00d9ff !important;font-weight:800 !important;text-shadow:#0284c7 1px 1px 10px,0 0 8px rgba(0,217,255,0.88) !important}' +
      '#qcx-user-dropdown{position:fixed;z-index:999998;width:236px;max-width:calc(100vw - 16px);border-radius:10px;border:1px solid #24302a;background:#0e1612;color:#e6f5ec;box-shadow:0 12px 32px rgba(0,0,0,0.65);padding:8px;display:none;font-family:var(--qcx-article-sans,system-ui,sans-serif);box-sizing:border-box}' +
      '#qcx-user-dropdown.is-open{display:block}' +
      /* Clean identity: no pill/glow — name + role·email */ +
      '#qcx-user-dropdown .qcx-ud-name{color:#f4faf6!important;background:none!important;background-image:none!important;-webkit-text-fill-color:#f4faf6!important;text-shadow:none!important;filter:none!important;animation:none!important}' +
      '#qcx-user-dropdown .qcx-ud-head img{box-shadow:none!important}' +
      '.qcx-ud-head{display:flex;align-items:center;gap:8px;padding:2px 2px 8px;min-width:0}' +
      '.qcx-ud-meta{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px}' +
      '.qcx-ud-head img{width:28px!important;height:28px!important;border-radius:50%!important;object-fit:cover!important;border:1px solid #3a4a42!important;flex-shrink:0!important}' +
      '#qcx-user-dropdown[data-role="admin"] .qcx-ud-head img{border-color:#7a3a38!important}' +
      '#qcx-user-dropdown[data-role="vip"] .qcx-ud-head img{border-color:#6a5a2e!important}' +
      '#qcx-user-dropdown[data-role="pro"] .qcx-ud-head img{border-color:#2e5a6a!important}' +
      '.qcx-ud-name{margin:0!important;padding:0!important;font:700 12.5px/1.2 var(--qcx-article-sans,system-ui,sans-serif)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;color:#f4faf6!important}' +
      '.qcx-ud-sub{margin:0!important;padding:0!important;display:flex!important;align-items:center!important;gap:5px!important;min-width:0;font:500 10px/1.3 var(--qcx-article-mono,ui-monospace,monospace)!important;color:#6f8378!important;white-space:nowrap!important;overflow:hidden!important}' +
      '.qcx-ud-role{flex:0 0 auto;font-weight:800!important;letter-spacing:.04em;text-transform:uppercase;color:#9eb0a6!important}' +
      '.qcx-ud-role[data-role="admin"]{color:#ff8f88!important}' +
      '.qcx-ud-role[data-role="vip"]{color:#ffd166!important}' +
      '.qcx-ud-role[data-role="pro"]{color:#7dd3fc!important}' +
      '.qcx-ud-dot{flex:0 0 auto;opacity:.45}' +
      '.qcx-ud-email{min-width:0;overflow:hidden!important;text-overflow:ellipsis!important;color:inherit!important}' +
      '.qcx-ud-divider{height:1px;background:#1e2823;margin:0 2px 4px}' +
      '.qcx-ud-ico{flex:0 0 auto;display:inline-block;width:12px!important;height:12px!important;opacity:.85}' +
      '.qcx-ud-ico--fill{fill:currentColor!important}' +
      '.qcx-ud-ico--stroke{fill:none!important;stroke:currentColor!important}' +
      '.qcx-ud-actions{display:flex;flex-direction:column;gap:0;margin:0}' +
      '.qcx-ud-btn{width:100%;text-align:left;padding:6px 7px;border-radius:6px;border:0;background:transparent;color:#c5d9cd;font:600 11.5px/1.25 var(--qcx-article-sans,system-ui,sans-serif);cursor:pointer;display:flex;align-items:center;gap:7px;white-space:nowrap;box-sizing:border-box;text-decoration:none}' +
      'a.qcx-ud-btn{color:#c5d9cd}' +
      '.qcx-ud-btn:hover{background:rgba(255,255,255,0.05);color:#fff}' +
      '.qcx-ud-btn.is-admin{color:#9fe7c2}' +
      '.qcx-ud-btn.is-admin:hover{background:rgba(52,230,160,0.1);color:#c8ffe0}' +
      '.qcx-ud-btn.is-danger{color:#d9928e}' +
      '.qcx-ud-btn.is-danger:hover{background:rgba(255,95,86,0.1);color:#ffb0ab}' +
      '.qcx-ud-count{margin-left:auto;min-width:15px;height:15px;padding:0 4px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font:700 9px/1 var(--qcx-article-mono,monospace);background:rgba(52,230,160,0.12);color:#6fd9a8}' +
      /* Save: inline after title, icon-only, no chrome, 1em = title size */ +
      '.qcx-mac-topbar .qcx-post-save-btn,.qcx-mt-right .qcx-post-save-btn{display:none!important}' +
      'h1.post-title .qcx-post-save-btn,.post-header h1.post-title #qcx-post-save-btn,button.qcx-post-save-btn{' +
        'appearance:none!important;-webkit-appearance:none!important;box-sizing:border-box!important;' +
        'display:inline-flex!important;align-items:center!important;justify-content:center!important;' +
        'width:1em!important;height:1em!important;min-width:1em!important;max-width:1em!important;' +
        'min-height:1em!important;max-height:1em!important;' +
        'padding:0!important;margin:0 0 0 0.35em!important;gap:0!important;overflow:visible!important;' +
        'font-size:1em!important;line-height:1!important;vertical-align:-0.12em!important;' +
        'border:0!important;border-radius:0!important;outline:none!important;' +
        'background:transparent!important;background-color:transparent!important;box-shadow:none!important;' +
        'color:inherit!important;opacity:0.55!important;cursor:pointer!important;' +
        'transition:opacity .15s,color .15s!important}' +
      'h1.post-title .qcx-post-save-btn:hover,button.qcx-post-save-btn:hover{' +
        'opacity:1!important;color:#34e6a0!important;background:transparent!important;background-color:transparent!important}' +
      'h1.post-title .qcx-post-save-btn.is-saved,button.qcx-post-save-btn.is-saved{' +
        'opacity:1!important;color:#ffd166!important;background:transparent!important;background-color:transparent!important}' +
      'h1.post-title .qcx-post-save-btn svg,h1.post-title .qcx-post-save-ico,button.qcx-post-save-btn svg{' +
        'width:1em!important;height:1em!important;min-width:1em!important;min-height:1em!important;' +
        'max-width:1em!important;max-height:1em!important;display:block!important;margin:0!important;padding:0!important;' +
        'flex:0 0 auto!important}' +
      'h1.post-title .qcx-post-save-label,button.qcx-post-save-btn .qcx-post-save-label{' +
        'display:none!important;visibility:hidden!important;width:0!important;height:0!important;' +
        'padding:0!important;margin:0!important;overflow:hidden!important;font-size:0!important}' +
      '.qcx-mt-right{display:inline-flex!important;align-items:center!important;gap:10px!important}' +
      '#qcx-google-auth-modal,#qcx-google-auth-modal.is-open{display:none!important;visibility:hidden!important;pointer-events:none!important}' +
      '#qcx-saved-modal{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(6,10,8,0.72)}' +
      '#qcx-saved-modal.is-open{display:flex}' +
      '.qcx-saved-dialog{width:100%;max-width:380px;border-radius:14px;border:1px solid #2a3830;background:#141a16;color:#e6f5ec;padding:22px 22px 18px;box-shadow:0 18px 48px rgba(0,0,0,0.55);box-sizing:border-box;font-family:var(--qcx-article-sans,"IBM Plex Sans",system-ui,sans-serif);display:flex;flex-direction:column;gap:0}' +
      '.qcx-saved-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid #2a3830}' +
      '.qcx-saved-title{margin:0;font-size:18px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#fff;line-height:1.15}' +
      '.qcx-saved-close{appearance:none;width:28px;height:28px;border-radius:8px;border:0;background:transparent;color:#8aa396;font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}' +
      '.qcx-saved-close:hover{color:#e6f5ec;background:rgba(255,255,255,0.05)}' +
      '.qcx-saved-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}' +
      '.qcx-saved-label{margin:0;font:700 10px/1.2 var(--qcx-article-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;color:#7d8f84}' +
      '.qcx-saved-count{font:700 10px/1.2 var(--qcx-article-mono,ui-monospace,monospace);color:#7dcea0;letter-spacing:.04em}' +
      '.qcx-saved-body{overflow:hidden;min-height:72px}' +
      '.qcx-saved-empty{margin:20px 0 8px;text-align:center;color:#8aa396;font-size:13px;line-height:1.5}' +
      '.qcx-saved-hint{display:block;margin-top:6px;font-size:12px;color:#5f7368}' +
      '.qcx-saved-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0;border:1px solid #2a3830;border-radius:10px;overflow:hidden;background:#0b120c}' +
      '.qcx-saved-item{display:flex;align-items:center;gap:10px;padding:11px 12px;border-top:1px solid #1c2420}' +
      '.qcx-saved-item:first-child{border-top:0}' +
      '.qcx-saved-item:hover{background:#121a15}' +
      '.qcx-saved-idx{flex:0 0 auto;width:18px;font:700 10px/1 var(--qcx-article-mono,ui-monospace,monospace);color:#5f7368;text-align:right}' +
      '.qcx-saved-link{flex:1;min-width:0;color:#d8e8de;text-decoration:none;font:600 13px/1.3 var(--qcx-article-sans,"IBM Plex Sans",system-ui,sans-serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.qcx-saved-link:hover{color:#7dcea0}' +
      '.qcx-saved-del{appearance:none;flex:0 0 auto;width:24px;height:24px;border-radius:6px;border:0;background:transparent;color:#6b7c72;font-size:16px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0;opacity:.75}' +
      '.qcx-saved-del:hover{color:#ff9b94;background:rgba(255,95,86,0.12);opacity:1}' +
      '.qcx-saved-more{appearance:none;width:100%;margin-top:12px;padding:11px 14px;border-radius:10px;border:0;background:#7dcea0;color:#06110a;font:800 13px/1.2 var(--qcx-article-sans,"IBM Plex Sans",system-ui,sans-serif);cursor:pointer}' +
      '.qcx-saved-more:hover{filter:brightness(1.06)}' +
      '.qcx-saved-foot{display:none}' +
      '.qcx-payos-dialog{width:100%;max-width:420px;border-radius:16px;border:1px solid rgba(52,230,160,0.38);background:linear-gradient(180deg,#0b1912 0%,#06100b 100%);color:#e8fff2;padding:18px;box-shadow:0 24px 64px rgba(0,0,0,0.82);box-sizing:border-box;font-family:var(--qcx-article-sans,system-ui,sans-serif)}' +
      '.qcx-payos-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}' +
      '.qcx-payos-badge{display:inline-block;padding:2px 7px;border-radius:999px;background:rgba(52,230,160,0.15);color:#34e6a0;font:800 9.5px/1.2 var(--qcx-article-mono,monospace);letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}' +
      '.qcx-payos-title{margin:0;font-size:17px;font-weight:800;color:#fff}' +
      '.qcx-payos-close{appearance:none;width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#b8d8c8;font-size:18px;line-height:1;cursor:pointer;display:grid;place-items:center}' +
      '.qcx-payos-close:hover{background:rgba(255,95,86,0.18);color:#ff9b94;border-color:rgba(255,95,86,0.4)}' +
      '.qcx-payos-input{width:100%;box-sizing:border-box;padding:10px 12px;margin-bottom:9px;border-radius:9px;border:1px solid rgba(76,175,130,0.34);background:#050d09;color:#ecfdf5;font:500 13px/1.3 var(--qcx-article-sans,system-ui,sans-serif);outline:none}' +
      '.qcx-payos-input:focus{border-color:#34e6a0;box-shadow:0 0 0 2px rgba(52,230,160,0.18)}' +
      '.qcx-payos-btn{width:100%;padding:11px 15px;border-radius:10px;border:0;background:linear-gradient(135deg,#28d28c,#17a368);color:#04120b;font:800 13px/1.2 var(--qcx-article-sans,system-ui,sans-serif);cursor:pointer;transition:filter .15s,transform .15s}' +
      '.qcx-payos-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}' +
      '.qcx-payos-status{margin-top:9px;font-size:11.5px;color:#8fb6a1;text-align:center;line-height:1.4}' +
      '.qcx-payos-status.is-err{color:#ff8780;font-weight:600}' +
      '.qcx-google-oauth-btn{width:100%;padding:10px 14px;border-radius:9px;border:1px solid rgba(255,255,255,0.18);background:#fff;color:#111;font:700 13px/1.2 var(--qcx-article-sans,system-ui,sans-serif);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:10px}' +
      '.qcx-google-oauth-btn:hover{background:#f2f6f4}';

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
      mSlot.style.cssText = 'margin-left:auto;margin-right:8px;';
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

    if (!window.__qcxGmailAuthV7) {
      window.__qcxGmailAuthV7 = true;
      (function initRescueAuthFallback() {
        var API_BASE = 'https://timkiem-store-api.kkymljnk.workers.dev';
        var ENT_KEY = 'qcx_payos_entitlement_v1';
        var AUTH_CFG_KEY = 'qcx_google_auth_cfg_v1';
        var AVATAR_CACHE_KEY = 'qcx_google_avatar_cache_v1';
        var SAVED_POSTS_KEY = 'qcx_saved_posts_v1';
        var PENDING_SAVE_KEY = 'qcx_pending_save_post_v1';
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
        function getCurrentPostMeta() {
          var url = String(location.href || '').split('#')[0].split('?')[0];
          var titleEl = document.querySelector('h1.post-title, .post-header .post-title, .item-title');
          var title = titleEl ? String(titleEl.textContent || '').trim() : (document.title || '').trim();
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
            try { id = new URL(url).pathname.replace(/\/+$/, '') || url; } catch (e2) { id = url; }
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
              if (res && res.ok && Array.isArray(res.savedPosts)) {
                writeSavedPostsCache(email, res.savedPosts);
                return res.savedPosts;
              }
              return readSavedPostsCache(email);
            })
            .catch(function () { return readSavedPostsCache(email); });
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
            writeSavedPostsCache(email, res.savedPosts || []);
            updatePostSaveButtonState();
            return res.savedPosts || [];
          });
        }
        function apiUnsavePost(id) {
          var ent = readEnt();
          var email = ent && ent.user && ent.user.email;
          if (!email || !ent.sessionToken || !id) return Promise.reject(new Error('NO_AUTH'));
          return fetch(API_BASE + '/api/auth/saved-posts', {
            method: 'DELETE',
            headers: authHeaders(),
            body: JSON.stringify({ id: id })
          }).then(function (r) { return r.json(); }).then(function (res) {
            if (!(res && res.ok)) throw new Error((res && res.error) || 'UNSAVE_FAIL');
            writeSavedPostsCache(email, res.savedPosts || []);
            updatePostSaveButtonState();
            return res.savedPosts || [];
          });
        }
        function setPendingSave(meta) {
          try { localStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(meta || getCurrentPostMeta())); } catch (e) {}
        }
        function consumePendingSave() {
          try {
            var raw = localStorage.getItem(PENDING_SAVE_KEY);
            if (!raw) return null;
            localStorage.removeItem(PENDING_SAVE_KEY);
            return JSON.parse(raw);
          } catch (e) { return null; }
        }
        function flushPendingSaveAfterLogin() {
          var pending = consumePendingSave();
          if (!pending || !pending.url) return;
          apiSavePost(pending).catch(function () {});
        }
        function postSaveIconHtml() {
          return '<svg class="qcx-post-save-ico" viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2.5h8v11l-4-2.4L4 13.5v-11z"/></svg>';
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
              triggerGoogleSignIn();
              return;
            }
            var list = readSavedPostsCache(ent.user.email);
            var already = list.some(function (p) { return p && (String(p.id) === String(meta.id) || String(p.url) === String(meta.url)); });
            if (already) {
              apiUnsavePost(meta.id).catch(function () {});
            } else {
              apiSavePost(meta).catch(function () {});
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
          var saved = list.some(function (p) { return p && (String(p.id) === String(meta.id) || String(p.url) === String(meta.url)); });
          btn.classList.toggle('is-saved', !!saved);
          btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
          /* Icon-only: strip any leftover label text from older builds */
          var label = btn.querySelector('.qcx-post-save-label');
          if (label) label.parentNode.removeChild(label);
          if (!btn.querySelector('.qcx-post-save-ico, svg')) {
            btn.innerHTML = postSaveIconHtml();
          }
          btn.title = saved ? 'Đã lưu' : 'Lưu bài';
          btn.setAttribute('aria-label', saved ? 'Đã lưu' : 'Lưu bài');
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
        function fetchAdminRoleStyles() {
          if (roleStylesFetched) return;
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
                renderAuthSlots();
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
          if (r === 'admin' || (r !== 'member' && cfg.allowSelfSwitch !== false)) {
            try {
              var map = JSON.parse(localStorage.getItem(NAME_STYLE_KEY) || '{}') || {};
              if (key && map[key]) return map[key];
            } catch (e) {}
          }
          return (cfg.roleDefaults && cfg.roleDefaults[r]) || (userObj && userObj.nameStyle) || ROLE_DEFAULT_STYLE[r] || 'mint';
        }
        function setUserNameStyle(email, styleId, isAdminUser) {
          var key = String(email || '').trim().toLowerCase();
          try {
            var map = JSON.parse(localStorage.getItem(NAME_STYLE_KEY) || '{}') || {};
            if (key) {
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
          var chips = document.querySelectorAll('.qcx-user-chip');
          for (var i = 0; i < chips.length; i++) chips[i].setAttribute('data-name-style', styleId);
          var dd = document.getElementById('qcx-user-dropdown');
          if (dd) dd.setAttribute('data-name-style', styleId);
        }
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
              chip.hidden = false;
              var r = (u.role || 'member').toLowerCase();
              var ns = getUserNameStyle(u.email, r, u);
              chip.setAttribute('data-role', r);
              chip.setAttribute('data-tier', r.toUpperCase());
              chip.setAttribute('data-name-style', ns);
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
              chip.hidden = true;
            }
          }
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
          // Override theme-inline login entry so header always opens native Google chooser.
          window.__qcxTriggerGoogleSignIn = triggerGoogleSignIn;
          try { window.triggerGoogleSignIn = triggerGoogleSignIn; } catch (e) {}
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
              if (isClientAdminEmail(email) && res.user) res.user.role = 'admin';
              if (res.user) {
                res.user.picture = getPreferredGoogleAvatar(email, res.user.name || name, res.user.picture, res.user.role);
                rememberGoogleAccount(res.user);
              }
              saveEnt(res);
              probeRealAvatarAsync(email, name);
              flushPendingSaveAfterLogin();
              fetchSavedPosts(true).then(function () { updatePostSaveButtonState(); });
              var gm = document.getElementById('qcx-google-auth-modal');
              if (gm) gm.classList.remove('is-open');
              return true;
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
              var gm = document.getElementById('qcx-google-auth-modal');
              if (gm) gm.classList.remove('is-open');
              return true;
            });
          });
        }
        function loadGsiScript(cb) {
          if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            if (cb) cb();
            return;
          }
          if (gsiScriptLoading) {
            if (cb) setTimeout(cb, 450);
            return;
          }
          gsiScriptLoading = true;
          var s = document.createElement('script');
          s.src = 'https://accounts.google.com/gsi/client';
          s.async = true;
          s.defer = true;
          s.onload = function () { if (cb) cb(); };
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
          killAuthModal();
          loadLocalAuthCfg();
          if (!googleClientId) googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
          // Always use full-page Google OAuth (account chooser) — no gsi/transform popup.
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
        function triggerGoogleSignIn() {
          killAuthModal();
          loadLocalAuthCfg();
          if (!googleClientId) googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
          // Native Google account chooser only (popup/tab) — never show custom modal.
          startGoogleOAuthPopup(null);
          fetchAuthConfig().then(function () { /* warm/refresh client id for next time */ });
        }
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
    sharpenCardImages();
    window.setTimeout(ensureGmailAuthEngine, 100);
    window.setTimeout(ensureGhostBlink, 400);
    window.setTimeout(ensureSharpBrandAvatar, 200);
    window.setTimeout(sharpenCardImages, 200);
    window.setTimeout(sharpenCardImages, 900);
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
  relocateHeroForDesktopRail();
  hideDropsOnHome();
  polishHeroBrand();
  ensureCardLabelsWithTutorial(document);
  ensureAdminChrome();
  ensureSiteFooter();
  ensureSharpBrandAvatar();
  ensureGhostBlink();
  sharpenCardImages();
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
      relocateHeroForDesktopRail();
      hideDropsOnHome();
      polishHeroBrand();
      ensureCardLabelsWithTutorial(document);
      ensureAdminChrome();
      ensureSiteFooter();
      ensureSharpBrandAvatar();
      ensureGhostBlink();
      sharpenCardImages();
    }, { once: true });
  }
  window.setTimeout(ensureGmailAuthEngine, 100);
  window.setTimeout(ensureGmailAuthEngine, 500);
  window.setTimeout(function(){ polishHeroBrand(); ensureCardLabelsWithTutorial(document); }, 80);
  window.setTimeout(function(){ polishHeroBrand(); ensureCardLabelsWithTutorial(document); }, 400);
  window.setTimeout(ensureSidebarRail, 80);
  window.setTimeout(ensureSidebarRail, 400);
  window.setTimeout(relocateHeroForDesktopRail, 60);
  window.setTimeout(relocateHeroForDesktopRail, 300);
  window.setTimeout(hideDropsOnHome, 80);
  window.setTimeout(hideDropsOnHome, 400);
  window.setTimeout(ensureAdminChrome, 60);
  window.setTimeout(ensureAdminChrome, 300);
  window.setTimeout(ensureAdminChrome, 800);
  window.setTimeout(ensureSiteFooter, 100);
  window.setTimeout(ensureSiteFooter, 500);
  window.setTimeout(ensureAtmosphere, 80);
  window.setTimeout(syncEmptyCommentsShell, 120);
  window.setTimeout(syncEmptyCommentsShell, 600);
  window.setTimeout(ensureMobileNavReady, 120);
  window.setTimeout(ensureMobileNavReady, 500);
  window.setTimeout(ensureGhostBlink, 200);
  window.setTimeout(ensureGhostBlink, 800);
  window.setTimeout(ensureGhostBlink, 1600);
  window.setTimeout(ensureSharpBrandAvatar, 80);
  window.setTimeout(ensureSharpBrandAvatar, 400);
  window.setTimeout(sharpenCardImages, 120);
  window.setTimeout(sharpenCardImages, 500);
  window.setTimeout(sharpenCardImages, 1200);

  /* Always scrub native Blog1 snippets (CSS leak), even when rescue skips. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSnippetClean, { once: true });
  else bootSnippetClean();
})();
