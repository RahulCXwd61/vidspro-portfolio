/* ==========================================================================
   SMOOTH SCROLL — Lenis driven by gsap.ticker, wired into ScrollTrigger.
   ==========================================================================
   This file exists so every page shares ONE frame loop for scrolling and
   animation. Lenis must never run its own requestAnimationFrame loop
   alongside GSAP's — that's what caused the Home-page stutter: two separate
   rAF callbacks each writing/reading scroll position with no guaranteed
   order between them.

   Public API (called from main.js):
     initSmoothScroll(container)  — create Lenis and hook it to ScrollTrigger.
                                     Safe to call again (e.g. after a Barba
                                     swap) — it tears down any previous
                                     instance first.
     destroySmoothScroll()        — fully stop and release Lenis.
     refreshSmoothScroll()        — recompute scroll bounds (call after DOM
                                     size changes, e.g. new page content).
     stopSmoothScroll()           — pause user scrolling (dialogs, menu).
     startSmoothScroll()          — resume user scrolling.
     scrollToTop(immediate)       — jump to y = 0. `immediate` skips the tween
                                     (used on Barba page entry).
   ========================================================================== */

(function (window, document) {
  'use strict';

  var lenis = null;
  var tickerFn = null;
  var stRefreshHandler = null;
  var isStopped = false;

  function hasGsap() {
    return typeof gsap !== 'undefined';
  }

  function hasScrollTrigger() {
    return typeof ScrollTrigger !== 'undefined';
  }

  // Tears down whatever the previous instance set up. Always safe to call,
  // even if nothing was ever initialised.
  function destroySmoothScroll() {
    if (tickerFn && hasGsap()) {
      gsap.ticker.remove(tickerFn);
    }
    tickerFn = null;

    if (stRefreshHandler && lenis) {
      lenis.off('scroll', stRefreshHandler);
    }
    stRefreshHandler = null;

    if (lenis) {
      try { lenis.destroy(); } catch (e) {}
      lenis = null;
    }

    isStopped = false;
  }

  // `container` is accepted (and ignored beyond existence-checking) so the
  // call signature matches how main.js invokes it after a Barba swap —
  // Lenis itself always scrolls the window/html, not a specific container.
  function initSmoothScroll(container) {
    if (typeof Lenis === 'undefined') {
      console.warn('[smooth-scroll] Lenis is not loaded; skipping smooth scroll init.');
      return;
    }

    // Always start clean — Barba calls this on every page entry, and a
    // second live Lenis instance is exactly what caused the double-rAF bug.
    destroySmoothScroll();

    lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      smoothTouch: false,
      // Let elements opt out of smoothing (dialogs, popups, custom scroll
      // areas) via the standard Lenis attribute. main.js already sets this
      // on the trailer dialog and the watch popup.
      prevent: function (node) {
        return !!(node && node.closest && node.closest('[data-lenis-prevent]'));
      }
    });

    // Drive Lenis from gsap.ticker instead of its own requestAnimationFrame
    // loop. gsap.ticker's timestamp is in seconds; Lenis wants milliseconds.
    tickerFn = function (time) {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);

    // GSAP's ticker occasionally "catches up" after a long task (tab switch,
    // heavy layout) by simulating extra time. That's fine for tweens but it
    // makes Lenis jump, so we disable lag smoothing site-wide.
    gsap.ticker.lagSmoothing(0);

    // Keep ScrollTrigger in sync with Lenis's virtual scroll position instead
    // of relying on native `scroll` events, which Lenis mostly suppresses.
    if (hasScrollTrigger()) {
      stRefreshHandler = function () {
        ScrollTrigger.update();
      };
      lenis.on('scroll', stRefreshHandler);

      // Tell ScrollTrigger to use Lenis's scroll position/limits instead of
      // the native window ones, and to move the page via Lenis rather than
      // the browser's own scrollTo when a pin/scrub needs to set scroll.
      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop: function (value) {
          if (arguments.length && lenis) {
            lenis.scrollTo(value, { immediate: true });
          }
          return lenis ? lenis.scroll : window.scrollY;
        },
        getBoundingClientRect: function () {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight
          };
        },
        pinType: document.documentElement.style.transform !== undefined ? 'transform' : 'fixed'
      });

      ScrollTrigger.defaults({ scroller: document.documentElement });
      ScrollTrigger.refresh();
    }

    isStopped = false;
  }

  // Recompute Lenis's internal bounds and ScrollTrigger's trigger positions.
  // Call after content height changes (new page swapped in, images loaded).
  function refreshSmoothScroll() {
    if (lenis) lenis.resize();
    if (hasScrollTrigger()) ScrollTrigger.refresh();
  }

  // Pause user scrolling — used while a dialog/menu/popup is open.
  function stopSmoothScroll() {
    if (!lenis || isStopped) return;
    lenis.stop();
    isStopped = true;
  }

  // Resume user scrolling.
  function startSmoothScroll() {
    if (!lenis || !isStopped) return;
    lenis.start();
    isStopped = false;
  }

  // Jump to the top of the page. `immediate` (used on Barba page-enter) skips
  // the eased scroll-to animation so the new page starts pinned at y = 0
  // instead of visibly scrolling up from wherever the old page left off.
  function scrollToTop(immediate) {
    if (lenis) {
      lenis.scrollTo(0, { immediate: !!immediate });
    } else {
      window.scrollTo(0, 0);
    }
  }

  // Expose on window so main.js's `typeof initSmoothScroll === 'function'`
  // checks find them as globals.
  window.initSmoothScroll = initSmoothScroll;
  window.destroySmoothScroll = destroySmoothScroll;
  window.refreshSmoothScroll = refreshSmoothScroll;
  window.stopSmoothScroll = stopSmoothScroll;
  window.startSmoothScroll = startSmoothScroll;
  window.scrollToTop = scrollToTop;

})(window, document);