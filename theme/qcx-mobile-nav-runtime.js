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
     2. NAVIGATION MENU ENHANCER & SMART LABEL CATEGORIZER
     ========================================================== */
  function buildNavMenu() {
    var nav = document.getElementById('qcx-menu-nav');
    if (!nav) return;
    if (nav.getAttribute('data-qcx-enhanced') === 'true') return;
    function el(tag, cls, txt) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (typeof txt === 'string') node.textContent = txt;
      return node;
    }
    nav.innerHTML = '';
    var sec1 = el('div', 'qcx-menu-section', 'ĐIỀU HƯỚNG CHÍNH');
    sec1.style.cssText = 'padding:14px 16px 6px;font-size:11px;font-weight:700;color:rgba(138,165,150,.85);letter-spacing:.08em;';
    nav.appendChild(sec1);
    var MAIN_MENUS = [
      { title: 'Trang chủ', icon: '🏠', href: '/' },
      { title: 'Hướng Dẫn Skill & Prompt', icon: '⚡', href: '/search/label/AI?max-results=12' },
      { title: 'Mã Nguồn Mở', icon: '💻', href: '/search/label/Developer?max-results=12' },
      { title: 'Thủ Thuật Windows', icon: '🪟', href: '/search/label/Tools?max-results=12' }
    ];
    MAIN_MENUS.forEach(function(item) {
      var isCur = false;
      try {
        var u = new URL(item.href, location.href);
        if (item.href === '/') {
          isCur = location.pathname === '/' || location.pathname === '';
        } else {
          var tag = u.pathname.replace(/.*\/search\/label\//, '');
          isCur = tag && decodeURIComponent(location.pathname).indexOf(decodeURIComponent(tag)) !== -1;
        }
      } catch (e) {}
      var a = el('a', 'qcx-menu-link' + (isCur ? ' qcx-menu-current' : ''));
      a.href = item.href;
      var icon = el('span', 'qcx-menu-link-icon', item.icon);
      icon.style.cssText = 'font-size:16px;line-height:1;margin-right:10px;';
      var txt = el('span', 'qcx-menu-link-text', item.title);
      a.appendChild(icon);
      a.appendChild(txt);
      nav.appendChild(a);
    });
    var rawLinks = document.querySelectorAll('#Label1 a[href*="/search/label/"], .widget.Label a[href*="/search/label/"], a[href*="/search/label/"]');
    var allLabels = {};
    Array.prototype.forEach.call(rawLinks, function(a) {
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
      if (!allLabels[k]) {
        allLabels[k] = { name: cleanName, href: href };
      }
    });
    var CATEGORIES = [
      {
        name: 'SKILL & AI PROMPT',
        icon: '⚡',
        match: /^(AI|Prompt|Skill|ChatGPT|Grok|HeyGen|Make|Canva|Design|Audio|Tutorial|OpenAI)$/i,
        items: []
      },
      {
        name: 'MÃ NGUỒN MỞ & API',
        icon: '💻',
        match: /^(Developer|API|Google Cloud|Gemini|Exa|Exa\.ai|Open-Source|GitHub|Cloud)$/i,
        items: []
      },
      {
        name: 'THỦ THUẬT WINDOWS & TOOLS',
        icon: '🪟',
        match: /^(Windows|Tools|CapCut|Editing|Video|Automation)$/i,
        items: []
      },
      {
        name: 'HỌC TẬP & KHÁC',
        icon: '📚',
        match: /^(EdTech|Giáo dục|Ôn thi THPT|Học online|Học sinh|Luyện thi miễn phí|IOS|Jailbreak|MOBILE|Figma)$/i,
        items: []
      }
    ];
    Object.keys(allLabels).forEach(function(k) {
      var item = allLabels[k];
      for (var i = 0; i < CATEGORIES.length; i++) {
        if (CATEGORIES[i].match.test(item.name)) {
          CATEGORIES[i].items.push(item);
          break;
        }
      }
    });
    CATEGORIES.forEach(function(cat) {
      if (!cat.items.length) return;
      var sec = el('div', 'qcx-menu-section', cat.icon + ' ' + cat.name);
      sec.style.cssText = 'padding:14px 16px 6px;font-size:11px;font-weight:700;color:#00e599;letter-spacing:.06em;';
      nav.appendChild(sec);
      var cloud = el('div', 'qcx-menu-labels-cloud');
      cloud.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:4px 16px 12px;';
      cat.items.forEach(function(item) {
        var chip = el('a', 'qcx-menu-chip', item.name);
        chip.href = item.href;
        chip.title = 'Nhãn ' + item.name;
        chip.style.cssText = 'padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#d0ded5;font-size:12px;text-decoration:none;transition:background .15s;';
        cloud.appendChild(chip);
      });
      nav.appendChild(cloud);
    });
    nav.setAttribute('data-qcx-enhanced', 'true');
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
