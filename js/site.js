(function () {
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("is-open");
    });
  }

  // Home banner auto slide (every 10s)
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

    function go(i) {
      var nextIndex = ((i % slides.length) + slides.length) % slides.length;
      if (nextIndex === index) return;
      var cur = slides[index];
      cur.classList.remove("is-active");
      cur.classList.add("is-exit");
      index = nextIndex;
      slides[index].classList.add("is-active");
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
    arm();
  }

  // Section jump links: highlight active while scrolling
  var subnav = document.querySelector("[data-subnav]");
  if (!subnav) return;

  var links = Array.prototype.slice.call(subnav.querySelectorAll('a[href^="#"]'));
  var sections = links
    .map(function (link) {
      var id = link.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      return el ? { link: link, el: el } : null;
    })
    .filter(Boolean);

  function setActive(id) {
    links.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
    });
  }

  function onScroll() {
    var offset = (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 76) + 70;
    var y = window.scrollY + offset;
    var current = sections[0] && sections[0].el.id;
    sections.forEach(function (item) {
      if (item.el.offsetTop <= y) current = item.el.id;
    });
    if (current) setActive(current);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      var id = link.getAttribute("href").slice(1);
      setActive(id);
      if (nav) nav.classList.remove("is-open");
    });
  });
})();
