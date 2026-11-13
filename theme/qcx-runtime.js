(function () {
  function enterNow(nodes) {
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('is-in');
  }

  function qcxGhostBlink(el) {
    if (!el || el.classList.contains('is-blinking')) return;
    el.classList.remove('is-blinking');
    void el.offsetWidth;
    el.classList.add('is-blinking');
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      el.classList.remove('is-blinking');
      el.removeEventListener('animationend', onEnd);
    };
    var onEnd = function (ev) {
      if (ev.target && ev.target.classList && ev.target.classList.contains('qcx-eye')) finish();
    };
    el.addEventListener('animationend', onEnd);
    window.setTimeout(finish, 280);
  }
  function bootGhostBlink() {
    var nodes = document.querySelectorAll('.qcx-brand-svg');
    if (!nodes.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nodes.forEach(function (svg) {
      if (svg.getAttribute('data-qcx-blink-bound')) return;
      svg.setAttribute('data-qcx-blink-bound', '1');
      svg.addEventListener('click', function (e) {
        e.preventDefault();
        qcxGhostBlink(svg);
      });
      svg.addEventListener('pointerenter', function () {
        qcxGhostBlink(svg);
      });
      svg.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          qcxGhostBlink(svg);
        }
      });
      var host = svg.closest ? (svg.closest('.qcx-avatar') || svg.closest('.qcx-avatar-wrap')) : null;
      if (host && !host.getAttribute('data-qcx-blink-host')) {
        host.setAttribute('data-qcx-blink-host', '1');
        host.addEventListener('pointerenter', function () {
          qcxGhostBlink(svg);
        });
      }
    });
    if (reduce) return;
    var heroSvg = document.querySelector('.qcx-hero .qcx-brand-svg, .qcx-avatar .qcx-brand-svg');
    if (!heroSvg || heroSvg.getAttribute('data-qcx-autoblinked')) return;
    var fireAuto = function () {
      if (heroSvg.getAttribute('data-qcx-autoblinked')) return;
      heroSvg.setAttribute('data-qcx-autoblinked', '1');
      qcxGhostBlink(heroSvg);
    };
    var wrap = document.querySelector('.qcx-avatar-wrap') || heroSvg;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.disconnect();
          window.setTimeout(fireAuto, 1000);
        });
      }, { threshold: 0.25 });
      io.observe(wrap);
      window.setTimeout(function () { io.disconnect(); fireAuto(); }, 2200);
    } else {
      window.setTimeout(fireAuto, 1200);
    }
  }

  function bootEnter() {
    var nodes = document.querySelectorAll('[data-enter]');
    if (!nodes.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      enterNow(nodes);
      return;
    }
    var hero = document.querySelector('.qcx-hero[data-enter], .qcx-hero');
    if (hero && !hero.hasAttribute('data-enter')) hero.setAttribute('data-enter', 'hero');
    var avatar = document.querySelector('.qcx-avatar-wrap');
    if (avatar && !avatar.hasAttribute('data-enter')) avatar.setAttribute('data-enter', 'avatar');
    nodes = document.querySelectorAll('[data-enter]');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
      nodes.forEach(function (node) { io.observe(node); });
      window.setTimeout(function () { enterNow(nodes); }, 900);
    } else {
      window.requestAnimationFrame(function () { enterNow(nodes); });
    }
  }
  function bootAll() { bootEnter(); bootGhostBlink(); }
  window.qcxBootGhostBlink = bootGhostBlink;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAll);
  } else {
    bootAll();
  }
})();

(function() {
  'use strict';

  function createElement(tag, className, textValue) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof textValue === 'string') element.textContent = textValue;
    return element;
  }

  function normalizeText(value) {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\u0111/g, 'd')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function canonicalArticleUrl(value) {
    var canonical = document.querySelector('link[rel="canonical"]');
    var openGraph = document.querySelector('meta[property="og:url"]');
    var liveUrl = new URL(window.location.href);
    var candidates = [
      value,
      canonical ? canonical.href : '',
      openGraph ? openGraph.content : '',
      window.location.href
    ];
    for (var index = 0; index < candidates.length; index += 1) {
      if (!candidates[index]) continue;
      try {
        var parsed = new URL(candidates[index], window.location.href);
        /* Không bao giờ thay URL bài đang đọc bằng URL trang chủ. */
        if (liveUrl.pathname !== '/' && parsed.pathname === '/') continue;
        parsed.hash = '';
        ['m', 'fbclid', 'gclid'].forEach(function(key) {
          parsed.searchParams.delete(key);
        });
        return parsed.href;
      } catch (error) {}
    }
    return window.location.href;
  }

  function openFacebookShare(value) {
    var articleUrl = canonicalArticleUrl(value);
    var shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' +
      encodeURIComponent(articleUrl);
    var width = Math.min(680, window.screen.availWidth || 680);
    var height = Math.min(720, window.screen.availHeight || 720);
    var left = Math.max(0, (window.screenX || 0) +
      ((window.outerWidth || width) - width) / 2);
    var top = Math.max(0, (window.screenY || 0) +
      ((window.outerHeight || height) - height) / 2);
    var popup = window.open(
      shareUrl,
      'qcxFacebookShare',
      'popup=yes,width=' + width + ',height=' + height +
        ',left=' + Math.round(left) + ',top=' + Math.round(top) +
        ',resizable=yes,scrollbars=yes'
    );
    if (!popup) return false;
    try { popup.opener = null; popup.focus(); } catch (error) {}
    return true;
  }

  window.qcxFacebookShare = openFacebookShare;
  window.qcxCanonicalArticleUrl = canonicalArticleUrl;

  function initMobileNav() {
    var nav = document.querySelector('.footer-navigation-bar');
    var inlineSearches = document.querySelectorAll('.qcx-inline-search');
    var hamburger = document.querySelector('.hamburger-menu');
    /* Contempo often strips footer-navigation-bar; hamburger / inline search still need the drawer. */
    if (!nav && !inlineSearches.length && !hamburger) return;
    if (document.documentElement.getAttribute('data-qcx-nav-ready') === 'true') {
      if (document.getElementById('qcx-menu')) return;
      document.documentElement.removeAttribute('data-qcx-nav-ready');
    }
    document.documentElement.setAttribute('data-qcx-nav-ready', 'true');
    if (nav) nav.setAttribute('data-qcx-ready', 'true');

    var homeButton = nav ? nav.querySelector('li:first-child > a') : null;
    var menuButton = (nav && nav.querySelector('.open-menu')) || hamburger;
    var searchButton = nav ? nav.querySelector('.open-search') : null;
    var commentButton = nav ? nav.querySelector('.sroll-comments') : null;
    var shareButton = nav ? nav.querySelector('.share-post') : null;
    var toastTimer = 0;

    [homeButton, menuButton, searchButton, commentButton, shareButton].forEach(function(button) {
      if (!button) return;
      button.classList.remove('empty-link');
      button.classList.add('qcx-nav-enabled');
      button.removeAttribute('onclick');
    });

    var toast = createElement('div', '', '');
    toast.id = 'qcx-mobile-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    function showToast(message) {
      window.clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add('show');
      toastTimer = window.setTimeout(function() { toast.classList.remove('show'); }, 2200);
    }

    var backdrop = createElement('div');
    backdrop.id = 'qcx-menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    var menu = createElement('aside');
    menu.id = 'qcx-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('aria-label', 'Điều hướng chính');

    var menuHeader = createElement('div');
    menuHeader.id = 'qcx-menu-header';
    var menuLogo = createElement('div', '', 'AI HUB');
    menuLogo.id = 'qcx-menu-logo';
    var menuClose = createElement('button', '', '\u00d7');
    menuClose.id = 'qcx-menu-close';
    menuClose.type = 'button';
    menuClose.setAttribute('aria-label', 'Đóng menu');
    menuHeader.appendChild(menuLogo);
    menuHeader.appendChild(menuClose);
    var menuSearch = createElement('button', 'qcx-menu-search-row');
    menuSearch.id = 'qcx-menu-search';
    menuSearch.type = 'button';
    menuSearch.setAttribute('aria-label', 'Mở tìm kiếm');
    var isMacHint = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '') || /Mac OS/i.test(navigator.userAgent || '');
    var spaceHint = isMacHint ? '\u2318 Space' : 'Ctrl Space';
    menuSearch.innerHTML =
      '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.6"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      '<span>Tìm kiếm bài viết…</span>' +
      '<kbd class="qcx-menu-search-hint" aria-hidden="true">' + spaceHint + '</kbd>';

    var menuNav = createElement('nav');
    menuNav.id = 'qcx-menu-nav';
    var primarySection = createElement('div', 'qcx-menu-section', 'Điều hướng');
    menuNav.appendChild(primarySection);

    function addMenuLink(text, href, current) {
      var link = createElement('a', 'qcx-menu-link');
      link.href = href;
      if (current) link.classList.add('qcx-menu-current');
      var label = createElement('span', 'qcx-menu-link-text', text);
      link.appendChild(label);
      menuNav.appendChild(link);
      return link;
    }

    function isCurrentHref(href) {
      try {
        var parsed = new URL(href, location.href);
        var path = parsed.pathname || '/';
        if (path === '/' || path === '') return location.pathname === '/' || location.pathname === '';
        if (location.pathname === path && location.search === parsed.search) return true;
        return location.pathname === path && !parsed.search;
      } catch (error) {
        return false;
      }
    }

    /* Bố cục widgets: PageList → Điều hướng */
    var pageLinks = document.querySelectorAll('#PageList1 .widget-content a, #PageList1 ul a');
    if (!pageLinks.length) {
      pageLinks = document.querySelectorAll('.widget.PageList .widget-content a, .widget.PageList ul a');
    }
    if (pageLinks.length) {
      Array.prototype.forEach.call(pageLinks, function(anchor) {
        var text = (anchor.textContent || '').trim();
        var href = anchor.getAttribute('href') || '/';
        if (!text) return;
        addMenuLink(text, href, isCurrentHref(href));
      });
    } else {
      addMenuLink('Trang chủ', '/', location.pathname === '/' || location.pathname === '');
    }

    /* Bố cục widgets: Label → Nhãn chips */
    var labelLinks = document.querySelectorAll('#Label1 a[href*="/search/label/"]');
    if (!labelLinks.length) {
      labelLinks = document.querySelectorAll('.widget.Label a[href*="/search/label/"]');
    }
    if (labelLinks.length) {
      menuNav.appendChild(createElement('div', 'qcx-menu-section', 'Nhãn'));
      var labelCloud = createElement('div', 'qcx-menu-labels-cloud');
      var seenLabels = {};
      Array.prototype.forEach.call(labelLinks, function(anchor) {
        var name = (anchor.textContent || '').trim();
        var href = anchor.getAttribute('href');
        if (!name || !href || seenLabels[name.toLowerCase()]) return;
        seenLabels[name.toLowerCase()] = true;
        var link = createElement('a', 'qcx-menu-chip');
        link.href = href;
        link.textContent = name;
        link.title = 'Nhãn ' + name;
        labelCloud.appendChild(link);
      });
      menuNav.appendChild(labelCloud);
    }

    var menuFooter = createElement('div');
    var menuFooterLink = createElement('a', 'qcx-menu-footer-cta', 'Hỗ trợ Telegram');
    menuFooter.id = 'qcx-menu-footer';
    menuFooterLink.href = 'https://t.me/superkhung';
    menuFooterLink.setAttribute('aria-label', 'Hỗ trợ qua Telegram');
    menuFooterLink.setAttribute('rel', 'noopener noreferrer');
    menuFooterLink.setAttribute('target', '_blank');
    menuFooter.appendChild(menuFooterLink);
    menu.appendChild(menuHeader);
    menu.appendChild(menuSearch);
    menu.appendChild(menuNav);
    menu.appendChild(menuFooter);
    document.body.appendChild(backdrop);
    document.body.appendChild(menu);

    var searchOverlay = createElement('div');
    searchOverlay.id = 'qcx-mobile-search';
    searchOverlay.setAttribute('aria-hidden', 'true');
    searchOverlay.setAttribute('role', 'dialog');
    searchOverlay.setAttribute('aria-modal', 'true');
    searchOverlay.setAttribute('aria-label', 'Tìm kiếm bài viết');
    var searchWindow = createElement('div', 'qcx-mobile-search-window');
    var searchForm = createElement('form', 'qcx-mobile-search-form');
    searchForm.action = '/search';
    searchForm.method = 'get';
    searchForm.appendChild(createElement('span', 'qcx-mobile-search-prompt', 'find:'));
    var searchInput = createElement('input', 'qcx-mobile-search-input');
    searchInput.type = 'search';
    searchInput.name = 'q';
    searchInput.autocomplete = 'off';
    searchInput.spellcheck = false;
    searchInput.placeholder = 'Tiêu đề, nhãn, nội dung...';
    searchInput.setAttribute('aria-label', 'Từ khóa tìm kiếm');
    var searchClose = createElement('button', 'qcx-mobile-search-close', '\u00d7');
    searchClose.type = 'button';
    searchClose.setAttribute('aria-label', 'Đóng tìm kiếm');
    searchForm.appendChild(searchInput);
    searchForm.appendChild(searchClose);
    var searchResults = createElement('div', 'qcx-mobile-search-results');
    searchResults.id = 'qcx-mobile-search-results';
    searchResults.setAttribute('role', 'listbox');
    searchResults.setAttribute('aria-live', 'polite');
    searchInput.setAttribute('aria-controls', searchResults.id);
    searchInput.setAttribute('aria-autocomplete', 'list');
    searchWindow.appendChild(searchForm);
    searchWindow.appendChild(searchResults);
    searchOverlay.appendChild(searchWindow);
    document.body.appendChild(searchOverlay);

    var searchEntries = [];
    var seenUrls = {};
    var searchFeedState = 'idle';
    var searchFeedPromise = null;
    var activeSearchIndex = -1;
    var searchRenderTimer = 0;
    var SEARCH_CACHE_KEY = 'qcx-smart-search-v4';
    var SEARCH_CACHE_TTL = 10 * 60 * 1000;

    function cleanSearchText(value) {
      var holder = document.createElement('div');
      holder.innerHTML = String(value || '');
      return (holder.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function improveThumbnail(value) {
      return String(value || '')
        .replace(/\/s\d+(?:-c)?\//, '/s160-c/')
        .replace(/=s\d+(?:-c)?(?:$|&)/, '=s160-c');
    }

    function isUsableThumbnail(value) {
      var url = String(value || '').trim();
      return !!url &&
        !/^(?:data:image|about:blank)/i.test(url) &&
        !/(?:transparent|spacer|blank|pixel)(?:[-_.]|$)/i.test(url);
    }

    function firstImageFromHtml(value) {
      if (!value) return '';
      var holder = document.createElement('div');
      holder.innerHTML = String(value);
      var images = Array.prototype.slice.call(holder.querySelectorAll('img'));
      for (var index = 0; index < images.length; index += 1) {
        var image = images[index];
        var candidates = [
          image.getAttribute('data-original-src'),
          image.getAttribute('data-src'),
          image.getAttribute('data-lazy-src'),
          image.getAttribute('src')
        ];
        for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
          if (isUsableThumbnail(candidates[candidateIndex])) return candidates[candidateIndex];
        }
      }
      return '';
    }

    function addSearchEntry(entry) {
      var href = entry && entry.href ? String(entry.href) : '';
      var title = cleanSearchText(entry && (entry.title || entry.text));
      if (!href || !title || title.length < 3) return;
      var labels = Array.isArray(entry.labels) ? entry.labels.filter(Boolean).slice(0, 5) : [];
      var summary = cleanSearchText(entry.summary).slice(0, 260);
      var thumbnail = improveThumbnail(entry.thumbnail);

      /* The card DOM is indexed before the Blogger feed. A card can have the
         correct URL but no usable image; merge the later feed record instead
         of discarding it as a duplicate. */
      if (Object.prototype.hasOwnProperty.call(seenUrls, href)) {
        var existing = searchEntries[seenUrls[href]];
        if (!existing) return;
        if (!isUsableThumbnail(existing.thumbnail) && isUsableThumbnail(thumbnail)) {
          existing.thumbnail = thumbnail;
        }
        if (!existing.labels.length && labels.length) {
          existing.labels = labels;
          existing.normalizedLabels = normalizeText(labels.join(' '));
        }
        if (!existing.summary && summary) {
          existing.summary = summary;
          existing.normalizedSummary = normalizeText(summary);
        }
        if (!existing.date && entry.date) existing.date = entry.date;
        return;
      }

      seenUrls[href] = searchEntries.length;
      searchEntries.push({
        title: title,
        href: href,
        labels: labels,
        summary: summary,
        thumbnail: thumbnail,
        date: entry.date || '',
        normalizedTitle: normalizeText(title),
        normalizedLabels: normalizeText(labels.join(' ')),
        normalizedSummary: normalizeText(summary),
        order: searchEntries.length
      });
    }

    Array.prototype.slice.call(document.querySelectorAll('.card-content .title a, .item-title a, h1.post-title')).forEach(function(node) {
      var container = node.closest ? node.closest('.card, li, article') : null;
      var thumbnail = container ? container.querySelector('img') : null;
      addSearchEntry({
        title: node.textContent,
        href: node.href || location.href,
        summary: container ? container.textContent : '',
        thumbnail: thumbnail ? thumbnail.src : ''
      });
    });

    function parseSearchFeed(payload) {
      var entries = payload && payload.feed && payload.feed.entry ? payload.feed.entry : [];
      entries.forEach(function(entry) {
        var alternate = (entry.link || []).filter(function(link) { return link.rel === 'alternate'; })[0];
        if (!alternate || !alternate.href) return;
        var labels = (entry.category || []).map(function(category) { return category.term || ''; });
        var contentHtml = entry.content && entry.content.$t
          ? entry.content.$t
          : (entry.summary && entry.summary.$t ? entry.summary.$t : '');
        var published = entry.published && entry.published.$t ? new Date(entry.published.$t) : null;
        var date = published && !isNaN(published.getTime())
          ? String(published.getDate()).padStart(2, '0') + '/' + String(published.getMonth() + 1).padStart(2, '0')
          : '';
        addSearchEntry({
          title: entry.title && entry.title.$t,
          href: alternate.href,
          labels: labels,
          summary: contentHtml,
          thumbnail: isUsableThumbnail(entry.media$thumbnail && entry.media$thumbnail.url)
            ? entry.media$thumbnail.url
            : firstImageFromHtml(contentHtml),
          date: date
        });
      });
    }

    function loadSearchFeed() {
      if (searchFeedState === 'ready') return Promise.resolve(searchEntries);
      if (searchFeedPromise) return searchFeedPromise;
      searchFeedState = 'loading';
      searchFeedPromise = new Promise(function(resolve) {
        try {
          var cached = JSON.parse(sessionStorage.getItem(SEARCH_CACHE_KEY) || 'null');
          if (cached && Date.now() - cached.savedAt < SEARCH_CACHE_TTL && cached.payload) {
            parseSearchFeed(cached.payload);
            searchFeedState = 'ready';
            resolve(searchEntries);
            return;
          }
        } catch (ignore) {}
        fetch('/feeds/posts/default?alt=json&max-results=24&orderby=updated', { credentials: 'same-origin' })
          .then(function(response) {
            if (!response.ok) throw new Error('SEARCH_FEED_' + response.status);
            return response.json();
          })
          .then(function(payload) {
            parseSearchFeed(payload);
            try { sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), payload: payload })); } catch (ignore) {}
            searchFeedState = 'ready';
            resolve(searchEntries);
          })
          .catch(function() {
            searchFeedState = 'error';
            resolve(searchEntries);
          });
      });
      return searchFeedPromise;
    }

    function closeMenu() {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      backdrop.classList.remove('open');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('qcx-menu-open', 'qcx-panel-open');
      if (menuButton) {
        menuButton.classList.remove('qcx-nav-active');
        menuButton.setAttribute('aria-expanded', 'false');
      }
    }

    function openMenu() {
      closeSearch();
      menu.classList.add('open');
      menu.setAttribute('aria-hidden', 'false');
      backdrop.classList.add('open');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.classList.add('qcx-menu-open', 'qcx-panel-open');
      if (menuButton) {
        menuButton.classList.add('qcx-nav-active');
        menuButton.setAttribute('aria-expanded', 'true');
      }
      menuClose.focus();
    }

    function searchScore(entry, query) {
      if (!query) return 0;
      var title = entry.normalizedTitle;
      var labelsText = entry.normalizedLabels;
      var summary = entry.normalizedSummary;
      var titleWords = title.split(/\s+/);
      var labelWords = labelsText.split(/\s+/);
      var score = 0;
      if (title === query) score += 360;
      else if (title.indexOf(query) === 0) score += 280;
      if (titleWords.some(function(word) { return word.indexOf(query) === 0; })) score += 220;
      if (title.indexOf(query) !== -1) score += 170;
      if (labelsText === query) score += 150;
      if (labelWords.some(function(word) { return word.indexOf(query) === 0; })) score += 125;
      if (labelsText.indexOf(query) !== -1) score += 95;
      if (query.length > 1 && summary.indexOf(query) !== -1) score += 45;
      if (!score) return 0;
      return score + Math.max(0, 20 - entry.order);
    }

    function renderSearchStatus(message, loading) {
      var status = createElement('div', 'qcx-mobile-search-status' + (loading ? ' is-loading' : ''), message);
      status.setAttribute('role', 'status');
      searchResults.appendChild(status);
    }

    function setActiveSearchIndex(index) {
      var links = Array.prototype.slice.call(searchResults.querySelectorAll('.qcx-mobile-search-result'));
      if (!links.length) {
        activeSearchIndex = -1;
        searchInput.removeAttribute('aria-activedescendant');
        return;
      }
      activeSearchIndex = (index + links.length) % links.length;
      links.forEach(function(link, linkIndex) {
        var active = linkIndex === activeSearchIndex;
        link.classList.toggle('is-active', active);
        link.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      searchInput.setAttribute('aria-activedescendant', links[activeSearchIndex].id);
      links[activeSearchIndex].scrollIntoView({ block: 'nearest' });
    }

    function renderSearchResults(value) {
      var query = normalizeText(value);
      searchResults.textContent = '';
      activeSearchIndex = -1;
      searchInput.removeAttribute('aria-activedescendant');
      if (!query) return;

      var matches = searchEntries.map(function(entry) {
        return { entry: entry, score: searchScore(entry, query) };
      }).filter(function(result) {
        return result.score > 0;
      }).sort(function(left, right) {
        return right.score - left.score || left.entry.order - right.entry.order;
      }).slice(0, 7);

      if (!matches.length) {
        renderSearchStatus(
          searchFeedState === 'loading'
            ? '// đang đọc danh sách bài viết...'
            : '// chưa có gợi ý · nhấn Enter để tìm toàn blog',
          searchFeedState === 'loading'
        );
        return;
      }

      matches.forEach(function(result, resultIndex) {
        var entry = result.entry;
        var link = createElement('a', 'qcx-mobile-search-result');
        link.id = 'qcx-search-option-' + resultIndex;
        link.href = entry.href;
        link.setAttribute('role', 'option');
        link.setAttribute('aria-selected', 'false');
        var media = createElement('span', 'qcx-search-result-media');
        if (entry.thumbnail) {
          var image = document.createElement('img');
          image.src = entry.thumbnail;
          image.alt = '';
          image.loading = 'lazy';
          image.decoding = 'async';
          image.addEventListener('load', function() {
            if (this.naturalWidth > 2 && this.naturalHeight > 2) return;
            this.remove();
          });
          image.addEventListener('error', function() { this.remove(); });
          media.appendChild(image);
        }
        var copy = createElement('span', 'qcx-search-result-copy');
        copy.appendChild(createElement('span', 'qcx-search-result-title', entry.title));
        var metaText = entry.labels.slice(0, 2).join(' · ');
        if (entry.date) metaText += (metaText ? ' · ' : '') + entry.date;
        copy.appendChild(createElement('span', 'qcx-search-result-meta', metaText || 'Bài viết TIMKIEM'));
        link.appendChild(media);
        link.appendChild(copy);
        searchResults.appendChild(link);
      });
    }

    function scheduleSearchRender() {
      window.clearTimeout(searchRenderTimer);
      searchRenderTimer = window.setTimeout(function() {
        renderSearchResults(searchInput.value);
        loadSearchFeed().then(function() {
          renderSearchResults(searchInput.value);
        });
      }, 90);
    }

    function closeSearch() {
      searchOverlay.classList.remove('open');
      searchOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('qcx-panel-open');
      if (searchButton) {
        searchButton.classList.remove('qcx-nav-active');
        searchButton.setAttribute('aria-expanded', 'false');
      }
    }

    function openSearch() {
      closeMenu();
      searchOverlay.classList.add('open');
      searchOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('qcx-panel-open');
      if (searchButton) {
        searchButton.classList.add('qcx-nav-active');
        searchButton.setAttribute('aria-expanded', 'true');
      }
      loadSearchFeed().then(function() {
        if (searchInput.value.trim()) renderSearchResults(searchInput.value);
      });
      window.setTimeout(function() { searchInput.focus(); }, 30);
    }

    /* Public entry point used by home, desktop and mobile search controls. */
    window.qcxOpenSearch = openSearch;
    Array.prototype.slice.call(inlineSearches).forEach(function(control) {
      control.addEventListener('click', function(event) {
        event.preventDefault();
        openSearch();
      });
      control.addEventListener('keydown', function(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openSearch();
      });
    });

    function bindCommand(button, command) {
      if (!button) return;
      button.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        command();
      }, true);
    }

    bindCommand(homeButton, function() {
      if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
      else location.href = '/';
    });
    bindCommand(menuButton, openMenu);
    bindCommand(searchButton, openSearch);
    bindCommand(commentButton, function() {
      var comments = document.getElementById('comments');
      if (!comments) {
        showToast('// bài viết chưa bật bình luận');
        return;
      }
      comments.scrollIntoView({ behavior: 'smooth', block: 'start' });
      comments.setAttribute('tabindex', '-1');
      window.setTimeout(function() { comments.focus({ preventScroll: true }); }, 450);
    });
    bindCommand(shareButton, function() {
      var directShareUrl = shareButton ? shareButton.getAttribute('data-share-url') : '';
      var articleUrl = canonicalArticleUrl(directShareUrl);
      var shareTitle = document.title || 'AI HUB TOOLS';
      if (navigator.share) {
        navigator.share({ title: shareTitle, url: articleUrl }).catch(function(){});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(articleUrl).then(function(){
          showToast('// đã copy link');
        }).catch(function(){
          if (!openFacebookShare(articleUrl)) showToast('// không chia sẻ được');
        });
        return;
      }
      if (!openFacebookShare(articleUrl)) showToast('// không chia sẻ được');
    });

    var scrollTopButton = nav ? nav.querySelector('.scroll-top') : null;
    bindCommand(scrollTopButton, function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    backdrop.addEventListener('click', closeMenu);
    menuClose.addEventListener('click', closeMenu);
    menuSearch.addEventListener('click', openSearch);
    searchClose.addEventListener('click', closeSearch);
    searchOverlay.addEventListener('click', function(event) {
      if (event.target === searchOverlay) closeSearch();
    });
    searchInput.addEventListener('input', scheduleSearchRender);
    searchInput.addEventListener('keydown', function(event) {
      var links = searchResults.querySelectorAll('.qcx-mobile-search-result');
      if (event.key === 'ArrowDown' && links.length) {
        event.preventDefault();
        setActiveSearchIndex(activeSearchIndex + 1);
      } else if (event.key === 'ArrowUp' && links.length) {
        event.preventDefault();
        setActiveSearchIndex(activeSearchIndex <= 0 ? links.length - 1 : activeSearchIndex - 1);
      } else if (event.key === 'Enter' && activeSearchIndex >= 0 && links[activeSearchIndex]) {
        event.preventDefault();
        location.href = links[activeSearchIndex].href;
      }
    });
    searchForm.addEventListener('submit', function(event) {
      var activeResult = searchResults.querySelector('.qcx-mobile-search-result.is-active');
      if (activeResult) {
        event.preventDefault();
        location.href = activeResult.href;
        return;
      }
      if (!searchInput.value.trim()) {
        event.preventDefault();
        showToast('// hãy nhập từ khóa');
        searchInput.focus();
      }
    });
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        closeMenu();
        closeSearch();
      }
      var target = event.target;
      var isTyping = target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
      var isCmdK = (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
      var isCmdSpace = event.key === ' ' && (event.metaKey || event.ctrlKey) && !event.altKey;
      if (isCmdK || isCmdSpace) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (searchOverlay.classList.contains('open')) closeSearch();
        else openSearch();
        return;
      }
      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSearch();
      }
    }, true);
  }

  window.__qcxInitMobileNav = initMobileNav;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMobileNav, { once: true });
  else initMobileNav();
})();

(function(){
  function clearHeights(){
    var cards = document.querySelectorAll('.all_posts .card, .qcx-rescue-blog .card');
    Array.prototype.forEach.call(cards, function(card){
      card.style.minHeight = '';
      card.style.height = '';
    });
  }
  function run(){
    if (typeof window.__qcxCleanCardSnippets === 'function') window.__qcxCleanCardSnippets();
    clearHeights();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
  window.addEventListener('resize', function(){
    window.clearTimeout(window.__qcxEqT);
    window.__qcxEqT = window.setTimeout(clearHeights, 120);
  });
})();

(function() {
  'use strict';

  function imageSource(img) {
    var link = img.closest ? img.closest('a[href]') : null;
    var linked = link ? link.href : '';
    if (linked && /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(linked)) return linked;
    return img.currentSrc || img.src || '';
  }

  function imageTitle(img) {
    var title = (img.getAttribute('alt') || img.getAttribute('title') || '').trim();
    if (title) return title;
    var source = imageSource(img).split(/[?#]/)[0].split('/').pop();
    try { source = decodeURIComponent(source); } catch (error) {}
    return source || 'preview.png';
  }

  function createLightbox() {
    if (document.getElementById('qcx-lightbox')) return;

    var images = Array.prototype.slice.call(document.querySelectorAll('.post-body .mac-frame-image img'));
    if (!images.length) return;

    var lightbox = document.createElement('div');
    lightbox.id = 'qcx-lightbox';
    lightbox.className = 'qcx-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.setAttribute('aria-label', 'Xem ảnh toàn màn hình');

    var rail = document.createElement('div');
    rail.className = 'qcx-lightbox-rail';

    var win = document.createElement('div');
    win.className = 'qcx-lightbox-window';

    var header = document.createElement('div');
    header.className = 'qcx-lightbox-header';
    var dots = document.createElement('div');
    dots.className = 'qcx-lightbox-dots';
    for (var dotIndex = 0; dotIndex < 3; dotIndex += 1) dots.appendChild(document.createElement('i'));
    var title = document.createElement('div');
    title.className = 'qcx-lightbox-title';
    header.appendChild(dots);
    header.appendChild(title);

    var stage = document.createElement('div');
    stage.className = 'qcx-lightbox-stage';
    var largeImage = document.createElement('img');
    largeImage.className = 'qcx-lightbox-image';
    largeImage.alt = '';
    stage.appendChild(largeImage);

    var close = document.createElement('button');
    close.className = 'qcx-lightbox-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng ảnh');
    close.textContent = '×';

    win.appendChild(header);
    win.appendChild(stage);
    lightbox.appendChild(rail);
    lightbox.appendChild(win);
    lightbox.appendChild(close);
    document.body.appendChild(lightbox);

    var thumbs = [];
    var activeIndex = 0;

    function show(index) {
      activeIndex = index;
      var img = images[index];
      largeImage.src = imageSource(img);
      largeImage.alt = img.alt || '';
      title.textContent = imageTitle(img);
      thumbs.forEach(function(thumb, thumbIndex) {
        thumb.classList.toggle('is-active', thumbIndex === index);
      });
    }

    function open(index) {
      show(index);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('qcx-lightbox-open');
      close.focus();
    }

    function hide() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('qcx-lightbox-open');
      largeImage.removeAttribute('src');
    }

    images.forEach(function(img, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'qcx-lightbox-thumb';
      button.setAttribute('aria-label', 'Mở ảnh ' + (index + 1));
      var thumbnail = document.createElement('img');
      thumbnail.src = img.currentSrc || img.src;
      thumbnail.alt = '';
      button.appendChild(thumbnail);
      button.addEventListener('click', function() { show(index); });
      rail.appendChild(button);
      thumbs.push(button);

      img.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        open(index);
      }, true);
    });

    close.addEventListener('click', hide);
    lightbox.addEventListener('click', function(event) {
      if (event.target === lightbox) hide();
    });
    document.addEventListener('keydown', function(event) {
      if (!lightbox.classList.contains('is-open')) return;
      if (event.key === 'Escape') hide();
      if (event.key === 'ArrowRight') show((activeIndex + 1) % images.length);
      if (event.key === 'ArrowLeft') show((activeIndex - 1 + images.length) % images.length);
    });
  }

  if (document.readyState === 'complete') createLightbox();
  else window.addEventListener('load', createLightbox);
})();
