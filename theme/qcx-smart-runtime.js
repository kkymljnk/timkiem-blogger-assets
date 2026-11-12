(function() {
  'use strict';

  function createElement(tagName, className, text) {
    var node = document.createElement(tagName);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function highResolutionUrl(url) {
    if (!url || url.indexOf('data:') === 0) return url;
    if (!/(?:blogger\.googleusercontent\.com|bp\.blogspot\.com|googleusercontent\.com)/i.test(url)) return url;
    return url
      .replace(/\/w\d+-h\d+(?:-[^/]+)?\//i, '/s1600/')
      .replace(/\/s\d+(?:-[^/]+)?\//i, '/s1600/')
      .replace(/=s\d+(?:-[^?&]+)?(?=$|[?&])/i, '=s1600');
  }

  function slugify(text) {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
  }

  function updateTerminalKeyword(article) {
    var path = document.querySelector('.qcx-mt-path');
    if (!path || !article) return;
    var titleNode = document.querySelector('.post-title, .post-header h1, #the-article h1');
    var title = (titleNode ? titleNode.textContent : document.title || '').trim();
    var normalizedTitle = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd')
      .toLowerCase();
    var labelNodes = document.querySelectorAll('.post-label a, .post-labels a, .keywords a, a[rel="tag"]');
    var labels = Array.prototype.slice.call(labelNodes).map(function(node) {
      return (node.textContent || '').trim();
    }).filter(function(label, index, list) {
      return label && list.indexOf(label) === index &&
        !/^(?:50[.,]000|bca|themeblogspot|bài đăng trên blog)$/i.test(label);
    });
    labels.sort(function(left, right) {
      function score(label) {
        var normalized = label.normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\u0111/g, 'd')
          .toLowerCase();
        var value = Math.min(normalized.length, 30);
        if (normalizedTitle.indexOf(normalized) >= 0) value += 100;
        if (/^(?:tool|source code|resource)$/i.test(label)) value -= 18;
        return value;
      }
      return score(right) - score(left);
    });
    var keyword = labels[0] || title.split(/\s+/).filter(function(word) {
      return word.length > 2 && !/^(?:và|cho|của|trên|một|the|with|from)$/i.test(word);
    }).slice(0, 3).join(' ');
    var keywordSlug = slugify(keyword).split('-').slice(0, 4).join('-') || 'article';
    path.textContent = 'timkiem/' + keywordSlug;
    path.title = keyword ? 'Từ khóa: ' + keyword : 'TIMKIEM';
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function(resolve, reject) {
      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', 'readonly');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
      } catch (error) { reject(error); }
      document.body.removeChild(field);
    });
  }

  function initSmartArticle() {
    var article = document.querySelector('.post-body');
    if (!article || article.getAttribute('data-smart-ready') === 'true') return;
    try {
    updateTerminalKeyword(article);

    /* Keep the Drive gate legible after article-specific mobile CSS loads. */
    if (!document.getElementById('qcx-runtime-mobile-fixes')) {
      var runtimeStyle = document.createElement('style');
      runtimeStyle.id = 'qcx-runtime-mobile-fixes';
      runtimeStyle.textContent = '.qcx-top-download .qcx-download-button,.qcx-download-pro .qcx-download-button{display:flex!important;align-items:center!important;justify-content:space-between!important;min-height:50px!important;width:100%!important;padding:10px 12px 10px 14px!important;background:#1c2420!important;border:1px solid #46ffc2!important;border-radius:13px!important;color:#00160d!important;font:800 12px var(--mono,ui-monospace,monospace)!important;line-height:1.2!important;opacity:1!important;visibility:visible!important}.qcx-top-download .qcx-download-button span,.qcx-top-download .qcx-download-button b,.qcx-download-pro .qcx-download-button span,.qcx-download-pro .qcx-download-button b{color:#00160d!important;opacity:1!important;-webkit-text-fill-color:#00160d!important}.qcx-top-download .qcx-download-button span,.qcx-download-pro .qcx-download-button span{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.qcx-top-download .qcx-download-button b,.qcx-download-pro .qcx-download-button b{flex:0 0 auto!important}';
      document.body.appendChild(runtimeStyle);
    }
    /* Skip legacy gate style inject when secure resource script owns the unlock rail. */
    if (!document.getElementById('qcx-secure-resource') && !document.getElementById('qcx-runtime-gate-style')) {
      var gateStyle = document.createElement('style');
      gateStyle.id = 'qcx-runtime-gate-style';
      gateStyle.textContent = '.qcx-top-download .qcx-download-button.qcx-follow-gate,.qcx-download-pro .qcx-download-button.qcx-follow-gate{display:flex!important;align-items:center!important;justify-content:center!important;min-height:48px!important;padding:0 16px!important;border:2px solid #0a1a12!important;border-radius:999px!important;background:var(--accent,#1c2420)!important;box-shadow:3px 3px 0 #0a1a12!important;color:#e8efe9!important}.qcx-top-download .qcx-download-button.qcx-follow-gate span,.qcx-download-pro .qcx-download-button.qcx-follow-gate span{color:#e8efe9!important;-webkit-text-fill-color:#e8efe9!important;font:700 15px/1 \'Space Grotesk\',system-ui,sans-serif!important;letter-spacing:-.01em!important;text-transform:none!important}.qcx-top-download .qcx-download-button.qcx-follow-gate b,.qcx-download-pro .qcx-download-button.qcx-follow-gate b{display:none!important}';
      document.body.appendChild(gateStyle);
    }

    /* The legacy sidebar is floated, so sticky on #sidebar itself scrolls
       away. Wrap the resource and related widgets in a non-floated sticky
       child while keeping the sidebar as the layout column. */
    (function initStickyResourceStack() {
      var sidebar = document.querySelector('#sidebar');
      var resourceCard = document.querySelector('.qcx-top-download');
      var relatedWidget = document.querySelector('#PopularPosts1');
      var resourceAnchor = article.querySelector('.qcx-download-anchor');
      if (!sidebar || !resourceCard || !relatedWidget) return;

      var desktopQuery = window.matchMedia('(min-width: 861px)');
      var stack = sidebar.querySelector('.qcx-sticky-stack');
      if (!stack) {
        stack = document.createElement('div');
        stack.className = 'qcx-sticky-stack';
        sidebar.insertBefore(stack, relatedWidget);
        stack.appendChild(relatedWidget);
      }

      function syncStickyResourceStack() {
        if (desktopQuery.matches) {
          if (resourceCard.parentNode !== stack) stack.insertBefore(resourceCard, relatedWidget);
          if (relatedWidget.parentNode !== stack) stack.appendChild(relatedWidget);
          sidebar.classList.add('qcx-download-sidebar');
          resourceCard.classList.add('qcx-positioned', 'qcx-mounted');
          resourceCard.hidden = false;
          resourceCard.removeAttribute('aria-busy');
        } else {
          if (resourceAnchor && resourceAnchor.parentNode && resourceAnchor.nextElementSibling !== resourceCard) {
            resourceAnchor.parentNode.insertBefore(resourceCard, resourceAnchor.nextSibling);
          }
          sidebar.classList.remove('qcx-download-sidebar');
        }
      }

      syncStickyResourceStack();
      window.setTimeout(syncStickyResourceStack, 120);
      window.setTimeout(syncStickyResourceStack, 700);
      if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', syncStickyResourceStack);
      else desktopQuery.addListener(syncStickyResourceStack);
    })();

    /* Upgrade the free-resource gate without exposing the Blogger implementation. */
    (function enhanceFreeResourceGate() {
      /* Secure Worker gate owns Free/Paid rail — do not rewrite its button/overlay. */
      if (window.__qcxSecureResourceBooted) return;
      if (document.querySelector('.qcx-top-download[data-qcx-secure="1"]')) return;
      try {
        var secureMarker = document.getElementById('qcx-resource');
        if (secureMarker && (secureMarker.getAttribute('data-resource-id') || /resourceId/.test(secureMarker.textContent || ''))) return;
      } catch (secureIgnore) {}
      var gateButton = document.querySelector('.qcx-download-button[data-download-key="qcx-drive"], .qcx-download-button.qcx-follow-gate');
      if (!gateButton) return;
      if (gateButton.closest('[data-qcx-secure="1"]')) return;
      var downloadCard = gateButton.closest('.qcx-download-pro');
      var topLine = downloadCard && downloadCard.querySelector('.qcx-download-top');
      var accessBadge = topLine && topLine.querySelector('.qcx-online');
      if (accessBadge) {
        accessBadge.classList.add('qcx-free-badge');
        accessBadge.innerHTML = '<i aria-hidden="true"></i> MIỄN PHÍ';
      }
      var cardHeading = topLine && topLine.querySelector('span:first-child');
      if (cardHeading) {
        cardHeading.classList.add('qcx-resource-heading');
        cardHeading.textContent = 'TÀI NGUYÊN';
      }

      var driveUrl = '';
      var driveHost = document.querySelector('[data-qcx-drive-url], script#qcx-drive-url, .post-body script[data-qcx-drive]');
      var driveSources = [];
      if (driveHost) driveSources.push(driveHost);
      Array.prototype.push.apply(driveSources, Array.prototype.slice.call(document.querySelectorAll('.post-body script, .the-article script')));
      driveSources.some(function(script) {
        var attrUrl = script.getAttribute && script.getAttribute('data-qcx-drive-url');
        if (attrUrl) { driveUrl = attrUrl; return true; }
        var source = script.textContent || '';
        var match = source.match(/DRIVE_URL\s*=\s*atob\([\'\"]([^\'\"]+)[\'\"]\)/i);
        if (!match) return false;
        try { driveUrl = atob(match[1]); } catch (ignore) { driveUrl = ''; }
        return !!driveUrl;
      });
      if (driveUrl && !/^https:\/\//i.test(driveUrl)) driveUrl = '';
      var resourceLink = downloadCard && downloadCard.querySelector('.qcx-resource-link');
      if (!resourceLink && downloadCard && driveUrl) {
        resourceLink = document.createElement('a');
        resourceLink.className = 'qcx-resource-link';
        resourceLink.setAttribute('data-qcx-resource-link', 'true');
        resourceLink.target = '_blank';
        resourceLink.rel = 'noopener';
        resourceLink.textContent = 'MỞ TÀI NGUYÊN ↗';
        downloadCard.insertBefore(resourceLink, downloadCard.querySelector('small') || null);
      }
      var resourceLive = null;
      if (resourceLink) {
        if (driveUrl) resourceLink.href = driveUrl;
        /* Replace old encoded text such as "&#8599;" with real DOM content. */
        var resourceLabel = createElement('span', 'qcx-resource-link-label', 'MỞ TÀI NGUYÊN');
        resourceLink.textContent = '';
        resourceLink.appendChild(resourceLabel);
        resourceLive = createElement('span', 'qcx-resource-live');
        resourceLive.appendChild(createElement('i'));
        var resourceCount = createElement('b', '', '1');
        resourceCount.setAttribute('data-qcx-live-count', 'true');
        resourceLive.appendChild(resourceCount);
        resourceLive.appendChild(createElement('span', 'qcx-resource-live-text', 'đang xem'));
        resourceLink.appendChild(resourceLive);
        resourceLink.appendChild(createElement('span', 'qcx-resource-live-arrow', '↗'));
        resourceLink.setAttribute('data-qcx-rendered', 'true');
      }

      function startResourcePresence() {
        /* Store presence API removed — keep badge hidden. */
        if (resourceLive) resourceLive.classList.remove('is-visible');
      }
      startResourcePresence();

      function syncGateState() {
        var isReady = gateButton.classList.contains('is-ready');
        var state = isReady ? 'ready' : 'locked';
        if (gateButton.getAttribute('data-qcx-state') === state) return;
        gateButton.setAttribute('data-qcx-state', state);
        gateButton.innerHTML = isReady
          ? '<span>ĐÃ XÁC NHẬN · NHẬN TÀI LIỆU</span><b aria-hidden="true">↗</b>'
          : '<span>NHẬN TÀI LIỆU</span><b aria-hidden="true">↗</b>';
        if (isReady && driveUrl) gateButton.href = driveUrl;
        else gateButton.href = '#qcx-follow';
        gateButton.hidden = isReady;
        gateButton.setAttribute('aria-hidden', isReady ? 'true' : 'false');
        if (isReady) gateButton.style.setProperty('display', 'none', 'important');
        else gateButton.style.removeProperty('display');
        if (resourceLink) resourceLink.classList.toggle('is-visible', isReady);
      }
      syncGateState();
      gateButton.addEventListener('click', function(event) {
        if (!gateButton.classList.contains('is-ready')) return;
        if (!driveUrl) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        var driveWindow = window.open(driveUrl, 'TimkiemDriveResource', 'noopener,noreferrer');
        if (driveWindow) {
          try { driveWindow.opener = null; } catch (ignore) {}
        }
      }, true);
      if (window.MutationObserver) {
        var gateObserver = new MutationObserver(syncGateState);
        gateObserver.observe(gateButton, { attributes: true, attributeFilter: ['class'] });
      }

      /* Secure gate owns comment-only overlay — skip legacy polishers. */
    })();

    /* On mobile, keep the full card in the article and show a compact dock only after it scrolls away. */
    (function initMobileResourceDock() {
      if (document.documentElement.getAttribute('data-page-type') !== 'post') return;
      var card = document.querySelector('.qcx-top-download');
      var gateButton = card && card.querySelector('.qcx-download-button[data-download-key="qcx-drive"], .qcx-download-button.qcx-follow-gate');
      var anchor = article.querySelector('.qcx-download-anchor');
      if (!card || !gateButton || !anchor || document.querySelector('.qcx-mobile-resource-dock')) return;

      var mobileQuery = window.matchMedia('(max-width: 860px)');
      var dock = document.createElement('button');
      var action = null;
      var ticking = false;

      dock.type = 'button';
      dock.className = 'qcx-mobile-resource-dock';
      dock.setAttribute('aria-label', 'Nhận tài nguyên K Live');
      dock.setAttribute('aria-hidden', 'true');
      dock.innerHTML = '<span class="qcx-mobile-resource-copy"><small>TÀI NGUYÊN MIỄN PHÍ</small><strong>Tải K&#39;Live</strong></span><span class="qcx-mobile-resource-action">NHẬN ↗</span>';
      var articleImage = article.querySelector('.qcx-cover img, .post-body img');
      var articleImageUrl = articleImage && (articleImage.currentSrc || articleImage.getAttribute('src') || articleImage.getAttribute('data-src'));
      if (articleImageUrl) {
        var resourceThumb = document.createElement('span');
        var resourceThumbImage = document.createElement('img');
        resourceThumb.className = 'qcx-mobile-resource-thumb';
        resourceThumbImage.src = articleImageUrl;
        resourceThumbImage.alt = '';
        resourceThumbImage.loading = 'lazy';
        resourceThumb.appendChild(resourceThumbImage);
        dock.insertBefore(resourceThumb, dock.firstChild);
      }
      document.body.appendChild(dock);
      action = dock.querySelector('.qcx-mobile-resource-action');

      function placeMobileCard() {
        if (!mobileQuery.matches) return;
        if (anchor.nextElementSibling !== card) anchor.parentNode.insertBefore(card, anchor.nextSibling);
        card.classList.add('qcx-positioned', 'qcx-mounted');
        card.hidden = false;
        card.removeAttribute('aria-busy');
      }

      function isReady() {
        return gateButton.classList.contains('is-ready') || !!card.querySelector('.qcx-resource-link.is-visible');
      }

      function currentOnline() {
        var value = Number(document.documentElement.getAttribute('data-qcx-online') || 0);
        return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
      }

      function updateDock() {
        ticking = false;
        placeMobileCard();
        var cardRect = card.getBoundingClientRect();
        var articleRect = article.getBoundingClientRect();
        var visible = mobileQuery.matches && cardRect.bottom < 76 && articleRect.bottom > 118;
        dock.classList.toggle('is-visible', visible);
        dock.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (action) {
          var online = currentOnline();
          action.textContent = isReady()
            ? 'MỞ' + (online ? ' · ' + online : '') + ' ↗'
            : 'NHẬN' + (online ? ' · ' + online : '') + ' ↗';
          dock.setAttribute('aria-label', (isReady() ? 'Mở tài nguyên' : 'Nhận tài nguyên') +
            (online ? ', ' + online + ' người đang xem' : ''));
        }
      }

      function requestUpdate() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateDock);
      }

      dock.addEventListener('click', function() {
        var directLink = card.querySelector('.qcx-resource-link.is-visible');
        if (directLink) directLink.click();
        else gateButton.click();
      });
      window.addEventListener('scroll', requestUpdate, { passive: true });
      window.addEventListener('resize', requestUpdate);
      if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', requestUpdate);
      if (window.MutationObserver) {
        var dockObserver = new MutationObserver(requestUpdate);
        dockObserver.observe(card, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
      }
      placeMobileCard();
      updateDock();
    })();

    /* Remove the autogenerated safety disclaimer from the public article view. */
    article.querySelectorAll('.qcx-notice').forEach(function(notice) { notice.remove(); });

    /* Open Blogger follow in a small window and return when it is closed. */
    document.querySelectorAll('.qcx-sc-btn').forEach(function(followLink) {
      if (followLink.getAttribute('data-qcx-return-bound') === 'true') return;
      followLink.setAttribute('data-qcx-return-bound', 'true');
      followLink.addEventListener('click', function(event) {
        var popup = window.open(followLink.href, 'qcxBloggerFollow', 'popup=yes,width=460,height=680,resizable=yes,scrollbars=yes');
        if (!popup) return;
        event.preventDefault();
        try { popup.focus(); } catch (ignore) {}
        var returnUrl = window.location.href;
        var poll = window.setInterval(function() {
          if (popup.closed) {
            window.clearInterval(poll);
            window.location.assign(returnUrl);
          }
        }, 500);
        window.setTimeout(function() { window.clearInterval(poll); }, 1200000);
      });
    });

    /* Populate the sidebar with the five newest published Blogger pages. */
    var latestList = document.querySelector('#PopularPosts1 .widget-content>ul');
    if (latestList && latestList.getAttribute('data-qcx-latest-ready') !== 'true') {
      latestList.setAttribute('data-qcx-latest-ready', 'true');
      latestList.setAttribute('aria-label', 'Tutorial');
      var normalizePostUrl = function(value) {
        try {
          var parsed = new URL(value || '', location.href);
          parsed.hash = '';
          parsed.search = '';
          return (parsed.origin + parsed.pathname).replace(/\/$/, '').toLowerCase();
        } catch (ignore) { return String(value || '').split(/[?#]/)[0].replace(/\/$/, '').toLowerCase(); }
      };
      var currentPostUrl = normalizePostUrl((document.querySelector('link[rel="canonical"]') || {}).href || location.href);
      var cleanLatestPageText = function(value) {
        var holder = document.createElement('div');
        holder.innerHTML = String(value || '');
        return (holder.textContent || '').replace(/\s+/g, ' ').trim();
      };
      var isLatestPageThumbnail = function(value) {
        var url = String(value || '').trim();
        return !!url &&
          !/^(?:data:image|about:blank)/i.test(url) &&
          !/(?:transparent|spacer|blank|pixel)(?:[-_.]|$)/i.test(url);
      };
      var firstLatestPageImage = function(value) {
        if (!value) return '';
        var holder = document.createElement('div');
        holder.innerHTML = String(value);
        var images = Array.prototype.slice.call(holder.querySelectorAll('img'));
        for (var imageIndex = 0; imageIndex < images.length; imageIndex += 1) {
          var image = images[imageIndex];
          var candidates = [
            image.getAttribute('data-original-src'),
            image.getAttribute('data-src'),
            image.getAttribute('data-lazy-src'),
            image.getAttribute('src')
          ];
          for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
            if (isLatestPageThumbnail(candidates[candidateIndex])) return candidates[candidateIndex];
          }
        }
        return '';
      };
      var renderLatestEmpty = function() {
        if (latestList.children.length) {
          latestList.removeAttribute('aria-busy');
          return;
        }
        latestList.innerHTML = '';
        var empty = document.createElement('li');
        empty.className = 'qcx-latest-empty';
        empty.textContent = 'Ch\u01b0a c\u00f3 Tutorial';
        latestList.appendChild(empty);
        latestList.removeAttribute('aria-busy');
      };
      var latestPostHref = function(entry) {
        var href = '';
        (entry.link || []).forEach(function(link) {
          if (!href && link.rel === 'alternate') href = link.href || '';
        });
        return href;
      };
      var latestPostImage = function(entry) {
        var contentHtml = entry.content && entry.content.$t
          ? entry.content.$t
          : (entry.summary && entry.summary.$t ? entry.summary.$t : '');
        var mediaUrl = entry['media$thumbnail'] && entry['media$thumbnail'].url
          ? entry['media$thumbnail'].url
          : '';
        var imageUrl = isLatestPageThumbnail(mediaUrl) ? mediaUrl : firstLatestPageImage(contentHtml);
        if (!isLatestPageThumbnail(imageUrl)) return '';
        return String(imageUrl)
          .replace(/\/s\d+(?:-c)?\//i, '/w320-h180-c/')
          .replace(/=s\d+(?:-c)?(?=$|&)/i, '=w320-h180-c');
      };
      var renderLatestPosts = function(entries) {
          /* Build the replacement off-screen first. If Blogger returns an
             unusable entry or image parsing fails, the static fallback stays
             visible instead of flashing and then disappearing. */
          var fragment = document.createDocumentFragment();
          entries.forEach(function(entry) {
            var title = cleanLatestPageText(entry.title && entry.title.$t ? entry.title.$t : '');
            var href = latestPostHref(entry);
            if (!title || !href) return;
            var imageUrl = latestPostImage(entry);
            var li = document.createElement('li');
            var thumb = document.createElement('div');
            thumb.className = 'item-thumbnail';
            var thumbLink = document.createElement('a');
            thumbLink.href = href;
            thumbLink.title = title;
            thumbLink.setAttribute('aria-label', title);
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
            thumb.appendChild(thumbLink); li.appendChild(thumb);
            var titleWrap = document.createElement('div'); titleWrap.className = 'item-title';
            var titleLink = document.createElement('a'); titleLink.href = href; titleLink.title = title; titleLink.textContent = title;
            titleWrap.appendChild(titleLink); li.appendChild(titleWrap);
            fragment.appendChild(li);
          });
          if (!fragment.childNodes.length) {
            renderLatestEmpty();
            return false;
          }
          latestList.innerHTML = '';
          latestList.appendChild(fragment);
          latestList.removeAttribute('aria-busy');
          return true;
      };
      var renderLatestPageFeed = function(data) {
          var entries = data && data.feed && data.feed.entry ? data.feed.entry.slice() : [];
          entries = entries.filter(function(entry) {
            var href = latestPostHref(entry);
            return href && normalizePostUrl(href) !== currentPostUrl;
          });
          entries.sort(function(a, b) {
            var dateA = Date.parse((a.published && a.published.$t) || 0) || 0;
            var dateB = Date.parse((b.published && b.published.$t) || 0) || 0;
            return dateB - dateA;
          });
          if (entries.length) renderLatestPosts(entries.slice(0, 5));
          else latestList.removeAttribute('aria-busy');
      };
      var latestCallback = 'qcxLatestPages' + Date.now() + Math.floor(Math.random() * 1000);
      var latestScript = document.createElement('script');
      var latestTimer;
      var latestSettled = false;
      var finishLatestPages = function(data) {
        if (latestSettled) return;
        latestSettled = true;
        if (latestTimer) window.clearTimeout(latestTimer);
        try { delete window[latestCallback]; } catch (ignore) { window[latestCallback] = undefined; }
        if (latestScript.parentNode) latestScript.parentNode.removeChild(latestScript);
        if (data) renderLatestPageFeed(data);
        else renderLatestEmpty();
      };
      window[latestCallback] = function(data) { finishLatestPages(data); };
      latestScript.async = true;
      latestScript.onerror = function() { finishLatestPages(null); };
      latestScript.src = '/feeds/pages/default?alt=json-in-script&max-results=6&orderby=published&callback=' + encodeURIComponent(latestCallback);
      (document.head || document.documentElement).appendChild(latestScript);
      latestTimer = window.setTimeout(function() { finishLatestPages(null); }, 10000);
    }

    /* Remove obsolete step badges such as 01 that can sit beside media. */
    article.querySelectorAll('.qcx-step-num, .qcx-step-number').forEach(function(badge) {
      badge.remove();
    });

    /* Remove old ThemeBlogspot SKU blocks such as 018, including their spacer. */
    article.querySelectorAll('.sku').forEach(function(sku) {
      var legacyLink = sku.closest ? sku.closest('a') : null;
      var legacyBlock = legacyLink || sku;
      var previous = legacyBlock.previousSibling;
      while (previous && previous.nodeType === 3 && !previous.nodeValue.trim()) {
        var whitespace = previous;
        previous = previous.previousSibling;
        whitespace.remove();
      }
      if (previous && previous.nodeType === 1 && previous.tagName === 'BR') previous.remove();
      legacyBlock.remove();
    });
    article.querySelectorAll('a[href*="themeblogspot018.blogspot.com"]').forEach(function(legacyLink) {
      legacyLink.remove();
    });

    /* Remove legacy seller labels from the rendered post footer. */
    var legacyLabel = /^(?:bca|themeblogspot|blogspot|seo-friendly|drop-down-menu|\d{1,3}(?:[.,]\d{3})+(?:\s*(?:vnd|\u0111))?)$/i;
    var validArticleLabels = [];
    var knownLabels = {};
    document.querySelectorAll('.post-footer .keywords a, .post-label a, .post-labels a').forEach(function(labelLink) {
      var labelName = (labelLink.textContent || '').replace(/\s+/g, ' ').trim();
      if (!labelName) return;
      if (legacyLabel.test(labelName)) {
        labelLink.remove();
        return;
      }
      var labelKey = labelName.toLowerCase();
      if (!knownLabels[labelKey]) {
        knownLabels[labelKey] = true;
        validArticleLabels.push(labelName);
      }
    });
    document.querySelectorAll('.post-footer .keywords, .post-footer .post-label').forEach(function(labelGroup) {
      if (!labelGroup.querySelector('a')) labelGroup.remove();
    });

    /* Upgrade legacy feature tables without touching image-caption tables. */
    article.querySelectorAll('table').forEach(function(table, tableIndex) {
      if (table.classList.contains('tr-caption-container') || table.getAttribute('role') === 'presentation') return;
      if (table.getAttribute('data-qcx-table') === 'true') return;
      var rows = Array.prototype.slice.call(table.rows || []);
      if (!rows.length) return;

      table.setAttribute('data-qcx-table', 'true');
      table.classList.add('qcx-spec-table');
      var firstCells = Array.prototype.slice.call(rows[0].cells || []);
      var firstText = firstCells.map(function(cell) { return (cell.textContent || '').trim().toLowerCase(); });
      var hasHeader = firstCells.some(function(cell) { return cell.tagName === 'TH'; }) ||
        /^(?:t\u00ednh n\u0103ng|feature|h\u1ea1ng m\u1ee5c|th\u00f4ng tin)$/.test(firstText[0] || '') ||
        /^(?:test|status|tr\u1ea1ng th\u00e1i|gi\u00e1 tr\u1ecb|value)$/.test(firstText[1] || '');
      var headers = hasHeader ? firstCells.map(function(cell, index) {
        return (cell.textContent || '').replace(/\s+/g, ' ').trim() || ('C\u1ed9t ' + (index + 1));
      }) : ['H\u1ea1ng m\u1ee5c', 'Th\u00f4ng tin'];
      if (hasHeader) rows[0].classList.add('qcx-spec-head');

      rows.forEach(function(row, rowIndex) {
        if (hasHeader && rowIndex === 0) return;
        Array.prototype.slice.call(row.cells || []).forEach(function(cell, cellIndex) {
          cell.setAttribute('data-label', headers[cellIndex] || ('C\u1ed9t ' + (cellIndex + 1)));
          var value = (cell.textContent || '').replace(/\s+/g, ' ').trim();
          if (!value) {
            cell.textContent = '\u2014';
            cell.classList.add('qcx-status-empty');
          } else if (/^(?:true|yes|c\u00f3)$/i.test(value)) {
            cell.textContent = '\u2713 C\u00f3';
            cell.classList.add('qcx-status-yes');
          } else if (/^(?:false|no|kh\u00f4ng)$/i.test(value)) {
            cell.textContent = '\u2014 Kh\u00f4ng';
            cell.classList.add('qcx-status-no');
          }
        });
      });

      var tableWrap = table.parentElement;
      if (tableWrap && tableWrap.classList.contains('overflow')) {
        tableWrap.classList.add('qcx-spec-table-wrap');
      } else {
        tableWrap = document.createElement('div');
        tableWrap.className = 'qcx-spec-table-wrap';
        table.parentNode.insertBefore(tableWrap, table);
        tableWrap.appendChild(table);
      }
      tableWrap.setAttribute('role', 'region');
      tableWrap.setAttribute('aria-label', 'B\u1ea3ng th\u00f4ng tin ' + (tableIndex + 1));
      tableWrap.setAttribute('tabindex', '0');
    });

    /* High-resolution, lazy and non-blocking images. */
    article.querySelectorAll('img').forEach(function(img, index) {
      img.loading = index === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.setAttribute('fetchpriority', index === 0 ? 'high' : 'low');

      var dataSource = img.getAttribute('data-src');
      if (dataSource) img.setAttribute('data-src', highResolutionUrl(dataSource));
      var source = img.getAttribute('src');
      if (source && source.indexOf('data:') !== 0) img.setAttribute('src', highResolutionUrl(source));

      var link = img.closest ? img.closest('a[href]') : null;
      if (link) link.setAttribute('href', highResolutionUrl(link.getAttribute('href')));
    });

    article.querySelectorAll('video').forEach(function(video) {
      video.preload = 'metadata';
      video.playsInline = true;
      video.setAttribute('playsinline', 'playsinline');
    });
    article.querySelectorAll('iframe').forEach(function(frame) {
      frame.loading = 'lazy';
      if (!frame.title) frame.title = 'Embedded media';
    });

    /* Reading time, excluding code and embedded widgets. */
    var readable = article.cloneNode(true);
    readable.querySelectorAll('pre, code, script, style, iframe, form').forEach(function(node) { node.remove(); });
    var words = (readable.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    /* // dd/mm · N phút đọc — under title (TOC stays off). */
    if (words > 0 && !document.querySelector('.qcx-read-time')) {
      var postHeader = article.parentNode ? article.parentNode.querySelector('.post-header') : null;
      var dateLabel = '';
      try {
        var rawDate =
          (postHeader && postHeader.getAttribute('data-published')) ||
          ((document.querySelector('.post-timestamp time[datetime], time[datetime]') || {}).getAttribute &&
            document.querySelector('.post-timestamp time[datetime], time[datetime]').getAttribute('datetime')) ||
          '';
        if (rawDate) {
          var d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            dateLabel =
              String(d.getDate()).padStart(2, '0') +
              '/' +
              String(d.getMonth() + 1).padStart(2, '0');
          }
        }
      } catch (ignoreDate) {}
      var mins = Math.max(1, Math.ceil(words / 220));
      var readTime = document.createElement('div');
      readTime.className = 'qcx-read-time';
      readTime.textContent = (dateLabel ? dateLabel + ' · ' : '') + mins + ' phút đọc';
      if (postHeader) postHeader.appendChild(readTime);
      else article.parentNode.insertBefore(readTime, article);
    }

    /* TOC disabled — post chrome keeps title + read-time only. */
    article.querySelectorAll('.qcx-toc').forEach(function(node) { try { node.remove(); } catch (ignore) {} });

    /* Modern copy buttons for code blocks. */
    article.querySelectorAll('pre').forEach(function(pre) {
      if (pre.getAttribute('data-copy-ready') === 'true') return;
      pre.setAttribute('data-copy-ready', 'true');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'qcx-copy-btn';
      button.textContent = 'copy';
      button.setAttribute('aria-label', 'Sao chép mã');
      var frame = pre.closest ? pre.closest('.mac-frame') : null;
      var host = frame ? frame.querySelector('.mac-frame-header') : null;
      if (!host) {
        var wrap = document.createElement('div');
        wrap.className = 'qcx-code-wrap';
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);
        host = wrap;
      }
      host.appendChild(button);
      button.addEventListener('click', function() {
        copyText(pre.innerText || pre.textContent || '').then(function() {
          button.textContent = 'copied';
          button.classList.add('copied');
          setTimeout(function() { button.textContent = 'copy'; button.classList.remove('copied'); }, 1600);
        }).catch(function() { button.textContent = 'error'; });
      });
    });

    /* Safe external links. */
    article.querySelectorAll('a[href]').forEach(function(link) {
      try {
        var target = new URL(link.href, window.location.href);
        if (target.origin !== window.location.origin) {
          link.target = '_blank';
          var relTokens = (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
          ['noopener', 'noreferrer'].forEach(function(token) {
            if (relTokens.indexOf(token) === -1) relTokens.push(token);
          });
          link.setAttribute('rel', relTokens.join(' '));
        }
      } catch (error) {}
    });

    /* Useful article ending: share, copy, contact and label-aware related posts. */
    if (!document.querySelector('.qcx-article-end')) {
      var articleEnd = document.createElement('section');
      articleEnd.className = 'qcx-article-end';
      articleEnd.setAttribute('aria-label', 'C\u00f4ng c\u1ee5 cu\u1ed1i b\u00e0i vi\u1ebft');
      var endActions = document.createElement('div');
      endActions.className = 'qcx-end-actions';

      function endButton(text, className) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'qcx-end-action ' + className;
        button.textContent = text;
        return button;
      }
      function flashAction(button, text) {
        var original = button.textContent;
        button.textContent = text;
        window.setTimeout(function() { button.textContent = original; }, 1500);
      }

      var shareAction = endButton('\u2197 Chia s\u1ebb', 'qcx-end-share');
      var copyAction = endButton('\u2398 Sao ch\u00e9p li\u00ean k\u1ebft', 'qcx-end-copy');
      var contactAction = document.createElement('a');
      contactAction.className = 'qcx-end-action qcx-end-contact';
      contactAction.href = 'https://t.me/superkhung';
      contactAction.target = '_blank';
      contactAction.rel = 'noopener noreferrer';
      contactAction.textContent = '\u2192 @superkhung';
      endActions.appendChild(shareAction);
      endActions.appendChild(copyAction);
      endActions.appendChild(contactAction);
      articleEnd.appendChild(endActions);

      var relatedSection = document.createElement('div');
      relatedSection.className = 'qcx-related-smart';
      relatedSection.hidden = true;
      var relatedTitle = document.createElement('div');
      relatedTitle.className = 'qcx-related-title';
      relatedTitle.textContent = '// b\u00e0i vi\u1ebft li\u00ean quan';
      var relatedGrid = document.createElement('div');
      relatedGrid.className = 'qcx-related-grid';
      relatedSection.appendChild(relatedTitle);
      relatedSection.appendChild(relatedGrid);
      articleEnd.appendChild(relatedSection);
      article.insertAdjacentElement('afterend', articleEnd);

      var currentUrl = window.qcxCanonicalArticleUrl ? window.qcxCanonicalArticleUrl() : window.location.href;
      shareAction.addEventListener('click', function() {
        if (!window.qcxFacebookShare || !window.qcxFacebookShare(currentUrl)) {
          copyText(currentUrl).then(function() { flashAction(shareAction, '\u2713 \u0110\u00e3 sao ch\u00e9p'); });
        }
      });
      copyAction.addEventListener('click', function() {
        copyText(currentUrl)
          .then(function() { flashAction(copyAction, '\u2713 \u0110\u00e3 sao ch\u00e9p'); })
          .catch(function() { flashAction(copyAction, 'L\u1ed7i sao ch\u00e9p'); });
      });

      function alternateLink(entry) {
        var links = entry.link || [];
        for (var linkIndex = 0; linkIndex < links.length; linkIndex += 1) {
          if (links[linkIndex].rel === 'alternate') return links[linkIndex].href || '';
        }
        return '';
      }
      function relatedImage(entry) {
        var media = entry['media$thumbnail'];
        if (!media || !media.url) return '';
        return media.url
          .replace(/\/s72-c\//i, '/w640-h360-c/')
          .replace(/=s72-c/i, '=w640-h360-c');
      }
      function renderRelated(entries) {
        var rendered = 0;
        entries.forEach(function(entry) {
          if (rendered >= 3) return;
          var url = alternateLink(entry);
          if (!url || url.replace(/\/$/, '') === currentUrl.replace(/\/$/, '')) return;
          var titleText = entry.title && entry.title.$t ? entry.title.$t : '';
          if (!titleText) return;
          var card = document.createElement('a');
          card.className = 'qcx-related-card';
          card.href = url;
          var imageUrl = relatedImage(entry);
          if (imageUrl) {
            var image = document.createElement('img');
            image.src = imageUrl;
            image.alt = titleText;
            image.loading = 'lazy';
            image.decoding = 'async';
            card.appendChild(image);
          } else {
            card.classList.add('is-text-only');
          }
          var titleSpan = document.createElement('span');
          titleSpan.textContent = titleText;
          card.appendChild(titleSpan);
          relatedGrid.appendChild(card);
          rendered += 1;
        });
        var sidebarHasRelated = window.matchMedia('(min-width: 861px)').matches &&
          !!document.querySelector('#sidebar .qcx-sidebar-rail, #sidebar #PopularPosts2, #sidebar.qcx-download-sidebar #PopularPosts1');
        relatedSection.hidden = rendered === 0 || sidebarHasRelated;
        return rendered;
      }
      function requestRelated(useLabel) {
        var labelPath = useLabel ? '/-/' + encodeURIComponent(useLabel) : '';
        return fetch('/feeds/posts/default' + labelPath + '?alt=json&max-results=8', { credentials: 'same-origin' })
          .then(function(response) {
            if (!response.ok) throw new Error('feed unavailable');
            return response.json();
          })
          .then(function(data) {
            return renderRelated(data.feed && data.feed.entry ? data.feed.entry : []);
          });
      }
      requestRelated(validArticleLabels[0] || '')
        .then(function(rendered) {
          if (!rendered && validArticleLabels.length) return requestRelated('');
          return rendered;
        })
        .catch(function() { relatedSection.hidden = true; });
    }

    /* One requestAnimationFrame-driven reading progress listener. */
    var progress = document.getElementById('qcx-read-progress');
    if (!progress) {
      progress = document.createElement('div');
      progress.id = 'qcx-read-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.appendChild(progress);
    }
    var ticking = false;
    function updateProgress() {
      var rect = article.getBoundingClientRect();
      var start = window.scrollY + rect.top;
      var distance = Math.max(1, article.offsetHeight - window.innerHeight);
      var percent = Math.max(0, Math.min(100, ((window.scrollY - start) / distance) * 100));
      progress.style.width = percent + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(updateProgress); }
    }, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();
    } catch (smartErr) {
      try { console.warn('qcx initSmartArticle', smartErr); } catch (e) {}
    } finally {
      if (!document.querySelector('.qcx-article-end') && article && article.parentNode) {
        try {
          var endFallback = document.createElement('section');
          endFallback.className = 'qcx-article-end';
          endFallback.setAttribute('aria-label', 'Công cụ cuối bài viết');
          endFallback.innerHTML = '<div class="qcx-end-actions">' +
            '<button type="button" class="qcx-end-action qcx-end-share">↗ Chia sẻ</button>' +
            '<button type="button" class="qcx-end-action qcx-end-copy">⎘ Sao chép liên kết</button>' +
            '<a class="qcx-end-action qcx-end-contact" href="https://t.me/superkhung" rel="noopener noreferrer" target="_blank">→ @superkhung</a>' +
            '</div>';
          article.insertAdjacentElement('afterend', endFallback);
          var shareBtn = endFallback.querySelector('.qcx-end-share');
          var copyBtn = endFallback.querySelector('.qcx-end-copy');
          var url = window.location.href;
          if (shareBtn) shareBtn.addEventListener('click', function() {
            if (navigator.share) navigator.share({ url: url }).catch(function(){});
            else if (navigator.clipboard) navigator.clipboard.writeText(url);
          });
          if (copyBtn) copyBtn.addEventListener('click', function() {
            if (navigator.clipboard) navigator.clipboard.writeText(url);
          });
        } catch (endErr) {}
      }
      article.setAttribute('data-smart-ready', 'true');
    }
  }

  function initMobileCommercialCta() {
    var bar = document.querySelector('.qcx-mobile-cta');
    if (!bar || window.matchMedia('(min-width: 861px)').matches) return;
    var gate = document.querySelector('.qcx-download-button, .qcx-follow-gate, .qcx-top-download');
    if (!gate) return;
    var primary = bar.querySelector('[data-qcx-mobile-cta="download"]');
    var readyGate = document.querySelector('.qcx-download-button.is-ready, .qcx-resource-link.is-visible');
    if (primary) {
      if (readyGate && readyGate.href && readyGate.href.indexOf('#') !== 0) primary.href = readyGate.href;
      else if (gate.href) primary.href = gate.getAttribute('href') || '#qcx-follow';
      primary.addEventListener('click', function(event) {
        if (primary.getAttribute('href') === '#qcx-follow' || primary.getAttribute('href') === '#') {
          event.preventDefault();
          var target = document.querySelector('.qcx-download-button, #qcx-follow, .qcx-follow');
          if (target && target.click) target.click();
          else if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
    bar.hidden = false;
    bar.classList.add('is-visible');
    document.body.classList.add('qcx-has-mobile-cta');
  }

  function bootSmartArticle() {
    try { initSmartArticle(); } catch (err) { try { console.warn('qcx smart article', err); } catch (e) {} }
    try { initMobileCommercialCta(); } catch (err2) {}
  }
  if (document.readyState === 'complete') {
    bootSmartArticle();
  } else {
    window.addEventListener('load', bootSmartArticle, { once: true });
    document.addEventListener('DOMContentLoaded', function() {
      window.setTimeout(bootSmartArticle, 0);
    }, { once: true });
  }
  window.setTimeout(bootSmartArticle, 1200);
})();
