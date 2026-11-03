(function () {
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");
  var siteHeader = document.querySelector(".site-header");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("is-open");
      if (siteHeader && document.body.classList.contains("page-home")) {
        siteHeader.classList.toggle("is-solid", nav.classList.contains("is-open") || window.scrollY > 40);
      }
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        // keep mobile menu open when tapping a dropdown parent
        if (link.classList.contains("nav-link") && link.parentElement && link.parentElement.querySelector(".nav-drop")) {
          return;
        }
        nav.classList.remove("is-open");
      });
    });
  }

  // Mega menu: class-based open so homepage banner won't steal hover
  document.querySelectorAll(".nav-item:has(.nav-panel)").forEach(function (item) {
    var timer = null;
    item.addEventListener("mouseenter", function () {
      if (timer) clearTimeout(timer);
      document.querySelectorAll(".nav-item.is-open").forEach(function (el) {
        if (el !== item) el.classList.remove("is-open");
      });
      item.classList.add("is-open");
    });
    item.addEventListener("mouseleave", function () {
      timer = setTimeout(function () {
        item.classList.remove("is-open");
      }, 120);
    });
  });

  // Home banner auto slide (every 10s) — slogan fadeInUp per slide
  var banner = document.querySelector("[data-banner]");
  if (banner) {
    var slides = Array.prototype.slice.call(banner.querySelectorAll(".banner-slide"));
    var dotsWrap = banner.querySelector("[data-banner-dots]");
    var prev = banner.querySelector("[data-banner-prev]");
    var next = banner.querySelector("[data-banner-next]");
    var index = 0;
    var timer = null;

    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "第 " + (i + 1) + " 张");
        if (i === 0) b.className = "is-active";
        b.addEventListener("click", function () { go(i); });
        dotsWrap.appendChild(b);
      });
    }
    var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.children) : [];

    function replayCopy(slide) {
      var copy = slide.querySelector(".banner-copy");
      if (!copy) return;
      copy.classList.remove("is-in");
      copy.style.animation = "none";
      void copy.offsetWidth;
      copy.style.animation = "";
      copy.classList.add("is-in");
    }

    function go(i) {
      var nextIndex = ((i % slides.length) + slides.length) % slides.length;
      if (nextIndex === index && slides[index].classList.contains("is-active")) {
        replayCopy(slides[index]);
        arm();
        return;
      }
      var cur = slides[index];
      cur.classList.remove("is-active");
      cur.classList.add("is-exit");
      var oldCopy = cur.querySelector(".banner-copy");
      if (oldCopy) oldCopy.classList.remove("is-in");
      index = nextIndex;
      slides[index].classList.add("is-active");
      replayCopy(slides[index]);
      dots.forEach(function (d, di) { d.classList.toggle("is-active", di === index); });
      setTimeout(function () { cur.classList.remove("is-exit"); }, 800);
      arm();
    }

    function arm() {
      clearTimeout(timer);
      timer = setTimeout(function () { go(index + 1); }, 10000);
    }

    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });
    replayCopy(slides[0]);
    arm();
  }

  var revealNodes = document.querySelectorAll("[data-aos]");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!revealNodes.length || reduceMotion || !("IntersectionObserver" in window)) {
    revealNodes.forEach(function (node) { node.classList.add("is-in"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var replay = entry.target.closest(".home-about");
        if (replay) {
          entry.target.classList.toggle("is-in", entry.isIntersecting);
          return;
        }
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.28 });
    revealNodes.forEach(function (node) {
      if (node.classList.contains("step-chain")) return;
      revealObserver.observe(node);
    });
  }

  var steps = document.querySelector(".step-chain");
  if (steps && !reduceMotion) {
    var stepItems = Array.prototype.slice.call(steps.children);

    function paintStep(li, state, prev) {
      if (state === "in") {
        li.style.transition = "none";
        li.style.transform = "translateX(-140px)";
        li.style.opacity = "0";
        void li.offsetWidth;
        li.style.transition = "transform 0.5s ease, opacity 0.5s ease";
        li.style.transform = "translateX(0)";
        li.style.opacity = "1";
        return;
      }
      var fromIn = prev === "in";
      li.style.transition = fromIn ? "transform 0.5s ease, opacity 0.5s ease" : "none";
      li.style.transform = state === "right" ? "translateX(140px)" : "translateX(-140px)";
      li.style.opacity = "0";
    }

    function updateSteps() {
      var rect = steps.getBoundingClientRect();
      var vh = window.innerHeight;
      var n = stepItems.length;
      var appearProgress = (vh * 1.2 - rect.top) / (vh * 0.5);
      var leaveProgress = (40 - rect.top) / (vh * 0.9);
      stepItems.forEach(function (li, i) {
        var appearAt = 0.05 + i * 0.18;
        var leaveAt = 0.12 + (n - 1 - i) * 0.16;
        var next = "left";
        if (leaveProgress >= leaveAt) next = "right";
        else if (appearProgress >= appearAt) next = "in";
        if (li.dataset.step === next) return;
        var prev = li.dataset.step || "left";
        li.dataset.step = next;
        paintStep(li, next, prev);
      });
    }

    window.addEventListener("scroll", updateSteps, { passive: true });
    updateSteps();
  } else if (steps) {
    steps.classList.add("is-in");
  }

  var fields = document.querySelector("[data-fields]");
  if (fields) {
    var fieldPanes = Array.prototype.slice.call(fields.querySelectorAll("[data-fields-pane]"));
    var fieldFulls = Array.prototype.slice.call(fields.querySelectorAll(".fields-full"));
    function activateField(i) {
      fields.classList.add("is-hovering");
      fieldPanes.forEach(function (pane, n) {
        pane.classList.toggle("is-on", n === i);
      });
      fieldFulls.forEach(function (bg, n) {
        bg.classList.toggle("is-on", n === i);
      });
    }
    function clearField() {
      fields.classList.remove("is-hovering");
      fieldPanes.forEach(function (pane) { pane.classList.remove("is-on"); });
      fieldFulls.forEach(function (bg) { bg.classList.remove("is-on"); });
    }
    fieldPanes.forEach(function (pane, i) {
      pane.addEventListener("mouseenter", function () { activateField(i); });
      pane.addEventListener("focus", function () { activateField(i); });
    });
    fields.addEventListener("mouseleave", clearField);
  }

  var biz = document.querySelector("[data-biz]");
  if (biz) {
    var bizTabs = Array.prototype.slice.call(biz.querySelectorAll("[data-biz-tab]"));
    var bizShots = Array.prototype.slice.call(biz.querySelectorAll(".biz-shot"));
    function activateBiz(i) {
      bizTabs.forEach(function (item, n) {
        var on = n === i;
        item.classList.toggle("is-active", on);
        item.setAttribute("aria-selected", on ? "true" : "false");
      });
      bizShots.forEach(function (shot, n) {
        var on = n === i;
        shot.classList.toggle("is-active", on);
        shot.hidden = !on;
      });
    }
    bizTabs.forEach(function (tab, i) {
      tab.addEventListener("mouseenter", function () { activateBiz(i); });
      tab.addEventListener("focus", function () { activateBiz(i); });
    });
  }

  var partners = document.querySelector("[data-partners]");
  if (partners) {
    var partnerTabs = partners.querySelectorAll("[data-partner-tab]");
    var partnerGrids = partners.querySelectorAll(".partner-grid");
    partnerTabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        partnerTabs.forEach(function (item, n) {
          var on = n === i;
          item.classList.toggle("is-active", on);
          item.setAttribute("aria-selected", on ? "true" : "false");
        });
        partnerGrids.forEach(function (grid, n) {
          grid.hidden = n !== i;
        });
      });
    });
  }

  if ((document.body.classList.contains("page-home") || document.body.classList.contains("page-fields")) && !reduceMotion) {
    var blocks = Array.prototype.slice.call(document.querySelectorAll("body > section, body > .site-footer"));
    var blockIndex = 0;
    var moving = false;
    var animId = 0;
    var wheelOn = false;
    var wheelAt = 0;
    var wheelPeak = 0;
    var gesturePeak = 0;
    var lastWheel = 0;
    var wheelDir = 0;
    var headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 88;
    var isHome = document.body.classList.contains("page-home");
    var homeDots = isHome
      ? Array.prototype.slice.call(document.querySelectorAll("[data-home-dots] button"))
      : [];
    var sectionCount = document.querySelectorAll("body > section").length;
    var homeHeader = isHome ? document.querySelector(".site-header") : null;
    var homeHero = isHome ? document.querySelector(".home-photo") : null;

    function blockTop(el) {
      if (isHome && el === homeHero) return 0;
      var bar = document.querySelector(".page-bar");
      var barH = bar ? bar.offsetHeight : 0;
      return Math.max(0, el.offsetTop - headerH - barH);
    }

    function nearestBlock() {
      var y = window.scrollY + 8;
      var found = 0;
      blocks.forEach(function (el, i) {
        if (blockTop(el) <= y) found = i;
      });
      return found;
    }

    function syncHomeChrome(i) {
      if (homeHeader) {
        var menuOpen = nav && nav.classList.contains("is-open");
        homeHeader.classList.toggle("is-solid", menuOpen || i > 0);
      }
      if (!homeDots.length) return;
      var active = Math.min(Math.max(i, 0), sectionCount - 1, homeDots.length - 1);
      homeDots.forEach(function (btn, n) {
        var on = n === active;
        btn.classList.toggle("is-active", on);
        if (on) btn.setAttribute("aria-current", "true");
        else btn.removeAttribute("aria-current");
      });
    }

    function goBlock(i) {
      if (i < 0) i = 0;
      if (i > blocks.length - 1) i = blocks.length - 1;
      if (i === blockIndex) return;
      blockIndex = i;
      syncHomeChrome(i);
      var id = ++animId;
      moving = true;
      var start = window.scrollY;
      var end = blockTop(blocks[i]);
      var t0 = performance.now();
      var root = document.documentElement;
      root.style.scrollBehavior = "auto";
      function frame(now) {
        if (id !== animId) return;
        var p = Math.min(1, (now - t0) / 550);
        var eased = 1 - Math.pow(1 - p, 1.5);
        window.scrollTo(0, start + (end - start) * eased);
        if (p < 1) {
          requestAnimationFrame(frame);
          return;
        }
        moving = false;
        root.style.scrollBehavior = "";
        syncHomeChrome(blockIndex);
      }
      requestAnimationFrame(frame);
    }

    homeDots.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        blockIndex = i === blockIndex ? -1 : blockIndex;
        goBlock(i);
      });
    });

    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey) return;
      if (e.target.closest && e.target.closest("#location")) return;
      e.preventDefault();
      if (!e.deltaY) return;
      var now = performance.now();
      var power = Math.abs(e.deltaY);
      if (e.deltaMode === 1) power = power * 16;
      if (e.deltaMode === 2) power = power * 400;
      var dir = e.deltaY > 0 ? 1 : -1;
      var sinceEvent = now - lastWheel;
      lastWheel = now;
      if (wheelOn && now - wheelAt < 80 && dir === wheelDir) {
        if (power > wheelPeak) wheelPeak = power;
        if (power > gesturePeak) gesturePeak = power;
        return;
      }
      var quiet = sinceEvent > 120;
      var turned = wheelDir !== 0 && dir !== wheelDir;
      var spiked = power >= 18 && power > wheelPeak * 2 && wheelPeak < gesturePeak * 0.45;
      if (wheelOn && !quiet && !turned && !spiked) {
        wheelPeak = wheelPeak * 0.62 + power * 0.38;
        return;
      }
      wheelOn = true;
      wheelAt = now;
      wheelPeak = power;
      gesturePeak = power;
      wheelDir = dir;
      goBlock(blockIndex + dir);
    }, { passive: false });

    var touchY = null;
    var touchHijack = false;
    window.addEventListener("touchstart", function (e) {
      var t = e.target;
      touchHijack = !t.closest("#location, input, textarea, select");
      touchY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      if (touchHijack) e.preventDefault();
    }, { passive: false });
    window.addEventListener("touchend", function (e) {
      if (!touchHijack || touchY == null) return;
      var dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) < 12) return;
      goBlock(blockIndex + (dy > 0 ? 1 : -1));
    });

    window.addEventListener("keydown", function (e) {
      var tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.repeat) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goBlock(blockIndex + 1);
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goBlock(blockIndex - 1);
      }
    });

    function blockFromHash(hash) {
      var id = String(hash || "").replace(/^#/, "");
      if (!id) return -1;
      var target = document.getElementById(id);
      if (!target) return -1;
      var i = -1;
      blocks.forEach(function (block, n) {
        if (block === target || block.contains(target)) i = n;
      });
      return i;
    }

    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var id = "";
      if (href.charAt(0) === "#") {
        id = href.slice(1);
      } else {
        try {
          var u = new URL(a.href, location.href);
          if (u.pathname.replace(/\/$/, "") !== location.pathname.replace(/\/$/, "")) return;
          id = u.hash ? u.hash.slice(1) : "";
        } catch (err) {
          return;
        }
      }
      if (!id) return;
      var i = blockFromHash(id);
      if (i < 0) return;
      e.preventDefault();
      if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
      blockIndex = i === blockIndex ? -1 : blockIndex;
      goBlock(i);
    });

    window.addEventListener("scroll", function () {
      if (moving) return;
      blockIndex = nearestBlock();
      syncHomeChrome(blockIndex);
    }, { passive: true });

    var hashIndex = blockFromHash(location.hash);
    if (hashIndex >= 0) {
      blockIndex = -1;
      goBlock(hashIndex);
    } else {
      blockIndex = nearestBlock();
      syncHomeChrome(blockIndex);
    }
  }

  // Home side dots without snap scrolling (reduced motion)
  if (document.body.classList.contains("page-home") && reduceMotion) {
    var quietSections = Array.prototype.slice.call(document.querySelectorAll("body > section"));
    var quietDots = Array.prototype.slice.call(document.querySelectorAll("[data-home-dots] button"));
    function markQuietDot(i) {
      quietDots.forEach(function (btn, n) {
        var on = n === i;
        btn.classList.toggle("is-active", on);
        if (on) btn.setAttribute("aria-current", "true");
        else btn.removeAttribute("aria-current");
      });
    }
    quietDots.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        var el = quietSections[i];
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        markQuietDot(i);
      });
    });
  }

  // Section jump links: highlight active while scrolling
  var subnav = document.querySelector("[data-subnav]");
  if (!subnav) return;

  var links = Array.prototype.slice.call(subnav.querySelectorAll("a"));

  function sectionId(link) {
    var href = link.getAttribute("href") || "";
    if (href.charAt(0) === "#") return href.slice(1);
    return link.getAttribute("data-section") || "";
  }

  var sections = links
    .map(function (link) {
      var id = sectionId(link);
      var el = id && document.getElementById(id);
      return el ? { link: link, el: el } : null;
    })
    .filter(Boolean);

  var crumb = document.querySelector("[data-crumb]");

  function setActive(id) {
    links.forEach(function (link) {
      var on = sectionId(link) === id;
      link.classList.toggle("is-active", on);
      if (on && crumb) crumb.textContent = link.textContent.trim();
    });
  }

  function onScroll() {
    var offset = (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 76) + 70;
    var y = window.scrollY + offset;
    var current = sections[0] && sections[0].el.id;
    sections.forEach(function (item) {
      var top = item.el.getBoundingClientRect().top + window.scrollY;
      if (top <= y) current = item.el.id;
    });
    if (current) setActive(current);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      setActive(href.slice(1));
      if (nav) nav.classList.remove("is-open");
    });
  });
})();

(function () {
  document.querySelectorAll("[data-news-page]").forEach(function (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".news-card"));
    if (!cards.length) return;
    var pager = grid.parentElement && grid.parentElement.querySelector("[data-news-pager]");
    var size = parseInt(grid.getAttribute("data-page-size"), 10) || 9;
    var page = 1;
    var pages = Math.ceil(cards.length / size) || 1;

    function show(next) {
      page = next;
      if (page < 1) page = 1;
      if (page > pages) page = pages;
      var start = (page - 1) * size;
      var end = start + size;
      cards.forEach(function (card, i) {
        card.hidden = i < start || i >= end;
      });
      if (!pager) return;
      if (pages < 2) {
        pager.hidden = true;
        pager.innerHTML = "";
        return;
      }
      pager.hidden = false;
      var marks = "";
      for (var i = 1; i <= pages; i++) {
        marks += '<button type="button" data-page="' + i + '"' + (i === page ? ' class="is-on"' : "") + ">" + i + "</button>";
      }
      pager.innerHTML = marks;
    }

    if (pager) {
      pager.addEventListener("click", function (event) {
        var btn = event.target.closest("button[data-page]");
        if (!btn) return;
        show(Number(btn.getAttribute("data-page")));
        var top = grid.getBoundingClientRect().top + window.scrollY - 180;
        window.scrollTo(0, top > 0 ? top : 0);
      });
    }
    show(1);
  });
})();
