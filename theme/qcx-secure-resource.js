/**
 * TIMKIEM secure resource gate (Blogspot theme client).
 * Secrets never live in post HTML — delivery comes from Cloudflare Worker.
 * v20261113-marker2 — wait for marker id before free boot; prefer marker over slug.
 */
(function () {
  'use strict';
  if (window.__qcxSecureResourceBooted) return;

  var API_BASE = 'https://api.timkiem.app';
  var FREE_TOKEN_KEY = 'qcx_free_token_v1';
  var UNLOCK_SESSION_KEY = 'qcx_free_unlock_session_v1';
  var PRICE_LABEL = /^(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:\s*đ|d|vnd)?$/i;
  /* Blogger comment/frame tries top.location after publish — omit allow-top-navigation. */
  var COMMENT_FRAME_SANDBOX =
    'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';

  function pageType() {
    return document.documentElement.getAttribute('data-page-type') || '';
  }

  function isAdminPage() {
    try {
      if (/\/p\/admin\.html$/i.test(location.pathname || '')) return true;
      if (document.getElementById('qcx-admin-root')) return true;
      if (document.documentElement.getAttribute('data-qcx-admin') === '1') return true;
    } catch (ignore) {}
    return false;
  }

  function bypassAdminLock() {
    try {
      document.documentElement.setAttribute('data-qcx-admin', '1');
      document.documentElement.setAttribute('data-qcx-unlocked', '1');
      Array.prototype.slice.call(document.querySelectorAll('.qcx-lock-panel')).forEach(function (panel) {
        try { panel.remove(); } catch (err) {
          panel.hidden = true;
          panel.style.setProperty('display', 'none', 'important');
          panel.classList.add('is-done');
        }
      });
      Array.prototype.slice.call(document.querySelectorAll('.qcx-content-unlock, [data-qcx-unhidden]')).forEach(function (node) {
        node.hidden = false;
        node.classList.add('is-open');
        node.style.removeProperty('display');
        node.style.setProperty('display', 'block', 'important');
      });
      var root = document.getElementById('qcx-admin-root');
      if (root) {
        root.hidden = false;
        root.style.removeProperty('display');
        root.style.removeProperty('height');
        root.style.removeProperty('visibility');
      }
    } catch (ignore) {}
  }

  function isPostPage() {
    if (isAdminPage()) return false;
    return pageType() === 'post' || !!document.querySelector('.the-article .post-body, article.post-item .post-body');
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function api(path, options) {
    var opts = options || {};
    opts.credentials = 'include';
    opts.headers = opts.headers || {};
    if (opts.body && !opts.headers['Content-Type']) {
      opts.headers['Content-Type'] = 'application/json';
    }
    return fetch(API_BASE + path, opts).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      }).catch(function () {
        return { ok: res.ok, status: res.status, data: null };
      });
    });
  }

  function stripSecrets(root) {
    if (!root) return;
    /* After unlock, never re-strip restored Drive links. */
    if (document.documentElement.getAttribute('data-qcx-unlocked') === '1') return;
    Array.prototype.slice.call(root.querySelectorAll('a[href*="drive.google.com"], a[href*="docs.google.com"]')).forEach(function (a) {
      if (a.classList && a.classList.contains('qcx-restored-link')) return;
      if (a.classList && a.classList.contains('qcx-inline-resource-link')) return;
      var span = createEl('span', 'qcx-stripped-link', '[liên kết đã được bảo vệ]');
      a.parentNode.replaceChild(span, a);
    });
    Array.prototype.slice.call(root.querySelectorAll('script[type="application/json"]')).forEach(function (script) {
      try {
        var parsed = JSON.parse(script.textContent || '{}');
        if (parsed && (parsed.drive || parsed.driveUrl)) {
          delete parsed.drive;
          delete parsed.driveUrl;
          script.textContent = JSON.stringify(parsed);
        }
      } catch (ignore) {}
    });
    Array.prototype.slice.call(root.querySelectorAll('[data-qcx-drive-url]')).forEach(function (node) {
      node.removeAttribute('data-qcx-drive-url');
    });
  }

  function readMarker() {
    var node = document.getElementById('qcx-resource');
    if (!node) return null;
    /* Prefer data-* div (Blogger often strips <script> in post body). */
    if (node.getAttribute('data-resource-id') || node.getAttribute('data-mode')) {
      return {
        mode: (node.getAttribute('data-mode') || '').toLowerCase() || undefined,
        resourceId: node.getAttribute('data-resource-id') || undefined,
        title: node.getAttribute('data-title') || undefined,
        price: node.getAttribute('data-price') || undefined
      };
    }
    try {
      var data = JSON.parse(node.textContent || '{}');
      if (!data || typeof data !== 'object') return null;
      return data;
    } catch (ignore) {
      return null;
    }
  }

  function collectLabels() {
    var labels = [];
    Array.prototype.slice.call(document.querySelectorAll(
      '.post-labels a, .label-info a, a[rel="tag"], .the-article [data-label], .post-item [data-label], a[href*="/search/label/"]'
    )).forEach(function (node) {
      var name = (node.getAttribute('data-label') || node.textContent || '').replace(/^Search:\s*/i, '').trim();
      if (!name && node.href) {
        var m = String(node.href).match(/\/search\/label\/([^?#]+)/i);
        if (m) {
          try { name = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (ignore) { name = m[1]; }
        }
      }
      if (name) labels.push(name);
    });
    return labels;
  }

  function detectMode(marker, labels) {
    if (marker && marker.mode === 'free') return 'free';
    if (marker && marker.mode === 'paid') return 'paid';
    var i;
    for (i = 0; i < labels.length; i += 1) {
      var label = labels[i];
      if (/^free$/i.test(label) || /miễn\s*phí/i.test(label)) return 'free';
    }
    for (i = 0; i < labels.length; i += 1) {
      var paid = labels[i];
      if (/^vip$/i.test(paid) || PRICE_LABEL.test(paid.replace(/\s+/g, ''))) return 'paid';
    }
    var path = (location.pathname || '') + ' ' + (document.title || '');
    if (/\bfree\b|mien-phi|miễn\s*phí/i.test(path)) return 'free';
    if (marker && marker.resourceId) return 'free';
    return null;
  }

  function blogMeta() {
    var blogId =
      document.documentElement.getAttribute('data-blog-id') ||
      (document.querySelector('meta[name="blogger-blog-id"]') || {}).content ||
      '';
    var post =
      document.querySelector('.the-article[data-post-id], article.post-item[data-post-id], [data-post-id]');
    var postId = post ? post.getAttribute('data-post-id') || '' : '';
    if (!postId) {
      var html = document.documentElement.innerHTML || '';
      var match =
        html.match(/data-post-id=["'](\d{10,})["']/) ||
        html.match(/postId['"]?\s*[:=]\s*['"]?(\d{10,})/i) ||
        html.match(/blog-?\d+\.post-(\d{10,})/i);
      if (match) postId = match[1];
    }
    if (!blogId) {
      var blogMatch = (document.documentElement.innerHTML || '').match(/blog-(\d{10,})/);
      if (blogMatch) blogId = blogMatch[1];
    }
    return {
      blogId: String(blogId || '').replace(/[^0-9]/g, ''),
      postId: String(postId || '').replace(/[^0-9]/g, ''),
      postUrl: (document.querySelector('link[rel="canonical"]') || {}).href || location.href.split('#')[0]
    };
  }

  function tokenStoreKey(resourceId) {
    return FREE_TOKEN_KEY + ':' + resourceId;
  }

  function pageSlug() {
    return (location.pathname.split('/').pop() || '')
      .replace(/\.html$/i, '')
      .toLowerCase();
  }

  /* Marker id and URL slug can both be valid Worker resources — keep both. */
  function resourceIdCandidates(primary) {
    var ids = [];
    var push = function (id) {
      id = String(id || '').toLowerCase();
      if (id && ids.indexOf(id) === -1) ids.push(id);
    };
    push(primary);
    push(pageSlug());
    var marker = readMarker();
    if (marker) push(marker.resourceId);
    return ids;
  }

  function defaultTokenExpiry() {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  /* freeToken persists across visits; unlock-in-progress stays in sessionStorage. */
  function saveFreeToken(resourceId, token, expiresAt) {
    var payload = JSON.stringify({
      token: token,
      expiresAt: expiresAt || defaultTokenExpiry()
    });
    resourceIdCandidates(resourceId).forEach(function (id) {
      var key = tokenStoreKey(id);
      var localOk = false;
      try {
        localStorage.setItem(key, payload);
        localOk = true;
      } catch (ignore) {}
      if (localOk) {
        /* Only drop session copy after local write succeeds. */
        try { sessionStorage.removeItem(key); } catch (ignore2) {}
      } else {
        try { sessionStorage.setItem(key, payload); } catch (ignore3) {}
      }
    });
  }

  function isHardAuthMessage(err) {
    var text = String(err || '').toLowerCase();
    if (!text) return false;
    /* Do NOT match generic "chưa mở khóa" — Worker uses that for resource miss too. */
    return /unauthorized|token_invalid|token.*(invalid|expire|hết|het)|expired|revoked/.test(text);
  }

  /* Hard = clear auth reject only. Empty 401/403 body is soft — keep remembered unlock. */
  function isHardTokenFailure(out) {
    if (!out || out.ok) return false;
    var status = Number(out.status || 0);
    var err = out.error || (out.data && out.data.error) || '';
    if (!(status === 401 || status === 403 || out.hard === true)) return false;
    return isHardAuthMessage(err);
  }

  /* After a fresh mint, never hard-revoke on ambiguous delivery miss — retry soft. */
  function isFreshMintHardFailure(out) {
    if (!out || out.ok) return false;
    var status = Number(out.status || 0);
    var err = String(out.error || (out.data && out.data.error) || '').toLowerCase();
    return (status === 401 || status === 403) && /token_invalid|token.*(invalid|expire)|expired|revoked|unauthorized/.test(err);
  }

  function pinConfigResourceId(config, nextId) {
    if (!config || !nextId) return;
    var id = String(nextId || '').toLowerCase().trim();
    if (!id) return;
    var prev = config.resourceId;
    config.resourceId = id;
    /* Keep remembered unlock under every known id (slug + marker + Worker id). */
    var match = readFreeTokenMatch(id) || readFreeTokenMatch(prev) || readFreeTokenMatch(pageSlug());
    if (match && match.token) {
      saveFreeToken(id, match.token, match.expiresAt || defaultTokenExpiry());
    }
  }

  function readStoredTokenRaw(resourceId) {
    var key = tokenStoreKey(resourceId);
    try {
      var local = localStorage.getItem(key);
      if (local) return local;
    } catch (ignore) {}
    try {
      return sessionStorage.getItem(key) || '';
    } catch (ignore2) {
      return '';
    }
  }

  function clearFreeToken(resourceId) {
    resourceIdCandidates(resourceId).forEach(function (id) {
      var key = tokenStoreKey(id);
      try { localStorage.removeItem(key); } catch (ignore) {}
      try { sessionStorage.removeItem(key); } catch (ignore2) {}
    });
  }

  function readFreeTokenMatch(resourceId) {
    var ids = resourceIdCandidates(resourceId);
    var i;
    for (i = 0; i < ids.length; i += 1) {
      try {
        var raw = readStoredTokenRaw(ids[i]);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        if (!parsed || !parsed.token) continue;
        if (parsed.expiresAt && Date.parse(parsed.expiresAt) < Date.now()) {
          clearFreeToken(ids[i]);
          continue;
        }
        try {
          if (!localStorage.getItem(tokenStoreKey(ids[i]))) {
            saveFreeToken(ids[i], parsed.token, parsed.expiresAt || defaultTokenExpiry());
          }
        } catch (ignorePromote) {}
        return {
          token: parsed.token,
          resourceId: ids[i],
          expiresAt: parsed.expiresAt || defaultTokenExpiry()
        };
      } catch (ignore) {}
    }
    return null;
  }

  function readFreeToken(resourceId) {
    var match = readFreeTokenMatch(resourceId);
    return (match && match.token) || '';
  }

  function unlockSessionKey(resourceId) {
    return UNLOCK_SESSION_KEY + ':' + String(resourceId || pageSlug() || 'post');
  }

  function saveUnlockSession(resourceId, data) {
    try {
      sessionStorage.setItem(unlockSessionKey(resourceId), JSON.stringify({
        resourceId: resourceId,
        nonce: data && data.nonce || '',
        commentCode: data && data.commentCode || '',
        startedAt: data && data.startedAt || Date.now()
      }));
    } catch (ignore) {}
  }

  function readUnlockSession(resourceId) {
    try {
      var raw = sessionStorage.getItem(unlockSessionKey(resourceId));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.nonce) return null;
      if (parsed.startedAt && (Date.now() - Number(parsed.startedAt)) > 30 * 60 * 1000) return null;
      return parsed;
    } catch (ignore) {
      return null;
    }
  }

  function clearUnlockSession(resourceId) {
    try { sessionStorage.removeItem(unlockSessionKey(resourceId)); } catch (ignore) {}
    resourceIdCandidates(resourceId).forEach(function (id) {
      try { sessionStorage.removeItem(unlockSessionKey(id)); } catch (ignore2) {}
    });
  }

  function ensureUnlockTarget(body) {
    var existing = body.querySelector('.qcx-content-unlock, [data-qcx-unhidden]');
    if (existing) {
      existing.classList.add('qcx-content-unlock');
      /* Never re-hide after unlock — refresh/rescue used to force display:none and leave the lock panel stuck. */
      var donePanel = document.querySelector('.qcx-lock-panel.is-done');
      var pageUnlocked = document.documentElement.getAttribute('data-qcx-unlocked') === '1';
      if (existing.classList.contains('is-open') || donePanel || pageUnlocked) {
        existing.style.removeProperty('display');
        existing.hidden = false;
        existing.classList.add('is-open');
      } else {
        existing.style.setProperty('display', 'none');
        existing.hidden = true;
      }
      return existing;
    }
    var host = body.querySelector('.container') || body;
    var unlock = createEl('div', 'qcx-content-unlock');
    unlock.style.setProperty('display', 'none');
    unlock.hidden = true;
    var skip = /^(SCRIPT|STYLE|NOSCRIPT)$/;
    var keepOut = function (node) {
      if (!node || node.nodeType !== 1) return true;
      if (skip.test(node.tagName)) return true;
      if (node.classList.contains('qcx-lock-panel')) return true;
      if (node.classList.contains('qcx-top-download')) return true;
      if (node.classList.contains('qcx-download-anchor')) return true;
      if (node.id === 'qcx-resource' || node.classList.contains('qcx-resource-marker')) return true;
      if (node.classList.contains('separator') || node.classList.contains('mac-frame')) return true;
      if (node.classList.contains('qcx-teaser')) return true;
      return false;
    };
    var move = [];
    Array.prototype.forEach.call(host.children, function (child) {
      if (!keepOut(child)) move.push(child);
    });
    if (!move.length && host === body) {
      Array.prototype.forEach.call(body.childNodes, function (child) {
        if (child.nodeType === 1 && !keepOut(child)) move.push(child);
      });
    }
    move.forEach(function (child) { unlock.appendChild(child); });
    if (host === body) body.appendChild(unlock);
    else host.appendChild(unlock);
    return unlock;
  }

  /* Cached freeToken only — do NOT paint unlock until delivery validates (avoids flash→relock). */
  function hasCachedFreeToken(config) {
    if (!config || config.mode === 'paid') return false;
    return !!readFreeToken(config.resourceId);
  }
  /* Prep wrap/hide only; never mark unlocked here. */
  function prepareLockShell(config) {
    var body = document.querySelector('.post-body');
    if (body) ensureUnlockTarget(body);
    removeLegacyDownloadCards();
  }

  function findPostHero(body) {
    if (!body) return null;
    var hero = null;
    Array.prototype.forEach.call(body.children, function (el) {
      if (hero) return;
      if (el.classList && (el.classList.contains('mac-frame') || el.classList.contains('mac-frame-image') || el.classList.contains('separator'))) {
        hero = el;
      }
    });
    return hero;
  }

  /* Hero must sit under title / read-time — first in .post-body. */
  function placeHeroUnderTitle(body) {
    if (!body) return;
    var hero = findPostHero(body);
    if (!hero) return;
    try {
      hero.hidden = false;
      hero.style.removeProperty('display');
    } catch (ignoreShow) {}
    if (body.firstElementChild === hero) return;
    body.insertBefore(hero, body.firstChild);
  }

  /* Intro / teaser stays visible under hero; lock CTA sits after it. */
  function isIntroStopNode(node) {
    if (!node || node.nodeType !== 1) return true;
    if (node.classList.contains('qcx-lock-panel')) return true;
    if (node.id === 'comments' || node.classList.contains('qcx-comments-shell')) return true;
    if (node.id === 'qcx-resource' || node.classList.contains('qcx-resource-marker')) return true;
    if (node.classList.contains('qcx-content-unlock') || node.classList.contains('container')) return true;
    if (node.querySelector && node.querySelector('.qcx-content-unlock')) return true;
    return false;
  }

  function findIntroAnchor(body, hero) {
    if (!body) return null;
    var teaser = body.querySelector('.qcx-teaser');
    if (teaser && body.contains(teaser)) return teaser;
    var node = hero ? hero.nextElementSibling : body.firstElementChild;
    var lastIntro = hero || null;
    while (node) {
      if (node.classList && node.classList.contains('qcx-lock-panel')) {
        node = node.nextElementSibling;
        continue;
      }
      if (isIntroStopNode(node)) break;
      lastIntro = node;
      node = node.nextElementSibling;
    }
    return lastIntro;
  }

  /* Lock CTA after intro under hero (still above comments / locked body). */
  function placeLockPanelAboveFold(body, panel) {
    if (!body || !panel) return;
    placeHeroUnderTitle(body);
    var hero = findPostHero(body);
    var anchor = findIntroAnchor(body, hero);
    if (anchor) {
      if (panel.previousElementSibling === anchor) return;
      if (anchor.nextSibling) body.insertBefore(panel, anchor.nextSibling);
      else body.appendChild(panel);
      return;
    }
    if (body.firstElementChild === panel) return;
    body.insertBefore(panel, body.firstChild);
  }

  /* While gating: grow with content — no nested scroll (page scroll only). */
  function capCommentsForUnlockChrome(comments) {
    if (!comments) return;
    try {
      comments.style.setProperty('max-height', 'none', 'important');
      comments.style.setProperty('overflow-x', 'hidden', 'important');
      comments.style.setProperty('overflow-y', 'visible', 'important');
    } catch (ignore) {}
  }

  function ensureLockPanel(config) {
    var body = document.querySelector('.post-body');
    if (!body) return null;
    Array.prototype.slice.call(body.querySelectorAll('.qcx-content-lock, [data-qcx-lock]')).forEach(function (node) {
      try { node.remove(); } catch (ignore) {}
    });
    var unlock = ensureUnlockTarget(body);
    var rid = config && config.resourceId;
    /* freeToken alone must NOT unlock UI — wait for delivery validate to avoid FOUC/revoke flash. */
    var alreadyUnlocked =
      document.documentElement.getAttribute('data-qcx-unlocked') === '1' ||
      isPageUnlocked(rid) ||
      (unlock && unlock.classList.contains('is-open'));
    if (alreadyUnlocked) {
      markPageUnlocked();
      if (unlock) {
        unlock.hidden = false;
        unlock.style.removeProperty('display');
        unlock.classList.add('is-open');
      }
      var hidePanel = body.querySelector('.qcx-lock-panel');
      if (hidePanel) {
        hidePanel.hidden = true;
        hidePanel.style.setProperty('display', 'none', 'important');
        hidePanel.classList.add('is-done');
      }
      placeHeroUnderTitle(body);
      removeLegacyDownloadCards();
      return hidePanel;
    }
    var existing = body.querySelector('.qcx-lock-panel');
    if (existing) {
      if (existing.classList.contains('is-done') || (unlock && unlock.classList.contains('is-open'))) {
        existing.hidden = true;
        existing.style.setProperty('display', 'none', 'important');
        existing.classList.add('is-done');
        if (unlock) {
          unlock.hidden = false;
          unlock.style.removeProperty('display');
          unlock.classList.add('is-open');
        }
        placeHeroUnderTitle(body);
        removeLegacyDownloadCards();
        return existing;
      }
      placeLockPanelAboveFold(body, existing);
      try {
        var cmtExisting = document.getElementById('comments') || document.querySelector('.qcx-comments-shell');
        placeCommentsForUnlock(cmtExisting);
        capCommentsForUnlockChrome(cmtExisting);
      } catch (ignorePlace) {}
      wireLockPanel(existing);
      removeLegacyDownloadCards();
      return existing;
    }
    /* Already unlocked this session — do not rebuild the lock chrome. */
    if (unlock && unlock.classList.contains('is-open')) {
      placeHeroUnderTitle(body);
      removeLegacyDownloadCards();
      return null;
    }
    var isPaid = config.mode === 'paid';
    var panel = createEl('div', 'qcx-lock-panel' + (isPaid ? ' is-paid' : ' is-free'));
    panel.setAttribute('data-qcx-lock-ui', '1');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', isPaid ? 'Nội dung thành viên' : 'Nội dung đang khóa');
    var badge = isPaid ? 'PHẦN DÀNH CHO THÀNH VIÊN' : 'NỘI DUNG MỞ SAU KHI COMMENT';
    var footTitle = isPaid ? 'Phần còn lại dành cho thành viên' : 'Phần còn lại đang khóa';
    var footDesc = isPaid ? 'Mở khoá để xem toàn bộ hướng dẫn' : 'Bình luận mã để xem toàn bộ hướng dẫn';
    panel.innerHTML =
      '<div class="qcx-lock-divider"><span></span></div>' +
      '<div class="qcx-lock-stage">' +
      '<span class="qcx-lock-ribbon">LOCKED</span>' +
      '<span class="qcx-lock-bracket qcx-lb-tl" aria-hidden="true"></span>' +
      '<span class="qcx-lock-bracket qcx-lb-tr" aria-hidden="true"></span>' +
      '<span class="qcx-lock-bracket qcx-lb-bl" aria-hidden="true"></span>' +
      '<span class="qcx-lock-bracket qcx-lb-br" aria-hidden="true"></span>' +
      '<div class="qcx-lock-reticle" aria-hidden="true"><i></i></div>' +
      '<div class="qcx-lock-skel" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '</div>' +
      '<div class="qcx-lock-foot">' +
      '<div class="qcx-lock-foot-copy"><strong></strong><span></span></div>' +
      '<button type="button" class="qcx-lock-cta"><i aria-hidden="true"></i><b></b></button>' +
      '</div>';
    panel.querySelector('.qcx-lock-divider span').textContent = badge;
    panel.querySelector('.qcx-lock-foot-copy strong').textContent = footTitle;
    panel.querySelector('.qcx-lock-foot-copy span').textContent = footDesc;
    panel.querySelector('.qcx-lock-cta b').textContent = 'Mở khoá';
    placeLockPanelAboveFold(body, panel);
    if (!panel.parentNode) {
      if (unlock && unlock.parentNode) unlock.parentNode.insertBefore(panel, unlock);
      else body.appendChild(panel);
    }
    try {
      var cmtNew = document.getElementById('comments') || document.querySelector('.qcx-comments-shell');
      placeCommentsForUnlock(cmtNew);
      capCommentsForUnlockChrome(cmtNew);
    } catch (ignorePlace2) {}
    wireLockPanel(panel);
    removeLegacyDownloadCards();
    return panel;
  }

  function resolvePostIds(meta) {
    var blogId = (meta && meta.blogId) || document.documentElement.getAttribute('data-blog-id') || '';
    var postId = (meta && meta.postId) || '';
    if (!postId) {
      var node = document.querySelector('[data-post-id]');
      if (node) postId = node.getAttribute('data-post-id') || '';
    }
    if (!postId) {
      var html = document.documentElement.innerHTML || '';
      var match =
        html.match(/blog-\d+\.post-(\d+)/) ||
        html.match(/[?&]po=(\d+)/) ||
        html.match(/postID[=:\"']+(\d+)/i) ||
        html.match(/postId[=:\"']+(\d+)/i);
      if (match) postId = match[1];
    }
    blogId = String(blogId || '').replace(/[^0-9]/g, '');
    postId = String(postId || '').replace(/[^0-9]/g, '');
    return { blogId: blogId, postId: postId };
  }

  function bloggerCommentFrameUrl(meta) {
    var ids = resolvePostIds(meta);
    if (!ids.blogId || !ids.postId) return '';
    /* skin=indie + theme posts.background.color → Blogger paints composer (not host CSS). */
    return 'https://www.blogger.com/comment/frame/' + ids.blogId + '?po=' + ids.postId + '&skin=indie';
  }

  function blogHomeOrigin() {
    try {
      var canon = (document.querySelector('link[rel="canonical"]') || {}).href || '';
      if (canon) return new URL(canon).origin;
    } catch (ignore) {}
    return location.origin;
  }

  function commentFeedUrls(meta) {
    var ids = resolvePostIds(meta);
    if (!ids.postId) return [];
    var urls = [];
    urls.push(blogHomeOrigin() + '/feeds/' + ids.postId + '/comments/default?alt=json&max-results=20');
    if (ids.blogId) {
      urls.push('https://www.blogger.com/feeds/' + ids.blogId + '/' + ids.postId + '/comments/default?alt=json&max-results=20');
    }
    return urls;
  }

  function ensureUnlockHint(box) {
    if (!box) return null;
    Array.prototype.slice.call(box.querySelectorAll('.qcx-comments-hint[data-qcx-unlock-hint="1"]')).forEach(function (node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    return null;
  }

  function ensureCommentListHost(box) {
    if (!box) return null;
    var list = box.querySelector('#qcx-comment-list');
    function fitCommentListItems(host) {
      if (!host) return;
      var items = host.querySelector('.qcx-comment-list-items');
      if (!items) return;
      try {
        items.style.setProperty('max-height', 'min(42vh, 280px)', 'important');
        items.style.setProperty('overflow-y', 'auto', 'important');
        items.style.setProperty('overflow-x', 'hidden', 'important');
        items.style.setProperty('gap', '2px', 'important');
      } catch (ignoreFit) {}
    }
    if (list) {
      fitCommentListItems(list);
      return list;
    }
    list = createEl('div', 'qcx-comment-list');
    list.id = 'qcx-comment-list';
    list.setAttribute('aria-live', 'polite');
    list.setAttribute(
      'style',
      'margin:0 0 12px!important;padding:10px 12px!important;border:1px solid rgba(0,240,163,.16)!important;border-radius:12px!important;background:rgba(0,240,163,.03)!important'
    );
    list.innerHTML =
      '<div class="qcx-comment-list-head" style="display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;margin:0 0 8px!important">' +
      '<strong style="font:700 12px/1.2 ui-monospace,monospace!important;color:#e6f5ec!important">Bình luận gần đây</strong>' +
      '<span class="qcx-comment-list-state" style="font:600 11px/1 ui-monospace,monospace!important;color:#8fb39f!important">Đang tải…</span></div>' +
      '<ul class="qcx-comment-list-items" style="list-style:none!important;margin:0!important;padding:0!important;display:flex!important;flex-direction:column!important;gap:2px!important;max-height:min(42vh,280px)!important;overflow-y:auto!important;overflow-x:hidden!important"></ul>';
    var form = box.querySelector('.comment-form');
    var gate = box.querySelector('.qcx-inline-gate');
    if (gate && gate.parentNode) gate.parentNode.insertBefore(list, gate.nextSibling);
    else if (form && form.parentNode) form.parentNode.insertBefore(list, form);
    else box.appendChild(list);
    return list;
  }

  function mountGateInComments(gate, meta) {
    if (!gate) return null;
    var box = ensureCommentsMount(meta);
    if (!box) return null;
    var hint = ensureUnlockHint(box);
    var form = box.querySelector('.comment-form');
    /* Order: hint → gate → list → form/iframe */
    if (hint && hint.parentNode) {
      if (gate.parentNode !== hint.parentNode || hint.nextSibling !== gate) {
        hint.parentNode.insertBefore(gate, hint.nextSibling);
      }
    } else if (form && form.parentNode) {
      form.parentNode.insertBefore(gate, form);
    } else {
      box.appendChild(gate);
    }
    var list = ensureCommentListHost(box);
    if (list && gate.parentNode) {
      if (list.parentNode !== gate.parentNode || gate.nextSibling !== list) {
        gate.parentNode.insertBefore(list, gate.nextSibling);
      }
    }
    if (form && list && list.parentNode && list.nextSibling !== form) {
      list.parentNode.insertBefore(form, list.nextSibling);
    }
    return box;
  }

  /* UI unlock state only — freeToken alone must not count (validate delivery first). */
  function isPageUnlocked(resourceId) {
    if (document.documentElement.getAttribute('data-qcx-unlocked') === '1') return true;
    var unlock = document.querySelector('.qcx-content-unlock.is-open');
    if (unlock) return true;
    var panel = document.querySelector('.qcx-lock-panel.is-done');
    if (panel) return true;
    return false;
  }

  function markPageUnlocked() {
    try { document.documentElement.setAttribute('data-qcx-unlocked', '1'); } catch (ignore) {}
  }

  /* During unlock: keep #comments near gate — after lock panel or above share. */
  function placeCommentsForUnlock(comments) {
    if (!comments) return null;
    try {
      comments.classList.remove('is-settled');
      comments.setAttribute('data-qcx-unlock-chrome', '1');
      var panel = document.querySelector('.qcx-lock-panel');
      var end = document.querySelector('.qcx-article-end');
      if (panel && panel.parentNode) {
        if (comments.previousSibling !== panel) panel.parentNode.insertBefore(comments, panel.nextSibling);
      } else if (end && end.parentNode) {
        if (comments.nextSibling !== end) end.parentNode.insertBefore(comments, end);
      }
      capCommentsForUnlockChrome(comments);
    } catch (ignore) {}
    return comments;
  }

  /* After unlock: settle #comments under share row (native widget slot). */
  function placeCommentsSettled(comments) {
    if (!comments) return null;
    try {
      comments.classList.add('is-settled');
      comments.removeAttribute('data-qcx-unlock-chrome');
      comments.style.removeProperty('max-height');
      comments.style.removeProperty('overflow');
      comments.style.removeProperty('overflow-x');
      comments.style.removeProperty('overflow-y');
      var end = document.querySelector('.qcx-article-end');
      var theArticle = document.querySelector('#the-article, .the-article');
      var postItem = document.querySelector('article.post-item') ||
        (theArticle && theArticle.closest('article.post-item'));
      if (end && end.parentNode) {
        if (comments.previousSibling !== end) {
          if (end.nextSibling) end.parentNode.insertBefore(comments, end.nextSibling);
          else end.parentNode.appendChild(comments);
        }
      } else if (theArticle && theArticle.parentNode) {
        if (comments.previousSibling !== theArticle) {
          if (theArticle.nextSibling) theArticle.parentNode.insertBefore(comments, theArticle.nextSibling);
          else theArticle.parentNode.appendChild(comments);
        }
      } else if (postItem) {
        postItem.appendChild(comments);
      }
    } catch (ignore) {}
    return comments;
  }

  /* Keep #comments visible after unlock — remount if missing, settle under share. */
  function restoreUnlockCommentsChrome() {
    markPageUnlocked();
    var box = null;
    try {
      box = ensureCommentsMount(blogMeta());
    } catch (ignoreMount) {}
    var nodes = document.querySelectorAll(
      '#comments, .qcx-comments-shell, .comments.embed'
    );
    Array.prototype.slice.call(nodes).forEach(function (node) {
      try {
        node.classList.remove('is-dismissed');
        node.hidden = false;
        node.removeAttribute('aria-hidden');
        node.style.setProperty('display', 'block', 'important');
        node.style.setProperty('visibility', 'visible', 'important');
        node.style.removeProperty('height');
        node.style.removeProperty('overflow');
        if (node.classList.contains('qcx-comments-shell') || node.id === 'comments') {
          node.style.setProperty('margin', '20px 0 28px', 'important');
          node.style.setProperty('padding', '18px', 'important');
        }
      } catch (ignore) {}
    });
    Array.prototype.slice.call(document.querySelectorAll('#qcx-comment-list, .qcx-comment-list')).forEach(function (list) {
      try {
        list.hidden = false;
        list.style.removeProperty('display');
      } catch (ignore2) {}
    });
    var comments = box || document.getElementById('comments');
    placeCommentsSettled(comments);
    /* One-shot list fill when unlocked (poll stops after freeToken). */
    try {
      if (typeof window.__qcxSecureRefreshComments === 'function') {
        window.__qcxSecureRefreshComments({ busy: true, resetFrame: false });
      } else if (box) {
        var listEl = ensureCommentListHost(box);
        if (listEl && !listEl.getAttribute('data-qcx-restored-feed')) {
          listEl.setAttribute('data-qcx-restored-feed', '1');
          fetchCommentFeed(blogMeta()).then(function (result) {
            if (!result || !result.ok) {
              renderCommentList(listEl, [], 'Không tải được feed');
              return;
            }
            renderCommentList(
              listEl,
              result.comments,
              result.comments.length ? result.comments.length + ' bình luận' : 'Chưa có'
            );
          }).catch(function () {
            renderCommentList(listEl, [], 'Lỗi mạng');
          });
        }
      }
    } catch (ignoreFeed) {}
    return box || document.getElementById('comments');
  }

  function dismissUnlockUi() {
    Array.prototype.slice.call(document.querySelectorAll('.qcx-inline-gate, [data-qcx-secure-gate="1"]')).forEach(function (node) {
      try { node.remove(); } catch (ignore) {}
    });
    Array.prototype.slice.call(document.querySelectorAll('.qcx-comments-hint[data-qcx-unlock-hint="1"]')).forEach(function (node) {
      try { node.remove(); } catch (ignore) {}
    });
    restoreUnlockCommentsChrome();
    return null;
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = String(html || '');
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function formatCommentTime(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('vi-VN', { hour12: false });
    } catch (ignore) {
      return '';
    }
  }

  function parseFeedEntries(data) {
    var feed = (data && data.feed) || {};
    var entries = feed.entry || [];
    if (!Array.isArray(entries)) entries = entries ? [entries] : [];
    return entries.map(function (entry) {
      var author = (entry.author && entry.author[0]) || {};
      var name = (author.name && author.name.$t) || 'Ẩn danh';
      var avatar =
        (author.gd$image && author.gd$image.src) ||
        (author['gd$image'] && author['gd$image'].src) ||
        '';
      var content =
        (entry.content && entry.content.$t) ||
        (entry.summary && entry.summary.$t) ||
        (entry.title && entry.title.$t) ||
        '';
      var published = (entry.published && entry.published.$t) || (entry.updated && entry.updated.$t) || '';
      var id = (entry.id && entry.id.$t) || published + ':' + name;
      return {
        id: id,
        name: name,
        avatar: avatar,
        text: stripHtml(content),
        published: published
      };
    });
  }

  function renderCommentList(listEl, comments, stateText) {
    if (!listEl) return;
    var stateEl = listEl.querySelector('.qcx-comment-list-state');
    var itemsEl = listEl.querySelector('.qcx-comment-list-items');
    if (stateEl) stateEl.textContent = stateText || '';
    if (!itemsEl) return;
    if (!comments || !comments.length) {
      itemsEl.innerHTML = '<li class="qcx-comment-empty">Chưa có bình luận công khai.</li>';
      return;
    }
    itemsEl.innerHTML = comments.map(function (c) {
      var avatarUrl = String(c.avatar || '').replace(/"/g, '');
      var avatar = avatarUrl
        ? '<img class="qcx-comment-avatar" src="' + avatarUrl + '" alt="" width="24" height="24" loading="lazy" referrerpolicy="no-referrer" style="width:24px!important;height:24px!important;max-width:24px!important;border-radius:50%!important;object-fit:cover!important;display:block!important">'
        : '<span class="qcx-comment-avatar is-fallback" aria-hidden="true" style="width:24px!important;height:24px!important;border-radius:50%!important;display:block!important"></span>';
      var name = String(c.name || 'Ẩn danh').replace(/</g, '&lt;');
      var isAdmin = String(c.name || '').trim() === "K'";
      var nameColor = isAdmin ? '#ff3b3b' : '#eaf7f0';
      var nameClass = isAdmin ? ' class="is-admin"' : '';
      var time = c.published ? formatCommentTime(c.published) : '';
      var text = String(c.text || '').replace(/</g, '&lt;');
      return (
        '<li class="qcx-comment-item" data-id="' + String(c.id).replace(/"/g, '') + '" style="display:flex!important;align-items:flex-start!important;gap:6px!important;margin:0!important;padding:4px 0!important;list-style:none!important">' +
        avatar +
        '<div class="qcx-comment-body" style="min-width:0!important;flex:1 1 auto!important">' +
        '<div class="qcx-comment-meta" style="display:flex!important;flex-wrap:nowrap!important;align-items:baseline!important;justify-content:space-between!important;width:100%!important;gap:4px 8px!important">' +
        '<b' + nameClass + ' style="font:800 13px/1.25 system-ui,-apple-system,sans-serif!important;color:' + nameColor + '!important">' + name + '</b>' +
        (time ? '<time style="font:600 11px/1.2 ui-monospace,monospace!important;color:#8fb39f!important;margin-left:auto!important;white-space:nowrap!important">' + time + '</time>' : '') +
        '</div>' +
        '<p style="margin:2px 0 0!important;color:#d7ebe0!important;font:500 12px/1.35 system-ui,sans-serif!important;word-break:break-word!important">' + text + '</p>' +
        '</div></li>'
      );
    }).join('');
  }

  function fetchCommentFeed(meta) {
    var urls = commentFeedUrls(meta);
    if (!urls.length) return Promise.resolve({ ok: false, comments: [], error: 'missing postId' });
    var tryUrl = function (i) {
      if (i >= urls.length) return Promise.resolve({ ok: false, comments: [], error: 'feed failed' });
      return fetch(urls[i], { credentials: 'omit', cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error('status ' + res.status);
          return res.json();
        })
        .then(function (data) {
          return { ok: true, comments: parseFeedEntries(data), url: urls[i] };
        })
        .catch(function () {
          return tryUrl(i + 1);
        });
    };
    return tryUrl(0);
  }

  function ensureCommentsMount(meta) {
    var existing = document.getElementById('comments');
    var ids = resolvePostIds(meta);
    var frameUrl = bloggerCommentFrameUrl(meta);
    function ensureFrame(host) {
      if (!frameUrl || !host) return;
      var form = host.querySelector('.comment-form') || host;
      var frame = host.querySelector('iframe.qcx-blogger-comment-frame');
      if (!frame) {
        frame = document.createElement('iframe');
        frame.className = 'qcx-blogger-comment-frame blogger-iframe-colorize';
        frame.setAttribute('title', 'Bình luận Blogger');
        frame.setAttribute('allowtransparency', 'true');
        frame.setAttribute('frameborder', '0');
        frame.setAttribute('sandbox', COMMENT_FRAME_SANDBOX);
        frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        frame.setAttribute('style', 'display:block!important;width:100%!important;min-height:280px;height:320px;border:0;border-radius:12px;background:transparent');
        form.appendChild(frame);
        frame.setAttribute('data-qcx-frame-loads', '0');
        frame.addEventListener('load', function () {
          /*
           * Blogger comment/frame navigates after publish. Sandbox blocks parent F5;
           * subsequent iframe loads mean the composer left — reset src + kick poll.
           */
          var loads = Number(frame.getAttribute('data-qcx-frame-loads') || '0') + 1;
          frame.setAttribute('data-qcx-frame-loads', String(loads));
          if (loads <= 1) return;
          if (frame.getAttribute('data-qcx-frame-resetting') === '1') {
            frame.removeAttribute('data-qcx-frame-resetting');
            return;
          }
          frame.setAttribute('data-qcx-frame-resetting', '1');
          window.setTimeout(function () {
            try {
              frame.setAttribute('data-qcx-frame-loads', '0');
              frame.src = frameUrl;
            } catch (ignore) {
              frame.removeAttribute('data-qcx-frame-resetting');
            }
            try {
              if (typeof window.__qcxSecureRefreshComments === 'function') {
                window.__qcxSecureRefreshComments({ resetFrame: false });
              }
            } catch (ignore2) {}
          }, 350);
        });
      } else if (frame.getAttribute('sandbox') !== COMMENT_FRAME_SANDBOX) {
        /* sandbox must be set before first navigation — rebuild if missing/wrong. */
        try { frame.parentNode && frame.parentNode.removeChild(frame); } catch (ignoreRebuild) {}
        ensureFrame(host);
        return;
      }
      if (frame.getAttribute('src') !== frameUrl) {
        frame.setAttribute('data-qcx-frame-loads', '0');
        frame.src = frameUrl;
      }
    }
    if (existing) {
      existing.classList.remove('is-dismissed');
      existing.hidden = false;
      existing.removeAttribute('aria-hidden');
      /* Unlock hint only while still locked. */
      if (!isPageUnlocked()) ensureUnlockHint(existing);
      else {
        Array.prototype.slice.call(existing.querySelectorAll('.qcx-comments-hint[data-qcx-unlock-hint="1"]')).forEach(function (node) {
          try { node.remove(); } catch (ignoreHint) {}
        });
      }
      ensureCommentListHost(existing);
      ensureFrame(existing);
      existing.style.setProperty('display', 'block', 'important');
      existing.style.setProperty('visibility', 'visible', 'important');
      if (isPageUnlocked()) placeCommentsSettled(existing);
      else placeCommentsForUnlock(existing);
      return existing;
    }
    var article = document.querySelector('article.post-item') || document.querySelector('#the-article') || document.querySelector('.post-body');
    if (!article) return null;
    var host = article.classList && article.classList.contains('post-item')
      ? article
      : (article.closest('article.post-item') || article.parentNode || article);
    var box = createEl('div', 'comments embed qcx-comments-shell');
    box.id = 'comments';
    box.setAttribute('data-embed', 'true');
    box.setAttribute('data-allow-comments', 'true');
    box.setAttribute('data-qcx-comments-rescue', '1');
    box.setAttribute('style', 'display:block!important;visibility:visible!important;margin:20px 0 28px;padding:18px;border:1px solid #1d2a1f;border-radius:16px;background:#101810;color:#e6f5ec;position:relative;z-index:5');
    var title = createEl('h4', 'postAComment', 'Bình luận Blogger');
    title.setAttribute('style', 'margin:0 0 12px;font-size:1.15rem;color:#e6f5ec');
    var form = createEl('div', 'comment-form qcx-comments-rescue');
    form.setAttribute('style', 'display:flex;flex-direction:column;gap:10px');
    if (!frameUrl) {
      var missing = createEl('p', 'qcx-comments-hint', 'Không lấy được blogId/postId để tải form bình luận.');
      form.appendChild(missing);
    }
    box.appendChild(title);
    if (!isPageUnlocked()) ensureUnlockHint(box);
    box.appendChild(form);
    ensureCommentListHost(box);
    ensureFrame(box);
    if (isPageUnlocked()) {
      if (!box.parentNode) host.appendChild(box);
      placeCommentsSettled(box);
    } else {
      placeCommentsForUnlock(box);
      if (!box.parentNode) host.appendChild(box);
    }
    return box;
  }

  function scrollToComments(meta) {
    var comments = ensureCommentsMount(meta) || document.getElementById('comments');
    window.setTimeout(function () {
      if (comments) {
        try {
          comments.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (ignore) {
          location.hash = 'comments';
        }
      }
    }, 60);
    return comments;
  }

  function killLegacyGatePopups() {
    Array.prototype.slice.call(document.querySelectorAll('.qcx-gate-overlay')).forEach(function (node) {
      try { node.remove(); } catch (ignore) {}
    });
    document.body.style.overflow = '';
  }

  function removeLegacyDownloadCards() {
    Array.prototype.slice.call(document.querySelectorAll('.qcx-top-download, .qcx-download-anchor')).forEach(function (node) {
      try {
        if (node.parentNode) node.parentNode.removeChild(node);
      } catch (ignore) {}
    });
  }

  function wireLockPanel(panel) {
    if (!panel || panel.getAttribute('data-qcx-wired') === '1') return;
    panel.setAttribute('data-qcx-wired', '1');
    var cta = panel.querySelector('.qcx-lock-cta');
    if (!cta) return;
    cta.addEventListener('click', function (event) {
      event.preventDefault();
      killLegacyGatePopups();
      var meta = blogMeta();
      scrollToComments(meta);
      if (typeof window.__qcxStartFreeUnlock === 'function') {
        window.__qcxStartFreeUnlock();
      }
    });
  }



  function restoreProtectedLinks(driveUrl) {
    if (!driveUrl) return 0;
    var root =
      document.querySelector('.qcx-content-unlock.is-open, .qcx-content-unlock') ||
      document.querySelector('.post-body') ||
      document;
    var count = 0;
    Array.prototype.slice.call(root.querySelectorAll('.qcx-stripped-link')).forEach(function (span) {
      var a = createEl('a', 'qcx-restored-link');
      a.href = driveUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Mở liên kết tài nguyên';
      try {
        if (span.parentNode) span.parentNode.replaceChild(a, span);
        count += 1;
      } catch (ignore) {}
    });
    return count;
  }

  function hideInlineResourceLink() {
    Array.prototype.slice.call(document.querySelectorAll('.qcx-inline-resource-link')).forEach(function (link) {
      try {
        link.hidden = true;
        link.setAttribute('aria-hidden', 'true');
        link.style.setProperty('display', 'none', 'important');
        if (link.parentNode) link.parentNode.removeChild(link);
      } catch (ignore) {}
    });
  }

  function ensureInlineResourceLink(driveUrl) {
    /* Keep Drive links restored in content; do not show the green pill CTA. */
    if (driveUrl) restoreProtectedLinks(driveUrl);
    hideInlineResourceLink();
    return null;
  }

  function notifyContentUnlocked() {
    try {
      if (typeof window.__qcxEnsureReadTime === 'function') window.__qcxEnsureReadTime();
    } catch (ignoreRt) {}
    try {
      window.dispatchEvent(new CustomEvent('qcx:content-unlocked'));
    } catch (ignoreEv) {}
  }

  function revealLockedContent() {
    var unhidden = document.querySelector('[data-qcx-unhidden], .qcx-content-unlock');
    if (unhidden) {
      unhidden.hidden = false;
      unhidden.style.removeProperty('display');
      unhidden.classList.add('is-open');
    }
    var lock = document.querySelector('[data-qcx-lock], .qcx-content-lock');
    if (lock) {
      lock.hidden = true;
      lock.style.setProperty('display', 'none', 'important');
      lock.classList.add('is-closed');
    }
    var panel = document.querySelector('.qcx-lock-panel');
    if (panel) {
      panel.hidden = true;
      panel.style.setProperty('display', 'none', 'important');
      panel.classList.add('is-done');
    }
    var body = document.querySelector('.post-body');
    placeHeroUnderTitle(body);
    restoreUnlockCommentsChrome();
    removeLegacyDownloadCards();
    notifyContentUnlocked();
  }



  function setReadyLink(driveUrl) {
    revealLockedContent();
    ensureInlineResourceLink(driveUrl);
    removeLegacyDownloadCards();
  }

  function fetchDelivery(resourceId, freeToken) {
    var headers = {};
    if (freeToken) headers['X-Free-Token'] = freeToken;
    return api('/api/delivery?resourceId=' + encodeURIComponent(resourceId), {
      method: 'GET',
      headers: headers
    });
  }

  function buildInlineGate(meta) {
    killLegacyGatePopups();
    var existing = document.querySelector('.qcx-inline-gate');
    if (existing) existing.remove();
    var gate = createEl('div', 'qcx-inline-gate');
    gate.setAttribute('role', 'region');
    gate.setAttribute('aria-label', 'Mở khóa bằng bình luận');
    gate.setAttribute('data-qcx-secure-gate', '1');
    gate.setAttribute('data-qcx-gate-ver', 'comment4u-compact');
    gate.hidden = true;
    gate.innerHTML =
      '<div class="qcx-gate-dialog qcx-inline-gate-dialog qcx-gate-compact-wrap">' +
      '<div class="qcx-gate-compact">' +
      '<span class="qcx-gate-check-title">Bình luận mã</span>' +
      '<code class="qcx-gate-code">—</code>' +
      '<button type="button" class="qcx-gate-copy">Copy</button>' +
      '</div>' +
      '<div class="qcx-gate-status qcx-gate-status-silent" role="status" aria-live="polite"></div>' +
      '</div>';
    mountGateInComments(gate, meta || blogMeta());
    return gate;
  }

  function showInlineGate(gate, meta) {
    if (!gate) return;
    mountGateInComments(gate, meta || blogMeta());
    gate.hidden = false;
    gate.classList.add('is-open');
  }


  function applyDelivery(resourceId, freeToken, closeOverlayFn) {
    var ids = resourceIdCandidates(resourceId);
    var last = { status: 0, error: '', hard: false };
    var anyHard = false;
    function tryOne(index) {
      if (index >= ids.length) {
        return Promise.resolve({
          ok: false,
          error: last.error || 'Không lấy được tài nguyên.',
          status: last.status,
          hard: anyHard || last.hard,
          data: last.data || null
        });
      }
      return fetchDelivery(ids[index], freeToken).then(function (delivery) {
        if (!delivery.ok || !delivery.data || !delivery.data.ok) {
          var err = (delivery.data && delivery.data.error) || '';
          var status = delivery.status || 0;
          var hard = status === 401 || status === 403 || isHardAuthMessage(err);
          last = { status: status, error: err, hard: hard, data: delivery.data };
          if (hard) anyHard = true;
          return tryOne(index + 1);
        }
        var payload = delivery.data.data || {};
        try {
          setReadyLink(payload.driveUrl);
          if (payload.notesHtml) {
            var host = document.querySelector('[data-qcx-unhidden], .qcx-content-unlock, .post-body');
            if (host && !host.querySelector('.qcx-delivery-notes')) {
              var notes = createEl('div', 'qcx-delivery-notes');
              notes.innerHTML = payload.notesHtml;
              host.appendChild(notes);
            }
          }
        } catch (err) {
          revealLockedContent();
          if (payload.driveUrl) ensureInlineResourceLink(payload.driveUrl);
        }
        if (closeOverlayFn) closeOverlayFn();
        /* Pin winning Worker resourceId so later F5 matches token binding. */
        try {
          var meta = readFreeTokenMatch(resourceId) || readFreeTokenMatch(ids[index]);
          saveFreeToken(ids[index], freeToken, (meta && meta.expiresAt) || defaultTokenExpiry());
        } catch (ignorePin) {}
        return { ok: true, resourceId: ids[index] };
      }).catch(function () {
        return tryOne(index + 1);
      });
    }
    return tryOne(0);
  }

  /* Deduped delivery check for cached freeToken — soft fail retries once, never clears here. */
  function validateCachedDelivery(resourceId, freeToken, closeOverlayFn) {
    var key = String(resourceId || '') + '|' + String(freeToken || '');
    if (window.__qcxDeliveryInflight && window.__qcxDeliveryKey === key) {
      return window.__qcxDeliveryInflight;
    }
    window.__qcxDeliveryKey = key;
    function attempt(isRetry) {
      return applyDelivery(resourceId, freeToken, closeOverlayFn).then(function (out) {
        if (out && out.ok) return out;
        if (!isHardTokenFailure(out) && !isRetry) {
          return new Promise(function (resolve) {
            window.setTimeout(function () {
              resolve(attempt(true));
            }, 4000);
          });
        }
        return out;
      });
    }
    window.__qcxDeliveryInflight = attempt(false).then(function (out) {
      if (window.__qcxDeliveryKey === key) {
        window.__qcxDeliveryInflight = null;
        window.__qcxDeliveryKey = '';
      }
      return out;
    }, function (err) {
      if (window.__qcxDeliveryKey === key) {
        window.__qcxDeliveryInflight = null;
        window.__qcxDeliveryKey = '';
      }
      return { ok: false, hard: false, error: String(err || 'network') };
    });
    return window.__qcxDeliveryInflight;
  }

  function revokeUnlockAfterHardFailure(config) {
    if (!config) return;
    clearFreeToken(config.resourceId);
    try { document.documentElement.removeAttribute('data-qcx-unlocked'); } catch (ignoreAttr) {}
    var unlockShell = document.querySelector('.qcx-content-unlock');
    if (unlockShell) {
      unlockShell.classList.remove('is-open');
      unlockShell.style.setProperty('display', 'none');
    }
    ensureLockPanel(config);
  }

  function cleanGateParams() {
    try {
      var url = new URL(location.href);
      if (!url.searchParams.has('qcx_free') && !url.searchParams.has('qcx_rid')) return;
      url.searchParams.delete('qcx_free');
      url.searchParams.delete('qcx_rid');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch (ignore) {}
  }

  function wireFree(config, meta) {
    killLegacyGatePopups();
    removeLegacyDownloadCards();
    var gate = null;
    var status = null;
    var codeEl = null;
    var copyBtn = null;
    var state = {
      nonce: '',
      commentCode: '',
      pollTimer: 0,
      listPollTimer: 0,
      listFastUntil: 0,
      lastCommentIds: '',
      commentOk: false,
      starting: false,
      listRefreshing: false,
      unlocked: false,
      sawCode: false,
      pollBackoffMs: 0,
      pollInflight: false,
      pollPausedUntil: 0
    };

    function bindGateRefs(nextGate) {
      gate = nextGate;
      if (!gate) {
        status = codeEl = copyBtn = null;
        return;
      }
      status = gate.querySelector('.qcx-gate-status');
      codeEl = gate.querySelector('.qcx-gate-code');
      copyBtn = gate.querySelector('.qcx-gate-copy');
    }

    function ensureGate() {
      if (state.unlocked || state.commentOk) return null;
      if (gate && document.body.contains(gate)) {
        mountGateInComments(gate, liveMeta());
        return gate;
      }
      bindGateRefs(buildInlineGate(liveMeta()));
      if (gate) {
        gate.removeAttribute('data-qcx-bound');
        bindGateControls();
        if (state.commentCode) applyCode(state.commentCode);
      }
      return gate;
    }

    /* Silent only for plain waiting; show ok / sawCode / 429 so unlock progress is visible. */
    function setStatus(text, kind) {
      if (!status) return;
      status.textContent = text || '';
      var msg = String(text || '');
      var forceVisible = kind === 'ok' || kind === 'err' ||
        /Đã thấy mã|Quá tải|đang mở khoá|đang mở khóa|xác minh/i.test(msg);
      var silent = kind !== 'err' && !forceVisible;
      status.className = 'qcx-gate-status' +
        (silent ? ' qcx-gate-status-silent' : '') +
        (kind === 'ok' ? ' is-ok' : kind === 'err' ? ' is-err' : kind === 'busy' ? ' is-busy' : '');
    }


    function applyCode(code) {
      if (!code) return;
      state.commentCode = code;
      if (codeEl) codeEl.textContent = code;
      if (copyBtn) copyBtn.hidden = false;
      if (state.nonce) {
        saveUnlockSession(config.resourceId, {
          nonce: state.nonce,
          commentCode: state.commentCode,
          startedAt: state.sessionStartedAt || Date.now()
        });
      }
    }

    function markUnlockedAndDismiss() {
      state.unlocked = true;
      state.commentOk = true;
      stopCommentPoll();
      stopListPoll();
      clearUnlockSession(config.resourceId);
      gate = dismissUnlockUi();
      bindGateRefs(null);
      cleanGateParams();
    }

    function stopCommentPoll() {
      window.clearTimeout(state.pollTimer);
      window.clearInterval(state.pollTimer);
      state.pollTimer = 0;
      state.pollPausedUntil = 0;
      state.pollBackoffMs = 0;
    }

    function scheduleCommentPoll(delayMs) {
      window.clearTimeout(state.pollTimer);
      window.clearInterval(state.pollTimer);
      var wait = Math.max(0, Number(delayMs) || 0);
      state.pollTimer = window.setTimeout(function () {
        state.pollTimer = 0;
        pollComment(true);
      }, wait);
    }

    function stopListPoll() {
      window.clearTimeout(state.listPollTimer);
      state.listPollTimer = 0;
    }

    function softResetCommentFrame() {
      var box = document.getElementById('comments');
      if (!box) return;
      var frame = box.querySelector('iframe.qcx-blogger-comment-frame');
      if (!frame || !frame.src) return;
      try {
        frame.setAttribute('data-qcx-frame-resetting', '1');
        frame.setAttribute('data-qcx-frame-loads', '0');
        var src = frame.src;
        frame.src = src;
      } catch (ignore) {}
    }

    function refreshCommentList(opts) {
      opts = opts || {};
      var box = ensureCommentsMount(liveMeta());
      var listEl = ensureCommentListHost(box);
      if (!listEl || state.listRefreshing) return Promise.resolve(null);
      state.listRefreshing = true;
      if (opts.busy !== false) {
        var stateEl = listEl.querySelector('.qcx-comment-list-state');
        if (stateEl && !stateEl.textContent) stateEl.textContent = 'Đang tải…';
      }
      return fetchCommentFeed(liveMeta()).then(function (result) {
        state.listRefreshing = false;
        if (!result.ok) {
          renderCommentList(listEl, [], 'Không tải được feed');
          return result;
        }
        var idList = result.comments.map(function (c) { return c.id; });
        var ids = idList.join('|');
        var prevIds = state.lastCommentIds ? state.lastCommentIds.split('|') : [];
        var first = !state.lastCommentIds;
        var grew = !first && idList.some(function (id) {
          return id && prevIds.indexOf(id) === -1;
        });
        state.lastCommentIds = ids;
        renderCommentList(
          listEl,
          result.comments,
          result.comments.length ? (result.comments.length + ' bình luận') : 'Chưa có'
        );
        if (grew && !first) {
          listEl.classList.remove('is-flash');
          void listEl.offsetWidth;
          listEl.classList.add('is-flash');
          /* Avoid iframe thrash while waiting for unlock — sandbox load handler resets composer. */
          if (opts.resetFrame === true) softResetCommentFrame();
          /* New public comment → immediately ask Worker to unlock. */
          if (state.nonce && !state.commentOk) pollComment(true);
        }
        var sawCode = !!(state.commentCode && result.comments.some(function (c) {
          return (c.text || '').indexOf(state.commentCode) !== -1;
        }));
        state.sawCode = sawCode;
        listEl.classList.toggle('has-code', sawCode);
        if (sawCode && state.nonce && !state.commentOk) {
          setStatus('Đã thấy mã — đang mở khoá…', 'ok');
          /* Priority check — skip if mid-backoff unless pause already elapsed. */
          if (Date.now() >= (state.pollPausedUntil || 0)) pollComment(true);
          state.listFastUntil = Date.now() + 30 * 1000;
        }
        return result;
      }).catch(function () {
        state.listRefreshing = false;
        renderCommentList(listEl, [], 'Lỗi mạng');
        return null;
      });
    }

    function startListPoll(fast) {
      stopListPoll();
      if (fast) state.listFastUntil = Date.now() + 60 * 1000;
      function tick() {
        refreshCommentList({ busy: false });
        var interval = Date.now() < state.listFastUntil ? 2000 : 3000;
        stopListPoll();
        state.listPollTimer = window.setTimeout(tick, interval);
      }
      refreshCommentList({ busy: true });
      state.listPollTimer = window.setTimeout(tick, fast ? 2000 : 3000);
      window.setTimeout(stopListPoll, 10 * 60 * 1000);
    }

    function finishWithToken(freeToken, expiresAt, opts) {
      opts = opts || {};
      var freshMint = opts.freshMint === true;
      saveFreeToken(config.resourceId, freeToken, expiresAt);
      clearUnlockSession(config.resourceId);
      state.commentOk = true;
      stopListPoll();
      setStatus('Đã xác minh — đang mở tài nguyên…', 'ok');
      /* Hide unlock chrome immediately, then open content. */
      markUnlockedAndDismiss();
      markPageUnlocked();
      revealLockedContent();
      return validateCachedDelivery(config.resourceId, freeToken, function () {
        cleanGateParams();
      }).then(function (out) {
        if (out && out.ok) {
          if (out.resourceId) pinConfigResourceId(config, out.resourceId);
          state.unlocked = true;
          restoreUnlockCommentsChrome();
          return true;
        }
        /* Fresh comment mint: keep unlock unless Worker clearly rejected the token. */
        var hard = freshMint ? isFreshMintHardFailure(out) : isHardTokenFailure(out);
        if (!hard) {
          markPageUnlocked();
          revealLockedContent();
          setStatus('Đã mở khóa — đang tải tài nguyên…', 'busy');
          window.setTimeout(function () {
            validateCachedDelivery(config.resourceId, freeToken, cleanGateParams).then(function (retryOut) {
              if (retryOut && retryOut.ok) {
                if (retryOut.resourceId) pinConfigResourceId(config, retryOut.resourceId);
                restoreUnlockCommentsChrome();
              }
            });
          }, 2500);
          return false;
        }
        state.unlocked = false;
        state.commentOk = false;
        revokeUnlockAfterHardFailure(config);
        ensureGate();
        showInlineGate(gate, liveMeta());
        setStatus(out.error || 'Không mở được tài nguyên.', 'err');
        ensureChallengeThen(function () {
          armCommentWatch('Đang chờ mã mới…');
        });
        return false;
      });
    }

    function pollComment(auto) {
      if (!state.nonce || state.commentOk || state.unlocked) return;
      if (state.pollInflight) return;
      if (auto && Date.now() < (state.pollPausedUntil || 0)) {
        scheduleCommentPoll(state.pollPausedUntil - Date.now());
        return;
      }
      state.pollInflight = true;
      api('/api/free/check-comment', {
        method: 'POST',
        body: JSON.stringify({
          resourceId: config.resourceId,
          nonce: state.nonce
        })
      }).then(function (result) {
        state.pollInflight = false;
        if (!result.ok || !result.data || !result.data.ok) {
          if (result.status === 429) {
            state.pollBackoffMs = Math.min(30000, Math.max(5000, (state.pollBackoffMs || 2500) * 2));
            state.pollPausedUntil = Date.now() + state.pollBackoffMs;
            setStatus(
              state.sawCode
                ? 'Đã thấy mã — quá tải, thử lại sau ' + Math.round(state.pollBackoffMs / 1000) + 's…'
                : 'Quá tải — thử lại sau vài giây…',
              'err'
            );
            if (auto) scheduleCommentPoll(state.pollBackoffMs);
            return;
          }
          if (!auto) setStatus((result.data && result.data.error) || 'Không kiểm tra được.', 'err');
          else setStatus(state.sawCode ? 'Đã thấy mã — đang mở khoá…' : 'Đang chờ…', state.sawCode ? 'ok' : 'busy');
          if (auto) scheduleCommentPoll(5000);
          return;
        }
        state.pollBackoffMs = 0;
        state.pollPausedUntil = 0;
        var data = result.data.data || {};
        if (data.steps && data.steps.commentCode) applyCode(data.steps.commentCode);
        if (data.freeToken) {
          stopCommentPoll();
          if (data.resourceId) pinConfigResourceId(config, data.resourceId);
          finishWithToken(data.freeToken, data.expiresAt, { freshMint: true });
          return;
        }
        if (data.found) {
          state.sawCode = true;
          setStatus(data.message || 'Đã thấy bình luận. Đang hoàn tất…', 'ok');
          refreshCommentList({ busy: false });
        } else if (state.sawCode) {
          setStatus('Đã thấy mã — đang mở khoá…', 'ok');
        } else {
          setStatus('Đang chờ…', 'busy');
        }
        if (auto) scheduleCommentPoll(5000);
      }).catch(function () {
        state.pollInflight = false;
        if (!auto) setStatus('Lỗi mạng khi kiểm tra bình luận.', 'err');
        else setStatus(state.sawCode ? 'Đã thấy mã — đang mở khoá…' : 'Đang chờ…', state.sawCode ? 'ok' : 'busy');
        if (auto) scheduleCommentPoll(5000);
      });
    }

    function startCommentPoll() {
      stopCommentPoll();
      state.pollBackoffMs = 0;
      state.pollPausedUntil = 0;
      /* First tick soon, then self-schedule every 5s (or longer on 429 backoff). */
      scheduleCommentPoll(500);
      window.setTimeout(stopCommentPoll, 10 * 60 * 1000);
    }

    function armCommentWatch(message) {
      if (!state.nonce || state.unlocked) return;
      ensureGate();
      setStatus(message || 'Đang chờ…', 'busy');
      ensureCommentsMount(liveMeta());
      startCommentPoll();
      startListPoll(true);
      pollComment(true);
    }

    function onTabResume() {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      if (state.unlocked || state.commentOk) return;
      if (!state.nonce) return;
      refreshCommentList({ busy: false });
      pollComment(true);
      startListPoll(true);
    }

    document.addEventListener('visibilitychange', onTabResume);
    window.addEventListener('focus', onTabResume);

    function liveMeta() {
      var fresh = blogMeta() || {};
      meta.blogId = fresh.blogId || meta.blogId || '';
      meta.postId = fresh.postId || meta.postId || '';
      meta.postUrl = fresh.postUrl || meta.postUrl || location.href.split('#')[0];
      return meta;
    }

    function ensureChallengeThen(next) {
      var ids = liveMeta();
      if (!ids.blogId || !ids.postId) {
        setStatus('Thiếu blogId/postId trên trang — không tạo được phiên.', 'err');
        return;
      }
      if (state.nonce) {
        next();
        return;
      }
      if (state.starting) return;
      state.starting = true;
      setStatus('Đang tạo mã…', 'busy');
      api('/api/free/start', {
        method: 'POST',
        body: JSON.stringify({
          resourceId: config.resourceId,
          postUrl: ids.postUrl,
          blogId: ids.blogId,
          postId: ids.postId
        })
      }).then(function (result) {
        state.starting = false;
        if (!result.ok || !result.data || !result.data.ok) {
          setStatus((result.data && result.data.error) || 'Không tạo được phiên.', 'err');
          return;
        }
        var data = result.data.data || {};
        if (data.resourceId) pinConfigResourceId(config, data.resourceId);
        state.nonce = data.nonce;
        state.sessionStartedAt = Date.now();
        applyCode(data.commentCode || '');
        saveUnlockSession(config.resourceId, {
          nonce: state.nonce,
          commentCode: state.commentCode,
          startedAt: state.sessionStartedAt
        });
        setStatus('Đang chờ…', 'busy');
        next();
      }).catch(function () {
        state.starting = false;
        setStatus('Lỗi mạng. Thử lại.', 'err');
      });
    }

    function startFreeUnlock() {
      killLegacyGatePopups();
      liveMeta();
      if (state.unlocked) return;
      var existing = readFreeToken(config.resourceId);
      if (existing) {
        setStatus('Đang mở khoá…', 'busy');
        validateCachedDelivery(config.resourceId, existing, function () {
          cleanGateParams();
        }).then(function (out) {
          if (out && out.ok) {
            state.unlocked = true;
            state.commentOk = true;
            markUnlockedAndDismiss();
            revealLockedContent();
            restoreUnlockCommentsChrome();
            return;
          }
          if (!isHardTokenFailure(out)) {
            setStatus('Đang mở lại tài nguyên…', 'busy');
            return;
          }
          state.unlocked = false;
          state.commentOk = false;
          revokeUnlockAfterHardFailure(config);
          ensureGate();
          showInlineGate(gate, liveMeta());
          scrollToComments(liveMeta());
          setStatus(out.error || 'Token cũ hết hạn — bình luận mã mới.', 'err');
          ensureChallengeThen(function () {
            armCommentWatch('Đang chờ…');
          });
        });
        return;
      }
      ensureGate();
      showInlineGate(gate, liveMeta());
      scrollToComments(liveMeta());
      startListPoll(true);
      ensureChallengeThen(function () {
        if (state.commentCode && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(state.commentCode).catch(function () {});
        }
        armCommentWatch('Đang chờ…');
      });
    }

    window.__qcxStartFreeUnlock = startFreeUnlock;
    window.__qcxOnHardRevoke = function () {
      state.unlocked = false;
      state.commentOk = false;
      state.nonce = '';
      state.commentCode = '';
      stopCommentPoll();
      stopListPoll();
      bindGateRefs(null);
    };
    window.__qcxSecureRefreshComments = function (opts) {
      refreshCommentList(opts || { busy: false, resetFrame: false });
      if (state.nonce && !state.commentOk && !state.unlocked) pollComment(true);
    };

    function resumeUnlockSession() {
      if (state.unlocked || state.commentOk || state.nonce) return false;
      if (readFreeToken(config.resourceId)) return false;
      var session = readUnlockSession(config.resourceId);
      if (!session || !session.nonce) return false;
      state.nonce = session.nonce;
      state.sessionStartedAt = session.startedAt || Date.now();
      ensureGate();
      showInlineGate(gate, liveMeta());
      applyCode(session.commentCode || '');
      armCommentWatch('Đang chờ…');
      return true;
    }

    function bindGateControls() {
      if (!gate || gate.getAttribute('data-qcx-bound') === '1') return;
      gate.setAttribute('data-qcx-bound', '1');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var code = state.commentCode || (codeEl && codeEl.textContent) || '';
          if (!code || code === '—') return;
          var done = function () {
            copyBtn.textContent = 'Đã copy';
            window.setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1400);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(done).catch(function () {
              copyBtn.textContent = 'Lỗi';
              window.setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1400);
            });
          } else {
            copyBtn.textContent = 'Chọn tay';
            window.setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1400);
          }
        });
      }
    }

    cleanGateParams();
    /* Boot: stay locked until delivery validates cached freeToken (no optimistic flash). */
    var cached = readFreeToken(config.resourceId);
    if (cached) {
      validateCachedDelivery(config.resourceId, cached, function () {
        markUnlockedAndDismiss();
      }).then(function (out) {
        if (out && out.ok) {
          state.unlocked = true;
          state.commentOk = true;
          markPageUnlocked();
          revealLockedContent();
          restoreUnlockCommentsChrome();
          return;
        }
        if (!isHardTokenFailure(out)) {
          /* Soft/network: retry once already done inside validate — stay locked, retry later via Mở khoá. */
          return;
        }
        state.unlocked = false;
        state.commentOk = false;
        revokeUnlockAfterHardFailure(config);
        /* Remembered token was truly revoked — wait for user to click Mở khoá. */
      });
    } else {
      resumeUnlockSession();
    }
  }

  function wirePaid(config) {
    var state = { orderId: '', accessToken: '', pollTimer: 0 };
    removeLegacyDownloadCards();

    function tryDelivery() {
      return fetchDelivery(config.resourceId, '').then(function (delivery) {
        if (delivery.ok && delivery.data && delivery.data.ok) {
          setReadyLink(delivery.data.data.driveUrl);
          return true;
        }
        return false;
      });
    }

    function activate() {
      return api('/api/access/activate', {
        method: 'POST',
        body: JSON.stringify({ orderId: state.orderId, accessToken: state.accessToken })
      }).then(function (result) {
        if (result.ok && result.data && result.data.ok) return tryDelivery();
        return false;
      });
    }

    function pollPaid() {
      window.clearInterval(state.pollTimer);
      state.pollTimer = window.setInterval(function () {
        activate().then(function (opened) {
          if (opened) window.clearInterval(state.pollTimer);
        });
      }, 4000);
      window.setTimeout(function () { window.clearInterval(state.pollTimer); }, 15 * 60 * 1000);
    }

    function startPaidCheckout(event) {
      if (event) event.preventDefault();
      var busyTarget = document.querySelector('.qcx-lock-cta');
      if (busyTarget) busyTarget.classList.add('is-busy');
      api('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Blog reader',
          customerEmail: 'pass+' + Date.now() + '@timkiem.app',
          customerContact: 'blog-pass'
        })
      }).then(function (result) {
        if (busyTarget) busyTarget.classList.remove('is-busy');
        if (!result.ok || !result.data || !result.data.ok) {
          window.alert((result.data && result.data.error) || 'Không tạo được thanh toán.');
          return;
        }
        state.orderId = result.data.data.orderId;
        state.accessToken = result.data.data.accessToken;
        var payUrl = result.data.data.checkoutUrl;
        if (payUrl) window.open(payUrl, '_blank', 'noopener');
        pollPaid();
      }).catch(function () {
        if (busyTarget) busyTarget.classList.remove('is-busy');
        window.alert('Lỗi mạng khi tạo thanh toán.');
      });
    }

    var lockCta = document.querySelector('.qcx-lock-panel.is-paid .qcx-lock-cta');
    if (lockCta && lockCta.getAttribute('data-qcx-paid-wired') !== '1') {
      lockCta.setAttribute('data-qcx-paid-wired', '1');
      lockCta.addEventListener('click', startPaidCheckout);
    }

    api('/api/access/check', { method: 'GET' }).then(function (result) {
      if (result.ok && result.data && result.data.data && result.data.data.active) {
        tryDelivery();
      }
    });
  }

  function boot() {
    /* Admin must never enter the comment/paywall gate — it hid #qcx-admin-root (height 0 / “trắng”). */
    if (isAdminPage()) {
      bypassAdminLock();
      window.__qcxSecureResourceBooted = true;
      window.__qcxSecureRefresh = function () { bypassAdminLock(); };
      return;
    }
    if (!isPostPage()) return;
    killLegacyGatePopups();
    var article = document.querySelector('.the-article, article.post-item, .blog-posts');
    var body = document.querySelector('.post-body, .the-article');
    stripSecrets(body || document);
    var marker = readMarker() || {};
    var labels = collectLabels();
    var mode = detectMode(marker, labels);
    var slug = pageSlug();
    function scheduleBootRetry() {
      /* Marker/labels may arrive after paintRescue — keep watching (feed can take >3s). */
      if (!window.__qcxSecureBootTries) window.__qcxSecureBootTries = 0;
      if (window.__qcxSecureBootTries < 40) {
        window.__qcxSecureBootTries += 1;
        window.setTimeout(boot, 250);
      } else if (!window.__qcxSecureBootMo) {
        var bootMain = document.querySelector('#main') || document.body;
        if (bootMain) {
          window.__qcxSecureBootMo = new MutationObserver(function () {
            if (window.__qcxSecureResourceBooted) {
              try { window.__qcxSecureBootMo.disconnect(); } catch (ignore) {}
              return;
            }
            if (document.getElementById('qcx-resource') || document.querySelector('.post-body .qcx-content-unlock')) {
              boot();
            }
          });
          window.__qcxSecureBootMo.observe(bootMain, { childList: true, subtree: true });
        }
      }
    }
    if (!mode) {
      scheduleBootRetry();
      return;
    }
    /* Path/label can say free before rescue injects the marker. Wait for
     * data-resource-id so free/start hits the vault id, not the permalink slug. */
    if (
      mode === 'free' &&
      !(marker && marker.resourceId) &&
      !readFreeTokenMatch(slug) &&
      (!window.__qcxSecureBootTries || window.__qcxSecureBootTries < 40)
    ) {
      scheduleBootRetry();
      return;
    }
    if (window.__qcxSecureBootMo) {
      try { window.__qcxSecureBootMo.disconnect(); } catch (ignoreDisc) {}
      window.__qcxSecureBootMo = null;
    }
    if (window.__qcxSecureResourceBooted) return;
    window.__qcxSecureResourceBooted = true;
    /* Prefer marker resourceId (vault id). Only keep slug when a cached freeToken
     * already exists under the permalink slug (marker id may differ). */
    var matched =
      readFreeTokenMatch((marker && marker.resourceId) || '') ||
      readFreeTokenMatch(slug);
    var resourceId = String(
      (matched && matched.resourceId) ||
      (marker && marker.resourceId) ||
      slug ||
      ''
    ).toLowerCase();
    if (!resourceId) {
      console.warn('[qcx] Missing resourceId/slug — secure gate skipped.');
      window.__qcxSecureResourceBooted = false;
      return;
    }
    var config = {
      mode: mode,
      resourceId: resourceId
    };
    removeLegacyDownloadCards();
    prepareLockShell(config);
    ensureLockPanel(config);
    var meta = blogMeta();
    if (mode === 'free') wireFree(config, meta);
    else wirePaid(config);

    /* Rescue re-paints .post-body async — re-attach lock panel after feed render.
     * force=true bypasses debounce when panel was wiped by a second paintRescue. */
    window.__qcxSecureRefresh = function (force) {
      if (isAdminPage()) {
        bypassAdminLock();
        return;
      }
      var now = Date.now();
      var unlocked = document.documentElement.getAttribute('data-qcx-unlocked') === '1';
      var hasPanel = !!document.querySelector('.qcx-lock-panel');
      var hasBody = !!document.querySelector('.post-body');
      /* Missing panel after rescue repaint must never be swallowed by the 2s debounce. */
      var mustForce = force === true || (hasBody && !hasPanel && !unlocked && !readFreeToken(config.resourceId));
      if (!mustForce && window.__qcxSecureRefreshAt && now - window.__qcxSecureRefreshAt < 2000) return;
      window.__qcxSecureRefreshAt = now;
      stripSecrets(document.querySelector('.post-body'));
      removeLegacyDownloadCards();
      prepareLockShell(config);
      ensureLockPanel(config);
      if (config.mode === 'free') {
        var token = readFreeToken(config.resourceId);
        if (token && !unlocked) {
          validateCachedDelivery(config.resourceId, token, null).then(function (out) {
            if (out && out.ok) {
              if (out.resourceId) pinConfigResourceId(config, out.resourceId);
              markPageUnlocked();
              revealLockedContent();
              restoreUnlockCommentsChrome();
              return;
            }
            if (!isHardTokenFailure(out)) {
              /* Soft fail — stay locked; user can retry via Mở khoá. */
              return;
            }
            revokeUnlockAfterHardFailure(config);
            if (typeof window.__qcxOnHardRevoke === 'function') window.__qcxOnHardRevoke();
            /* Do not auto-open comment gate — user clicks Mở khoá for a new code. */
          });
          return;
        }
      }
      removeLegacyDownloadCards();
    };
    var main = document.querySelector('#main');
    if (main && !window.__qcxSecureMo) {
      var moTimer = 0;
      window.__qcxSecureMo = new MutationObserver(function () {
        if (
          document.querySelector('.qcx-lock-panel') ||
          !document.querySelector('.post-body') ||
          document.documentElement.getAttribute('data-qcx-unlocked') === '1' ||
          readFreeToken(config.resourceId)
        ) {
          return;
        }
        window.clearTimeout(moTimer);
        moTimer = window.setTimeout(function () {
          /* force: rescue often repaints within the old 2s debounce window */
          if (window.__qcxSecureRefresh) window.__qcxSecureRefresh(true);
        }, 120);
      });
      window.__qcxSecureMo.observe(main, { childList: true, subtree: true });
    }
    window.setTimeout(function () { window.__qcxSecureRefresh(true); }, 800);
  }

  /* Expose boot so layout-rescue can re-enter after late feed paint. */
  window.__qcxSecureBoot = boot;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  window.addEventListener('load', function () {
    stripSecrets(document.querySelector('.post-body'));
    if (window.__qcxSecureRefresh) window.__qcxSecureRefresh(true);
    else boot();
  }, { once: true });
})();
