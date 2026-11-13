(function(){
  var already = document.documentElement.getAttribute('data-qcx-rescue') === 'true';
  document.documentElement.setAttribute('data-qcx-rescue', 'true');

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

  function pathOf(url) {
    try { return new URL(url, location.origin).pathname.replace(/\/$/, ''); }
    catch (error) { return text(url).split('?')[0].replace(/\/$/, ''); }
  }

  function plainSummary(html) {
    var box = document.createElement('div');
    box.innerHTML = text(html);
    box.querySelectorAll('script,style,noscript,svg,iframe,code,pre').forEach(function(node){ node.remove(); });
    var raw = text(box.textContent).replace(/\s+/g, ' ').trim();
    /* Strip leaked CSS / style blocks that often land in Blogger snippets */
    raw = raw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\{[^{}]{0,800}\}/g, ' ')
      .replace(/(?:^|[\s;,{])(?:\*|\*|html|body|[\.\#][\w\-]+|[\w\-]+(?:\s+[\.\#\*]?[\w\-]+){0,6})\s*(?:,\s*(?:\*|html|body|[\.\#]?[\w\-]+(?:\s+[\.\#\*]?[\w\-]+){0,4}))*\s*\{?/gi, ' ')
      .replace(/(?:box-sizing|font-family|background(?:-image|-color|-size)?|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|color|display|position|width|height|border(?:-radius|-color|-width)?|overflow|z-index|opacity|transform|transition|content|flex|grid|gap|top|left|right|bottom)\s*:\s*[^;{]{1,120};?/gi, ' ')
      .replace(/[{};]+/g, ' ')
      .replace(/(?:^|\s)(?:\*|\.|\#)[\w\-]*(?:\s+[\.\#\*]?[\w\-]+){0,4}(?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!raw || /^[\{\}\*\#\.\;\:\-\s,]+$/.test(raw) || raw.length < 18) return '';
    if (/box-sizing|font-family|linear-gradient|\.btn-download|\.contain|body\s*\.|^\*\s|^\.\w/i.test(raw)) return '';
    if ((raw.match(/[{}:;]/g) || []).length >= 2) return '';
    return raw.slice(0, 140);
  }

  function cleanCardSnippets(root) {
    var scope = root || document;
    /* Cards are title-only — always strip description/snippet blocks. */
    scope.querySelectorAll('.card-content .post-entry, .card .post-entry').forEach(function(node){
      node.innerHTML = '';
      node.classList.add('is-css-leak');
      node.setAttribute('data-qcx-snippet', 'hidden');
      node.style.setProperty('display', 'none', 'important');
      try { node.remove(); } catch (ignore) {}
    });
  }
  window.__qcxCleanCardSnippets = cleanCardSnippets;

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

  function upgradeThumb(url) {
    if (!url) return '';
    return String(url)
      .replace(/\/s\d+-c\//i, '/w800-h450-c/')
      .replace(/=s\d+-c(?=$|[/?#])/i, '=w800-h450-c')
      .replace(/\/s72\//i, '/s800/')
      .replace(/=s72(?=$|[/?#])/i, '=s800');
  }

  function entryThumb(entry) {
    try {
      if (entry.media$thumbnail && entry.media$thumbnail.url) return upgradeThumb(entry.media$thumbnail.url);
    } catch (ignore) {}
    var html = (entry.content && entry.content.$t) || '';
    var match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? upgradeThumb(match[1]) : '';
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

  function ensureHero(main) {
    if (document.querySelector('.qcx-hero')) return;
    var title = text(document.querySelector('meta[property="og:site_name"]') && document.querySelector('meta[property="og:site_name"]').content) ||
      text(document.title || 'Blog').replace(/\s*[|\-].*$/, '') || 'Blog';
    var hero = el('section', 'qcx-hero');
    hero.setAttribute('data-enter', 'hero');
    hero.innerHTML =
      '<div class="qcx-hero-inner">' +
      '<h1 class="qcx-hero-title" data-enter="title">' + escapeHtml(title) + '</h1>' +
      '<div class="qcx-hero-divider"></div>' +
      '<p class="qcx-bio" data-enter="bio">Công cụ AI, tài nguyên và mã nguồn thực chiến. Hỗ trợ qua Telegram.</p>' +
      '<div class="qcx-hero-cta" data-enter="cta">' +
      '<a class="qcx-cta-btn" href="/search">Khám phá bài viết</a>' +
      '<a class="qcx-cta-btn qcx-cta-outline" href="https://t.me/superkhung" rel="noopener noreferrer" target="_blank">Hỗ trợ Telegram</a>' +
      '</div>' +
      '</div>' +
      '<div class="qcx-avatar-wrap" data-enter="avatar"><div class="qcx-avatar" aria-label="CÔNG CỤ.AI"><svg xmlns="http://www.w3.org/2000/svg" class="qcx-brand-mark qcx-brand-svg" viewBox="0 0 512 512" width="300" height="300" role="img" aria-label="CÔNG CỤ.AI" tabindex="0"><g class="qcx-ghost-art"><image href="https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.12.5/theme/qcx-brand-mark.png" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid meet"/></g><g class="qcx-ghost-eyes"><circle class="qcx-eye-socket" cx="230.6" cy="189.9" r="16.5" fill="#f2f2f2"/><circle class="qcx-eye qcx-eye-l" cx="230.6" cy="189.9" r="13.2" fill="#0a0a0a"/><circle class="qcx-eye-socket" cx="294.1" cy="183.5" r="16" fill="#f2f2f2"/><circle class="qcx-eye qcx-eye-r" cx="294.1" cy="183.5" r="12.8" fill="#0a0a0a"/></g></svg></div></div>';
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

  function relocateHeroForDesktopRail() {
    var hero = document.querySelector('.qcx-hero');
    if (!hero) return;
    placeHero(hero, document.querySelector('#main, .main'));
  }

  function ensureSidebarSearch() {
    /* Mobile uses drawer search only — do not inject inline Ctrl-K field. */
    if (window.matchMedia && window.matchMedia('(max-width: 860px)').matches) return;
    var sidebar = document.querySelector('#sidebar');
    var wrap = document.querySelector('.main-wrapper') || document.querySelector('main.main-container');
    if (!sidebar && wrap) {
      sidebar = el('aside', 'sidebar qcx-addon-zone qcx-rescue-sidebar');
      sidebar.id = 'sidebar';
      wrap.appendChild(sidebar);
    }
    if (!sidebar) return;
    var existing = sidebar.querySelector('.qcx-inline-search .qcx-search-text');
    if (existing) {
      existing.textContent = 'search…';
      return;
    }
    if (sidebar.querySelector('.qcx-inline-search')) return;
    var widget = el('div', 'widget HTML qcx-sidebar-search');
    widget.innerHTML =
      '<div class="widget-content">' +
      '<div aria-label="Mở tìm kiếm bài viết" class="qcx-inline-search qcx-sidebar-search" role="button" tabindex="0">' +
      '<span class="qcx-search-text">search…</span>' +
      '<span class="qcx-search-shortcut">Ctrl K</span>' +
      '</div></div>';
    sidebar.insertBefore(widget, sidebar.firstChild);
  }

  /* Font-only: Inter title/body like breakdev.org — no UI chrome changes. */
  var QCX_CDN = 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.13.55/theme/';
  var QCX_FONTS_CSS = QCX_CDN + 'qcx-breakdev-fonts.css';
  var QCX_ATMOSPHERE_CSS = QCX_CDN + 'qcx-atmosphere.css';
  var QCX_SITE_FAVICON = 'https://www.timkiem.app/favicon.ico';

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
      '.nav-pagination .blog-pager>a,.nav-pagination .blog-pager>button,' +
      '.blog-pager .older-link,.blog-pager .newer-link,' +
      '.qcx-pager .theme-button,.qcx-pager button.theme-button,' +
      '.qcx-rescue-pager .theme-button,.qcx-rescue-pager button.theme-button{' +
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
      'margin:0 0 28px!important;padding:0 14px!important;box-sizing:border-box!important;' +
      'background-color:#24352c!important;background-image:none!important;' +
      'border:1px solid rgba(0,240,163,.22)!important;border-radius:12px!important;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 8px 24px rgba(0,0,0,.4)!important;isolation:isolate!important}' +
      '.qcx-inline-search.qcx-sidebar-search{max-width:none!important;margin:0!important}' +
      '.qcx-inline-search:hover,.qcx-inline-search:focus-visible{border-color:rgba(0,240,163,.4)!important}' +
      '.qcx-inline-search .qcx-search-icon{display:block!important;flex:0 0 auto!important;width:18px!important;height:18px!important;' +
      'color:rgba(138,165,150,.85)!important}' +
      '.qcx-inline-search .qcx-search-text{flex:1 1 auto!important;min-width:0!important;' +
      'color:rgba(138,165,150,.72)!important;font:500 13px/1.3 var(--mono),monospace!important;text-align:left!important}' +
      '.qcx-inline-search .qcx-search-text::before{content:none!important}' +
      '.qcx-inline-search .qcx-search-shortcut{display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;' +
      'background:rgba(0,0,0,.35)!important;border:1px solid rgba(0,240,163,.25)!important;' +
      'color:#00f0a3!important;border-radius:6px!important;padding:3px 7px!important}' +
      '@media (min-width:861px){.qcx-inline-search.qcx-results-search{display:none!important}}' +
      /* Mobile: hide all inline search — drawer search only */
      '@media (max-width:860px){.qcx-inline-search,.qcx-inline-search.qcx-results-search,' +
      '.qcx-inline-search.qcx-sidebar-search,.widget.qcx-sidebar-search,' +
      '.widget.HTML.qcx-sidebar-search{display:none!important}}' +
      '.all_posts,[data-page-item=\"multiple\"] .all_posts{clear:both!important;margin-top:0!important}' +
      '#qcx-admin-root .gate,html[data-qcx-admin=\"1\"] #qcx-admin-root .gate{' +
      'background-color:#24352c!important;background-image:none!important;' +
      'border:1px solid rgba(0,240,163,.28)!important;border-radius:12px!important;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 0 0 1px rgba(0,0,0,.45),0 16px 42px rgba(0,0,0,.55)!important;' +
      'isolation:isolate!important}' +
      'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden))>.wrap>header,' +
      'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden)) #btnLogout{display:none!important}' +
      /* P1: hide “N Nhận xét” stub under lock; collapse empty unlock chrome */
      'body:has(.qcx-lock-panel) #comments>h4.postAComment,' +
      'body:has(.qcx-lock-panel) .qcx-comments-shell>h4.postAComment,' +
      'html[data-qcx-unlocked=\"1\"] #comments>h4.postAComment,' +
      'html[data-qcx-unlocked=\"1\"] .qcx-comments-shell>h4.postAComment{' +
      'display:none!important;margin:0!important;padding:0!important;height:0!important;overflow:hidden!important}' +
      '#comments[data-qcx-unlock-chrome=\"1\"]:not(.is-settled),' +
      '.qcx-comments-shell[data-qcx-unlock-chrome=\"1\"]:not(.is-settled){' +
      'border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;margin:0 0 8px!important}' +
      '#comments[data-qcx-unlock-chrome=\"1\"]:not(.is-settled):not(:has(.comment-form,.commentForm,iframe,.comment,#comment-editor,.qcx-comment-list)),' +
      '.qcx-comments-shell[data-qcx-unlock-chrome=\"1\"]:not(.is-settled):not(:has(.comment-form,.commentForm,iframe,.comment,#comment-editor,.qcx-comment-list)){' +
      'display:none!important;height:0!important;max-height:0!important;overflow:hidden!important;margin:0!important}' +
      '@media (max-width:860px){.qcx-sidebar-rail.qcx-tutorial-inline,#qcx-sidebar-rail-rescue.qcx-tutorial-inline{' +
      'display:block!important;width:100%!important;margin:12px 0 16px!important;padding:12px!important;' +
      'box-sizing:border-box!important;border:1px solid rgba(28,36,32,.14)!important;border-radius:14px!important;' +
      'background:rgba(4,10,7,.72)!important;--qcx-latest-thumb-width:72px;--qcx-latest-thumb-height:48px}' +
      '.qcx-tutorial-inline .qcx-latest-list{display:block!important;margin:0!important;padding:0!important;list-style:none!important}' +
      '.qcx-tutorial-inline .qcx-latest-list>li{display:grid!important;grid-template-columns:72px minmax(0,1fr)!important;' +
      'gap:10px!important;align-items:center!important;min-height:56px!important;margin:0!important;padding:8px 0!important;' +
      'border-bottom:1px solid rgba(28,36,32,.11)!important;list-style:none!important}' +
      '.qcx-tutorial-inline .item-thumbnail{width:72px!important;height:48px!important;margin:0!important;border-radius:8px!important;overflow:hidden!important}' +
      '.qcx-tutorial-inline .item-thumbnail img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}' +
      '.qcx-tutorial-inline .item-title a{display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;' +
      'overflow:hidden!important;color:#dce9df!important;font:700 11px/1.4 var(--mono),monospace!important;text-decoration:none!important}' +
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
      /* P3: // N phút đọc */
      '.qcx-read-time,[data-page-type=\"post\"] .post-header .qcx-read-time,.qcx-rescue-single .post-header .qcx-read-time{' +
      'display:block!important;margin:6px 0 0!important;padding:0!important;' +
      'font:500 12px/1.35 var(--mono),monospace!important;letter-spacing:.02em!important;' +
      'color:#28d28c!important;-webkit-text-fill-color:#28d28c!important;opacity:1!important}' +
      '.qcx-read-time::before,[data-page-type=\"post\"] .post-header .qcx-read-time::before,' +
      '.qcx-rescue-single .post-header .qcx-read-time::before,.post-item .post-header .qcx-read-time::before{' +
      'content:\"// \"!important;color:#28d28c!important;-webkit-text-fill-color:#28d28c!important;' +
      'opacity:1!important;font-weight:700!important}' +
      'html[data-qcx-admin=\"1\"] .qcx-read-time{display:none!important}';
    if (style.textContent !== css) style.textContent = css;
  }
  function ensureSubscribeCardPanel() { ensureRaisedChrome(); }

  /* XML drawer CSS — shell + interior (links/chips); theme Lưu often drops skin rules. */
  function ensureMenuDrawer() {
    var css =
      '#qcx-menu-backdrop{display:none!important;position:fixed!important;inset:0!important;' +
      'background:rgba(0,0,0,.72)!important;z-index:99997!important}' +
      '#qcx-menu-backdrop.open{display:block!important}' +
      '#qcx-menu{position:fixed!important;top:0!important;left:0!important;bottom:0!important;' +
      'width:min(92vw,360px)!important;max-width:360px!important;background:#07110c!important;' +
      'border-right:1px solid rgba(28,36,32,.14)!important;border-radius:0 18px 18px 0!important;' +
      'z-index:99998!important;display:flex!important;flex-direction:column!important;' +
      'transform:translateX(-105%)!important;transition:transform .28s cubic-bezier(.2,.8,.2,1)!important;' +
      'overflow:hidden!important;box-shadow:8px 0 48px rgba(0,0,0,.55)!important;margin:0!important;' +
      'padding-top:env(safe-area-inset-top,0px)!important;padding-bottom:env(safe-area-inset-bottom,0px)!important;' +
      'visibility:hidden!important;pointer-events:none!important}' +
      '#qcx-menu[aria-hidden=\"true\"]:not(.open){transform:translateX(-105%)!important;' +
      'visibility:hidden!important;pointer-events:none!important}' +
      '#qcx-menu.open,#qcx-menu[aria-hidden=\"false\"]{transform:translateX(0)!important;left:0!important;' +
      'visibility:visible!important;pointer-events:auto!important}' +
      /* Interior: stacked links, chips, hide Bài viết mới */
      '#qcx-menu-header{display:flex!important;align-items:center!important;justify-content:space-between!important;' +
      'padding:14px 16px 10px!important;flex-shrink:0!important;gap:10px!important}' +
      '#qcx-menu-logo{font:700 15px/1.2 var(--mono,monospace)!important;color:#e8fff2!important;' +
      'letter-spacing:.12em!important;text-transform:uppercase!important}' +
      '#qcx-menu-close{width:36px!important;height:36px!important;display:grid!important;place-items:center!important;' +
      'background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.08)!important;' +
      'border-radius:10px!important;cursor:pointer!important;flex-shrink:0!important;line-height:1!important;' +
      'color:rgba(190,211,198,.72)!important;font-size:20px!important;padding:0!important}' +
      '#qcx-menu-search.qcx-menu-search-row,.qcx-menu-search-row{display:flex!important;align-items:center!important;' +
      'gap:10px!important;width:calc(100% - 32px)!important;margin:0 16px 14px!important;min-height:48px!important;' +
      'padding:0 14px!important;border:1px solid rgba(0,240,163,.42)!important;border-radius:12px!important;' +
      'background:rgba(0,240,163,.08)!important;color:#e8fff2!important;' +
      'font:700 14px/1.2 system-ui,sans-serif!important;text-align:left!important;cursor:pointer!important;' +
      'flex-shrink:0!important;visibility:visible!important;opacity:1!important;' +
      'box-shadow:0 0 0 1px rgba(0,240,163,.12),0 8px 22px rgba(0,0,0,.35)!important}' +
      '#qcx-menu-search.qcx-menu-search-row>span{flex:1 1 auto!important;min-width:0!important}' +
      '#qcx-menu-search svg{color:#00f0a3!important}' +
      '#qcx-menu-search .qcx-menu-search-hint,.qcx-menu-search-row .qcx-menu-search-hint{display:inline-flex!important;' +
      'align-items:center!important;margin-left:auto!important;padding:2px 7px!important;' +
      'border:1px solid rgba(255,255,255,.12)!important;border-radius:6px!important;background:rgba(0,0,0,.28)!important;' +
      'color:rgba(190,211,198,.78)!important;font:600 10px/1.2 var(--mono,ui-monospace,monospace)!important;' +
      'letter-spacing:.02em!important;white-space:nowrap!important;flex-shrink:0!important}' +
      '@media (max-width:860px),(pointer:coarse){' +
      '#qcx-menu-search .qcx-menu-search-hint,.qcx-menu-search-row .qcx-menu-search-hint{display:none!important}}' +
      '#qcx-menu-search.qcx-menu-search-row:hover,.qcx-menu-search-row:hover,' +
      '#qcx-menu-search.qcx-menu-search-row:active,.qcx-menu-search-row:active{' +
      'border-color:rgba(0,240,163,.65)!important;color:#fff!important;background:rgba(0,240,163,.14)!important}' +
      '#qcx-menu-nav{flex:1!important;padding:0 0 12px!important;overflow-y:auto!important;' +
      'overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important}' +
      '.qcx-menu-link{display:flex!important;align-items:center!important;gap:10px!important;min-height:44px!important;' +
      'padding:10px 16px!important;margin:0 8px!important;color:var(--fg,#e8efe9)!important;font-size:15px!important;' +
      'font-weight:600!important;text-decoration:none!important;border:0!important;border-radius:10px!important}' +
      '.qcx-menu-link:hover,.qcx-menu-link.qcx-menu-current,.qcx-menu-link:focus-visible{' +
      'background:rgba(255,255,255,.06)!important;color:#e8efe9!important}' +
      '.qcx-menu-section{padding:16px 16px 8px!important;font-size:11px!important;font-weight:700!important;' +
      'color:rgba(138,165,150,.85)!important;letter-spacing:.08em!important;text-transform:uppercase!important;' +
      'border:0!important;margin:0!important}' +
      '.qcx-menu-label-link{display:flex!important;align-items:center!important;justify-content:space-between!important;' +
      'min-height:44px!important;padding:10px 16px!important;margin:0 8px!important;border-radius:10px!important;' +
      'text-decoration:none!important;color:var(--fg,#e8efe9)!important;font-size:14px!important;font-weight:600!important}' +
      '.qcx-menu-labels-cloud{display:flex!important;flex-wrap:wrap!important;gap:8px!important;' +
      'padding:4px 16px 12px!important}' +
      '.qcx-menu-chip{display:inline-flex!important;align-items:center!important;max-width:100%!important;' +
      'min-height:32px!important;padding:0 12px!important;border:1px solid rgba(28,36,32,.2)!important;' +
      'border-radius:999px!important;background:rgba(28,36,32,.05)!important;color:rgba(210,230,216,.9)!important;' +
      'font-size:12px!important;font-weight:600!important;text-decoration:none!important;white-space:nowrap!important}' +
      '#qcx-menu-footer{padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px))!important;' +
      'border-top:1px solid rgba(255,255,255,.06)!important;flex-shrink:0!important}' +
      '#qcx-menu-footer a,.qcx-menu-footer-cta{display:flex!important;align-items:center!important;' +
      'justify-content:center!important;width:100%!important;min-height:44px!important;border-radius:12px!important;' +
      'background:rgba(28,36,32,.1)!important;border:1px solid rgba(28,36,32,.28)!important;' +
      'color:var(--accent,#28d28c)!important;font-size:13px!important;font-weight:700!important;' +
      'text-decoration:none!important}' +
      '#qcx-menu .qcx-mobile-menu-hidden{display:none!important}' +
      'body.qcx-menu-open{overflow:hidden!important}' +
      /* PC menu FAB hidden — mobile uses tabbar .open-menu only */
      '#qcx-pc-menu-btn{display:none!important}' +
      'body#layout #qcx-pc-menu-btn,html[data-qcx-admin=\"1\"] #qcx-pc-menu-btn,' +
      'html[data-qcx-admin=\"1\"] #qcx-native-tabbar,html[data-qcx-admin=\"1\"] .footer-navigation-bar{display:none!important}';
    var style = document.getElementById('qcx-menu-drawer');
    if (!style) {
      style = document.createElement('style');
      style.id = 'qcx-menu-drawer';
      (document.head || document.documentElement).appendChild(style);
    }
    /* Avoid rewriting identical CSS — restyling mid-transition freezes the drawer open anim. */
    if (style.textContent !== css) style.textContent = css;
  }
  window.__qcxEnsureMenuDrawer = ensureMenuDrawer;

  function setMenuOpenState(open) {
    var menu = document.getElementById('qcx-menu');
    var backdrop = document.getElementById('qcx-menu-backdrop');
    var pcBtn = document.getElementById('qcx-pc-menu-btn');
    if (!menu) return;
    if (open) {
      menu.classList.add('open');
      menu.setAttribute('aria-hidden', 'false');
      if (backdrop) {
        backdrop.classList.add('open');
        backdrop.setAttribute('aria-hidden', 'false');
      }
      document.body.classList.add('qcx-menu-open', 'qcx-panel-open');
    } else {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
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
      'padding:4px 2px!important;font-family:var(--mono)!important;font-size:10px!important;font-weight:600!important;' +
      'text-decoration:none!important;gap:2px!important;color:rgba(190,211,198,.72)!important;fill:rgba(190,211,198,.72)!important;' +
      'box-sizing:border-box!important;-webkit-tap-highlight-color:transparent;touch-action:manipulation}' +
      '.footer-navigation-bar>div>ul>li>a>.icon,#qcx-native-tabbar>div>ul>li>a>.icon{width:24px!important;height:24px!important;' +
      'display:flex!important;align-items:center!important;justify-content:center!important}' +
      '.footer-navigation-bar>div>ul>li>a>.icon>svg,#qcx-native-tabbar>div>ul>li>a>.icon>svg{width:22px!important;height:22px!important;fill:currentColor!important}' +
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
      'grid-template-columns:64px minmax(0,1fr)!important;gap:6px 14px!important}' +
      'body:not(#layout) .qcx-avatar,.qcx-avatar{width:64px!important;height:64px!important;min-width:64px!important}' +
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
      'transform:translateY(-4px) scale(1.06)!important;' +
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
      '<div class=\"icon\"><svg height=\"22\" viewBox=\"0 0 24 24\" width=\"22\" fill=\"none\"><circle cx=\"11\" cy=\"11\" r=\"7\" stroke=\"currentColor\" stroke-width=\"1.8\"/><path d=\"M16.5 16.5L21 21\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg></div>' +
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
      var searchLabel = menuSearch.querySelector('span');
      if (searchLabel) searchLabel.textContent = 'Tìm kiếm bài viết…';
      menuSearch.setAttribute('aria-label', 'Mở tìm kiếm');
    }
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
  }

  function ensureDesktopMenuButton() {
    var btn = document.getElementById('qcx-pc-menu-btn');
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
  }
  window.__qcxEnsureMobileNavReady = ensureMobileNavReady;

  /* Theme often drops .qcx-backdrop / scanline / ghost-blink CSS — restore. */
  function ensureAtmosphere() {
    ensureStylesheet('qcx-atmosphere', QCX_ATMOSPHERE_CSS);
    ensureRaisedChrome();
    ensureMenuDrawer();
    ensureMobileNavReady();
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

  /* Fixed Tutorial count — 5 fits the right rail without crowding mobile. */
  var QCX_TUTORIAL_COUNT = 5;

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
    if (wrap && window.matchMedia('(min-width: 861px)').matches) {
      wrap.style.setProperty(
        'grid-template-columns',
        'minmax(0, 1fr) minmax(220px, 280px)',
        'important'
      );
    }
    if (sidebar) {
      sidebar.style.removeProperty('display');
      sidebar.removeAttribute('hidden');
      sidebar.removeAttribute('aria-hidden');
    }
  }

  /* Mobile: park Tutorial under .qcx-lock-panel (before #comments). PC: restore to sidebar.
     Unlock chrome may re-insert #comments as lock.nextSibling — reassert lock → rail → comments. */
  function placeTutorialBesideLock(rail, sidebar) {
    if (!rail) return;
    var lock = document.querySelector('.qcx-lock-panel:not(.is-done)');
    if (!lock) lock = document.querySelector('.qcx-lock-panel');
    var mobile = false;
    try { mobile = window.matchMedia('(max-width: 860px)').matches; } catch (ignoreMq) {}
    if (mobile && lock && lock.parentNode) {
      rail.classList.add('qcx-tutorial-inline');
      try {
        var comments = document.getElementById('comments') || document.querySelector('.qcx-comments-shell');
        /* Always: lock → Tutorial → comments → rest */
        if (lock.nextElementSibling !== rail) {
          lock.parentNode.insertBefore(rail, lock.nextElementSibling);
        }
        if (comments && comments.parentNode === lock.parentNode && rail.nextElementSibling !== comments) {
          if (rail.nextSibling) rail.parentNode.insertBefore(comments, rail.nextSibling);
          else rail.parentNode.appendChild(comments);
        }
      } catch (ignoreIns) {}
      return;
    }
    rail.classList.remove('qcx-tutorial-inline');
    if (sidebar && rail.parentNode !== sidebar) {
      try { sidebar.appendChild(rail); } catch (ignoreBack) {}
    }
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
                  '<div aria-level="2" class="qcx-related-heading" role="heading">Tutorial</div>');
              }
              shell.insertAdjacentHTML('beforeend',
                '<ul class="qcx-latest-list" aria-busy="true" aria-label="Tutorial"></ul>');
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
          '<div aria-level="2" class="qcx-related-heading" role="heading">Tutorial</div>' +
          '<ul class="qcx-latest-list" aria-busy="true" aria-label="Tutorial"></ul>' +
          '</div>';
        sidebar.appendChild(rail);
      }
    }
    /* Scrub duplicate rescue ids + stray inline clones (not the chosen rail). */
    document.querySelectorAll('#qcx-sidebar-rail-rescue, .post-body > .qcx-sidebar-rail.qcx-tutorial-inline').forEach(function(node) {
      if (node === rail) return;
      try { if (node.parentNode) node.parentNode.removeChild(node); } catch (ignoreDup) {}
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

    /* Mobile: Tutorial directly under lock (before #comments). PC: keep in #sidebar.
       Reassert after unlock chrome moves #comments under the lock. */
    placeTutorialBesideLock(rail, sidebar);
    hideMobileTutorialClones();
    if (!rail.getAttribute('data-qcx-tutorial-reassert')) {
      rail.setAttribute('data-qcx-tutorial-reassert', '1');
      [200, 600, 1200, 2400, 4500, 8000].forEach(function(ms) {
        window.setTimeout(function() {
          placeTutorialBesideLock(rail, sidebar);
          hideMobileTutorialClones();
        }, ms);
      });
      try {
        window.addEventListener('resize', function() {
          placeTutorialBesideLock(rail, sidebar);
          hideMobileTutorialClones();
        });
        var postBody = document.querySelector('.post-body');
        if (postBody && typeof MutationObserver === 'function') {
          var obs = new MutationObserver(function() {
            placeTutorialBesideLock(rail, sidebar);
            hideMobileTutorialClones();
          });
          obs.observe(postBody, { childList: true });
        }
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
      return String((entry.title && entry.title.$t) || '').replace(/\s+/g, ' ').trim();
    }
    function entryImage(entry) {
      var media = entry['media$thumbnail'] && entry['media$thumbnail'].url;
      if (!media) return '';
      return String(media)
        .replace(/\/s\d+(?:-c)?\//i, '/w320-h180-c/')
        .replace(/=s\d+(?:-c)?(?=$|&)/i, '=w320-h180-c');
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
        var imageUrl = entryImage(entry);
        if (imageUrl) {
          var image = document.createElement('img');
          image.alt = '';
          image.src = imageUrl;
          image.loading = 'lazy';
          image.decoding = 'async';
          image.width = 152;
          image.height = 96;
          image.addEventListener('error', function() {
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
        list.innerHTML = '<li class="qcx-latest-empty">Chưa có Tutorial</li>';
      } else {
        list.innerHTML = '';
        list.appendChild(fragment);
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
      loadFeed('/feeds/posts/default?alt=json&max-results=' + (QCX_TUTORIAL_COUNT + 3) + '&orderby=published', function(posts) {
        if (posts.length) {
          renderItems(posts);
          return;
        }
        loadFeed('/feeds/pages/default?alt=json&max-results=' + (QCX_TUTORIAL_COUNT + 3) + '&orderby=published', function(pages) {
          renderItems(pages);
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

  function cardFromEntry(entry) {
    var title = (entry.title && entry.title.$t) || 'Bài viết';
    var href = entryLink(entry) || '/';
    var labels = entryLabels(entry).slice(0, 2);
    var thumb = entryThumb(entry);
    var col = el('div', 'col-md-4');
    var media = thumb
      ? '<img class="qcx-card-media" alt="' + escapeHtml(title) + '" loading="lazy" src="' + escapeHtml(thumb) + '" width="1200" height="675"/>'
      : '<span class="qcx-card-noimg" aria-hidden="true">// no image</span>';
    var labelHtml = labels.map(function(label){
      return '<a href="/search/label/' + encodeURIComponent(label) + '" rel="tag">' + escapeHtml(label) + '</a>';
    }).join('');
    col.innerHTML =
      '<article class="card">' +
      '<div class="card-header">' +
      '<a href="' + escapeHtml(href) + '" title="' + escapeHtml(title) + '">' + media + '</a>' +
      (labelHtml ? '<div class="qcx-card-labels">' + labelHtml + '</div>' : '') +
      '</div>' +
      '<div class="card-content">' +
      '<h2 class="title"><a href="' + escapeHtml(href) + '">' + escapeHtml(title) + '</a></h2>' +
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
    var title = (entry.title && entry.title.$t) || document.title || 'Bài viết';
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
    article.innerHTML =
      '<div class="the-article" id="the-article">' +
      '<header class="post-header"' + (published ? ' data-published="' + escapeHtml(published) + '"' : '') + '>' +
      '<h1 class="post-title">' + escapeHtml(title) + '</h1>' +
      '</header>' +
      '<div class="post-body">' + content + '</div>' +
      '</div>';
    shell.appendChild(article);
    main.appendChild(shell);
    updateMacPath(title);
    document.title = title;
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

  function renderHomepage(main, entries) {
    var PAGE_SIZE = 6;
    ensureHero(main);
    var shell = el('div', 'widget Blog qcx-rescue-blog qcx-feed-in');
    shell.id = 'Blog1';
    var allPosts = el('div', 'all_posts');
    var row = el('div', 'row');
    var pager = el('div', 'nav-pagination qcx-pager qcx-rescue-pager');
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

    var page = 1;
    var totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

    function paint() {
      var start = (page - 1) * PAGE_SIZE;
      var slice = entries.slice(start, start + PAGE_SIZE);
      row.innerHTML = '';
      slice.forEach(function(entry){ row.appendChild(cardFromEntry(entry)); });
      cleanCardSnippets(row);
      window.setTimeout(function(){
        cleanCardSnippets(row);
        try {
          var cards = row.querySelectorAll('.card');
          cards.forEach(function(card){ card.style.minHeight = ''; card.style.height = ''; });
        } catch (err) {}
      }, 40);
      pagerInner.innerHTML = '';
      if (totalPages <= 1) {
        pager.style.display = 'none';
        return;
      }
      pager.style.display = '';
      var prev = el('button', 'newer-link theme-button', '← Mới hơn');
      prev.type = 'button';
      prev.disabled = page <= 1;
      prev.addEventListener('click', function(){
        if (page <= 1) return;
        page -= 1;
        paint();
        row.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      var info = el('span', 'qcx-pager-info', 'Trang ' + page + ' / ' + totalPages);
      var next = el('button', 'older-link theme-button', 'Cũ hơn →');
      next.type = 'button';
      next.disabled = page >= totalPages;
      next.addEventListener('click', function(){
        if (page >= totalPages) return;
        page += 1;
        paint();
        row.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      pagerInner.appendChild(prev);
      pagerInner.appendChild(info);
      pagerInner.appendChild(next);
    }

    paint();
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
    var cacheKey = 'qcx:feed:summary:12';
    var cached = readFeedCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    return fetchJson('/feeds/posts/summary?alt=json&max-results=12').then(function(payload){
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
      for (var i = 0; i < 6; i++) row.appendChild(skelCard());
      allPosts.appendChild(row);
      shell.appendChild(allPosts);
    }
    main.appendChild(shell);
    return shell;
  }

  function clearRescuePaint(main) {
    main.querySelectorAll('.qcx-hero, .qcx-rule, .qcx-section-head, .qcx-rescue-blog, .qcx-rescue-status').forEach(function(node){ node.remove(); });
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

    if (hasUsableNativeBlog()) return;

    ensureHeaderSearch();
    main.classList.remove('no-items');

    /* Pages use qcx:page:; posts use qcx:post: — must match loadSingleEntry. */
    var cacheKey = isSingle
      ? ((isStaticPage ? 'qcx:page:' : 'qcx:post:') + currentPath)
      : 'qcx:feed:summary:12';
    /* Reload: skip sessionStorage instant paint (F5 stale flash). Keep for navigate. */
    var skipInstantCache = isSingle && isReloadNavigation();
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
    window.setTimeout(cleanCardSnippets, 80);
    window.setTimeout(cleanCardSnippets, 400);
    window.setTimeout(cleanCardSnippets, 1200);
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
    var nativeBlog = document.querySelector('.widget.Blog:not(.qcx-rescue-blog)');
    /* Empty #main (Blog1 missing in Layout) → rescue immediately, no 120ms wait. */
    if (!nativeBlog) {
      rescuePosts();
      return;
    }
    /* Chờ Blog native ~120ms nếu widget đã có nhưng chưa kịp render card. */
    if (!hasUsableNativeBlog()) {
      window.setTimeout(function(){
        if (hasUsableNativeBlog()) return;
        rescuePosts();
      }, 120);
      return;
    }
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
        'font-weight:700!important;cursor:pointer!important}';
    var st = document.getElementById('qcx-admin-chrome-css');
    if (!st) {
      st = document.createElement('style');
      st.id = 'qcx-admin-chrome-css';
      (document.head || document.documentElement).appendChild(st);
    }
    if (st.textContent !== adminCss) st.textContent = adminCss;
  }

  function ensureSiteFooter() {
    if (isAdminPath()) return;
    if (document.querySelector('.qcx-subscribe-card[data-qcx-footer="1"]')) return;
    var host = document.querySelector('main.main-container') || document.querySelector('#main') || document.body;
    if (!host) return;
    var blogId = document.documentElement.getAttribute('data-blog-id') || '5252547691219049876';
    var home = ((document.querySelector('link[rel="canonical"]') || {}).href) || (location.origin + '/');
    var title = text(((document.querySelector('meta[property="og:site_name"]') || {}).content) || '') ||
      text(((document.querySelector('.qcx-hero-title') || {}).textContent) || '') ||
      'AI HUB TOOLS';
    var follow = 'https://www.blogger.com/follow.g?blogID=' + encodeURIComponent(blogId) +
      '&returnUrl=' + encodeURIComponent(home);
    var card = el('section', 'qcx-subscribe-card');
    card.setAttribute('data-qcx-footer', '1');
    card.setAttribute('aria-label', 'Theo dõi blog');
    card.innerHTML =
      '<div class="qcx-sc-text">' +
      '<div class="qcx-sc-title">Theo dõi ' + escapeHtml(title) + '</div>' +
      '<p class="qcx-sc-desc">Nhận bài mới trên Blogger và cập nhật nhanh qua Telegram.</p>' +
      '</div>' +
      '<div class="qcx-sc-actions">' +
      '<a class="qcx-sc-btn" href="' + follow + '" rel="nofollow noopener" target="_blank">Theo dõi blog</a>' +
      '<a class="qcx-sc-btn qcx-sc-btn-outline" href="https://t.me/superkhung" rel="noopener noreferrer" target="_blank">Kênh Telegram</a>' +
      '</div>';

    /* Prefer placing just above footer section so Layout “Chân trang” stays the widget zone. */
    var footerSection = document.getElementById('footer') || document.querySelector('footer.footer');
    if (footerSection && footerSection.parentNode) {
      footerSection.parentNode.insertBefore(card, footerSection);
    } else {
      host.appendChild(card);
    }

    /* Keep a visible HTML shell inside #footer so Chân trang is not empty live. */
    if (footerSection) {
      footerSection.classList.add('qcx-footer-gadgets');
      if (!footerSection.querySelector('.widget.HTML.qcx-footer-links, #HTML5')) {
        var widget = el('div', 'widget HTML qcx-footer-links');
        widget.id = 'HTML5';
        widget.innerHTML =
          '<div class="widget-content">' +
          '<div class="qcx-footer-links-row">' +
          '<a href="/">Trang chủ</a>' +
          '<a href="/search">Tất cả bài</a>' +
          '<a href="https://t.me/superkhung" rel="noopener noreferrer" target="_blank">Telegram</a>' +
          '</div></div>';
        footerSection.appendChild(widget);
      }
    }
  }

  /* Re-entry after CDN bump: refresh atmosphere/fonts/menu/ghost. */
  if (already) {
    ensureBreakdevFonts();
    ensureDefaultFavicon();
    ensureAtmosphere();
    ensureMenuDrawer();
    ensureMobileNavReady();
    ensureGhostBlink();
    window.setTimeout(ensureGhostBlink, 400);
    return;
  }

  bootRescue();
  ensureBreakdevFonts();
  ensureDefaultFavicon();
  ensureAtmosphere();
  ensureSidebarSearch();
  ensureSidebarRail();
  relocateHeroForDesktopRail();
  hideDropsOnHome();
  ensureAdminChrome();
  ensureSiteFooter();
  ensureGhostBlink();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      ensureBreakdevFonts();
      ensureDefaultFavicon();
      ensureAtmosphere();
      ensureSidebarSearch();
      ensureSidebarRail();
      relocateHeroForDesktopRail();
      hideDropsOnHome();
      ensureAdminChrome();
      ensureSiteFooter();
      ensureGhostBlink();
    }, { once: true });
  }
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
  window.setTimeout(ensureMobileNavReady, 120);
  window.setTimeout(ensureMobileNavReady, 500);
  window.setTimeout(ensureGhostBlink, 200);
  window.setTimeout(ensureGhostBlink, 800);
  window.setTimeout(ensureGhostBlink, 1600);

  /* Always scrub native Blog1 snippets (CSS leak), even when rescue skips. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSnippetClean, { once: true });
  else bootSnippetClean();
})();
