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
    menuSearch.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.6"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>Tìm bài viết, nhãn…</span>';

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

    addMenuLink('Trang chủ', '/', location.pathname === '/');
    var latestMenuLink = addMenuLink('Bài viết mới', '/search?max-results=12', location.pathname === '/search');
    latestMenuLink.classList.add('qcx-mobile-menu-hidden');

    /* Permanent topics with related Blogger labels grouped underneath. */
    var labelMap = {};
    function registerLabel(name, href) {
      name = (name || '').trim();
      if (!name || !href || /^(?:50[.,]000|bca|themeblogspot)$/i.test(name) || labelMap[name.toLowerCase()]) return;
      labelMap[name.toLowerCase()] = { name: name, href: href };
    }
    Array.prototype.slice.call(document.querySelectorAll('a[href*="/search/label/"], .post-label a, .post-labels a, .qcx-card-labels a, .label--filter a')).forEach(function(link) {
      registerLabel(link.textContent, link.href);
    });
    Array.prototype.slice.call(document.querySelectorAll('[data-label^="Search: "]')).forEach(function(node) {
      var name = (node.getAttribute('data-label') || '').replace(/^Search:\s*/i, '');
      registerLabel(name, '/search/label/' + encodeURIComponent(name));
    });
    var labels = Object.keys(labelMap).map(function(key) { return labelMap[key]; }).slice(0, 16);
    var fixedTopics = [
      { name: 'Mẹo & Thủ thuật', match: /mẹo|thủ thuật|tip|tips|hướng dẫn|guide|how\s*to/i },
      { name: 'Công cụ & Tài nguyên', match: /công cụ|tool|resource|source|tài nguyên|template|plugin/i },
      { name: 'AI & Công nghệ', match: /\bai\b|công nghệ|tech|automation|tự động|openai|claude|chatgpt/i },
      { name: 'Kỹ năng & Kinh nghiệm', match: /kỹ năng|kinh nghiệm|tutorial|obs|stream|livestream|tiktok|tikfinity/i }
    ];
    menuNav.appendChild(createElement('div', 'qcx-menu-section', 'Chuyên mục'));
    var usedTopicLabels = {};
    fixedTopics.forEach(function(topic) {
      var group = createElement('div', 'qcx-menu-topic-group');
      var related = labels.filter(function(label) { return topic.match.test(label.name); }).slice(0, 4);
      var topicLink = createElement('a', 'qcx-menu-label-link qcx-menu-topic-link');
      topicLink.href = related.length ? related[0].href : '/search?max-results=12';
      topicLink.title = related.length ? 'Xem nhãn ' + related[0].name : 'Xem bài viết mới';
      topicLink.appendChild(createElement('span', 'qcx-menu-label-name', topic.name));
      group.appendChild(topicLink);
      if (related.length) {
        var relatedWrap = createElement('div', 'qcx-menu-topic-labels');
        related.forEach(function(label) {
          usedTopicLabels[label.name.toLowerCase()] = true;
          var relatedLink = createElement('a');
          relatedLink.href = label.href;
          relatedLink.textContent = label.name;
          relatedLink.title = 'Nhãn ' + label.name;
          relatedWrap.appendChild(relatedLink);
        });
        group.appendChild(relatedWrap);
      }
      menuNav.appendChild(group);
    });
    var leftoverLabels = labels.filter(function(label) {
      return !usedTopicLabels[label.name.toLowerCase()] && !/^Bài đăng trên Blog$/i.test(label.name);
    }).slice(0, 12);
    if (leftoverLabels.length) {
      menuNav.appendChild(createElement('div', 'qcx-menu-section', 'Nhãn'));
      var labelCloud = createElement('div', 'qcx-menu-labels-cloud');
      leftoverLabels.forEach(function(label) {
        var link = createElement('a', 'qcx-menu-chip');
        link.href = label.href;
        link.textContent = label.name;
        link.title = 'Nhãn ' + label.name;
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
      if (isCmdK) {
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
