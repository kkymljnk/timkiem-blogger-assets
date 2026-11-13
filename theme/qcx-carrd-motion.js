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
      svg.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          qcxGhostBlink(svg);
        }
      });
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
