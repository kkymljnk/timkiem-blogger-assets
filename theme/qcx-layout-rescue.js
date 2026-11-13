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
      '<div class="qcx-avatar-wrap" data-enter="avatar"><div class="qcx-avatar" aria-label="CÔNG CỤ.AI"><svg xmlns="http://www.w3.org/2000/svg" class="qcx-brand-mark qcx-brand-svg" viewBox="0 0 512 512" width="300" height="300" role="img" aria-label="CÔNG CỤ.AI" tabindex="0"><g class="qcx-ghost-art"><image href="https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.12.5/theme/qcx-brand-mark.png" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid meet"/></g><g class="qcx-ghost-eyes"><circle class="qcx-eye qcx-eye-l" cx="230.6" cy="189.9" r="13.2" fill="#0a0a0a"/><circle class="qcx-eye qcx-eye-r" cx="294.1" cy="183.5" r="12.8" fill="#0a0a0a"/></g></svg></div></div>';
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
  var QCX_CDN = 'https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v2026.11.13.15/theme/';
  var QCX_FONTS_CSS = QCX_CDN + 'qcx-breakdev-fonts.css';
  var QCX_ATMOSPHERE_CSS = QCX_CDN + 'qcx-atmosphere.css';

  function ensureStylesheet(id, href) {
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    (document.head || document.documentElement).appendChild(link);
  }

  function ensureBreakdevFonts() {
    ensureStylesheet('qcx-breakdev-fonts', QCX_FONTS_CSS);
  }
  window.__qcxEnsureBreakdevFonts = ensureBreakdevFonts;

  /* Inline so subscribe panel never waits on jsDelivr cache. */
  function ensureSubscribeCardPanel() {
    var style = document.getElementById('qcx-subscribe-panel');
    if (!style) {
      style = document.createElement('style');
      style.id = 'qcx-subscribe-panel';
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent =
      '.qcx-subscribe-card,.qcx-subscribe-card[data-qcx-footer="1"]{' +
      'background-color:#1c2822!important;background-image:none!important;' +
      'border:1px solid rgba(0,240,163,.28)!important;border-radius:14px!important;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 0 0 1px rgba(0,0,0,.45),0 16px 42px rgba(0,0,0,.55)!important;' +
      'overflow:hidden!important;position:relative!important;isolation:isolate!important}' +
      '.qcx-subscribe-card::before{content:\"\"!important;position:absolute!important;inset:0!important;' +
      'pointer-events:none!important;z-index:0!important;' +
      'background-image:linear-gradient(90deg,rgba(0,240,163,.55) 0,rgba(0,240,163,.55) 3px,transparent 3px),' +
      'linear-gradient(180deg,rgba(255,255,255,.05),transparent 42%)!important;' +
      'background-color:transparent!important}' +
      '.qcx-subscribe-card>*{position:relative!important;z-index:1!important}';
  }

  /* Theme often drops .qcx-backdrop / scanline / ghost-blink CSS — restore. */
  function ensureAtmosphere() {
    ensureStylesheet('qcx-atmosphere', QCX_ATMOSPHERE_CSS);
    ensureSubscribeCardPanel();
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

  function ensureGhostBlink() {
    try {
      if (typeof window.qcxBootGhostBlink === 'function') {
        window.qcxBootGhostBlink();
        return;
      }
    } catch (ignore) {}
    /* Minimal fallback if carrd-motion/runtime not ready yet. */
    var nodes = document.querySelectorAll('.qcx-brand-svg');
    if (!nodes.length) return;
    Array.prototype.forEach.call(nodes, function (svg) {
      if (svg.getAttribute('data-qcx-blink-bound')) return;
      svg.setAttribute('data-qcx-blink-bound', '1');
      svg.addEventListener('click', function (e) {
        e.preventDefault();
        if (svg.classList.contains('is-blinking')) return;
        svg.classList.remove('is-blinking');
        void svg.offsetWidth;
        svg.classList.add('is-blinking');
        window.setTimeout(function () { svg.classList.remove('is-blinking'); }, 280);
      });
    });
    var heroSvg = document.querySelector('.qcx-hero .qcx-brand-svg, .qcx-avatar .qcx-brand-svg');
    if (!heroSvg || heroSvg.getAttribute('data-qcx-autoblinked')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.setTimeout(function () {
      if (heroSvg.getAttribute('data-qcx-autoblinked')) return;
      heroSvg.setAttribute('data-qcx-autoblinked', '1');
      heroSvg.click();
    }, 1100);
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

    var rail = sidebar.querySelector('#qcx-sidebar-rail-rescue, .qcx-sidebar-rail');
    if (!rail) {
      var nativeVisible = sidebar.querySelector('#PopularPosts2, .widget.PopularPosts');
      if (nativeVisible) {
        var ncs = window.getComputedStyle(nativeVisible);
        if (ncs.display !== 'none' && ncs.visibility !== 'hidden') return;
      }
      rail = el('div', 'widget HTML qcx-sidebar-rail');
      rail.id = 'qcx-sidebar-rail-rescue';
      rail.innerHTML =
        '<div class="widget-content">' +
        '<div aria-level="2" class="qcx-related-heading" role="heading">Tutorial</div>' +
        '<ul class="qcx-latest-list" aria-busy="true" aria-label="Tutorial"></ul>' +
        '</div>';
      sidebar.appendChild(rail);
    }

    if (window.matchMedia('(min-width: 861px)').matches) {
      var relatedDup = document.querySelector('.qcx-related-smart');
      if (relatedDup) relatedDup.hidden = true;
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
    /* Strip post chrome + homepage footer so login sits centered. */
    document.querySelectorAll(
      '.post-title, .qcx-read-time, .qcx-subscribe-card, .qcx-footer-links-row, #HTML5.qcx-footer-links'
    ).forEach(function(node){
      try {
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
    if (!document.getElementById('qcx-admin-chrome-css')) {
      var st = document.createElement('style');
      st.id = 'qcx-admin-chrome-css';
      st.textContent =
        'html[data-qcx-admin=\"1\"] #sidebar,' +
        'html[data-qcx-admin=\"1\"] .qcx-sidebar-rail,' +
        'html[data-qcx-admin=\"1\"] #HTML4,' +
        'html[data-qcx-admin=\"1\"] .post-header .post-title,' +
        'html[data-qcx-admin=\"1\"] .qcx-read-time,' +
        'html[data-qcx-admin=\"1\"] .qcx-subscribe-card,' +
        'html[data-qcx-admin=\"1\"] #footer .widget.HTML.qcx-footer-links,' +
        'html[data-qcx-admin=\"1\"] #HTML5{display:none!important}' +
        'html[data-qcx-admin=\"1\"] .main-wrapper{grid-template-columns:minmax(0,1fr)!important}' +
        'html[data-qcx-admin=\"1\"] #main,' +
        'html[data-qcx-admin=\"1\"] .centered-bottom,' +
        'html[data-qcx-admin=\"1\"] .post-body{max-width:100%!important;width:100%!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden)){' +
        'min-height:calc(100vh - 72px)!important;display:flex!important;' +
        'align-items:center!important;justify-content:center!important;' +
        'padding:24px 12px 48px!important;max-width:none!important;margin:0 auto!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root:has(.gate:not(.hidden)) .wrap{' +
        'width:100%!important;max-width:320px!important;margin:-8vh auto 0!important;padding:0!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate{' +
        'width:100%!important;max-width:320px!important;margin:0 auto!important;' +
        'padding:16px 16px 14px!important;border:1px solid rgba(0,240,163,.22)!important;' +
        'border-radius:12px!important;background:rgba(10,18,14,.92)!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate input,' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate button{' +
        'width:100%!important;box-sizing:border-box!important;' +
        'background:#0b120c!important;color:#e6f5ec!important;' +
        'border:1px solid rgba(0,240,163,.28)!important;border-radius:8px!important}' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate button.primary,' +
        'html[data-qcx-admin=\"1\"] #qcx-admin-root .gate .actions .primary{' +
        'background:#7dcea0!important;color:#06110a!important;border-color:transparent!important;' +
        'font-weight:700!important;margin-top:8px!important;padding:10px 12px!important}';
      (document.head || document.documentElement).appendChild(st);
    }
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

  /* Re-entry after CDN bump: refresh atmosphere/fonts/ghost only. */
  if (already) {
    ensureBreakdevFonts();
    ensureAtmosphere();
    ensureGhostBlink();
    window.setTimeout(ensureGhostBlink, 400);
    return;
  }

  bootRescue();
  ensureBreakdevFonts();
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
  window.setTimeout(ensureGhostBlink, 200);
  window.setTimeout(ensureGhostBlink, 800);
  window.setTimeout(ensureGhostBlink, 1600);

  /* Always scrub native Blog1 snippets (CSS leak), even when rescue skips. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSnippetClean, { once: true });
  else bootSnippetClean();
})();
