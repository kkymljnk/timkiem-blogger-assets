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
  var QCX_CDN = 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.18.42/theme/';
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
      '.qcx-mac-topbar .qcx-mt-right{display:inline-flex!important;align-items:center!important;gap:8px!important}' +
      '.qcx-auth-login-btn{appearance:none;border:1px solid rgba(52,230,160,0.32)!important;background:rgba(9,20,14,0.88)!important;color:#e6f5ec!important;cursor:pointer!important;font:600 11px/1 var(--qcx-article-mono,monospace)!important;display:inline-flex!important;align-items:center!important;gap:5px!important;height:28px!important;padding:0 10px!important;border-radius:999px!important;transition:border-color .18s,background .18s,transform .18s!important}' +
      '.qcx-auth-slot--topbar .qcx-auth-login-btn{height:26px!important;padding:0 8px!important;font-size:10.5px!important;gap:4px!important}' +
      '.qcx-auth-login-btn:hover{border-color:#34e6a0!important;background:rgba(52,230,160,0.14)!important;transform:translateY(-1px)}' +
      '.qcx-auth-login-btn[hidden],.qcx-user-chip[hidden]{display:none!important}' +
      '.qcx-google-ico{flex:0 0 auto;display:block;width:12px!important;height:12px!important}' +
      '.qcx-user-chip{appearance:none;box-sizing:border-box!important;cursor:pointer;display:inline-flex!important;align-items:center!important;gap:6px!important;height:28px!important;padding:0 3px!important;border-radius:999px!important;border:1px solid rgba(52,230,160,0.35)!important;background:rgba(10,22,16,0.92)!important;color:#e8fff2!important;font:600 11.5px/1 var(--qcx-article-sans,system-ui,sans-serif)!important;transition:all .18s ease!important;max-width:225px!important}' +
      '.qcx-auth-slot--topbar .qcx-user-chip{height:26px!important;padding:0 3px!important;gap:5.5px!important;font-size:11px!important;max-width:215px!important}' +
      '.qcx-user-avatar{box-sizing:border-box!important;width:20px!important;height:20px!important;border-radius:50%!important;object-fit:cover!important;flex:0 0 auto!important;border:1.5px solid #34e6a0!important;background:#07120c!important;display:block!important}' +
      '.qcx-auth-slot--topbar .qcx-user-avatar{width:18px!important;height:18px!important;border-width:1.5px!important}' +
      '.qcx-user-name{display:inline-block!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:116px!important;font-weight:600!important;line-height:1.25!important;letter-spacing:-0.01em!important}' +
      '.qcx-auth-slot--topbar .qcx-user-name{max-width:108px!important;font-size:11px!important}' +
      '.qcx-user-role-badge{box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:3px!important;height:20px!important;padding:0 7.5px 0 6px!important;border-radius:999px!important;font:800 9.5px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important;letter-spacing:.04em!important;text-transform:uppercase!important;flex:0 0 auto!important;-webkit-font-smoothing:antialiased!important}' +
      '.qcx-auth-slot--topbar .qcx-user-role-badge{height:18px!important;padding:0 6.5px 0 5.5px!important;font-size:8.5px!important;gap:2.5px!important}' +
      '.qcx-user-chip[data-role="member"] .qcx-user-role-badge{padding:0 7px!important}' +
      '.qcx-urb-ico{display:block!important;flex:0 0 auto!important;width:10px!important;height:10px!important;fill:currentColor!important;stroke:none!important}' +
      '.qcx-auth-slot--topbar .qcx-urb-ico{width:9.5px!important;height:9.5px!important}' +
      '.qcx-urb-ico path{fill:currentColor!important;stroke:none!important}' +
      '.qcx-urb-txt{display:inline-block!important;line-height:1!important;margin:0!important;padding:0!important;transform:translateY(0.2px)!important}' +
      '.qcx-user-chip[data-role="member"]{border-color:rgba(52,230,160,0.36)!important;background:rgba(52,230,160,0.08)!important}' +
      '.qcx-user-chip[data-role="member"] .qcx-user-avatar{border-color:#34e6a0!important}' +
      '.qcx-user-chip[data-role="member"] .qcx-user-name{color:#d9fbee!important}' +
      '.qcx-user-chip[data-role="member"] .qcx-user-role-badge{background:rgba(52,230,160,0.18)!important;color:#34e6a0!important}' +
      '.qcx-user-chip[data-role="pro"]{border-color:rgba(56,189,248,0.48)!important;background:rgba(56,189,248,0.10)!important;box-shadow:0 0 12px rgba(56,189,248,0.12)!important}' +
      '.qcx-user-chip[data-role="pro"] .qcx-user-avatar{border-color:#38bdf8!important}' +
      '.qcx-user-chip[data-role="pro"] .qcx-user-name{color:#bae6fd!important;font-weight:700!important}' +
      '.qcx-user-chip[data-role="pro"] .qcx-user-role-badge{background:rgba(56,189,248,0.22)!important;color:#38bdf8!important}' +
      '.qcx-user-chip[data-role="vip"]{border-color:rgba(255,209,102,0.58)!important;background:linear-gradient(135deg,rgba(255,209,102,0.16),rgba(245,158,11,0.08))!important;box-shadow:0 0 14px rgba(255,209,102,0.16)!important}' +
      '.qcx-user-chip[data-role="vip"] .qcx-user-avatar{border-color:#ffd166!important}' +
      '.qcx-user-chip[data-role="vip"] .qcx-user-name{color:#ffe599!important;font-weight:700!important}' +
      '.qcx-user-chip[data-role="vip"] .qcx-user-role-badge{background:linear-gradient(135deg,#ffd166,#f59e0b)!important;color:#140d00!important}' +
      '.qcx-user-chip[data-role="admin"]{border-color:rgba(255,107,107,0.62)!important;background:linear-gradient(135deg,rgba(255,95,86,0.18),rgba(255,189,46,0.10))!important;box-shadow:0 0 14px rgba(255,95,86,0.20)!important}' +
      '.qcx-user-chip[data-role="admin"] .qcx-user-avatar{border-color:#ff6b6b!important}' +
      '.qcx-user-chip[data-role="admin"] .qcx-user-name{color:#ffb4ae!important;font-weight:700!important}' +
      '.qcx-user-chip[data-role="admin"] .qcx-user-role-badge{background:linear-gradient(135deg,#ff5f56,#ffbd2e)!important;color:#1a0500!important}' +
      '#qcx-user-dropdown{position:fixed;z-index:999998;min-width:225px;max-width:265px;border-radius:12px;border:1px solid rgba(76,175,130,0.38);background:#09140e;color:#e6f5ec;box-shadow:0 16px 40px rgba(0,0,0,0.78);padding:11px;display:none;font-family:var(--qcx-article-sans,system-ui,sans-serif)}' +
      '#qcx-user-dropdown.is-open{display:block}' +
      '.qcx-ud-head{display:flex;align-items:center;gap:9px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:8px}' +
      '.qcx-ud-head img{width:34px;height:34px;border-radius:50%;object-fit:cover;border:1.5px solid #34e6a0;flex-shrink:0}' +
      '.qcx-ud-name{font-size:13px;font-weight:700;color:#fff;margin:0;line-height:1.2}' +
      '.qcx-ud-email{font-size:11px;color:#8fb6a1;margin:2px 0 0;word-break:break-all}' +
      '.qcx-ud-status{font-size:11px;padding:6px 8px;border-radius:7px;background:rgba(255,255,255,0.04);margin-bottom:8px;color:#bde3ce;line-height:1.35}' +
      '.qcx-ud-btn{width:100%;text-align:left;padding:6px 8px;border-radius:7px;border:0;background:transparent;color:#d8efe2;font:600 12px/1.25 var(--qcx-article-sans,system-ui,sans-serif);cursor:pointer;display:flex;align-items:center;gap:7px}' +
      '.qcx-ud-btn:hover{background:rgba(52,230,160,0.12);color:#fff}' +
      '.qcx-ud-btn.is-danger{color:#ff9b94}' +
      '.qcx-ud-btn.is-danger:hover{background:rgba(255,95,86,0.14)}' +
      '#qcx-google-auth-modal{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(3,9,6,0.84);backdrop-filter:blur(8px)}' +
      '#qcx-google-auth-modal.is-open{display:flex}' +
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

    var slotMarkup =
      '<button aria-label="Đăng nhập bằng Gmail" class="qcx-signal-x qcx-auth-login-btn" type="button">' +
        '<svg aria-hidden="true" class="qcx-google-ico" height="12" viewBox="0 0 24 24" width="12"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.82 0-.8-.08-1.57-.23-2.3z" fill="#4285F4"></path><path d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.26 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.6H-2.1v3.73C.54 18.4 5.94 22 12.18 22z" fill="#34A853"></path><path d="M3.22 13.43a5.85 5.85 0 0 1 0-3.76V5.94H-2.1a9.99 9.99 0 0 0 0 8.95l5.32-3.73z" fill="#FBBC05"></path><path d="M12.18 5.98c2.35 0 4.46.81 6.12 2.4l4.59-4.59C20.12 1.19 16.5 0 12.18 0 5.94 0 .54 3.6-2.1 8.84l5.32 3.73c1.26-3.79 4.79-6.59 8.96-6.59z" fill="#EA4335"></path></svg>' +
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

    var mtRight = document.querySelector('.qcx-mac-topbar .qcx-mt-right');
    if (mtRight && !mtRight.querySelector('.qcx-auth-slot')) {
      var tSlot = document.createElement('div');
      tSlot.className = 'qcx-auth-slot qcx-auth-slot--topbar';
      tSlot.setAttribute('data-qcx-auth-slot', 'topbar');
      tSlot.innerHTML = slotMarkup;
      mtRight.insertBefore(tSlot, mtRight.firstChild);
    }

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

    var sbZone = document.getElementById('sidebar');
    if (sbZone && !sbZone.querySelector('.qcx-sidebar-vip-card')) {
      var vipWidget = document.createElement('div');
      vipWidget.className = 'widget HTML';
      vipWidget.id = 'HTML8';
      vipWidget.innerHTML =
        '<div class="widget-content"><div class="qcx-sidebar-vip-card" style="margin-top:16px;padding:16px;border-radius:14px;border:1px solid rgba(52,230,160,0.28);background:linear-gradient(145deg,rgba(12,28,20,0.95),rgba(7,16,11,0.98))">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">' +
            '<span style="font:800 10px/1.2 monospace;letter-spacing:.08em;color:#ffd166;background:rgba(255,209,102,0.14);padding:3px 8px;border-radius:999px">&#128081; VIP PASS &amp; GMAIL SYNC</span>' +
            '<span style="font:700 10px/1.2 monospace;color:#34e6a0">PayOS 24/7</span>' +
          '</div>' +
          '<h4 style="margin:0 0 6px;font-size:14px;font-weight:700;color:#ecfdf5">Mở khóa toàn bộ kho VIP</h4>' +
          '<p style="margin:0 0 12px;font-size:12px;line-height:1.45;color:#9cc4b0">Đăng nhập Gmail để tự động khôi phục gói VIP/PRO và mở khóa nhanh không cần nhập lại mã trên mọi thiết bị.</p>' +
          '<div class="qcx-auth-slot qcx-auth-slot--sidebar" data-qcx-auth-slot="sidebar" style="width:100%">' + slotMarkup + '</div>' +
        '</div></div>';
      sbZone.appendChild(vipWidget);
    }

    var belowZone = document.getElementById('below-main');
    if (belowZone && !belowZone.querySelector('.qcx-community-support')) {
      belowZone.classList.remove('no-items');
      var commWidget = document.createElement('div');
      commWidget.className = 'widget HTML';
      commWidget.id = 'HTML10';
      commWidget.innerHTML =
        '<div class="widget-content"><section aria-label="Hỗ trợ cộng đồng MMO TEAM" class="qcx-community-support" style="max-width:1120px;margin:24px auto 8px;padding:18px 22px;border-radius:16px;border:1px solid rgba(76,175,130,0.24);background:linear-gradient(135deg,rgba(12,26,19,0.92),rgba(7,15,11,0.96));display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;box-sizing:border-box">' +
          '<div style="min-width:220px;flex:1 1 320px">' +
            '<div style="font:800 10px/1.2 monospace;letter-spacing:.08em;color:#34e6a0;text-transform:uppercase;margin-bottom:4px">MMO TEAM &#183; HỖ TRỢ TRỰC TUYẾN 24/7</div>' +
            '<div style="font-size:15px;font-weight:700;color:#ecfdf5;margin-bottom:3px">Cần hỗ trợ kích hoạt VIP, nhận tài nguyên hoặc báo lỗi link?</div>' +
            '<div style="font-size:12.5px;color:#97bda9">Liên hệ trực tiếp quản trị viên qua Telegram hoặc đăng nhập Gmail để tự động đồng bộ quyền truy cập.</div>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">' +
            '<a href="https://t.me/superkhung" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:999px;background:#28d28c;color:#05140d;font:700 12.5px/1.2 system-ui,sans-serif;text-decoration:none" target="_blank">Chat Telegram @superkhung</a>' +
            '<button class="qcx-community-login-trigger" data-qcx-google-login="1" style="appearance:none;display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:999px;border:1px solid rgba(52,230,160,0.38);background:rgba(52,230,160,0.1);color:#d8f8e8;font:600 12.5px/1.2 system-ui,sans-serif;cursor:pointer" type="button">Đồng bộ Gmail</button>' +
          '</div>' +
        '</section></div>';
      belowZone.appendChild(commWidget);
    }

    if (!window.__qcxGmailAuthV3) {
      window.__qcxGmailAuthV3 = true;
      (function initRescueAuthFallback() {
        var API_BASE = 'https://timkiem-store-api.kkymljnk.workers.dev';
        var ENT_KEY = 'qcx_payos_entitlement_v1';
        var AUTH_CFG_KEY = 'qcx_google_auth_cfg_v1';
        var AVATAR_CACHE_KEY = 'qcx_google_avatar_cache_v1';
        var DEFAULT_ADMIN_EMAILS = ['kkymljnk@gmail.com', 'superkhung@gmail.com', 'admin@mmo.wiki', 'admin@mmo.team'];
        var KNOWN_GOOGLE_AVATARS = {
          'kkymljnk@gmail.com': 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.3/images/avatars/kkymljnk-google.png',
          'superkhung@gmail.com': 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.19.3/images/avatars/kkymljnk-google.png'
        };
        var googleClientId = '';
        var adminEmailsList = DEFAULT_ADMIN_EMAILS.slice();
        var gsiScriptLoading = false;
        var pendingProbes = {};

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
            if (Array.isArray(raw.adminEmails) && raw.adminEmails.length) {
              raw.adminEmails.forEach(function (e) {
                var em = String(e || '').trim().toLowerCase();
                if (em && adminEmailsList.indexOf(em) === -1) adminEmailsList.push(em);
              });
            }
            var domCfg = document.querySelector('.qcx-layout-auth-config[data-admin-emails]');
            if (domCfg) {
              var csv = String(domCfg.getAttribute('data-admin-emails') || '');
              csv.split(',').forEach(function (e) {
                var em = String(e || '').trim().toLowerCase();
                if (em && adminEmailsList.indexOf(em) === -1) adminEmailsList.push(em);
              });
            }
          } catch (e) {}
        }
        function isClientAdminEmail(email) {
          var em = String(email || '').trim().toLowerCase();
          return !!(em && adminEmailsList.indexOf(em) !== -1);
        }
        function readEnt() {
          try { return JSON.parse(localStorage.getItem(ENT_KEY) || '{}') || {}; } catch (e) { return {}; }
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
            var lbl = loginBtn.querySelector('.qcx-signal-x-label');
            if (lbl && lbl.textContent !== 'Đăng nhập') lbl.textContent = 'Đăng nhập';
            if (!loginBtn.getAttribute('data-qcx-bound')) {
              loginBtn.setAttribute('data-qcx-bound', '1');
              loginBtn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                triggerGoogleSignIn(null);
              });
            }
            if (!chip.getAttribute('data-qcx-bound')) {
              chip.setAttribute('data-qcx-bound', '1');
              chip.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                toggleUserDropdown(this);
              });
            }
            if (u) {
              loginBtn.hidden = true;
              chip.hidden = false;
              var r = (u.role || 'member').toLowerCase();
              chip.setAttribute('data-role', r);
              chip.setAttribute('data-tier', r.toUpperCase());
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
                triggerGoogleSignIn(null);
              });
            }
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
        function startGoogleOAuthPopup(statusEl) {
          loadLocalAuthCfg();
          if (!googleClientId) {
            var emInp = document.getElementById('qcx-ga-email');
            var nmInp = document.getElementById('qcx-ga-name');
            if (emInp && emInp.value && emInp.value.indexOf('@') !== -1) {
              var subBtn = document.getElementById('qcx-ga-submit');
              if (subBtn) { subBtn.click(); return; }
            }
            if (statusEl) {
              statusEl.classList.remove('is-err');
              statusEl.textContent = 'Nhập Gmail & Họ tên bên dưới để đăng nhập và tự động tải Avatar Google.';
            }
            if (emInp && !emInp.value) emInp.focus();
            else if (nmInp) nmInp.focus();
            return;
          }
          loadGsiScript(function () {
            if (!(window.google && window.google.accounts && window.google.accounts.oauth2)) return;
            try {
              var client = window.google.accounts.oauth2.initTokenClient({
                client_id: googleClientId,
                scope: 'openid email profile',
                prompt: 'select_account',
                callback: function (tokenRes) {
                  if (!tokenRes || !tokenRes.access_token) return;
                  if (statusEl) statusEl.textContent = 'Đang xác thực tài khoản Google...';
                  fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': 'Bearer ' + tokenRes.access_token }
                  }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (gInfo) {
                    if (gInfo && gInfo.email && gInfo.picture) saveAvatarCache(gInfo.email, gInfo.picture);
                    return authenticateGmailProfile({ email: gInfo.email, name: gInfo.name, picture: gInfo.picture }, tokenRes.access_token);
                  });
                }
              });
              client.requestAccessToken({ prompt: 'select_account' });
            } catch (e) {}
          });
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
                '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.82 0-.8-.08-1.57-.23-2.3z" fill="#4285F4"/><path d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.26 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.6H-2.1v3.73C.54 18.4 5.94 22 12.18 22z" fill="#34A853"/><path d="M3.22 13.43a5.85 5.85 0 0 1 0-3.76V5.94H-2.1a9.99 9.99 0 0 0 0 8.95l5.32-3.73z" fill="#FBBC05"/><path d="M12.18 5.98c2.35 0 4.46.81 6.12 2.4l4.59-4.59C20.12 1.19 16.5 0 12.18 0 5.94 0 .54 3.6-2.1 8.84l5.32 3.73c1.26-3.79 4.79-6.59 8.96-6.59z" fill="#EA4335"/></svg>' +
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
        function triggerGoogleSignIn() {
          var m = ensureGoogleAuthModal();
          m.classList.add('is-open');
          loadLocalAuthCfg();
          renderSavedAccountsPicker();
          var popBtn = document.getElementById('qcx-ga-popup-btn');
          if (popBtn) popBtn.style.display = googleClientId ? 'flex' : 'none';
          if (googleClientId) startGoogleOAuthPopup(document.getElementById('qcx-ga-status'));
          else {
            var em = document.getElementById('qcx-ga-email');
            if (em) em.focus();
          }
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
          var statusText = role === 'admin' ? '⚡ Quản trị viên hệ thống (Mở khóa toàn bộ)' : (role === 'vip' ? '👑 Thành viên VIP 30 ngày' : (role === 'pro' ? '💎 Thành viên PRO' : 'Hạng: Thành viên (Chưa kích hoạt VIP)'));
          var avUrl = getPreferredGoogleAvatar(u.email, u.name, u.picture, role);
          dd.innerHTML =
            '<div class="qcx-ud-head"><img src="' + avUrl + '" alt=""/><div><p class="qcx-ud-name">' + (u.name || u.email) + '</p><p class="qcx-ud-email">' + u.email + '</p></div></div>' +
            '<div class="qcx-ud-status">' + statusText + '</div>' +
            (role === 'admin' ? '<a class="qcx-ud-btn" href="/p/admin.html" style="text-decoration:none">⚙️ Mở trang Quản trị Admin</a>' : '') +
            '<button type="button" class="qcx-ud-btn is-danger" id="qcx-ud-logout">🚪 Đăng xuất tài khoản</button>';
          var rect = anchorBtn.getBoundingClientRect();
          dd.style.top = Math.min(window.innerHeight - 210, Math.max(8, rect.bottom + 6)) + 'px';
          dd.style.left = Math.min(window.innerWidth - 255, Math.max(8, rect.right - 235)) + 'px';
          dd.classList.add('is-open');
          document.getElementById('qcx-ud-logout').onclick = function () {
            dd.classList.remove('is-open');
            clearEnt();
          };
        }
        window.__qcxRenderAuthSlots = renderAuthSlots;
        window.__qcxTriggerGoogleSignIn = triggerGoogleSignIn;
      })();
    }

    if (typeof window.__qcxRenderAuthSlots === 'function') {
      try { window.__qcxRenderAuthSlots(); } catch (ignore) {}
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
