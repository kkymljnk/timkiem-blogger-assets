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
      '/* Aave-accurate menu logo + Brand context menu */',
      '#qcx-menu-logo{color:#fff!important;-webkit-text-fill-color:#fff!important;cursor:pointer!important;position:relative!important}',
      '#qcx-menu-logo .qcx-menu-logo-mark{overflow:visible!important;color:#fff}',
      '#qcx-menu-logo .qcx-menu-logo-mark path{fill:#fff!important}',
      '#qcx-menu-logo .qcx-menu-logo-mark .logo-eyes,',
      '#qcx-menu-logo .qcx-menu-logo-mark .logo-eye-left,',
      '#qcx-menu-logo .qcx-menu-logo-mark .logo-eye-right{',
      '  transform-box:fill-box;transform-origin:center;will-change:transform;',
      '}',
      '#qcx-logo-brand-backdrop{position:fixed;inset:0;z-index:2147482999;background:transparent}',
      '#qcx-logo-brand-backdrop[hidden]{display:none!important}',
      '#qcx-logo-brand-menu{position:fixed;z-index:2147483000;min-width:18.5rem;padding:.5rem;border-radius:16px;',
      'background:#121a17;color:#e8fff2;',
      'box-shadow:0 0 0 1px rgba(0,240,163,.22),0 12px 32px rgba(0,0,0,.45);',
      'font:450 14px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      'letter-spacing:.14px;user-select:none;overflow:hidden;white-space:nowrap;',
      'opacity:0;transform:scale(.97);transform-origin:25% 25%;pointer-events:none;',
      'transition:opacity .2s cubic-bezier(.19,1,.22,1),transform .2s cubic-bezier(.19,1,.22,1)}',
      '#qcx-logo-brand-menu.is-open{opacity:1;transform:scale(1);pointer-events:auto}',
      '#qcx-logo-brand-menu[hidden]{display:none!important}',
      '#qcx-logo-brand-menu .qcx-lbm-brand{display:flex;align-items:center;gap:12px;padding:8px 16px 8px 6px;',
      'border-radius:8px;text-decoration:none;color:inherit;width:100%;transition:background-color .1s;',
      '--color-1:#7a9a8a;--color-2:#5c7a6c}',
      '#qcx-logo-brand-menu .qcx-lbm-brand:hover{background:rgba(0,240,163,.08)}',
      '#qcx-logo-brand-menu .qcx-lbm-brand:hover{--color-1:#28d28c;--color-2:#7dffc4}',
      '#qcx-logo-brand-menu .qcx-lbm-ghost{flex:0 0 auto;width:40px;height:40px;display:block}',
      '#qcx-logo-brand-menu .qcx-lbm-ghost path{transition:fill .15s}',
      '#qcx-logo-brand-menu .qcx-lbm-title{display:block;font-weight:450;font-size:14px;line-height:1.1;',
      'letter-spacing:.14px;color:#e8fff2;margin:0}',
      '#qcx-logo-brand-menu .qcx-lbm-desc{display:block;font-weight:450;font-size:14px;line-height:1.25;',
      'color:rgba(190,211,198,.78);margin:0}',
      '#qcx-logo-brand-menu .qcx-lbm-sep{height:1px;background:rgba(0,240,163,.16);margin:.3125rem -.5rem}',
      '#qcx-logo-brand-menu .qcx-lbm-actions{display:flex;width:288px;height:38px}',
      '#qcx-logo-brand-menu .qcx-lbm-btn{appearance:none;border:0;background:transparent;border-radius:8px;',
      'padding:6px 12px 6px 8px;display:flex;align-items:center;gap:8px;cursor:pointer;width:100%;',
      'color:rgba(190,211,198,.78);font:450 14px/1.1 system-ui,-apple-system,sans-serif;letter-spacing:.14px;',
      'transition:background-color .1s,color .1s;white-space:nowrap}',
      '#qcx-logo-brand-menu .qcx-lbm-btn:hover{background:rgba(0,240,163,.08);color:#e8fff2}',
      '#qcx-logo-brand-menu .qcx-lbm-btn svg{flex:0 0 auto;width:24px;height:25px;display:block}',
      '#qcx-logo-brand-menu .qcx-lbm-btn span{font-size:14px;font-weight:450}',
      '#qcx-logo-brand-menu .qcx-lbm-copied{display:none;justify-content:center;align-items:center;',
      'width:288px;height:38px;font:450 14px/1.1 system-ui,-apple-system,sans-serif;',
      'letter-spacing:.14px;color:#28d28c}',
      '#qcx-logo-brand-menu.is-copied .qcx-lbm-actions{display:none}',
      '#qcx-logo-brand-menu.is-copied .qcx-lbm-copied{display:flex}',
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

  function displayPostTitle(raw) {
    if (typeof window.__qcxDisplayPostTitle === 'function') return window.__qcxDisplayPostTitle(raw);
    var t = String(raw || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    var m = t.match(/^.{1,40}?\s*[—–]\s+(.+)$/);
    if (m && m[1]) return m[1].trim();
    m = t.match(/^.{1,40}?\s+-\s+(.+)$/);
    return (m && m[1]) ? m[1].trim() : t;
  }

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

      var shownTitle = displayPostTitle(item.title);
      var aThumb = document.createElement('a');
      aThumb.href = item.href;
      aThumb.title = item.title;
      aThumb.style.cssText = 'display:block!important;width:100%!important;height:100%!important;';

      var img = document.createElement('img');
      img.src = item.img;
      img.alt = shownTitle;
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
      aTitle.textContent = shownTitle;
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
  var MENU_ICONS = (typeof window !== 'undefined' && window.QCX_MENU_ICONS) || {
    home: "<svg style=\"--active-color-1: #28d28c; --active-color-2: #3ee09a; --active-color-3: #7dffc4; --active-color-4: #7dffc4\" class=\"qcx-menu-card-icon\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\"><path d=\"M30 0H10C4.48 0 0 4.48 0 10V30C0 35.52 4.48 40 10 40H30C35.52 40 40 35.52 40 30V10C40 4.48 35.52 0 30 0Z\" fill=\"var(--color-1)\"></path><path d=\"M15.39 14.61C17.1 14.33 18.72 15.49 19 17.21C19.27 18.92 18.11 20.54 16.39 20.82C14.68 21.1 13.06 19.93 12.79 18.22C12.51 16.5 13.67 14.89 15.39 14.61ZM23.61 14.61C25.32 14.33 26.94 15.49 27.22 17.21C27.5 18.92 26.33 20.54 24.62 20.82C22.9 21.1 21.29 19.93 21.01 18.22C20.73 16.5 21.89 14.89 23.61 14.61ZM20 4.73C28.54 4.73 35.46 11.78 35.46 20.49H31.51C31.51 13.96 26.4 8.68 20 8.68C13.6 8.68 8.48 13.96 8.48 20.49H4.53C4.53 11.78 11.45 4.73 20 4.73Z\" fill=\"#fff\"></path></svg>",
    posts: "<svg style=\"--active-color-1: #28d28c; --active-color-2: #3ee09a; --active-color-3: #7dffc4; --active-color-4: #7dffc4\" class=\"qcx-menu-card-icon\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\"><rect x=\"6\" y=\"7\" width=\"12\" height=\"26\" rx=\"3\" fill=\"var(--color-4)\"></rect><rect x=\"21\" y=\"7\" width=\"7\" height=\"26\" rx=\"2\" fill=\"var(--color-1)\"></rect><rect x=\"31\" y=\"7\" width=\"3\" height=\"26\" rx=\"1.5\" fill=\"var(--color-4)\"></rect></svg>",
    skill: "<svg style=\"--active-color-1: #28d28c; --active-color-2: #3ee09a; --active-color-3: #7dffc4; --active-color-4: #7dffc4\" class=\"qcx-menu-card-icon\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\"><path d=\"M19.5 5C21.1569 5 22.5 6.34315 22.5 8C22.5 9.21025 21.7821 10.2503 20.75 10.7246V14C20.75 14.6904 20.1904 15.25 19.5 15.25C18.8096 15.25 18.25 14.6904 18.25 14V10.7246C17.2179 10.2503 16.5 9.21025 16.5 8C16.5 6.34315 17.8431 5 19.5 5Z\" fill=\"var(--color-1)\"></path><path d=\"M26 17C29.3137 17 32 19.6863 32 23V28C32 31.3137 29.3137 34 26 34H13C9.68629 34 7 31.3137 7 28V23C7 19.6863 9.68629 17 13 17H26ZM15.5 22C14.3954 22 13.5 22.8954 13.5 24C13.5 25.1046 14.3954 26 15.5 26C16.6046 26 17.5 25.1046 17.5 24C17.5 22.8954 16.6046 22 15.5 22ZM23.5 22C22.3954 22 21.5 22.8954 21.5 24C21.5 25.1046 22.3954 26 23.5 26C24.6046 26 25.5 25.1046 25.5 24C25.5 22.8954 24.6046 22 23.5 22Z\" fill=\"var(--color-4)\"></path></svg>",
    code: "<svg style=\"--active-color-1: #7dffc4; --active-color-2: #3ee09a; --active-color-3: #28d28c; --active-color-4: #7dffc4\" class=\"qcx-menu-card-icon\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\"><path d=\"M18.16 13.27C19.36 13.05 20.64 13.05 21.84 13.27C23.2 13.53 24.38 14.21 26.73 15.57L33 19.18C35.35 20.54 36.53 21.22 36.97 22.01C37.17 22.37 37.27 22.74 37.26 23.11L37.26 23.26V28.72L37.26 29.02C37.28 29.42 37.19 29.82 36.97 30.21C36.53 30.99 35.35 31.67 33 33.03L26.73 36.65L25.9 37.13C24.08 38.17 23.03 38.72 21.84 38.94C20.64 39.17 19.36 39.17 18.16 38.94C16.8 38.69 15.62 38.01 13.27 36.65L7 33.03C4.65 31.67 3.47 30.99 3.03 30.21C2.81 29.82 2.72 29.42 2.74 29.02L2.74 23.11C2.73 22.74 2.83 22.37 3.03 22.01C3.47 21.22 4.65 20.54 7 19.18L13.27 15.57C15.62 14.21 16.8 13.53 18.16 13.27Z\" fill=\"var(--color-1)\"></path><path d=\"M18.16 7.35C19.36 7.12 20.64 7.12 21.84 7.35C23.2 7.6 24.38 8.28 26.73 9.64L33 13.26C35.35 14.62 36.53 15.3 36.97 16.08C37.17 16.44 37.27 16.81 37.26 17.18L37.26 17.33V22.79L37.26 23.1C37.28 23.49 37.19 23.9 36.97 24.28C36.53 25.07 35.35 25.75 33 27.11L26.73 30.72L25.9 31.2C24.08 32.25 23.03 32.8 21.84 33.02C20.64 33.24 19.36 33.24 18.16 33.02C16.8 32.76 15.62 32.08 13.27 30.72L7 27.11C4.65 25.75 3.47 25.07 3.03 24.28C2.81 23.9 2.72 23.49 2.74 23.1L2.74 17.18C2.73 16.81 2.83 16.44 3.03 16.08C3.47 15.3 4.65 14.62 7 13.26L13.27 9.64C15.62 8.28 16.8 7.6 18.16 7.35Z\" fill=\"var(--color-2)\"></path><path d=\"M18.16 1.28C19.36 1.06 20.64 1.06 21.84 1.28C23.2 1.54 24.38 2.22 26.73 3.58L33 7.19C35.35 8.55 36.53 9.23 36.97 10.02C37.17 10.38 37.27 10.75 37.26 11.12L37.26 11.27V16.73L37.26 17.03C37.28 17.43 37.19 17.83 36.97 18.22C36.53 19 35.35 19.68 33 21.04L26.73 24.66L25.9 25.14C24.08 26.18 23.03 26.73 21.84 26.96C20.64 27.18 19.36 27.18 18.16 26.96C16.8 26.7 15.62 26.02 13.27 24.66L7 21.04C4.65 19.68 3.47 19 3.03 18.22C2.81 17.83 2.72 17.43 2.74 17.03L2.74 11.12C2.73 10.75 2.83 10.38 3.03 10.02C3.47 9.23 4.65 8.55 7 7.19L13.27 3.58C15.62 2.22 16.8 1.54 18.16 1.28Z\" fill=\"var(--color-3)\"></path><path d=\"M18.13 1.19C19.32 0.96 20.61 0.96 21.8 1.19C23.16 1.44 24.34 2.12 26.69 3.48L32.94 7.09C35.29 8.44 36.47 9.12 36.91 9.91C37.3 10.6 37.3 11.34 36.91 12.03C36.47 12.81 35.29 13.49 32.94 14.85L26.69 18.46C24.34 19.81 23.16 20.49 21.8 20.75C20.61 20.97 19.32 20.97 18.13 20.75C16.78 20.49 15.6 19.81 13.25 18.46L7 14.85C4.64 13.49 3.47 12.81 3.03 12.03C2.64 11.34 2.64 10.6 3.03 9.91C3.47 9.12 4.64 8.44 7 7.09L13.25 3.48C15.6 2.12 16.78 1.44 18.13 1.19Z\" fill=\"var(--color-4)\"></path><path d=\"M24.56 10.81C23.78 11.26 22.52 11.26 21.74 10.81C20.96 10.36 20.96 9.63 21.74 9.18C22.52 8.73 23.78 8.73 24.56 9.18C25.34 9.63 25.34 10.36 24.56 10.81Z\" fill=\"#fff\"></path><path d=\"M20.87 12.94C20.09 13.39 18.83 13.39 18.05 12.94C17.27 12.49 17.27 11.76 18.05 11.31C18.83 10.86 20.09 10.86 20.87 11.31C21.65 11.76 21.65 12.49 20.87 12.94Z\" fill=\"#fff\"></path><path d=\"M15.48 7.7C19.31 5.48 25.59 5.52 29.49 7.77L27.72 8.8C24.79 7.11 20.13 7.06 17.25 8.72C14.38 10.38 14.46 13.07 17.39 14.76L15.61 15.79C11.71 13.53 11.65 9.91 15.48 7.7Z\" fill=\"#fff\"></path></svg>",
    tools: "<svg style=\"--active-color-1: #28d28c; --active-color-2: #3ee09a; --active-color-3: #7dffc4; --active-color-4: #7dffc4\" class=\"qcx-menu-card-icon\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\"><rect x=\"7.6665\" y=\"8\" width=\"10\" height=\"10\" rx=\"5\" fill=\"var(--color-1)\"></rect><rect x=\"21.6665\" y=\"22\" width=\"10\" height=\"10\" rx=\"5\" fill=\"var(--color-1)\"></rect><path d=\"M11.6665 28L27.6665 12\" stroke=\"var(--color-4)\" stroke-width=\"4\" stroke-linecap=\"round\"></path></svg>",
    search: "<svg style=\"--active-color-1: #28d28c; --active-color-2: #3ee09a; --active-color-3: #7dffc4; --active-color-4: #7dffc4\" class=\"qcx-menu-card-icon\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\"><path d=\"M20.43 30.86C25.48 30.86 29.77 27.58 31.28 23.03C31.55 22.21 31.69 21.8 31.52 21.16C31.4 20.69 30.94 20.05 30.53 19.79C29.97 19.43 29.38 19.43 28.2 19.43L12.66 19.43C11.48 19.43 10.88 19.43 10.32 19.79C9.92 20.05 9.45 20.69 9.33 21.16C9.17 21.8 9.31 22.21 9.58 23.03C11.08 27.58 15.37 30.86 20.43 30.86Z\" fill=\"var(--color-4)\"></path><path d=\"M20.43 16.43C23.72 16.43 26.5 14.3 27.48 11.34C27.66 10.81 27.75 10.54 27.64 10.12C27.56 9.82 27.26 9.4 27 9.23C26.63 9 26.25 9 25.48 9L15.38 9C14.61 9 14.22 9 13.86 9.23C13.59 9.4 13.29 9.82 13.22 10.12C13.11 10.54 13.2 10.81 13.37 11.34C14.35 14.3 17.14 16.43 20.43 16.43Z\" fill=\"var(--color-1)\"></path></svg>",
    telegram: "<svg style=\"--active-color-1: #28d28c; --active-color-2: #3ee09a; --active-color-3: #7dffc4; --active-color-4: #7dffc4\" class=\"qcx-menu-card-icon\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\"><circle cx=\"20\" cy=\"20\" r=\"16\" fill=\"var(--color-1)\"></circle><circle cx=\"16.72\" cy=\"17.91\" r=\"2.6\" fill=\"#fff\"></circle><circle cx=\"23.29\" cy=\"17.91\" r=\"2.6\" fill=\"#fff\"></circle><path d=\"M32.35 30.18V21.3H29C28.32 25.78 24.62 29.04 20 29.04C14.89 29.04 10.81 25.06 10.81 19.85C10.81 14.65 14.89 10.59 20 10.59C24.46 10.59 28.13 13.67 29 17.91H32.35C31.43 11.89 26.17 7.27 20 7.27C13.18 7.27 7.65 12.91 7.65 19.85C7.65 26.8 13.18 32.43 20 32.43C24.29 32.43 27.28 30.45 29.12 27.32C29.16 27.33 29.21 27.34 29.25 27.35V33.06C30.4 32.24 31.45 31.27 32.35 30.18Z\" fill=\"#fff\"></path></svg>",
    label: "<svg style=\"--active-color-1: #28d28c; --active-color-2: #3ee09a; --active-color-3: #7dffc4; --active-color-4: #7dffc4\" class=\"qcx-menu-card-icon\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\"><path d=\"M9.31 19C8.76 19 8.49 19 8.26 18.87C8.08 18.77 7.9 18.57 7.82 18.38C7.72 18.14 7.75 17.89 7.81 17.4C8.17 14.54 9.46 11.87 11.52 9.81C13.96 7.37 17.27 6 20.71 6C24.16 6 27.47 7.37 29.91 9.81C31.97 11.87 33.26 14.54 33.62 17.4C33.68 17.89 33.71 18.14 33.61 18.38C33.53 18.57 33.35 18.77 33.17 18.87C32.94 19 32.67 19 32.11 19H28.82C28.27 19 28 19 27.81 18.92C27.62 18.84 27.52 18.77 27.4 18.6C27.28 18.44 27.19 18.1 27.02 17.42C26.74 16.29 26.15 15.24 25.31 14.4C24.09 13.18 22.44 12.5 20.71 12.5C18.99 12.5 17.34 13.18 16.12 14.4C15.28 15.24 14.69 16.29 14.41 17.42C14.24 18.1 14.15 18.44 14.03 18.6C13.9 18.77 13.81 18.84 13.62 18.92C13.43 19 13.16 19 12.61 19H9.31Z\" fill=\"var(--color-4)\"></path><path d=\"M9.31 34C8.76 34 8.49 34 8.26 33.87C8.08 33.77 7.9 33.57 7.82 33.38C7.72 33.14 7.75 32.89 7.81 32.4C8.17 29.54 9.46 26.87 11.52 24.81C13.96 22.37 17.27 21 20.71 21C24.16 21 27.47 22.37 29.91 24.81C31.97 26.87 33.26 29.54 33.62 32.4C33.68 32.89 33.71 33.14 33.61 33.38C33.53 33.57 33.35 33.77 33.17 33.87C32.94 34 32.67 34 32.11 34H28.82C28.27 34 28 34 27.81 33.92C27.62 33.84 27.52 33.77 27.4 33.6C27.28 33.44 27.19 33.1 27.02 32.42C26.74 31.29 26.15 30.24 25.31 29.4C24.09 28.18 22.44 27.5 20.71 27.5C18.99 27.5 17.34 28.18 16.12 29.4C15.28 30.24 14.69 31.29 14.41 32.42C14.24 33.1 14.15 33.44 14.03 33.6C13.9 33.77 13.81 33.84 13.62 33.92C13.43 34 13.16 34 12.61 34H9.31Z\" fill=\"var(--color-1)\"></path></svg>",
    admin: "<svg style=\"--active-color-1: #28d28c; --active-color-2: #3ee09a; --active-color-3: #7dffc4; --active-color-4: #7dffc4\" class=\"qcx-menu-card-icon\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\"><g transform=\"translate(4 4) scale(2)\"><path d=\"M3.7135 11.5755C3.26054 10.8233 3 9.94207 3 9V4C3 2.89543 3.89543 2 5 2H11C11.2139 2 11.42 2.03359 11.6133 2.09579L3.7135 11.5755Z\" fill=\"var(--color-4)\"></path><path d=\"M4.62109 12.6863L12.7157 2.97266C12.896 3.27303 12.9998 3.62467 12.9998 4.0005V9.00049C12.9998 11.7619 10.7612 14.0005 7.99978 14.0005C6.6972 14.0005 5.51094 13.5024 4.62109 12.6863Z\" fill=\"var(--color-1)\"></path></g></svg>",
  };

  function buildNavMenu() {
    var nav = document.getElementById('qcx-menu-nav');
    if (!nav) return;
    if (nav.getAttribute('data-qcx-enhanced') === 'mint-cards-v8-mmo-logo') return;
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
      /* Aave-like SVG hover: class toggle so fill/stroke 0.2s works on touch + pointer */
      node.addEventListener('pointerenter', function () { node.classList.add('is-hover'); });
      node.addEventListener('pointerleave', function () { node.classList.remove('is-hover'); });
      node.addEventListener('pointercancel', function () { node.classList.remove('is-hover'); });
      node.addEventListener('blur', function () { node.classList.remove('is-hover'); });
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
    if (logo) {
      logo.setAttribute('aria-label', 'MMO.TEAM');
      /* Official Aave ghost/eyes + Satoshi Bold path wordmark — white on dark menu. */
      logo.innerHTML =
        '<svg class="qcx-menu-logo-mark" width="119.8" height="16" viewBox="0 0 119.8 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MMO.TEAM">' +
        '<path d="M14.985 0C6.70823 0 -0.00216598 6.80197 5.24457e-07 15.19H3.82821C3.82821 8.90381 8.78373 3.8072 14.985 3.8072C21.1862 3.8072 26.1418 8.90381 26.1418 15.19H29.9699C29.9715 6.80197 23.261 0 14.985 0Z" fill="#fff"/>' +
        '<g class="logo-eyes">' +
        '<path class="logo-eye-left qcx-eye" d="M11.007 15.5481C12.6893 15.5481 14.053 14.1915 14.053 12.5182C14.053 10.8448 12.6893 9.48828 11.007 9.48828C9.32471 9.48828 7.96094 10.8448 7.96094 12.5182C7.96094 14.1915 9.32471 15.5481 11.007 15.5481Z" fill="#fff"/>' +
        '<path class="logo-eye-right qcx-eye" d="M18.9679 15.5481C20.6502 15.5481 22.014 14.1915 22.014 12.5182C22.014 10.8448 20.6502 9.48828 18.9679 9.48828C17.2856 9.48828 15.9219 10.8448 15.9219 12.5182C15.9219 14.1915 17.2856 15.5481 18.9679 15.5481Z" fill="#fff"/>' +
        '</g>' +
        '<path d="M36.154 15.37H34.243V4.135H36.154L39.775 13.08L43.402 4.135H45.339V15.37H43.429V11.909Q43.429 11.06 43.431 10.486Q43.433 9.912 43.446 9.51Q43.459 9.108 43.48 8.804Q43.501 8.5 43.538 8.191L40.682 15.37H38.868L36.023 8.205Q36.108 8.715 36.131 9.501Q36.154 10.287 36.154 11.349Z" fill="#fff"/>' +
        '<path d="M49.718 15.37H47.807V4.135H49.718L53.339 13.08L56.966 4.135H58.903V15.37H56.993V11.909Q56.993 11.06 56.995 10.486Q56.997 9.912 57.01 9.51Q57.023 9.108 57.044 8.804Q57.065 8.5 57.102 8.191L54.246 15.37H52.432L49.587 8.205Q49.672 8.715 49.695 9.501Q49.718 10.287 49.718 11.349Z" fill="#fff"/>' +
        '<path d="M71.617 9.742Q71.617 11.455 70.924 12.766Q70.231 14.077 69 14.816Q67.77 15.554 66.152 15.554Q64.548 15.554 63.321 14.816Q62.094 14.077 61.408 12.772Q60.723 11.466 60.723 9.752Q60.723 8.039 61.416 6.727Q62.109 5.416 63.334 4.678Q64.559 3.939 66.162 3.939Q67.781 3.939 69.006 4.678Q70.231 5.416 70.924 6.722Q71.617 8.028 71.617 9.742ZM69.551 9.742Q69.551 8.54 69.136 7.664Q68.72 6.789 67.965 6.309Q67.211 5.83 66.173 5.83Q65.14 5.83 64.38 6.309Q63.62 6.789 63.204 7.664Q62.789 8.54 62.789 9.742Q62.789 10.939 63.204 11.822Q63.62 12.705 64.38 13.184Q65.14 13.664 66.173 13.664Q67.211 13.664 67.965 13.179Q68.72 12.694 69.136 11.811Q69.551 10.928 69.551 9.742Z" fill="#fff"/>' +
        '<path d="M74.419 15.561Q73.909 15.561 73.542 15.202Q73.176 14.843 73.176 14.343Q73.176 13.828 73.542 13.469Q73.909 13.111 74.419 13.111Q74.923 13.111 75.293 13.469Q75.663 13.828 75.663 14.343Q75.663 14.843 75.293 15.202Q74.923 15.561 74.419 15.561Z" fill="#fff"/>' +
        '<path d="M82.149 5.066V15.37H80.184V5.066ZM76.897 5.951V4.135H85.436V5.951Z" fill="#fff"/>' +
        '<path d="M93.908 15.37H86.924V4.135H93.904V5.951H88.197L88.888 5.324V8.839H93.375V10.57H88.888V14.185L88.197 13.553H93.908Z" fill="#fff"/>' +
        '<path d="M96.978 15.37H94.938L98.991 4.135H101.018L105.075 15.37H102.998L102.093 12.774H97.889ZM99.749 7.49 98.469 11.108H101.524L100.235 7.49Q100.165 7.262 100.092 7.026Q100.018 6.79 99.992 6.632Q99.966 6.786 99.899 7.021Q99.833 7.256 99.749 7.49Z" fill="#fff"/>' +
        '<path d="M108.37 15.37H106.459V4.135H108.37L111.991 13.08L115.618 4.135H117.555V15.37H115.644V11.909Q115.644 11.06 115.647 10.486Q115.649 9.912 115.662 9.51Q115.675 9.108 115.696 8.804Q115.717 8.5 115.754 8.191L112.898 15.37H111.084L108.239 8.205Q108.324 8.715 108.347 9.501Q108.37 10.287 108.37 11.349Z" fill="#fff"/>' +
        '</svg>';
      bindMenuLogoEyes(logo.querySelector('.qcx-menu-logo-mark'));
      bindMenuLogoBrandMenu(logo);
    }

    var secExplore = el('div', 'qcx-menu-section', 'Menu');
    nav.appendChild(secExplore);
    var grid1 = el('div', 'qcx-menu-card-grid');
    var path = location.pathname || '/';
    var cardsPrimary = [
      { title: 'Trang chủ', desc: 'Home', href: '/', icon: 'home', current: path === '/' || path === '' },
      { title: 'Bài viết', desc: 'Mới nhất', href: '/search', icon: 'posts' },
      { title: 'Skill & Prompt', desc: 'AI', href: '/search/label/AI?max-results=12', icon: 'skill' },
      { title: 'Mã nguồn', desc: 'Dev & API', href: '/search/label/Developer?max-results=12', icon: 'code' },
      { title: 'Tools', desc: 'Tool & App', href: '/search/label/Tools?max-results=12', icon: 'tools' },
      { title: 'Telegram', desc: 'Hỗ trợ', href: 'https://t.me/superkhung', icon: 'telegram', external: true }
    ];
    cardsPrimary.forEach(function (item) { addCard(grid1, item); });
    if (/\/p\/admin\.html/i.test(path) || document.documentElement.getAttribute('data-qcx-admin') === '1') {
      addCard(grid1, { title: 'Admin', desc: 'Soạn bài', href: '/p/admin.html', icon: 'admin' });
    }
    nav.appendChild(grid1);

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
      labelKeys.slice(0, 12).forEach(function (k) {
        var item = allLabels[k];
        var chip = el('a', 'qcx-menu-chip', item.name);
        chip.href = item.href;
        chip.title = 'Nhãn ' + item.name;
        cloud.appendChild(chip);
      });
      nav.appendChild(cloud);
    }

    var footer = document.getElementById('qcx-menu-footer');
    if (footer) footer.innerHTML = '';

    nav.setAttribute('data-qcx-enhanced', 'mint-cards-v11-aave-logo');
  }

  var QCX_MENU_LOGO_SVG_EXPORT =
    '<svg width="119.8" height="16" viewBox="0 0 119.8 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M14.985 0C6.70823 0 -0.00216598 6.80197 5.24457e-07 15.19H3.82821C3.82821 8.90381 8.78373 3.8072 14.985 3.8072C21.1862 3.8072 26.1418 8.90381 26.1418 15.19H29.9699C29.9715 6.80197 23.261 0 14.985 0Z" fill="black"/>' +
    '<path d="M11.007 15.5481C12.6893 15.5481 14.053 14.1915 14.053 12.5182C14.053 10.8448 12.6893 9.48828 11.007 9.48828C9.32471 9.48828 7.96094 10.8448 7.96094 12.5182C7.96094 14.1915 9.32471 15.5481 11.007 15.5481Z" fill="black"/>' +
    '<path d="M18.9679 15.5481C20.6502 15.5481 22.014 14.1915 22.014 12.5182C22.014 10.8448 20.6502 9.48828 18.9679 9.48828C17.2856 9.48828 15.9219 10.8448 15.9219 12.5182C15.9219 14.1915 17.2856 15.5481 18.9679 15.5481Z" fill="black"/>' +
    '<path d="M36.154 15.37H34.243V4.135H36.154L39.775 13.08L43.402 4.135H45.339V15.37H43.429V11.909Q43.429 11.06 43.431 10.486Q43.433 9.912 43.446 9.51Q43.459 9.108 43.48 8.804Q43.501 8.5 43.538 8.191L40.682 15.37H38.868L36.023 8.205Q36.108 8.715 36.131 9.501Q36.154 10.287 36.154 11.349Z" fill="black"/>' +
    '<path d="M49.718 15.37H47.807V4.135H49.718L53.339 13.08L56.966 4.135H58.903V15.37H56.993V11.909Q56.993 11.06 56.995 10.486Q56.997 9.912 57.01 9.51Q57.023 9.108 57.044 8.804Q57.065 8.5 57.102 8.191L54.246 15.37H52.432L49.587 8.205Q49.672 8.715 49.695 9.501Q49.718 10.287 49.718 11.349Z" fill="black"/>' +
    '<path d="M71.617 9.742Q71.617 11.455 70.924 12.766Q70.231 14.077 69 14.816Q67.77 15.554 66.152 15.554Q64.548 15.554 63.321 14.816Q62.094 14.077 61.408 12.772Q60.723 11.466 60.723 9.752Q60.723 8.039 61.416 6.727Q62.109 5.416 63.334 4.678Q64.559 3.939 66.162 3.939Q67.781 3.939 69.006 4.678Q70.231 5.416 70.924 6.722Q71.617 8.028 71.617 9.742ZM69.551 9.742Q69.551 8.54 69.136 7.664Q68.72 6.789 67.965 6.309Q67.211 5.83 66.173 5.83Q65.14 5.83 64.38 6.309Q63.62 6.789 63.204 7.664Q62.789 8.54 62.789 9.742Q62.789 10.939 63.204 11.822Q63.62 12.705 64.38 13.184Q65.14 13.664 66.173 13.664Q67.211 13.664 67.965 13.179Q68.72 12.694 69.136 11.811Q69.551 10.928 69.551 9.742Z" fill="black"/>' +
    '<path d="M74.419 15.561Q73.909 15.561 73.542 15.202Q73.176 14.843 73.176 14.343Q73.176 13.828 73.542 13.469Q73.909 13.111 74.419 13.111Q74.923 13.111 75.293 13.469Q75.663 13.828 75.663 14.343Q75.663 14.843 75.293 15.202Q74.923 15.561 74.419 15.561Z" fill="black"/>' +
    '<path d="M82.149 5.066V15.37H80.184V5.066ZM76.897 5.951V4.135H85.436V5.951Z" fill="black"/>' +
    '<path d="M93.908 15.37H86.924V4.135H93.904V5.951H88.197L88.888 5.324V8.839H93.375V10.57H88.888V14.185L88.197 13.553H93.908Z" fill="black"/>' +
    '<path d="M96.978 15.37H94.938L98.991 4.135H101.018L105.075 15.37H102.998L102.093 12.774H97.889ZM99.749 7.49 98.469 11.108H101.524L100.235 7.49Q100.165 7.262 100.092 7.026Q100.018 6.79 99.992 6.632Q99.966 6.786 99.899 7.021Q99.833 7.256 99.749 7.49Z" fill="black"/>' +
    '<path d="M108.37 15.37H106.459V4.135H108.37L111.991 13.08L115.618 4.135H117.555V15.37H115.644V11.909Q115.644 11.06 115.647 10.486Q115.649 9.912 115.662 9.51Q115.675 9.108 115.696 8.804Q115.717 8.5 115.754 8.191L112.898 15.37H111.084L108.239 8.205Q108.324 8.715 108.347 9.501Q108.37 10.287 108.37 11.349Z" fill="black"/>' +
    '</svg>';

  /* Aave logo motion via style.transform rAF — WAAPI on SVG <g> does not paint. */
  var __qcxEyesBusy = false;
  var __qcxEyesBusyTimer = null;
  var __qcxEyesSeqRaf = 0;
  var __qcxEyesTrack = { x: 0, y: 0, tx: 0, ty: 0, raf: 0, hovering: false };

  function qcxLiveLogoParts() {
    var host = document.getElementById('qcx-menu-logo');
    var mark = (host && host.__qcxLogoSvg) || (host && host.querySelector('.qcx-menu-logo-mark'));
    if (!mark) return null;
    return {
      host: host,
      mark: mark,
      eyes: mark.querySelector('.logo-eyes'),
      left: mark.querySelector('.logo-eye-left'),
      right: mark.querySelector('.logo-eye-right')
    };
  }

  function qcxEyesLookPx(eyes) {
    var w = 14;
    try {
      if (eyes.getBBox) {
        var bb = eyes.getBBox();
        if (bb && bb.width) w = bb.width;
      }
    } catch (e) {}
    try {
      var r = eyes.getBoundingClientRect();
      if (r && r.width) w = Math.max(w, r.width);
    } catch (e2) {}
    /* Visible at 16px logo: ~2.5–5px look */
    return Math.max(2.5, Math.min(5, w * 0.22));
  }

  function qcxEaseInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function qcxTween(from, to, dur, delay, onUpdate, onDone) {
    var startAt = performance.now() + (delay || 0);
    function frame(now) {
      if (now < startAt) {
        __qcxEyesSeqRaf = window.requestAnimationFrame(frame);
        return;
      }
      var t = Math.min(1, (now - startAt) / dur);
      onUpdate(from + (to - from) * qcxEaseInOut(t));
      if (t < 1) __qcxEyesSeqRaf = window.requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    __qcxEyesSeqRaf = window.requestAnimationFrame(frame);
  }

  function playMenuLogoEyes(svg) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (svg) {
      var host0 = document.getElementById('qcx-menu-logo');
      if (host0) host0.__qcxLogoSvg = svg;
    }
    var parts = qcxLiveLogoParts();
    if (!parts || !parts.eyes || !parts.left || !parts.right) return;
    __qcxEyesBusy = true;
    if (__qcxEyesBusyTimer) clearTimeout(__qcxEyesBusyTimer);
    if (__qcxEyesSeqRaf) {
      window.cancelAnimationFrame(__qcxEyesSeqRaf);
      __qcxEyesSeqRaf = 0;
    }
    var look = qcxEyesLookPx(parts.eyes);
    var setX = function (x) {
      var p = qcxLiveLogoParts();
      if (!p || !p.eyes) return;
      p.eyes.style.transform = 'translate(' + x.toFixed(2) + 'px,0px)';
    };
    var setBlink = function (sy) {
      var p = qcxLiveLogoParts();
      if (!p || !p.left || !p.right) return;
      p.left.style.transform = 'scaleY(' + sy.toFixed(3) + ')';
      p.right.style.transform = 'scaleY(' + sy.toFixed(3) + ')';
    };
    setX(0);
    setBlink(1);
    /* Aave: 0→+look 150; +→− 300; −→0 250; double blink */
    qcxTween(0, look, 150, 0, setX, function () {
      qcxTween(look, -look, 300, 200, setX, function () {
        qcxTween(-look, 0, 250, 0, setX, function () {
          qcxTween(1, 0.05, 75, 250, setBlink, function () {
            qcxTween(0.05, 1, 75, 0, setBlink, function () {
              qcxTween(1, 0.05, 75, 50, setBlink, function () {
                qcxTween(0.05, 1, 75, 0, setBlink, function () {
                  var p = qcxLiveLogoParts();
                  if (p) {
                    if (p.left) p.left.style.transform = '';
                    if (p.right) p.right.style.transform = '';
                    if (p.eyes) p.eyes.style.transform = 'translate(0px,0px)';
                  }
                  __qcxEyesBusy = false;
                });
              });
            });
          });
        });
      });
    });
    __qcxEyesBusyTimer = window.setTimeout(function () {
      __qcxEyesBusy = false;
    }, 1800);
  }

  function bindMenuLogoEyes(svg) {
    if (!svg) return;
    var host = document.getElementById('qcx-menu-logo');
    if (host) host.__qcxLogoSvg = svg;
    playMenuLogoEyes(svg);
    if (host && host.getAttribute('data-qcx-aave-eyes-bound') === '5') return;
    if (host) host.setAttribute('data-qcx-aave-eyes-bound', '5');
    var timer = null;
    var arm = function () {
      var target = (host && host.__qcxLogoSvg) || svg;
      if (timer) clearInterval(timer);
      timer = setInterval(function () {
        playMenuLogoEyes((host && host.__qcxLogoSvg) || target);
      }, 10000);
      playMenuLogoEyes(target);
    };
    window.addEventListener('scroll', arm, { passive: true });
    if (host) {
      var applyTrack = function () {
        if (__qcxEyesBusy || !__qcxEyesTrack.hovering) {
          __qcxEyesTrack.raf = 0;
          return;
        }
        var p = qcxLiveLogoParts();
        if (!p || !p.eyes) {
          __qcxEyesTrack.raf = 0;
          return;
        }
        __qcxEyesTrack.tx += (__qcxEyesTrack.x - __qcxEyesTrack.tx) * 0.28;
        __qcxEyesTrack.ty += (__qcxEyesTrack.y - __qcxEyesTrack.ty) * 0.28;
        p.eyes.style.transform =
          'translate(' + __qcxEyesTrack.tx.toFixed(2) + 'px,' + __qcxEyesTrack.ty.toFixed(2) + 'px)';
        if (p.left) p.left.style.transform = '';
        if (p.right) p.right.style.transform = '';
        if (Math.abs(__qcxEyesTrack.x - __qcxEyesTrack.tx) > 0.05 ||
            Math.abs(__qcxEyesTrack.y - __qcxEyesTrack.ty) > 0.05) {
          __qcxEyesTrack.raf = window.requestAnimationFrame(applyTrack);
        } else {
          __qcxEyesTrack.raf = 0;
        }
      };
      var trackEyes = function (clientX, clientY) {
        if (__qcxEyesBusy) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var p = qcxLiveLogoParts();
        if (!p || !p.mark) return;
        var rect = p.mark.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var nx = ((clientX - rect.left) / rect.width) * 2 - 1;
        var ny = ((clientY - rect.top) / rect.height) * 2 - 1;
        var maxX = 4.5;
        var maxY = 2;
        __qcxEyesTrack.hovering = true;
        __qcxEyesTrack.x = Math.max(-maxX, Math.min(maxX, nx * maxX));
        __qcxEyesTrack.y = Math.max(-maxY, Math.min(maxY, ny * maxY));
        if (!__qcxEyesTrack.raf) {
          __qcxEyesTrack.raf = window.requestAnimationFrame(applyTrack);
        }
      };
      var resetEyes = function () {
        __qcxEyesTrack.hovering = false;
        __qcxEyesTrack.x = 0;
        __qcxEyesTrack.y = 0;
        __qcxEyesTrack.tx = 0;
        __qcxEyesTrack.ty = 0;
        if (__qcxEyesTrack.raf) {
          window.cancelAnimationFrame(__qcxEyesTrack.raf);
          __qcxEyesTrack.raf = 0;
        }
        if (__qcxEyesBusy) return;
        var mark = host.__qcxLogoSvg || host.querySelector('.qcx-menu-logo-mark');
        if (!mark) return;
        var eyes = mark.querySelector('.logo-eyes');
        var left = mark.querySelector('.logo-eye-left');
        var right = mark.querySelector('.logo-eye-right');
        if (eyes) eyes.style.transform = '';
        if (left) left.style.transform = '';
        if (right) right.style.transform = '';
      };
      host.addEventListener('pointerenter', function () {
        playMenuLogoEyes(host.__qcxLogoSvg || svg);
      });
      host.addEventListener('pointermove', function (ev) { trackEyes(ev.clientX, ev.clientY); });
      host.addEventListener('mousemove', function (ev) { trackEyes(ev.clientX, ev.clientY); });
      host.addEventListener('pointerleave', resetEyes);
      host.addEventListener('mouseleave', resetEyes);
    }
    arm();
  }

  function closeLogoBrandMenu() {
    var menu = document.getElementById('qcx-logo-brand-menu');
    var backdrop = document.getElementById('qcx-logo-brand-backdrop');
    if (menu) {
      menu.classList.remove('is-open', 'is-copied');
      menu.hidden = true;
    }
    if (backdrop) backdrop.hidden = true;
  }

  function ensureLogoBrandMenu() {
    var menu = document.getElementById('qcx-logo-brand-menu');
    if (menu) return menu;

    var backdrop = document.createElement('div');
    backdrop.id = 'qcx-logo-brand-backdrop';
    backdrop.hidden = true;
    document.body.appendChild(backdrop);

    menu = document.createElement('div');
    menu.id = 'qcx-logo-brand-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    menu.innerHTML =
      '<a class="qcx-lbm-brand" href="/" role="menuitem">' +
      '<svg class="qcx-lbm-ghost" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">' +
      '<path d="M13.3144 23C12.7627 23 12.4869 23 12.26 22.8736C12.0755 22.7709 11.8991 22.5714 11.8198 22.3756C11.7222 22.135 11.7524 21.8913 11.8126 21.404C12.1663 18.5445 13.4632 15.8663 15.522 13.8076C17.9599 11.3696 21.2665 10 24.7144 10C28.1622 10 31.4688 11.3696 33.9067 13.8076C35.9655 15.8663 37.2624 18.5445 37.6161 21.404C37.6763 21.8913 37.7065 22.135 37.6089 22.3756C37.5296 22.5714 37.3532 22.7709 37.1687 22.8736C36.9418 23 36.666 23 36.1144 23L32.8158 23C32.2695 23 31.9963 23 31.8106 22.9221C31.6159 22.8403 31.5244 22.769 31.3977 22.6C31.2769 22.4389 31.1912 22.098 31.0199 21.4161C30.7358 20.2851 30.15 19.2412 29.3115 18.4028C28.0923 17.1836 26.4386 16.4986 24.7144 16.4986C22.9901 16.4986 21.3364 17.1836 20.1172 18.4028C19.2787 19.2412 18.693 20.2851 18.4088 21.4161C18.2375 22.098 18.1518 22.4389 18.031 22.6C17.9043 22.769 17.8128 22.8403 17.6181 22.9221C17.4324 23 17.1593 23 16.6129 23L13.3144 23Z" fill="var(--color-2, #5c7a6c)"/>' +
      '<path d="M13.3144 38C12.7627 38 12.4869 38 12.26 37.8736C12.0755 37.7709 11.8991 37.5714 11.8198 37.3756C11.7222 37.135 11.7524 36.8913 11.8126 36.404C12.1663 33.5445 13.4632 30.8663 15.522 28.8076C17.9599 26.3696 21.2665 25 24.7144 25C28.1622 25 31.4688 26.3696 33.9067 28.8076C35.9655 30.8663 37.2624 33.5445 37.6161 36.404C37.6763 36.8913 37.7065 37.135 37.6089 37.3756C37.5296 37.5714 37.3532 37.7709 37.1687 37.8736C36.9418 38 36.666 38 36.1144 38L32.8158 38C32.2695 38 31.9963 38 31.8106 37.9221C31.6159 37.8403 31.5244 37.769 31.3977 37.6C31.2769 37.4389 31.1912 37.098 31.0199 36.4161C30.7358 35.2851 30.15 34.2412 29.3115 33.4028C28.0923 32.1836 26.4386 31.4986 24.7144 31.4986C22.9901 31.4986 21.3364 32.1836 20.1172 33.4028C19.2787 34.2412 18.693 35.2851 18.4088 36.4161C18.2375 37.098 18.1518 37.4389 18.031 37.6C17.9043 37.769 17.8128 37.8403 17.6181 37.9221C17.4324 38 17.1593 38 16.6129 38L13.3144 38Z" fill="var(--color-1, #7a9a8a)"/>' +
      '</svg>' +
      '<div><p class="qcx-lbm-title">Brand</p>' +
      '<p class="qcx-lbm-desc">Assets, examples and guides.</p></div></a>' +
      '<div class="qcx-lbm-sep"></div>' +
      '<div class="qcx-lbm-actions">' +
      '<button type="button" class="qcx-lbm-btn" data-qcx-copy="png" role="menuitem">' +
      '<svg width="24" height="25" viewBox="0 0 24 25" fill="none" aria-hidden="true">' +
      '<rect x="6.5" y="9.16748" width="16" height="12" rx="2.5" fill="#7a9a8a"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M4 4.5C2.61929 4.5 1.5 5.61929 1.5 7V14C1.5 15.3807 2.61929 16.5 4 16.5H5V11.6675C5 9.45834 6.79086 7.66748 9 7.66748H17.5V7C17.5 5.61929 16.3807 4.5 15 4.5H4Z" fill="#5c7a6c"/></svg>' +
      '<span>Copy as PNG</span></button>' +
      '<button type="button" class="qcx-lbm-btn" data-qcx-copy="svg" role="menuitem">' +
      '<svg width="25" height="25" viewBox="0 0 25 25" fill="none" aria-hidden="true">' +
      '<path d="M11.2985 8.79086C10.5446 7.38345 8.52658 7.38345 7.77261 8.79086L3.07724 17.5556C2.36349 18.8879 3.32873 20.5 4.8402 20.5H14.231C15.7424 20.5 16.7077 18.8879 15.9939 17.5556L11.2985 8.79086Z" fill="#7a9a8a"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M12.46 7.81069C12.5167 7.89771 12.5704 7.98833 12.6209 8.08256L17.3163 16.8472C17.4127 17.0272 17.4917 17.2102 17.554 17.3945C20.5659 17.1321 22.9287 14.6041 22.9287 11.5242C22.9287 8.26966 20.2904 5.63135 17.0358 5.63135C15.1889 5.63135 13.5404 6.48097 12.46 7.81069Z" fill="#5c7a6c"/></svg>' +
      '<span>Copy as SVG</span></button>' +
      '</div>' +
      '<div class="qcx-lbm-copied" aria-live="polite">Copied!</div>';
    document.body.appendChild(menu);

    var copying = false;
    function flashCopied() {
      menu.classList.add('is-copied');
      window.setTimeout(function () {
        menu.classList.remove('is-copied');
        copying = false;
      }, 1200);
    }

    function copySvg() {
      return navigator.clipboard.writeText(QCX_MENU_LOGO_SVG_EXPORT);
    }

    function copyPng() {
      return new Promise(function (resolve, reject) {
        var svg = QCX_MENU_LOGO_SVG_EXPORT;
        var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
          try {
            var scale = 8;
            var canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            canvas.toBlob(function (pngBlob) {
              if (!pngBlob) {
                reject(new Error('png'));
                return;
              }
              navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]).then(resolve, reject);
            }, 'image/png');
          } catch (err) {
            URL.revokeObjectURL(url);
            reject(err);
          }
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error('img'));
        };
        img.src = url;
      });
    }

    menu.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('[data-qcx-copy]') : null;
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (copying) return;
      copying = true;
      var kind = btn.getAttribute('data-qcx-copy');
      var job = kind === 'png' ? copyPng() : copySvg();
      Promise.resolve(job).then(function () {
        flashCopied();
      }).catch(function () {
        if (kind === 'png') {
          copySvg().then(function () { flashCopied(); }).catch(function () { copying = false; });
        } else {
          copying = false;
        }
      });
    });

    backdrop.addEventListener('pointerdown', function () { closeLogoBrandMenu(); });
    document.addEventListener('pointerdown', function (ev) {
      if (menu.hidden) return;
      if (menu.contains(ev.target)) return;
      var host = document.getElementById('qcx-menu-logo');
      if (host && host.contains(ev.target)) return;
      closeLogoBrandMenu();
    }, true);
    window.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeLogoBrandMenu();
    });
    window.addEventListener('scroll', function () { closeLogoBrandMenu(); }, true);
    window.addEventListener('resize', function () { closeLogoBrandMenu(); });
    return menu;
  }

  function openLogoBrandMenu(host) {
    var menu = ensureLogoBrandMenu();
    var backdrop = document.getElementById('qcx-logo-brand-backdrop');
    menu.classList.remove('is-open', 'is-copied');
    menu.hidden = false;
    if (backdrop) backdrop.hidden = false;

    var anchor = host.getBoundingClientRect();
    menu.style.left = '0px';
    menu.style.top = '0px';
    /* Force layout then place under logo like Aave (left-aligned, top: logo bottom + 2px) */
    var mw = menu.offsetWidth || 296;
    var mh = menu.offsetHeight || 120;
    var left = Math.max(8, Math.min(anchor.left - 4, window.innerWidth - mw - 12));
    var top = Math.max(8, Math.min(anchor.bottom + 2, window.innerHeight - mh - 12));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';

    /* Spring-open next frame */
    window.requestAnimationFrame(function () {
      menu.classList.add('is-open');
    });
    playMenuLogoEyes(host.__qcxLogoSvg || host.querySelector('.qcx-menu-logo-mark'));
  }

  function bindMenuLogoBrandMenu(host) {
    if (!host || host.getAttribute('data-qcx-brand-menu') === '1') return;
    host.setAttribute('data-qcx-brand-menu', '1');
    host.addEventListener('contextmenu', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openLogoBrandMenu(host);
    });
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
