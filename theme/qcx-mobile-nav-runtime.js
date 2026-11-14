(function() {
  'use strict';

  /* ==========================================================
     0. ULTRA-CRISP 4K RETINA IMAGE & RESPONSIVE COMPACT FIX
     ========================================================== */
  function injectStyles() {
    var styleId = 'qcx-sharp-and-responsive-styles';
    var s = document.getElementById(styleId);
    if (!s) {
      s = document.createElement('style');
      s.id = styleId;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = [
      '/* 4K Crisp edges for graphics and text */',
      '.mac-frame-content img, .post-body img, .item-thumbnail img, .entry-thumbnail img {',
      '  image-rendering: -webkit-optimize-contrast !important;',
      '  image-rendering: crisp-edges !important;',
      '  -ms-interpolation-mode: nearest-neighbor !important;',
      '  transform: translateZ(0) !important;',
      '  backface-visibility: hidden !important;',
      '}',
      '',
      '/* Remove empty/excessive gaps above Tutorial rail and below article */',
      '#comments, .comments, .qcx-comments-shell {',
      '  margin-top: 0 !important;',
      '  margin-bottom: 0 !important;',
      '  padding-bottom: 0 !important;',
      '}',
      '#comments:empty, .comments:empty, .commentForm.spinner {',
      '  display: none !important;',
      '}',
      '.the-article, #the-article {',
      '  margin-bottom: 12px !important;',
      '  padding-bottom: 12px !important;',
      '}',
      '#sidebar, .sidebar {',
      '  margin-top: 14px !important;',
      '  padding-top: 0 !important;',
      '}',
      '#HTML4, .qcx-sidebar-rail {',
      '  margin-top: 0 !important;',
      '  padding-top: 0 !important;',
      '}',
      '/* Never hide tutorial list due to aria-busy */',
      '#sidebar .qcx-sidebar-rail .qcx-latest-list,',
      '#sidebar .qcx-sidebar-rail .qcx-latest-list[aria-busy="true"],',
      '#PopularPosts1 .qcx-latest-list[aria-busy="true"] {',
      '  visibility: visible !important;',
      '  min-height: 48px !important;',
      '  opacity: 1 !important;',
      '}',
      '',
      '/* Responsive Fix when window is shrunk or on Mobile/Tablet (<= 860px) */',
      '@media (max-width: 860px) {',
      '  main.main-container {',
      '    width: 100% !important;',
      '    max-width: 100% !important;',
      '    padding-left: 16px !important;',
      '    padding-right: 16px !important;',
      '    box-sizing: border-box !important;',
      '  }',
      '  .main-wrapper,',
      '  [data-page-type="post"] .main-wrapper,',
      '  [data-page-type="page"] .main-wrapper {',
      '    display: flex !important;',
      '    flex-direction: column !important;',
      '    width: 100% !important;',
      '    max-width: 100% !important;',
      '    margin: 0 auto !important;',
      '    padding: 0 !important;',
      '    gap: 16px !important;',
      '    box-sizing: border-box !important;',
      '  }',
      '  .main-wrapper > .main,',
      '  .main-wrapper > #main,',
      '  .the-article,',
      '  #the-article,',
      '  .post-item,',
      '  .post-body {',
      '    width: 100% !important;',
      '    max-width: 100% !important;',
      '    min-width: 0 !important;',
      '    margin: 0 !important;',
      '    padding: 0 !important;',
      '    float: none !important;',
      '    box-sizing: border-box !important;',
      '  }',
      '  .post-body .mac-frame,',
      '  .post-body .mac-frame-image {',
      '    width: 100% !important;',
      '    max-width: 100% !important;',
      '    margin: 14px 0 !important;',
      '    box-sizing: border-box !important;',
      '    --qcx-stage-w: 100% !important;',
      '  }',
      '  .post-body .mac-frame-image .mac-frame-content {',
      '    width: 100% !important;',
      '    height: auto !important;',
      '    max-height: none !important;',
      '    aspect-ratio: 16 / 9 !important;',
      '    display: block !important;',
      '  }',
      '  .post-body .mac-frame-image .mac-frame-content img {',
      '    width: 100% !important;',
      '    max-width: 100% !important;',
      '    height: auto !important;',
      '    display: block !important;',
      '    object-fit: cover !important;',
      '  }',
      '  .main-wrapper > #sidebar,',
      '  .main-wrapper > .sidebar {',
      '    width: 100% !important;',
      '    max-width: 100% !important;',
      '    margin: 12px 0 32px !important;',
      '    padding: 0 !important;',
      '    order: 2 !important;',
      '    display: block !important;',
      '  }',
      '  .qcx-sidebar-rail {',
      '    width: 100% !important;',
      '    max-width: 100% !important;',
      '  }',
      '  .qcx-sidebar-rail .qcx-latest-list {',
      '    width: 100% !important;',
      '    display: flex !important;',
      '    flex-direction: column !important;',
      '    gap: 10px !important;',
      '  }',
      '}'
    ].join('\n');
  }

  function fixResponsiveArticleWidth() {
    if (window.innerWidth <= 860) {
      var frames = document.querySelectorAll('.mac-frame-image, .mac-frame');
      Array.prototype.forEach.call(frames, function(f) {
        f.style.setProperty('--qcx-stage-w', '100%', 'important');
        f.style.setProperty('width', '100%', 'important');
        f.style.setProperty('max-width', '100%', 'important');
      });
      var articles = document.querySelectorAll('.the-article, #the-article, .main, #main');
      Array.prototype.forEach.call(articles, function(el) {
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('max-width', '100%', 'important');
      });
    }
  }

  /* ==========================================================
     1. ROBUST TUTORIAL SIDEBAR RAIL BUILDER & THUMBNAIL ENHANCER
     ========================================================== */
  var TUTORIAL_ITEMS = [
    { title: 'HeyGen Voice Turbo — Miễn Phí Tạo Giọng Nói AI Qua API Đến Hết 30/11', href: '/2026/11/heygen-voice-turbo-free.html', img: 'https://files.catbox.moe/p3pkgf.jpg' },
    { title: 'Exa.ai — Tổng Hợp 4 Mã Promo Code Nhận Hơn $140 API Credits', href: '/2026/11/exa-ai-free-credits.html', img: 'https://files.catbox.moe/s9tmbq.jpg' },
    { title: 'Google Cloud — Nhận $300 Free Credits Dùng Gemini API, Cloud Hosting & GPU', href: '/2026/11/google-cloud-300-credits.html', img: 'https://files.catbox.moe/dgekql.jpg' },
    { title: 'Canva Business — Hướng Dẫn Đổi Mã Nhận 3 Tháng Miễn Phí (Trị Giá S$75)', href: '/2026/11/blog-post_492.html', img: 'https://files.catbox.moe/sjwu1v.jpg' },
    { title: 'ChatGPT Plus — Cách Nhận 1 Tháng Dùng Thử Miễn Phí Chính Thức (100% Off)', href: '/2026/11/chatgpt-plus-1month-trial.html', img: 'https://files.catbox.moe/nnrrww.jpg' },
    { title: 'CapCut Pro — Hướng Dẫn Kích Hoạt Gói Trải Nghiệm 7 Ngày Tính Năng Nâng Cao', href: '/2026/11/capcut-pro-trial.html', img: 'https://files.catbox.moe/2iq9f2.jpg' }
  ];

  function renderTutorialList(railList) {
    if (!railList) return;
    railList.removeAttribute('aria-busy');
    railList.style.setProperty('visibility', 'visible', 'important');
    railList.style.setProperty('opacity', '1', 'important');

    var currentPath = location.pathname.toLowerCase().replace(/\/$/, '');
    var items = TUTORIAL_ITEMS.filter(function(it) {
      var p = it.href.toLowerCase().replace(/\/$/, '');
      return p !== currentPath;
    }).slice(0, 5);

    railList.innerHTML = '';
    items.forEach(function(item) {
      var li = document.createElement('li');
      li.style.cssText = 'display:grid!important;grid-template-columns:72px minmax(0,1fr)!important;gap:12px!important;align-items:center!important;padding:8px 0!important;border-bottom:1px solid rgba(255,255,255,0.06)!important;';

      var thumb = document.createElement('div');
      thumb.className = 'item-thumbnail';
      thumb.style.cssText = 'width:72px!important;height:48px!important;border-radius:6px!important;overflow:hidden!important;background:#111;flex-shrink:0!important;display:block!important;';

      var aThumb = document.createElement('a');
      aThumb.href = item.href;
      aThumb.title = item.title;
      aThumb.style.cssText = 'display:block!important;width:100%!important;height:100%!important;';

      var img = document.createElement('img');
      img.src = item.img;
      img.alt = item.title;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.style.cssText = 'width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;image-rendering:-webkit-optimize-contrast!important;image-rendering:crisp-edges!important;';
      aThumb.appendChild(img);
      thumb.appendChild(aThumb);

      var titleWrap = document.createElement('div');
      titleWrap.className = 'item-title';
      titleWrap.style.cssText = 'font-size:13px!important;line-height:1.4!important;font-weight:600!important;min-width:0!important;';

      var aTitle = document.createElement('a');
      aTitle.href = item.href;
      aTitle.textContent = item.title;
      aTitle.title = item.title;
      aTitle.style.cssText = 'color:#d0ded5!important;text-decoration:none!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;word-break:break-word!important;';
      titleWrap.appendChild(aTitle);

      li.appendChild(thumb);
      li.appendChild(titleWrap);
      railList.appendChild(li);
    });
  }

  function ensureTutorialRail() {
    var rails = document.querySelectorAll('#HTML4 .qcx-latest-list, .qcx-sidebar-rail .qcx-latest-list, #PopularPosts1 .qcx-latest-list');
    if (!rails.length) {
      var sidebar = document.querySelector('#sidebar, .sidebar');
      if (sidebar) {
        var box = document.createElement('div');
        box.className = 'widget HTML qcx-sidebar-rail';
        box.id = 'qcx-sidebar-rail-runtime';
        box.innerHTML = '<div class="widget-content"><div class="qcx-related-heading" role="heading" aria-level="2">Tutorial</div><ul class="qcx-latest-list"></ul></div>';
        sidebar.appendChild(box);
        rails = [box.querySelector('.qcx-latest-list')];
      }
    }
    Array.prototype.forEach.call(rails, function(ul) {
      if (!ul) return;
      if (ul.children.length === 0 || ul.getAttribute('aria-busy') === 'true' || ul.querySelector('.qcx-static-page')) {
        renderTutorialList(ul);
      }
    });
  }

  function hookTutorialObserver() {
    ensureTutorialRail();
    var rail = document.querySelector('#sidebar, .qcx-sidebar-rail, #HTML4');
    if (rail) {
      var obs = new MutationObserver(function() {
        var ul = document.querySelector('#HTML4 .qcx-latest-list, .qcx-sidebar-rail .qcx-latest-list');
        if (ul && (ul.children.length === 0 || ul.getAttribute('aria-busy') === 'true')) {
          renderTutorialList(ul);
        }
      });
      obs.observe(rail, { childList: true, subtree: true });
    }
    [200, 600, 1500, 3000].forEach(function(ms) {
      setTimeout(ensureTutorialRail, ms);
    });
  }

  /* ==========================================================
     2. AAVE-STYLE CARD MENU (mint TIMKIEM icons, 40×40 sq)
     ========================================================== */
  var MENU_SQ =
    'M30 0H10C4.48 0 0 4.48 0 10V30C0 35.52 4.48 40 10 40H30C35.52 40 40 35.52 40 30V10C40 4.48 35.52 0 30 0Z';
  function menuIcon(bg, glyph) {
    return (
      '<svg class="qcx-menu-card-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">' +
      '<path d="' + MENU_SQ + '" fill="' + bg + '"/>' + glyph + '</svg>'
    );
  }
  var MENU_ICONS = (typeof window !== 'undefined' && window.QCX_MENU_ICONS) || {
    home: menuIcon('#1a2e24', '<path d="M20 9.2L10.5 17.2V30h6.2V22.5h6.6V30H29.5V17.2L20 9.2Z" fill="#28d28c"/>'),
    posts: menuIcon('#1a2e24', '<rect x="11" y="10" width="18" height="4" rx="1.5" fill="#28d28c"/><rect x="11" y="18" width="18" height="4" rx="1.5" fill="#7dffc4"/><rect x="11" y="26" width="12" height="4" rx="1.5" fill="#28d28c" opacity=".7"/>'),
    skill: menuIcon('#14261e', '<path d="M22.5 8L14 21.5h6.2L17.5 32 26 18.5h-6.2L22.5 8Z" fill="#28d28c"/>'),
    code: menuIcon('#1a2e24', '<path d="M15.5 13.5L10 20l5.5 6.5" stroke="#28d28c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M24.5 13.5L30 20l-5.5 6.5" stroke="#7dffc4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
    tools: menuIcon('#1a2e24', '<rect x="11" y="12" width="18" height="14" rx="2.5" stroke="#28d28c" stroke-width="2" fill="none"/><path d="M11 17h18" stroke="#28d28c" stroke-width="2"/><circle cx="14.5" cy="14.5" r="1.1" fill="#28d28c"/>'),
    search: menuIcon('#14261e', '<circle cx="18" cy="18" r="6.5" stroke="#28d28c" stroke-width="2.2" fill="none"/><path d="M23.2 23.2L29 29" stroke="#28d28c" stroke-width="2.2" stroke-linecap="round"/>'),
    telegram: menuIcon('#1a2e24', '<path d="M12.2 19.4L27.8 12.6c.7-.3 1.4.3 1.2 1.1l-2.7 12.6c-.2.8-1 .9-1.5.5l-3.8-2.9-2.4 2.3c-.3.3-.8.1-.9-.3l-.5-4.2 9.2-8.3-11.4 6.9-3.9-1.2c-.8-.2-.8-1.3.1-1.6Z" fill="#28d28c"/>'),
    label: menuIcon('#1a2e24', '<path d="M12 14.5c0-1.4 1.1-2.5 2.5-2.5H22l8 8-7.5 7.5-8-8V14.5Z" stroke="#28d28c" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="16.2" cy="16.2" r="1.4" fill="#28d28c"/>'),
    admin: menuIcon('#14261e', '<path d="M20 10l2.2 4.5 5 .7-3.6 3.5.9 5L20 21.5 15.5 23.7l.9-5-3.6-3.5 5-.7L20 10Z" fill="#28d28c"/>')
  };

  function buildNavMenu() {
    var nav = document.getElementById('qcx-menu-nav');
    if (!nav) return;
    if (nav.getAttribute('data-qcx-enhanced') === 'aave-cards-v1') return;
    function el(tag, cls, txt) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (typeof txt === 'string') node.textContent = txt;
      return node;
    }
    function addCard(grid, item) {
      var node;
      if (item.action === 'search') {
        node = el('button', 'qcx-menu-card' + (item.current ? ' qcx-menu-current' : ''));
        node.type = 'button';
        node.setAttribute('aria-label', item.title);
      } else {
        node = el('a', 'qcx-menu-card' + (item.current ? ' qcx-menu-current' : ''));
        node.href = item.href;
        if (item.external) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      }
      var iconWrap = el('span', 'qcx-menu-card-icon-wrap');
      iconWrap.innerHTML = MENU_ICONS[item.icon] || MENU_ICONS.label;
      var content = el('span', 'qcx-menu-card-content');
      var titleRow = el('span', 'qcx-menu-card-title-row');
      var title = el('span', 'qcx-menu-card-title', item.title);
      titleRow.appendChild(title);
      if (item.badge) {
        var badge = el('span', 'qcx-menu-card-badge', item.badge);
        titleRow.appendChild(badge);
      }
      if (item.external) {
        var ext = el('span', 'qcx-menu-card-ext');
        ext.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        titleRow.appendChild(ext);
      }
      var desc = el('span', 'qcx-menu-card-desc', item.desc || '');
      content.appendChild(titleRow);
      content.appendChild(desc);
      node.appendChild(iconWrap);
      node.appendChild(content);
      if (item.action === 'search') {
        node.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (typeof window.__qcxEnsureMobileNavReady === 'function') {
            try { window.__qcxEnsureMobileNavReady(); } catch (ignoreR) {}
          }
          if (typeof window.qcxOpenSearch === 'function') window.qcxOpenSearch();
          else if (typeof window.__qcxInitMobileNav === 'function') {
            try { window.__qcxInitMobileNav(); } catch (ignoreI) {}
            if (typeof window.qcxOpenSearch === 'function') window.qcxOpenSearch();
          }
          var menu = document.getElementById('qcx-menu');
          if (menu && menu.classList.contains('open') && typeof window.__qcxEnsureMenuDrawer === 'function') {
            /* close via close button click path */
            var closeBtn = document.getElementById('qcx-menu-close');
            if (closeBtn) closeBtn.click();
          }
        });
      }
      grid.appendChild(node);
    }

    nav.innerHTML = '';
    var logo = document.getElementById('qcx-menu-logo');
    if (logo) logo.textContent = 'CÔNG CỤ.AI';

    var secExplore = el('div', 'qcx-menu-section', 'Khám phá');
    nav.appendChild(secExplore);
    var grid1 = el('div', 'qcx-menu-card-grid');
    var path = location.pathname || '/';
    var cardsPrimary = [
      { title: 'Trang chủ', desc: 'Về trang chủ TIMKIEM', href: '/', icon: 'home', current: path === '/' || path === '' },
      { title: 'Tất cả bài', desc: 'Danh sách bài viết mới', href: '/search', icon: 'posts' },
      { title: 'Skill & Prompt', desc: 'Hướng dẫn AI / Skill', href: '/search/label/AI?max-results=12', icon: 'skill' },
      { title: 'Mã nguồn mở', desc: 'Developer & API', href: '/search/label/Developer?max-results=12', icon: 'code' },
      { title: 'Tools & Windows', desc: 'Thủ thuật và công cụ', href: '/search/label/Tools?max-results=12', icon: 'tools' },
      { title: 'Tìm kiếm', desc: 'Mở tìm kiếm nhanh', icon: 'search', action: 'search' }
    ];
    cardsPrimary.forEach(function (item) { addCard(grid1, item); });
    nav.appendChild(grid1);

    var secConnect = el('div', 'qcx-menu-section', 'Kết nối');
    nav.appendChild(secConnect);
    var grid2 = el('div', 'qcx-menu-card-grid');
    addCard(grid2, {
      title: 'Telegram',
      desc: 'Hỗ trợ & cập nhật nhanh',
      href: 'https://t.me/superkhung',
      icon: 'telegram',
      external: true
    });
    if (/\/p\/admin\.html/i.test(path) || document.documentElement.getAttribute('data-qcx-admin') === '1') {
      addCard(grid2, { title: 'Admin', desc: 'Soạn bài & vault', href: '/p/admin.html', icon: 'admin' });
    }
    nav.appendChild(grid2);

    var rawLinks = document.querySelectorAll('#Label1 a[href*="/search/label/"], .widget.Label a[href*="/search/label/"]');
    var allLabels = {};
    Array.prototype.forEach.call(rawLinks, function (a) {
      var rawName = (a.textContent || '').trim();
      var href = a.getAttribute('href') || ('/search/label/' + encodeURIComponent(rawName));
      if (!rawName) return;
      if (/^(FREE|blog|50[.,]000|bca|themeblogspot)$/i.test(rawName)) return;
      var cleanName = rawName;
      if (/^giaoduc$/i.test(rawName)) cleanName = 'Giáo dục';
      if (/^onthithpt$/i.test(rawName)) cleanName = 'Ôn thi THPT';
      if (/^luyenthimienphi$/i.test(rawName)) cleanName = 'Luyện thi miễn phí';
      if (/^hoconline$/i.test(rawName)) cleanName = 'Học online';
      var k = cleanName.toLowerCase();
      if (!allLabels[k]) allLabels[k] = { name: cleanName, href: href };
    });
    var labelKeys = Object.keys(allLabels);
    if (labelKeys.length) {
      var secLab = el('div', 'qcx-menu-section', 'Nhãn');
      nav.appendChild(secLab);
      var cloud = el('div', 'qcx-menu-labels-cloud');
      labelKeys.slice(0, 24).forEach(function (k) {
        var item = allLabels[k];
        var chip = el('a', 'qcx-menu-chip', item.name);
        chip.href = item.href;
        chip.title = 'Nhãn ' + item.name;
        cloud.appendChild(chip);
      });
      nav.appendChild(cloud);
    }

    var footer = document.getElementById('qcx-menu-footer');
    if (footer) {
      footer.innerHTML = '';
      var cta = el('a', 'qcx-menu-footer-cta', 'Mở Telegram');
      cta.href = 'https://t.me/superkhung';
      cta.setAttribute('rel', 'noopener noreferrer');
      cta.setAttribute('target', '_blank');
      cta.setAttribute('aria-label', 'Mở Telegram hỗ trợ');
      footer.appendChild(cta);
    }

    nav.setAttribute('data-qcx-enhanced', 'aave-cards-v1');
  }

  function hookMenu() {
    var menu = document.getElementById('qcx-menu');
    if (menu) {
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'aria-hidden')) {
            if (menu.classList.contains('open') || menu.getAttribute('aria-hidden') === 'false') {
              buildNavMenu();
            }
          }
        });
      });
      observer.observe(menu, { attributes: true });
    }
    document.addEventListener('click', function(e) {
      var btn = e.target && e.target.closest('.open-menu, #qcx-pc-menu-btn, [aria-label="Menu"]');
      if (btn) {
        setTimeout(buildNavMenu, 50);
        setTimeout(buildNavMenu, 250);
      }
    }, true);
    setTimeout(buildNavMenu, 500);
  }

  function boot() {
    injectStyles();
    fixResponsiveArticleWidth();
    hookMenu();
    hookTutorialObserver();
    window.addEventListener('resize', fixResponsiveArticleWidth, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
