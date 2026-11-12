(function(){
  if (document.documentElement.getAttribute('data-qcx-rescue') === 'true') return;
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
      '<div class="qcx-avatar-wrap" data-enter="avatar"><div class="qcx-avatar" aria-label="CÔNG CỤ.AI"><svg xmlns="http://www.w3.org/2000/svg" class="qcx-brand-mark qcx-brand-svg" viewBox="0 0 512 512" width="300" height="300" role="img" aria-label="CÔNG CỤ.AI" tabindex="0"><g class="qcx-ghost-art"><image href="https://cdn.jsdelivr.net/gh/kkymljnk/timkiem-blogger-assets@v20261112/theme/qcx-brand-mark.png" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid meet"/></g><g class="qcx-ghost-eyes"><circle class="qcx-eye qcx-eye-l" cx="230.6" cy="189.9" r="13.2" fill="#0a0a0a"/><circle class="qcx-eye qcx-eye-r" cx="294.1" cy="183.5" r="12.8" fill="#0a0a0a"/></g></svg></div></div>';
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

  /* Fixed Tutorial count — 5 fits the right rail without crowding mobile. */
  var QCX_TUTORIAL_COUNT = 5;

  function isSingleArticlePage() {
    var pageType = document.documentElement.getAttribute('data-page-type') || '';
    var pageItem = document.documentElement.getAttribute('data-page-item') || '';
    if (pageType === 'homepage' || pageType === 'index') return false;
    if (pageItem === 'multiple') return false;
    return pageType === 'post' || pageType === 'page' || pageItem === 'single' ||
      !!document.querySelector('.post-body, .item-page');
  }

  /* Blogger Layout often strips theme-added sidebar gadgets. Inject a visible
     Tutorial rail on single posts/pages only — never on homepage. */
  function ensureSidebarRail() {
    if (!isSingleArticlePage()) {
      var homeRail = document.querySelector('#qcx-sidebar-rail-rescue, #sidebar .qcx-sidebar-rail');
      if (homeRail && homeRail.parentNode) homeRail.parentNode.removeChild(homeRail);
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
    /* Prefer recent posts; fall back to pages if the blog is page-heavy. */
    loadFeed('/feeds/posts/default?alt=json&max-results=' + (QCX_TUTORIAL_COUNT + 3) + '&orderby=published', function(posts) {
      if (posts.length) {
        renderItems(posts);
        return;
      }
      loadFeed('/feeds/pages/default?alt=json&max-results=' + (QCX_TUTORIAL_COUNT + 3) + '&orderby=published', function(pages) {
        renderItems(pages);
      });
    });

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
    var labelHtml = labels.map(function(label){
      return '<a href="/search/label/' + encodeURIComponent(label) + '" rel="tag">' + escapeHtml(label) + '</a>';
    }).join('');
    var shell = el('div', 'widget Blog qcx-rescue-blog qcx-rescue-single qcx-feed-in');
    shell.id = 'Blog1';
    var article = el('article', 'post-item');
    article.innerHTML =
      '<div class="the-article" id="the-article">' +
      '<header class="post-header">' +
      '<h1 class="post-title">' + escapeHtml(title) + '</h1>' +
      '</header>' +
      '<div class="post-body">' + content + '</div>' +
      '</div>';
    shell.appendChild(article);
    main.appendChild(shell);
    updateMacPath(title);
    document.title = title;
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
      if (Date.now() - parsed.t > 5 * 60 * 1000) return null;
      return parsed.d;
    } catch (err) { return null; }
  }

  function writeFeedCache(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (err) {}
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

  function loadSingleEntry() {
    var current = pathOf(location.href);
    var slug = (location.pathname.split('/').pop() || '').replace(/\.html$/i, '').replace(/-/g, ' ');
    var pageType = document.documentElement.getAttribute('data-page-type') || '';
    var isStaticPage = pageType === 'page' || /\/p\//i.test(location.pathname);
    var cacheKey = (isStaticPage ? 'qcx:page:' : 'qcx:post:') + current;
    var skipPageCache = isStaticPage && /\/p\/admin\.html$/i.test(current);
    var cached = skipPageCache ? null : readFeedCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    if (skipPageCache) {
      try { sessionStorage.removeItem(cacheKey); } catch (e) {}
    }

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
      // 1) Query nhẹ theo slug → thường ra đúng 1 bài đầy đủ.
      return fetchJson('/feeds/posts/default?alt=json&max-results=3&q=' + encodeURIComponent(slug))
        .then(function(payload){
          var match = findInList((payload.feed && payload.feed.entry) || []);
          if (match) return match;
          // 2) Fallback: summary 20 bài rồi lấy đúng 1 post theo ID.
          return fetchJson('/feeds/posts/summary?alt=json&max-results=20').then(function(summaryPayload){
            var hit = findInList((summaryPayload.feed && summaryPayload.feed.entry) || []);
            if (!hit) throw new Error('post-not-found');
            var id = postIdOf(hit);
            if (!id) return hit;
            return fetchJson('/feeds/posts/default/' + id + '?alt=json').then(function(full){
              return full.entry || hit;
            });
          });
        });
    }

    var loader = isStaticPage
      ? loadFromPagesFeed().catch(function(){ return loadFromPostsFeed(); })
      : loadFromPostsFeed().catch(function(){ return loadFromPagesFeed(); });

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

  function mountSkeleton(main, isSingle) {
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
      /* One refresh; __qcxSecureRefresh debounces. Skip if already unlocked. */
      if (
        typeof window.__qcxSecureRefresh === 'function' &&
        document.documentElement.getAttribute('data-qcx-unlocked') !== '1'
      ) {
        window.setTimeout(window.__qcxSecureRefresh, 0);
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
    var cached = readFeedCache(cacheKey);
    var skel = null;

    /* Cache hit → paint ngay, không hiện chữ loading. */
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
          /* Same id alone is not enough — admin/page edits keep id, change content. */
          if (cachedId && cachedId === resultId && cachedUpdated === resultUpdated && cachedHtml.length === resultHtml.length) {
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
    /* Chờ Blog native ~120ms nếu widget đã có nhưng chưa kịp render card. */
    if (document.querySelector('.widget.Blog:not(.qcx-rescue-blog)') && !hasUsableNativeBlog()) {
      window.setTimeout(function(){
        if (hasUsableNativeBlog()) return;
        rescuePosts();
      }, 120);
      return;
    }
    rescuePosts();
  }

  bootRescue();
  ensureSidebarSearch();
  ensureSidebarRail();
  relocateHeroForDesktopRail();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      ensureSidebarSearch();
      ensureSidebarRail();
      relocateHeroForDesktopRail();
    }, { once: true });
  }
  window.setTimeout(ensureSidebarRail, 80);
  window.setTimeout(ensureSidebarRail, 400);
  window.setTimeout(relocateHeroForDesktopRail, 60);
  window.setTimeout(relocateHeroForDesktopRail, 300);

  /* Always scrub native Blog1 snippets (CSS leak), even when rescue skips. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSnippetClean, { once: true });
  else bootSnippetClean();
})();
