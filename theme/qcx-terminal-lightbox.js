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
