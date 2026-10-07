// Navbar

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

(() => {
  const html = document.documentElement;
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY <= 0) {
      html.classList.remove('up', 'down');
    } else if (currentScrollY < lastScrollY) {
      html.classList.remove('down');
      html.classList.add('up');
    } else if (currentScrollY > lastScrollY) {
      html.classList.remove('up');
      html.classList.add('down');
    }

    lastScrollY = currentScrollY;
  }, { passive: true });
})();

$("#nav-button").on("click", function () {
  $("body").toggleClass("menu-open");
  if (typeof stopSmoothScroll === 'function' && typeof startSmoothScroll === 'function') {
    if ($("body").hasClass("menu-open")) {
      stopSmoothScroll();
    } else {
      startSmoothScroll();
    }
  }
});

/* ==========================================================================
   PAGE FEATURE INITIALISATION
   ========================================================================== */

// Holds a reference to the logo-slider controller so we can call
// startBannerAnimation() after the loader has fully retreated.
var _logoSliderCtrl = null;

// Resolve an asset path relative to this script's base directory so it works
// from any page path or nesting level.
function getAssetUrl(relPath) {
  var scripts = document.querySelectorAll('script[src]');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src;
    var idx = src.indexOf('js/main.js');
    if (idx !== -1) {
      return src.substring(0, idx) + relPath;
    }
  }
  return '/' + relPath;
}

// Dynamically inject a <script> tag and call `cb` when it finishes loading.
// If the script is already on the page (matched by src), calls `cb` immediately.
function loadScript(src, cb) {
  var existing = document.querySelector('script[src="' + src + '"]');
  if (existing) { if (cb) cb(); return; }
  var s = document.createElement('script');
  s.src = src;
  s.onload = function () { if (cb) cb(); };
  s.onerror = function () { if (cb) cb(); }; // still call cb so the transition doesn't hang
  document.head.appendChild(s);
}

// Dynamically inject a <link rel="stylesheet"> tag if not already present.
function loadStyle(href, cb) {
  var existing = document.querySelector('link[href*="' + href + '"]');
  if (existing) { if (cb) cb(); return; }
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  if (cb) {
    link.onload = cb;
    link.onerror = cb;
  }
  document.head.appendChild(link);
}

// Ensure both Swiper stylesheet and JS bundle are loaded.
function loadSwiperAssets(cb) {
  var cssUrl = getAssetUrl('css/swiper-bundle.min.css');
  var jsUrl = getAssetUrl('js/vendor/swiper-bundle.min.js');
  loadStyle(cssUrl);

  if (typeof Swiper !== 'undefined') {
    if (cb) cb();
  } else {
    loadScript(jsUrl, cb);
  }
}

// Incrementing counter — bumped at the start of every Barba transition.
// Any async callback that captures a stale generation value is a no-op.
var _transitionGen = 0;

// Initialises all interactive page components (sliders, dialogs, etc.).
// The logo-slider's banner entrance animation is NOT started here — call
// triggerBannerAnimation() separately once the loader has retreated.
function initPageComponents(root) {
  _logoSliderCtrl = initLogoSlider();
  initActionWatch();
  initDesignerSlider();
  initStillSlider();
  initTrailerDialog();
  initReferenceVideo();
  initPopupWatch();
  initWatchScrollAnimationpage(root);
  initWatchScrollAnimation(root);
  initCustAnimate(root);
  initEveryAnimate(root);
  initFilmImageParallax(root);

  if (typeof refreshSmoothScroll === 'function') {
    requestAnimationFrame(function () {
      refreshSmoothScroll();
    });
  }
}

// Tears down all interactive components that were set up by initPageComponents().
// Must be called before each Barba transition to prevent duplicate listeners
// and stale slider instances on the outgoing page.
function destroyPageComponents() {
  if (typeof destroySmoothScroll === 'function') {
    destroySmoothScroll();
  }

  // Stop the banner canvases and their autoplay tween before the DOM is swapped.
  if (_logoSliderCtrl && typeof _logoSliderCtrl.destroy === 'function') {
    try { _logoSliderCtrl.destroy(); } catch (e) {}
  }
  _logoSliderCtrl = null;

  // Destroy Slick slider
  try {
    var $ss = $('.still-slider');
    if ($ss.length && $ss.hasClass('slick-initialized')) {
      $ss.slick('destroy');
    }
  } catch (e) {}

  // Destroy all Swiper instances
  document.querySelectorAll('.designer-slider').forEach(function (el) {
    if (el.swiper && !el.swiper.destroyed) {
      try { el.swiper.destroy(true, true); } catch (e) {}
    }
  });

  // Close and reset trailer dialog, then remove any stale listener bindings so
  // the next Barba page can fully re-initialize the popup.
  var dialog = document.getElementById('trailer-dialog');
  if (dialog) {
    if (dialog._trailerDialogClickHandler) {
      dialog.removeEventListener('click', dialog._trailerDialogClickHandler);
      delete dialog._trailerDialogClickHandler;
    }
    if (dialog._trailerDialogCloseHandler) {
      dialog.removeEventListener('close', dialog._trailerDialogCloseHandler);
      delete dialog._trailerDialogCloseHandler;
    }

    var closeButton = dialog.querySelector('.trailer-dialog_close');
    if (closeButton && closeButton._trailerCloseHandler) {
      closeButton.removeEventListener('click', closeButton._trailerCloseHandler);
      delete closeButton._trailerCloseHandler;
    }

    document.querySelectorAll('.js-trailer-trigger').forEach(function (trigger) {
      if (trigger._trailerClickHandler) {
        trigger.removeEventListener('click', trigger._trailerClickHandler);
        delete trigger._trailerClickHandler;
      }
      delete trigger._trailerClickListenerAttached;
    });

    var vid = dialog.querySelector('.trailer-dialog_video');
    if (vid) { vid.pause(); vid.currentTime = 0; }
    if (typeof dialog.close === 'function') {
      try { dialog.close(); } catch (e) {}
    }
    delete dialog._trailerDialogClickListenerAttached;
    delete dialog._trailerDialogCloseListenerAttached;
  }

  // Pause any hover-triggered reference videos
  document.querySelectorAll('.reference-video-media').forEach(function (v) {
    try { v.pause(); } catch (e) {}
  });

  // Pause action-watch video
  var aw = document.querySelector('.js-action-watch-video');
  if (aw) { try { aw.pause(); } catch (e) {} }

  destroyWatchScrollAnimation();
  destroyCustAnimate();
  destroyEveryAnimate();
  destroyFilmImageParallax();
}

// Call this after the loader has fully retreated to start the home-page
// banner entrance animation (maple leaf / olympic canvas animateIn).
function triggerBannerAnimation() {
  if (_logoSliderCtrl && typeof _logoSliderCtrl.startBannerAnimation === 'function') {
    _logoSliderCtrl.startBannerAnimation();
  }
}

// GSAP tweens created for the stacked "Watch" text. Must be killed before
// each Barba swap so they do not keep targeting removed DOM nodes.
var _watchScrollAnims = [];

function trackWatchScrollAnim(tween) {
  if (tween) _watchScrollAnims.push(tween);
}

function destroyWatchScrollAnimation() {
  _watchScrollAnims.forEach(function (tween) {
    if (tween.scrollTrigger) tween.scrollTrigger.kill();
    tween.kill();
  });
  _watchScrollAnims = [];
}

function getWatchScope(root) {
  return root && root.querySelector ? root : document;
}

// Footer stacked-Watch motion (pages that use .new-cust).
function initWatchScrollAnimation(root) {

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  var scope = getWatchScope(root);
  var container = scope.querySelector('.new-cust');
  if (!container) return;

  var bigTextone = container.querySelector('.big-text-one');
  var bigTexttwo = container.querySelector('.big-text-two');
  var bigTextthree = container.querySelector('.big-text-three');

  gsap.registerPlugin(ScrollTrigger);

  if (bigTextone) {
    trackWatchScrollAnim(gsap.fromTo(bigTextone,
      { yPercent: 30 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: '70% bottom',
          end: 'bottom 100%',
          scrub: 1,
          markers: false
        }
      }
    ));
  }

  if (bigTexttwo) {
    trackWatchScrollAnim(gsap.fromTo(bigTexttwo,
      { yPercent: 60 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: '70% bottom',
          end: 'bottom 100%',
          scrub: 1,
          markers: false
        }
      }
    ));
  }

  if (bigTextthree) {
    trackWatchScrollAnim(gsap.fromTo(bigTextthree,
      { yPercent: 90 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: '70% bottom',
          end: 'bottom 100%',
          scrub: 1,
          markers: false
        }
      }
    ));
  }

  ScrollTrigger.refresh();
}

// Watch-page stacked-Watch motion (the .big-text-main hero).
function initWatchScrollAnimationpage(root) {

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  var scope = getWatchScope(root);
  var container = scope.querySelector('.big-text-main');
  if (!container) return;

  var bigTextonepage = container.querySelector('.big-text-one');
  var bigTexttwopage = container.querySelector('.big-text-two');
  var bigTextthreepage = container.querySelector('.big-text-three');

  gsap.registerPlugin(ScrollTrigger);

  if (bigTextonepage) {
    trackWatchScrollAnim(gsap.fromTo(bigTextonepage,
      { yPercent: 18 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: '50% 50%',
          end: '50% top',
          scrub: 1,
          markers: false
        }
      }
    ));
  }

  if (bigTexttwopage) {
    trackWatchScrollAnim(gsap.fromTo(bigTexttwopage,
      { yPercent: 36 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: '50% 50%',
          end: '50% top',
          scrub: 1,
          markers: false
        }
      }
    ));
  }

  if (bigTextthreepage) {
    trackWatchScrollAnim(gsap.fromTo(bigTextthreepage,
      { yPercent: 54 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: '50% 50%',
          end: '50% top',
          scrub: 1,
          markers: false
        }
      }
    ));
  }

  ScrollTrigger.refresh();
}

// Full initialisation used on the first page load.
// Handles DOM-state class management AND component initialisation.
function initPageFeatures() {
  // Force a paint of the "covered" loader state before removing it,
  // otherwise the browser can collapse add+remove into one frame and
  // the wipe-out CSS transition never plays.
  // Important: dom-is-loaded / dom-is-animated must only be added AFTER
  // dom-is-loading is removed — never overlap.
  initPageComponents();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.documentElement.classList.remove('dom-is-loading');
      document.documentElement.classList.add('dom-is-loaded');
      // Trigger the banner animation NOW that the loader has retreated.
      triggerBannerAnimation();
      if (typeof initSmoothScroll === 'function') {
        initSmoothScroll();
      }
      setTimeout(function () {
        document.documentElement.classList.add('dom-is-animated');
      }, 100);
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initPageFeatures();
});


function initDesignerSlider() {
  var sliders = document.querySelectorAll('.designer-slider');
  
  sliders.forEach(function(slider) {
    function doInit() {
      if (!document.body.contains(slider)) return;

      // Destroy any pre-existing Swiper instance on the element to avoid double-init
      if (slider.swiper && typeof slider.swiper.destroy === 'function') {
        try {
          slider.swiper.destroy(true, true);
        } catch (e) {}
      }

      try {
        var swiperInstance = new Swiper(slider, {
          slidesPerView: 2.5,
          spaceBetween: 0,
          mousewheel: true,
          preventClicks: true,
          speed: 600,
          navigation: {
            nextEl: slider.querySelector('.swiper-button-next'),
            prevEl: slider.querySelector('.swiper-button-prev'),
          },
          loop: true,
          observer: true,
          observeParents: true,
          resizeObserver: true,
          breakpoints: {
            0: {
              slidesPerView: 1
            },
            768: {
              slidesPerView: 2
            },
            1000: {
              slidesPerView: 2.5,
              observer: false
            }
          }
        });

        // Recalculate dimensions on next animation frames so layout is 100% accurate
        requestAnimationFrame(function () {
          if (swiperInstance && !swiperInstance.destroyed) {
            swiperInstance.update();
          }
        });

        // Also update when images load to ensure correct layout
        var images = slider.querySelectorAll('img');
        images.forEach(function(img) {
          if (img.complete) return;
          img.addEventListener('load', function() {
            if (swiperInstance && !swiperInstance.destroyed) {
              swiperInstance.update();
            }
          });
        });
      } catch (err) {
        console.error('Error initializing designer Swiper:', err);
      }
    }

    if (typeof Swiper !== 'undefined') {
      doInit();
    } else {
      loadSwiperAssets(doInit);
    }
  });
}

function initStillSlider() {
  var $slider = $('.still-slider');
  if (!$slider.length || typeof $.fn.slick === 'undefined') return;

  // Always destroy a stale slick instance before re-initialising —
  // Barba caches pages, so navigating back would try to double-init.
  if ($slider.hasClass('slick-initialized')) {
    try { $slider.slick('destroy'); } catch (e) {}
  }

  $slider.slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    infinite: true,
    centerMode: true,
    centerPadding: '0px',
    speed: 600,
    autoplay: true,
    autoplaySpeed: 2500,
    dots: false,
    arrows: true,
    prevArrow: '.stills-main .prev-arrow',
    nextArrow: '.stills-main .next-arrow',
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1
        }
      }
    ]
  });
}

/* ── Utility: simple Perlin-ish noise (value noise) ──────────────────────── */
function valueNoise(x, y, t) {
  var ix = Math.floor(x), iy = Math.floor(y);
  var fx = x - ix, fy = y - iy;
  var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  function h(a, b, c) { return Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453123 % 1; }
  return (
    h(ix, iy, t) * (1 - u) * (1 - v) +
    h(ix + 1, iy, t) * u * (1 - v) +
    h(ix, iy + 1, t) * (1 - u) * v +
    h(ix + 1, iy + 1, t) * u * v
  );
}

/* ── Canvas render helpers ────────────────────────────────────────────────
   The banner canvases used to each own a private requestAnimationFrame loop.
   Those loops ran forever — off-screen, on inactive slides, and (because
   nothing ever cancelled them) once more for every Barba return to Home.
   Routing them through gsap.ticker keeps the whole site on ONE frame loop
   shared with Lenis and ScrollTrigger, so canvas work can never land between
   a Lenis scroll update and a ScrollTrigger update.
   ────────────────────────────────────────────────────────────────────────── */

// Register a per-frame callback. Returns a function that unregisters it.
function addCanvasTick(fn) {
  if (typeof gsap !== 'undefined' && gsap.ticker) {
    gsap.ticker.add(fn);
    return function () { gsap.ticker.remove(fn); };
  }
  var raf;
  var stopped = false;
  function loop() {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    fn();
  }
  raf = requestAnimationFrame(loop);
  return function () {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}

// Tells a canvas whether it is worth drawing this frame: it must be on screen,
// on the active slide, and in a foreground tab.
function createCanvasVisibility(canvas) {
  var slide = canvas.closest ? canvas.closest('.v-logos-slider_item') : null;
  var observer = null;
  var inView = true;

  if (typeof IntersectionObserver !== 'undefined') {
    inView = false;
    observer = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { rootMargin: '150px 0px' });
    observer.observe(canvas);
  }

  return {
    shouldRender: function () {
      if (document.hidden) return false;
      if (!inView) return false;
      if (slide && !slide.classList.contains('is-active')) return false;
      return true;
    },
    destroy: function () {
      if (observer) observer.disconnect();
      observer = null;
    }
  };
}

/* ── Maple Leaf canvas renderer ───────────────────────────────────────────── */
function initMapleLeafCanvas(canvas) {
  var ctx = canvas.getContext('2d');
  var COLOR = '#F86939';
  var W, H, scale, ox, oy;

  // ViewBox: x in [-320,320], y in [-50,850]
  var VB_W = 640, VB_H = 900, VB_OX = 320, VB_OY = 50;

  // Triangle definitions [points in viewBox coords] + centroid
  var TRIANGLES = [
    { pts: [[100, 519.6], [0, 346.4], [-100, 519.6]], cx: 0, cy: 461.87 },
    { pts: [[-100, 519.6], [0, 346.4], [-200, 346.4]], cx: -100, cy: 404.13 },
    { pts: [[-100, 519.6], [-200, 346.4], [-300, 519.6]], cx: -200, cy: 461.87 },
    { pts: [[100, 519.6], [0, 346.4], [200, 346.4]], cx: 100, cy: 404.13 },
    { pts: [[100, 519.6], [200, 346.4], [300, 519.6]], cx: 200, cy: 461.87 },
    { pts: [[0, 346.4], [200, 346.4], [100, 173.2]], cx: 100, cy: 288.67 },
    { pts: [[0, 346.4], [-200, 346.4], [-100, 173.2]], cx: -100, cy: 288.67 },
    { pts: [[100, 173.2], [0, 346.4], [-100, 173.2]], cx: 0, cy: 230.93 },
    { pts: [[200, 346.4], [100, 173.2], [300, 173.2]], cx: 200, cy: 230.93 },
    { pts: [[-200, 346.4], [-100, 173.2], [-300, 173.2]], cx: -200, cy: 230.93 },
    { pts: [[-100, 173.2], [100, 173.2], [0, 0]], cx: 0, cy: 115.47 }
  ];
  // Tail rect: cx=0, cy=519.6 (top-center of rect)
  var TAIL = { x: -15, y: 519.6, w: 30, h: 300, cx: 0, cy: 669.6 };

  // Physics state for each piece
  var pieces = TRIANGLES.map(function () {
    return { ox: 0, oy: 0, vx: 0, vy: 0, alpha: 0, alphaTarget: 0, scaleVal: 0, scaleTarget: 0 };
  });
  var tailState = { ox: 0, oy: 0, vx: 0, vy: 0, alpha: 0, alphaTarget: 0, scaleVal: 0, scaleTarget: 0 };

  var mouse = { x: -9999, y: -9999, inside: false };
  var pointer = { clientX: -9999, clientY: -9999, dirty: false };
  var tilt = { x: 0, y: 0, targetX: 0, targetY: 0 };

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;
    scale = Math.min(W / VB_W, H / VB_H) * 0.72;
    ox = W / 2;
    oy = H / 2 - (VB_H * scale * 0.5 - VB_OY * scale);
  }

  function vbToScreen(x, y) {
    return [ox + (x) * scale, oy + (y - VB_OY) * scale];
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    var SPRING = 0.08, DAMPING = 0.72, REPEL_RADIUS = 260 * (scale / 0.72);

    // Smooth tilt lerp
    tilt.x += (tilt.targetX - tilt.x) * 0.08;
    tilt.y += (tilt.targetY - tilt.y) * 0.08;

    TRIANGLES.forEach(function (tri, i) {
      var p = pieces[i];

      // Repulsion from mouse
      var cx = ox + tri.cx * scale + tilt.x;
      var cy = oy + (tri.cy - VB_OY) * scale + tilt.y;
      var dx = cx + p.ox - mouse.x;
      var dy = cy + p.oy - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;

      if (mouse.inside && dist < REPEL_RADIUS) {
        var force = Math.pow(1 - dist / REPEL_RADIUS, 1.5) * 85;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Spring back
      p.vx += (0 - p.ox) * SPRING;
      p.vy += (0 - p.oy) * SPRING;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.ox += p.vx;
      p.oy += p.vy;

      // Alpha/scale entrance
      p.alpha += (p.alphaTarget - p.alpha) * 0.12;
      p.scaleVal += (p.scaleTarget - p.scaleVal) * 0.12;

      if (p.alpha < 0.01) return;

      var pts = tri.pts.map(function (pt) { return vbToScreen(pt[0], pt[1]); });
      var scrCx = ox + tri.cx * scale;
      var scrCy = oy + (tri.cy - VB_OY) * scale;

      ctx.save();
      ctx.translate(scrCx + p.ox + tilt.x, scrCy + p.oy + tilt.y);
      ctx.scale(p.scaleVal, p.scaleVal);
      ctx.translate(-scrCx, -scrCy);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = COLOR;
      ctx.strokeStyle = COLOR;
      ctx.lineWidth = 2.5; // Stroke edges to eliminate gaps/borders between triangles!
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke(); // Fill anti-aliased subpixel seams
      ctx.restore();
    });

    // Tail
    (function () {
      var p = tailState;
      var cx = ox + TAIL.cx * scale + tilt.x;
      var cy = oy + (TAIL.cy - VB_OY) * scale + tilt.y;
      var dx = cx + p.ox - mouse.x, dy = cy + p.oy - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var REPEL_RADIUS2 = 180 * (scale / 0.72);
      if (mouse.inside && dist < REPEL_RADIUS2) {
        var force = Math.pow(1 - dist / REPEL_RADIUS2, 1.5) * 45;
        p.vx += (dx / dist) * force;
      }
      p.vx += (0 - p.ox) * SPRING; p.vx *= DAMPING; p.ox += p.vx;
      p.vy += (0 - p.oy) * SPRING; p.vy *= DAMPING; p.oy += p.vy;
      p.alpha += (p.alphaTarget - p.alpha) * 0.1;
      p.scaleVal += (p.scaleTarget - p.scaleVal) * 0.1;
      if (p.alpha < 0.01) return;
      var tx = ox + TAIL.x * scale + p.ox + tilt.x;
      var ty = oy + (TAIL.y - VB_OY) * scale + p.oy + tilt.y;
      var tw = TAIL.w * scale, th = TAIL.h * scale;
      var tailCy = oy + (TAIL.y - VB_OY) * scale + tilt.y;
      ctx.save();
      ctx.translate(tx + tw / 2, tailCy);
      ctx.scale(1, p.scaleVal);
      ctx.translate(-(tx + tw / 2), -tailCy);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = COLOR;
      ctx.strokeStyle = COLOR;
      ctx.lineWidth = 2.0;
      ctx.fillRect(tx, ty - p.oy, tw, th);
      ctx.strokeRect(tx, ty - p.oy, tw, th);
      ctx.restore();
    })();
  }

  function animateIn() {
    pieces.forEach(function (p, i) {
      p.scaleVal = 0; p.scaleTarget = 1; p.alpha = 0;
      setTimeout(function () { p.alphaTarget = 1; }, 300 + i * 40);
    });
    tailState.scaleVal = 0; tailState.scaleTarget = 1; tailState.alpha = 0;
    setTimeout(function () { tailState.alphaTarget = 1; }, 900);
  }

  function animateOut() {
    pieces.forEach(function (p) { p.alphaTarget = 0; p.scaleTarget = 0; });
    tailState.alphaTarget = 0; tailState.scaleTarget = 0;
  }

  function handleMouseMove(e) {
    // Only store the coordinates here. Reading getBoundingClientRect() on every
    // mousemove forces a layout flush, which is a classic scroll-jank source
    // when the pointer moves while Lenis is animating the scroll.
    pointer.clientX = e.clientX;
    pointer.clientY = e.clientY;
    pointer.dirty = true;
  }

  // Resolve the cached pointer position against the canvas box — once per
  // frame, and only when the pointer actually moved.
  function syncPointer() {
    if (!pointer.dirty) return;
    pointer.dirty = false;

    var r = canvas.getBoundingClientRect();
    if (pointer.clientX >= r.left && pointer.clientX <= r.right &&
        pointer.clientY >= r.top && pointer.clientY <= r.bottom) {
      mouse.x = pointer.clientX - r.left;
      mouse.y = pointer.clientY - r.top;
      mouse.inside = true;
      tilt.targetX = ((pointer.clientX - r.left) / r.width - 0.5) * 35;
      tilt.targetY = ((pointer.clientY - r.top) / r.height - 0.5) * 35;
    } else {
      mouse.inside = false;
      tilt.targetX = 0;
      tilt.targetY = 0;
    }
  }

  // Nothing is moving and nothing is fading — the canvas already holds the
  // correct pixels, so we can skip the frame entirely instead of clearing and
  // repainting an identical image.
  function isSettled() {
    if (mouse.inside) return false;
    if (Math.abs(tilt.targetX - tilt.x) > 0.05) return false;
    if (Math.abs(tilt.targetY - tilt.y) > 0.05) return false;

    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (Math.abs(p.vx) > 0.01 || Math.abs(p.vy) > 0.01) return false;
      if (Math.abs(p.alphaTarget - p.alpha) > 0.005) return false;
      if (Math.abs(p.scaleTarget - p.scaleVal) > 0.005) return false;
    }

    var tl = tailState;
    if (Math.abs(tl.vx) > 0.01 || Math.abs(tl.vy) > 0.01) return false;
    if (Math.abs(tl.alphaTarget - tl.alpha) > 0.005) return false;
    if (Math.abs(tl.scaleTarget - tl.scaleVal) > 0.005) return false;

    return true;
  }

  function tick() {
    if (!visibility.shouldRender()) return;
    syncPointer();
    if (isSettled()) return;
    drawFrame();
  }

  function handleResize() { resize(); }

  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  window.addEventListener('resize', handleResize);
  resize();

  var visibility = createCanvasVisibility(canvas);
  var stopTick = addCanvasTick(tick);

  function destroy() {
    stopTick();
    visibility.destroy();
    document.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('resize', handleResize);
  }

  return { animateIn: animateIn, animateOut: animateOut, destroy: destroy };
}

/* ── Olympic canvas renderer ──────────────────────────────────────────────── */
function initOlympicCanvas(canvas, imgSrc) {
  var ctx = canvas.getContext('2d');
  var W, H;
  var img = new Image();
  img.src = imgSrc;
  var imgLoaded = false;
  img.onload = function () { imgLoaded = true; };

  var t = 0;
  var lastDraw = 0;
  var settleTimer = null;
  var pointer = { clientX: -9999, clientY: -9999, dirty: false };
  var mouseX = 0.5, mouseY = 0.5, mouseInside = false;
  var waveX = 0.5, waveY = 0.5, targetWaveX = 0.5, targetWaveY = 0.5;   // normalized wave center with lerp
  var waveAmp = 0, waveAmpTarget = 0;
  var idleAmp = 3.5;                  // subtle resting ripple amplitude

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    if (!imgLoaded) return;

    t += 0.016;
    // Smooth lerp for liquid wave positions & intensity
    waveX += (targetWaveX - waveX) * 0.07;
    waveY += (targetWaveY - waveY) * 0.07;
    waveAmp += (waveAmpTarget - waveAmp) * 0.05;

    // Draw image with displacement
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var fit = Math.min(W / iw, H / ih) * 0.7;
    var dw = iw * fit, dh = ih * fit;
    var dx = (W - dw) / 2, dy = (H - dh) / 2;

    // 32x32 = 1024 slices per frame instead of the old 80x80 = 6400. At this
    // canvas size the ripple is visually identical, but it costs ~6x less CPU
    // and ~6x fewer canvas draw calls, which is what was blowing the frame
    // budget and stuttering the scroll on Home.
    var ROWS = 32, COLS = 32;
    var cellW = dw / COLS, cellH = dh / ROWS;

    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        var u = col / COLS, v = row / ROWS;

        // Idle global wave
        var nx = u * 3.5 + t * 0.4;
        var ny = v * 3.5 + t * 0.3;
        var idleOffX = valueNoise(nx, ny, 0) * idleAmp;
        var idleOffY = valueNoise(nx + 100, ny, 0) * idleAmp;

        // Mouse ripple wave
        var ddx = u - waveX, ddy = v - waveY;
        var d = Math.sqrt(ddx * ddx + ddy * ddy) * 2.5;
        var rippleOff = Math.sin(d * 10 - t * 5) * waveAmp * Math.max(0, 1 - d);
        var rox = ddx > 0.001 ? rippleOff * (ddx / (d || 1)) : 0;
        var roy = ddy > 0.001 ? rippleOff * (ddy / (d || 1)) : 0;

        var offX = idleOffX + rox * 28;
        var offY = idleOffY + roy * 28;

        // Source rect (with displacement)
        var sx = (u + offX / dw) * iw;
        var sy = (v + offY / dh) * ih;
        var sw = iw / COLS;
        var sh = ih / ROWS;

        sx = Math.max(0, Math.min(iw - sw, sx));
        sy = Math.max(0, Math.min(ih - sh, sy));

        ctx.drawImage(img, sx, sy, sw, sh,
          dx + col * cellW, dy + row * cellH,
          cellW + 0.6, cellH + 0.6);
      }
    }

    // Settle wave when mouse leaves
    if (!mouseInside) waveAmpTarget += (0 - waveAmpTarget) * 0.04;
  }

  function handleMouseMove(e) {
    // Coordinates only — the rect is read once per frame in syncPointer().
    pointer.clientX = e.clientX;
    pointer.clientY = e.clientY;
    pointer.dirty = true;
  }

  function syncPointer() {
    if (!pointer.dirty) return;
    pointer.dirty = false;

    var r = canvas.getBoundingClientRect();
    if (pointer.clientX >= r.left && pointer.clientX <= r.right &&
        pointer.clientY >= r.top && pointer.clientY <= r.bottom) {
      mouseX = (pointer.clientX - r.left) / r.width;
      mouseY = (pointer.clientY - r.top) / r.height;
      targetWaveX = mouseX;
      targetWaveY = mouseY;
      mouseInside = true;
      waveAmpTarget = 1.4;
    } else {
      mouseInside = false;
      waveAmpTarget = 0;
    }
  }

  function tick() {
    if (!visibility.shouldRender()) return;
    syncPointer();

    // The resting ripple never stops, so instead of idling we simply run it at
    // ~30fps. Full 60fps is kept for the interactive ripple under the cursor.
    var isInteracting = mouseInside || waveAmp > 0.02 || waveAmpTarget > 0.02;
    var minFrameGap = isInteracting ? 0 : 33;
    var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - lastDraw < minFrameGap) return;
    lastDraw = now;

    drawFrame();
  }

  function handleResize() { resize(); }

  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  window.addEventListener('resize', handleResize);
  resize();

  var visibility = createCanvasVisibility(canvas);
  var stopTick = addCanvasTick(tick);

  function animateIn() {
    waveAmpTarget = 1.0;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { waveAmpTarget = 0; }, 1500);
  }
  function animateOut() {
    waveAmpTarget = 0;
  }
  function destroy() {
    clearTimeout(settleTimer);
    stopTick();
    visibility.destroy();
    document.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('resize', handleResize);
  }

  return { animateIn: animateIn, animateOut: animateOut, destroy: destroy };
}

/* ── Main slider controller ───────────────────────────────────────────────── */
function initLogoSlider() {
  var slider = document.querySelector('.v-logos-slider');
  if (!slider) return;

  var slides = slider.querySelectorAll('.v-logos-slider_item');
  var timelineItems = slider.querySelectorAll('.v-logos-slider_timeline_item');
  if (slides.length === 0) return;

  var currentIndex = 0;
  var autoplayTween = null;
  var slideDuration = 8;
  var isTransitioning = false;

  // Init canvases
  var mlCanvas = document.getElementById('canvas-mapleleaf');
  var olCanvas = document.getElementById('canvas-olympic');
  var mlCtrl = mlCanvas ? initMapleLeafCanvas(mlCanvas) : null;
  var olCtrl = olCanvas ? initOlympicCanvas(olCanvas, 'images/olympic.png') : null;
  function animateLogoIn(slide) {
    if (slide.classList.contains('-mapleleaf') && mlCtrl) mlCtrl.animateIn();
    if (slide.classList.contains('-olympic') && olCtrl) olCtrl.animateIn();
  }

  function animateLogoOut(slide) {
    if (slide.classList.contains('-mapleleaf') && mlCtrl) mlCtrl.animateOut();
    if (slide.classList.contains('-olympic') && olCtrl) olCtrl.animateOut();
  }

  function goToSlide(index) {
    if (isTransitioning || (index === currentIndex && autoplayTween)) return;
    isTransitioning = true;

    var oldSlide = slides[currentIndex];
    var newSlide = slides[index];
    var newTimelineItem = timelineItems[index];

    if (autoplayTween) { autoplayTween.kill(); autoplayTween = null; }

    slider.classList.add('is-changing');
    animateLogoOut(oldSlide);

    timelineItems.forEach(function (item, idx) {
      var bar = item.querySelector('.js-timeline');
      item.classList.remove('is-active');
      gsap.set(bar, { scaleX: idx < index ? 1 : 0 });
    });

    setTimeout(function () {
      oldSlide.classList.remove('is-active');
      newSlide.classList.add('is-active');
      newTimelineItem.classList.add('is-active');
      animateLogoIn(newSlide);
      slider.classList.remove('is-changing');
      currentIndex = index;
      isTransitioning = false;

      var bar = newTimelineItem.querySelector('.js-timeline');
      autoplayTween = gsap.fromTo(bar, { scaleX: 0 }, {
        scaleX: 1,
        duration: slideDuration,
        ease: 'none',
        onComplete: function () { goToSlide((currentIndex + 1) % slides.length); }
      });
    }, 600);
  }

  timelineItems.forEach(function (item, idx) {
    item.addEventListener('click', function () { goToSlide(idx); });
  });

  // Boot: activate the first slide visually, but do NOT call animateLogoIn yet.
  // The canvas entrance animation will be triggered by startBannerAnimation()
  // only after the page-transition loader has fully retreated, so it is never
  // wasted running under the loader overlay.
  slides[0].classList.add('is-active');
  timelineItems[0].classList.add('is-active');

  var firstBar = timelineItems[0].querySelector('.js-timeline');

  // Public method called by triggerBannerAnimation() once the loader retreats.
  function startBannerAnimation() {
    animateLogoIn(slides[currentIndex]);
    
    // Start the GSAP timeline-progress bar ONLY after the loader has completely finished.
    if (!autoplayTween) {
      autoplayTween = gsap.fromTo(firstBar, { scaleX: 0 }, {
        scaleX: 1,
        duration: slideDuration,
        ease: 'none',
        onComplete: function () { goToSlide((currentIndex + 1) % slides.length); }
      });
    }
  }

  // Tears down everything this controller owns. Without it, every Barba return
  // to Home left the previous canvases rendering and the previous autoplay
  // tween driving goToSlide() on detached DOM nodes — the jank compounded with
  // each visit.
  function destroy() {
    if (autoplayTween) { autoplayTween.kill(); autoplayTween = null; }
    if (mlCtrl && typeof mlCtrl.destroy === 'function') mlCtrl.destroy();
    if (olCtrl && typeof olCtrl.destroy === 'function') olCtrl.destroy();
    mlCtrl = null;
    olCtrl = null;
  }

  return { startBannerAnimation: startBannerAnimation, destroy: destroy };

}

/* ── Trailer Dialog Controller ────────────────────────────────────────────── */
function initTrailerDialog() {
  if (document._trailerDialogDelegated) return;
  document._trailerDialogDelegated = true;

  function findDialogFromTrigger(trigger) {
    if (!trigger) return null;
    var container = trigger.closest('[data-barba="container"]');
    if (container) {
      return container.querySelector('#trailer-dialog');
    }
    return document.getElementById('trailer-dialog');
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof startSmoothScroll === 'function' && !document.body.classList.contains('menu-open')) {
      startSmoothScroll();
    }

    var dialogVideo = dialog.querySelector('.trailer-dialog_video');
    if (dialogVideo) {
      dialogVideo.pause();
      dialogVideo.currentTime = 0;
    }

    if (typeof dialog.close === 'function') {
      try { dialog.close(); } catch (e) {}
    } else {
      dialog.removeAttribute('open');
    }
  }

  function openDialog(dialog) {
    if (!dialog) return;
    dialog.setAttribute('data-lenis-prevent', '');
    if (typeof stopSmoothScroll === 'function') stopSmoothScroll();

    if (typeof dialog.showModal === 'function') {
      try { dialog.showModal(); } catch (e) {}
    } else {
      dialog.setAttribute('open', '');
    }

    var dialogVideo = dialog.querySelector('.trailer-dialog_video');
    if (dialogVideo) {
      dialogVideo.currentTime = 0;
      var playPromise = dialogVideo.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function (error) {
          console.log('Trailer video play error:', error);
        });
      }
    }
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target && event.target.closest ? event.target.closest('.js-trailer-trigger') : null;
    if (trigger) {
      openDialog(findDialogFromTrigger(trigger));
      return;
    }

    var closeButton = event.target && event.target.closest ? event.target.closest('.trailer-dialog_close') : null;
    if (closeButton) {
      closeDialog(closeButton.closest('.trailer-dialog'));
      return;
    }

    var dialog = event.target && event.target.closest ? event.target.closest('.trailer-dialog') : null;
    if (dialog && event.target === dialog) {
      closeDialog(dialog);
    }
  });
}

/* ── Reference Video Panel Hover Controller ───────────────────────────────── */
function initReferenceVideo() {
  var referencePanels = document.querySelectorAll('.reference-video-panel');
  referencePanels.forEach(function (referencePanel) {
    var referenceVideo = referencePanel.querySelector('.reference-video-media');
    if (!referenceVideo) return;
    // Guard against duplicate listeners added by repeated Barba navigations.
    if (referencePanel._videoListenersAttached) return;
    referencePanel._videoListenersAttached = true;

    referenceVideo.muted = true;
    referencePanel.addEventListener('mouseenter', function () {
      referenceVideo.muted = true;
      var p = referenceVideo.play();
      if (p) p.catch(function (err) { console.log('Hover video play error:', err); });
    });
    referencePanel.addEventListener('mouseleave', function () {
      referenceVideo.pause();
    });
  });
}

/* ── Watch Section Controller ─────────────────────────────────────────────── */
function initActionWatch() {
  var bg = document.getElementById('js-action-watch-bg');
  var cta = document.getElementById('js-action-watch');
  var video = document.querySelector('.js-action-watch-video');

  if (!bg || !cta || !video) return;
  // Guard against duplicate listeners on repeated Barba navigations.
  if (bg._watchListenersAttached) return;
  bg._watchListenersAttached = true;

  function onEnter() {
    bg.classList.add('is-hovered');
    video.play().catch(function () {});
  }
  function onLeave() {
    bg.classList.remove('is-hovered');
    video.pause();
  }

  cta.addEventListener('mouseenter', onEnter);
  cta.addEventListener('mouseleave', onLeave);
  bg.addEventListener('mouseenter', onEnter);
  bg.addEventListener('mouseleave', onLeave);
}

// Scroll direction (html.up / html.down) is handled by smooth-scroll.js via Lenis.

function initPopupWatch() {
  var popup = document.querySelector('.popup-watch');
  if (!popup) return;

  popup.setAttribute('data-lenis-prevent', '');

  function syncPopupScrollLock() {
    if (typeof stopSmoothScroll !== 'function' || typeof startSmoothScroll !== 'function') return;
    if (popup.classList.contains('active')) {
      stopSmoothScroll();
    } else if (!document.body.classList.contains('menu-open')) {
      startSmoothScroll();
    }
  }

  // Show popup after 2 seconds
  setTimeout(function () {
    popup.classList.add('active');
    syncPopupScrollLock();
  }, 10000);

  // Close popup
  popup.querySelectorAll('.watch-close').forEach(function (button) {
    button.addEventListener('click', function () {
      popup.classList.remove('active');
      syncPopupScrollLock();
    });
  });
}

/* ==========================================================================
   WORD-BY-WORD REVEAL  —  .every-animate
   ==========================================================================
   Every word inside a .every-animate element fades opacity 0 -> 1 with a
   stagger, triggered as the element scrolls into view. No paid GSAP plugin
   required — words are split into spans manually, walking only text nodes so
   any inline markup (<strong>, <a>, etc.) already inside the element is left
   untouched and keeps working.
   ========================================================================== */

var EVERY_ANIMATE_STAGGER = 0.15;   // gap between each word, in seconds
var EVERY_ANIMATE_DURATION = 0.7;   // fade duration per word
var EVERY_ANIMATE_EASE = 'sine.out';

var _everyAnimateTriggers = []; // ScrollTriggers, killed on teardown
var _everyAnimateTweens = [];   // Tweens, killed on teardown

// Replaces the text inside `node` with the same text wrapped word-by-word in
// spans, without touching existing element children (bold, links, etc.).
// Whitespace between words is left as plain text so normal line-wrapping is
// unaffected.
function splitElementIntoWordSpans(node) {
  var children = Array.prototype.slice.call(node.childNodes);

  children.forEach(function (child) {
    if (child.nodeType === Node.TEXT_NODE) {
      var text = child.nodeValue;
      if (!text || !text.trim()) return; // whitespace-only node, leave as-is

      var fragment = document.createDocumentFragment();
      // Split but keep the separators (runs of whitespace) as their own tokens.
      var tokens = text.split(/(\s+)/);

      tokens.forEach(function (token) {
        if (token === '') return;
        if (/^\s+$/.test(token)) {
          fragment.appendChild(document.createTextNode(token));
        } else {
          var span = document.createElement('span');
          span.className = 'every-animate-word';
          span.style.display = 'inline-block';
          span.style.willChange = 'opacity';
          span.textContent = token;
          fragment.appendChild(span);
        }
      });

      node.replaceChild(fragment, child);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      // Recurse so words inside nested inline tags get wrapped too, while
      // the nested tag itself (and any class/attrs/behavior on it) stays put.
      splitElementIntoWordSpans(child);
    }
  });
}

function initEveryAnimate(root) {
  destroyEveryAnimate();

  if (typeof gsap === 'undefined') return;

  var scope = getWatchScope(root);
  var elements = scope.querySelectorAll('.every-animate');
  if (!elements.length) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  elements.forEach(function (el) {
    // Guard against double-splitting if this ever runs twice on the same
    // element without a real DOM swap in between.
    if (!el.dataset.everyAnimateSplit) {
      splitElementIntoWordSpans(el);
      el.dataset.everyAnimateSplit = 'true';
    }

    var words = el.querySelectorAll('.every-animate-word');
    if (!words.length) return;

    if (reduceMotion) {
      gsap.set(words, { opacity: 1 });
      return;
    }

    gsap.set(words, { opacity: 0 });

    if (typeof ScrollTrigger !== 'undefined') {
      var tween = gsap.to(words, {
        opacity: 1,
        duration: EVERY_ANIMATE_DURATION,
        ease: EVERY_ANIMATE_EASE,
        stagger: EVERY_ANIMATE_STAGGER,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
          stagger: 0.1,
          duration:2
        }
      });
      // gsap.to() with an inline scrollTrigger creates one internally;
      // grab it back off the tween so we can kill it cleanly on teardown.
      if (tween.scrollTrigger) _everyAnimateTriggers.push(tween.scrollTrigger);
      _everyAnimateTweens.push(tween);
    } else {
      // No ScrollTrigger available — just play the reveal immediately.
      var tween2 = gsap.to(words, {
        opacity: 1,
        duration: EVERY_ANIMATE_DURATION,
        ease: EVERY_ANIMATE_EASE,
        stagger: EVERY_ANIMATE_STAGGER
      });
      _everyAnimateTweens.push(tween2);
    }
  });
}

function destroyEveryAnimate() {
  _everyAnimateTriggers.forEach(function (st) { st.kill(); });
  _everyAnimateTriggers = [];

  _everyAnimateTweens.forEach(function (tw) { tw.kill(); });
  _everyAnimateTweens = [];
}

/* ==========================================================================
   SCROLL REVEAL  —  .cust-animate  ->  .animate-show
   ========================================================================== */

// Single IntersectionObserver for the current page. Re-created on every Barba
// navigation and disconnected on teardown so it never watches detached nodes.
var _custAnimateObserver = null;

function initCustAnimate(root) {
  // Always start from a clean slate (Barba may re-enter the same page).
  destroyCustAnimate();

  var scope = getWatchScope(root);
  var elements = scope.querySelectorAll('.cust-animate');
  if (!elements.length) return;

  // Fallback for very old browsers: just reveal everything immediately.
  if (typeof IntersectionObserver === 'undefined') {
    elements.forEach(function (el) { el.classList.add('animate-show'); });
    return;
  }

  _custAnimateObserver = new IntersectionObserver(function (entries, observer) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('animate-show');
      // One-shot reveal — stop watching so we don't re-fire on every scroll.
      observer.unobserve(entry.target);
    });
  }, {
    root: null,
    // Trigger slightly after the element has really entered the viewport.
    // threshold 0 keeps it working for elements taller than the screen.
    rootMargin: '0px 0px -12% 0px',
    threshold: 0
  });

  elements.forEach(function (el) {
    if (el.classList.contains('animate-show')) return; // already revealed
    _custAnimateObserver.observe(el);
  });
}

function destroyCustAnimate() {
  if (_custAnimateObserver) {
    _custAnimateObserver.disconnect();
    _custAnimateObserver = null;
  }
}

/* ==========================================================================
   FILM IMAGE SCROLL DRIFT  —  .film-image-first (5px) / .film-image-last (10px)
   ==========================================================================
   The element drifts in the SAME direction as the scroll (scroll down -> the
   image nudges down, scroll up -> it nudges up), clamped to its max offset,
   then eases back to its original position when scrolling stops.
   Driven by gsap.ticker so it stays in sync with every other GSAP animation
   and adds no extra scroll listener on top of Lenis.
   ========================================================================== */

var FILM_PARALLAX_TARGETS = [
  // direction: 1 = moves with the scroll, -1 = moves against it.
  { selector: '.film-image-first', max: 100, direction: -1 },
  { selector: '.film-image-last', max: 200, direction: 1 }
];

// How much of a frame's scroll delta is converted into movement. Higher =
// reaches the max offset sooner. Clamping keeps it within the 5px / 10px cap.
var FILM_PARALLAX_SENSITIVITY = 1;
// Easing applied per frame towards the target offset (and back to 0 on idle).
var FILM_PARALLAX_EASE = 0.15;

var _filmParallaxItems = [];
var _filmParallaxTicker = null;
var _filmParallaxLastScroll = 0;

function getScrollY() {
  return window.scrollY || window.pageYOffset || 0;
}

function initFilmImageParallax(root) {
  // Kill any previous instance first (Barba re-entry / re-init safety).
  destroyFilmImageParallax();

  if (typeof gsap === 'undefined') return;

  // Respect users who asked for less motion.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var scope = getWatchScope(root);

  FILM_PARALLAX_TARGETS.forEach(function (config) {
    scope.querySelectorAll(config.selector).forEach(function (el) {
      _filmParallaxItems.push({
        el: el,
        max: config.max,
        direction: config.direction === -1 ? -1 : 1,
        current: 0,
        // quickSetter is the cheapest way to write a transform every frame.
        setter: gsap.quickSetter(el, 'y', 'px')
      });
    });
  });

  if (!_filmParallaxItems.length) return;

  _filmParallaxLastScroll = getScrollY();

  _filmParallaxTicker = function () {
    var now = getScrollY();
    var delta = now - _filmParallaxLastScroll; // > 0 scrolling down, < 0 up
    _filmParallaxLastScroll = now;

    for (var i = 0; i < _filmParallaxItems.length; i++) {
      var item = _filmParallaxItems[i];

      // Drift with (direction 1) or against (direction -1) the scroll,
      // capped at the element's max offset.
      var target = delta * FILM_PARALLAX_SENSITIVITY * item.direction;
      if (target > item.max) target = item.max;
      if (target < -item.max) target = -item.max;

      item.current += (target - item.current) * FILM_PARALLAX_EASE;

      // Snap to exactly 0 once the drift is imperceptible, so the element
      // always settles back on its original position.
      if (Math.abs(item.current) < 0.01) item.current = 0;

      item.setter(item.current);
    }
  };

  gsap.ticker.add(_filmParallaxTicker);
}

function destroyFilmImageParallax() {
  if (_filmParallaxTicker && typeof gsap !== 'undefined') {
    gsap.ticker.remove(_filmParallaxTicker);
  }
  _filmParallaxTicker = null;

  // Reset transforms so a cached page never comes back with a stale offset.
  if (typeof gsap !== 'undefined') {
    _filmParallaxItems.forEach(function (item) {
      try { gsap.set(item.el, { clearProps: 'transform' }); } catch (e) {}
    });
  }

  _filmParallaxItems = [];
}

var LOADER_VARIANTS = ['rofl-loader', 'lines-loader', 'gradient-loader', 'skewed-lines-loader'];

function getLoaderVariant(htmlString) {
  var match = /<html[^>]*class="([^"]*)"/i.exec(htmlString || '');
  if (!match) return null;
  var classes = match[1].split(/\s+/);
  for (var i = 0; i < LOADER_VARIANTS.length; i++) {
    if (classes.indexOf(LOADER_VARIANTS[i]) !== -1) return LOADER_VARIANTS[i];
  }
  return null;
}

function setLoaderVariant(variant) {
  var html = document.documentElement;
  html.classList.remove.apply(html.classList, LOADER_VARIANTS);
  if (variant) html.classList.add(variant);
}

if (typeof barba !== 'undefined') {
  // How long to wait (ms) in the "leave" phase for the CSS loader to fully
  // cover the screen.  The slowest loader (rofl-loader) finishes at ~2.2 s,
  // but the white wrapper-before covers the viewport in ~1 s for all variants,
  // so 2000 ms is a safe "screen is fully hidden" point for every variant.
  var LOADER_COVER_TIME = 2000;

  // How long to wait (ms) AFTER removing dom-is-loading before the loader has
  // fully retreated off screen.  The CSS uses `transition: z-index 0s 2s` on
  // every wrapper, so 2000 ms is the correct settling time.
  var LOADER_RETREAT_TIME = 2000;

  // Maximum total time (ms) a transition is allowed to take before we force
  // the loader off as a safety net — prevents the loader ever staying stuck.
  var LOADER_MAX_TIME = 7000;

  // IDs of all pending transition timers — cancelled at the start of each new
  // navigation so overlapping transitions never fight over DOM state classes.
  var _loaderTimers = [];
  var _loaderSafetyTimer = null;

  function clearLoaderTimers() {
    _loaderTimers.forEach(function(id) { clearTimeout(id); });
    _loaderTimers = [];
    if (_loaderSafetyTimer !== null) {
      clearTimeout(_loaderSafetyTimer);
      _loaderSafetyTimer = null;
    }
  }

  // Force-remove the loader and restore all DOM state classes immediately.
  // Called by the safety timeout and whenever we need a guaranteed clean state.
  function forceLoaderOff() {
    clearLoaderTimers();
    document.documentElement.classList.remove('dom-is-loading');
    document.documentElement.classList.add('dom-is-loaded', 'dom-is-animated');
    if (typeof initSmoothScroll === 'function') {
      initSmoothScroll();
    }
  }

  barba.hooks.before(function (data) {
    // ── Step 1: cancel all timers from any previous transition.
    clearLoaderTimers();

    // ── Step 2: bump the generation counter so stale async callbacks abort.
    _transitionGen++;

    // ── Step 3: tear down outgoing page components (sliders, video, etc.).
    destroyPageComponents();

    // ── Step 4: switch the loader variant to the DESTINATION page's variant
    // NOW, before the cover animation starts.  This prevents the two-loader
    // overlap that occurs when navigating between pages that use different
    // (or the same) loader — only one variant is ever active at a time.
    if (data && data.next && data.next.html) {
      setLoaderVariant(getLoaderVariant(data.next.html));
    }

    // ── Step 5: strip DOM-state classes and trigger the cover animation.
    document.documentElement.classList.remove('dom-is-loaded', 'dom-is-animated');
    document.documentElement.classList.add('dom-is-loading');

    // ── Step 6: reset stale logo-slider reference.
    _logoSliderCtrl = null;

    // ── Step 7: arm the safety net — forces the loader off if anything hangs.
    _loaderSafetyTimer = setTimeout(function () {
      console.warn('[VidsPro] Loader safety timeout fired — forcing loader off.');
      forceLoaderOff();
      triggerBannerAnimation();
    }, LOADER_MAX_TIME);
  });

  barba.hooks.beforeEnter(function (data) {
    // setLoaderVariant already called in `before` to avoid the two-loader bug,
    // but call it again here as a safety measure in case `before` didn't have
    // the html yet (e.g. on the very first navigation).
    if (data && data.next && data.next.html) {
      setLoaderVariant(getLoaderVariant(data.next.html));
    }
    if (typeof scrollToTop === 'function') {
      scrollToTop(true);
    } else {
      window.scrollTo(0, 0);
    }
    document.body.classList.remove('menu-open');

    // Update active nav link to reflect the new page.
    var nextPath = data.next.url.path;
    document.querySelectorAll('.v-nav_link').forEach(function (link) {
      link.classList.remove('is-current');
      var href = link.getAttribute('href');
      if (href === '/') {
        if (nextPath === '/' || nextPath === '/index.html') {
          link.classList.add('is-current');
        }
      } else if (href && nextPath.indexOf(href) === 0) {
        var nextChar = nextPath.charAt(href.length);
        if (!nextChar || nextChar === '/' || nextChar === '.') {
          link.classList.add('is-current');
        }
      }
    });
  });

  barba.hooks.afterEnter(function (data) {
    // Capture the generation at the moment afterEnter fires.
    // Any setTimeout/rAF below will bail out if the generation has advanced.
    var myGen = _transitionGen;
    var nextContainer = data && data.next && data.next.container;

    var hasDesignerSlider = !!document.querySelector('.designer-slider');
    var needsSwiper = hasDesignerSlider && typeof Swiper === 'undefined';

    function runInit() {
      // Bail if a newer transition has already started.
      if (myGen !== _transitionGen) return;

      // Initialise page components while the loader still covers the screen.
      // Pass the incoming container so Watch GSAP targets the new DOM, not a
      // leftover node from the outgoing page (both can exist briefly).
      initPageComponents(nextContainer);

      // Double-rAF ensures the browser commits the new DOM before we start
      // the CSS wipe-out (retreat) animation.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (myGen !== _transitionGen) return;

          // Removing dom-is-loading triggers the CSS retreat animation.
          document.documentElement.classList.remove('dom-is-loading');

          // Wait for the full retreat animation (2 s) before revealing content.
          var retreatTimer = setTimeout(function () {
            if (myGen !== _transitionGen) return; // stale — a newer nav started

            _loaderTimers = _loaderTimers.filter(function (id) { return id !== retreatTimer; });

            // Normal path completed — cancel the safety net.
            if (_loaderSafetyTimer !== null) {
              clearTimeout(_loaderSafetyTimer);
              _loaderSafetyTimer = null;
            }

            document.documentElement.classList.add('dom-is-loaded');
            triggerBannerAnimation();
            if (typeof initSmoothScroll === 'function') {
              initSmoothScroll(nextContainer);
            }

            if (typeof ScrollTrigger !== 'undefined') {
              ScrollTrigger.refresh();
            }

            // Recalculate Swiper dimensions now that the loader is fully gone.
            document.querySelectorAll('.designer-slider').forEach(function (dSlider) {
              if (dSlider.swiper && !dSlider.swiper.destroyed) {
                dSlider.swiper.update();
              }
            });

            var animTimer = setTimeout(function () {
              if (myGen !== _transitionGen) return;
              _loaderTimers = _loaderTimers.filter(function (id) { return id !== animTimer; });
              document.documentElement.classList.add('dom-is-animated');
            }, 100);
            _loaderTimers.push(animTimer);

          }, LOADER_RETREAT_TIME);
          _loaderTimers.push(retreatTimer);
        });
      });
    }

    if (needsSwiper) {
      loadSwiperAssets(runInit);
    } else {
      runInit();
    }
  });


  barba.init({
    preventRunning: true,
    transitions: [{
      name: 'loader-cover',

      // LEAVE — wait for the CSS loader to fully cover the viewport.
      // The loader variant was already switched in the `before` hook,
      // so only one loader animation is ever active.
      leave: function () {
        return new Promise(function (resolve) {
          setTimeout(resolve, LOADER_COVER_TIME);
        });
      },

      // ENTER — ensure the incoming container is immediately opaque so it is
      // ready the moment the loader retreats.  Clears any stale GSAP opacity
      // that might have been set on a previously cached container.
      enter: function (data) {
        gsap.set(data.next.container, { opacity: 1, clearProps: 'opacity' });
      }
    }]
  });
}