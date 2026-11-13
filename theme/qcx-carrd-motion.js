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
    nodes.forEach(function (svg) {
      var eyes = svg.querySelectorAll('.qcx-eye');
      Array.prototype.forEach.call(eyes, function (eye) {
        var prev = eye.previousElementSibling;
        if (prev && prev.classList && prev.classList.contains('qcx-eye-socket')) return;
        var cx = eye.getAttribute('cx');
        var cy = eye.getAttribute('cy');
        var r = parseFloat(eye.getAttribute('r') || '13');
        if (!cx || !cy || !isFinite(r)) return;
        var socket = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        socket.setAttribute('class', 'qcx-eye-socket');
        socket.setAttribute('cx', cx);
        socket.setAttribute('cy', cy);
        socket.setAttribute('r', String(Math.round((r + 3.3) * 10) / 10));
        socket.setAttribute('fill', '#f2f2f2');
        if (eye.parentNode) eye.parentNode.insertBefore(socket, eye);
      });
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
