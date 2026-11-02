(function () {
  var data = window.CASE_DATA;
  if (!data) return;

  function esc(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  function project(id) {
    var list = data.projects;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function cover(item) {
    return item.images.length ? item.images[0] : data.blank;
  }

  var grid = document.querySelector("[data-case-grid]");
  var nav = document.querySelector("[data-case-nav]");
  if (grid && nav) {
    var buttons = "";
    data.cats.forEach(function (cat) {
      buttons += '<button type="button" data-cat="' + cat.id + '">' + esc(cat.name) + "</button>";
    });
    nav.innerHTML = buttons;

    var pager = document.querySelector("[data-case-pager]");
    var pageSize = 9;
    var page = 1;

    function cardHtml(item) {
      return '<a class="case-card" href="case.html?id=' + item.id + '">' +
        '<span class="case-card-media"><img src="' + cover(item) + '" alt="" loading="lazy"></span>' +
        "<strong>" + esc(item.title) + "</strong>" +
        (item.scope ? "<span>" + esc(item.scope) + "</span>" : "") +
        "</a>";
    }

    function show(catId, nextPage) {
      var cat = data.cats[0];
      data.cats.forEach(function (item) {
        if (item.id === catId) cat = item;
      });
      var list = data.projects.filter(function (item) { return item.cat === cat.id; });
      var pages = Math.ceil(list.length / pageSize) || 1;
      page = nextPage || 1;
      if (page > pages) page = pages;
      var start = (page - 1) * pageSize;
      grid.innerHTML = list.slice(start, start + pageSize).map(cardHtml).join("");
      nav.querySelectorAll("button").forEach(function (btn) {
        btn.classList.toggle("is-on", btn.getAttribute("data-cat") === cat.id);
      });
      if (pager) {
        var marks = "";
        for (var i = 1; i <= pages; i++) {
          marks += '<button type="button" data-page="' + i + '"' + (i === page ? ' class="is-on"' : "") + ">" + i + "</button>";
        }
        pager.innerHTML = marks;
        pager.hidden = pages < 2;
      }
      var intro = document.querySelector("[data-case-intro]");
      if (intro) intro.textContent = cat.intro;
      if (location.hash !== "#" + cat.id) history.replaceState(null, "", "#" + cat.id);
      if (nextPage) {
        var top = grid.getBoundingClientRect().top + window.scrollY - 180;
        window.scrollTo(0, top > 0 ? top : 0);
      }
    }

    function catFromHash() {
      var hash = location.hash.slice(1);
      var found = data.cats[0].id;
      data.cats.forEach(function (cat) {
        if (cat.id === hash) found = cat.id;
      });
      return found;
    }

    nav.addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      location.hash = btn.getAttribute("data-cat");
    });

    if (pager) {
      pager.addEventListener("click", function (event) {
        var btn = event.target.closest("button");
        if (!btn) return;
        show(catFromHash(), Number(btn.getAttribute("data-page")));
      });
    }

    window.addEventListener("hashchange", function () {
      show(catFromHash());
    });
    show(catFromHash());
  }

  var detail = document.querySelector("[data-case-detail]");
  if (!detail) return;

  var id = new URLSearchParams(location.search).get("id");
  var item = project(id);
  if (!item) {
    detail.innerHTML = '<p class="case-back"><a href="cases.html">返回业务案例</a></p><p>未找到该案例。</p>';
    return;
  }

  var catName = "";
  data.cats.forEach(function (cat) {
    if (cat.id === item.cat) catName = cat.name;
  });
  document.title = item.title + " | 业务案例 | 中核华瑞科技";
  var crumb = document.querySelector("[data-case-crumb]");
  if (crumb) crumb.textContent = item.title;

  var images = item.images.length ? item.images : [data.blank];
  var cover = images[0];
  var rest = images.slice(1);

  var meta = [];
  if (catName) meta.push("<span>" + esc(catName) + "</span>");
  if (item.scope) meta.push("<span>" + esc(item.scope) + "</span>");
  if (item.place) meta.push("<span>" + esc(item.place) + "</span>");

  function shot(src, cls, label) {
    return '<button class="' + cls + '" type="button" data-zoom-src="' + src + '" data-zoom-alt="' + esc(item.title) + '">' +
      '<img src="' + src + '" alt="' + esc(item.title) + '" loading="lazy">' +
      (label ? '<em>' + label + "</em>" : "") +
      "</button>";
  }

  var mosaic = "";
  if (rest.length) {
    mosaic = '<div class="case-mosaic" data-count="' + Math.min(rest.length, 6) + '">' +
      rest.map(function (src, i) {
        return shot(src, "case-shot", String(i + 2).padStart(2, "0"));
      }).join("") +
      "</div>";
  }

  detail.innerHTML =
    '<p class="case-back"><a href="cases.html#' + item.cat + '">← 返回' + esc(catName) + "</a></p>" +
    '<div class="case-head">' +
      "<h2>" + esc(item.title) + "</h2>" +
      (meta.length ? '<p class="case-meta">' + meta.join('<i aria-hidden="true"></i>') + "</p>" : "") +
      (item.text ? '<p class="case-lead">' + esc(item.text) + "</p>" : "") +
    "</div>" +
    '<div class="case-visual">' +
      shot(cover, "case-cover", rest.length ? "01" : "") +
      mosaic +
    "</div>";

  var dialog = document.querySelector("[data-zoom]");
  if (dialog) {
    var img = dialog.querySelector("img");
    var cap = dialog.querySelector("p");
    detail.querySelectorAll("[data-zoom-src]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        img.src = btn.getAttribute("data-zoom-src");
        img.alt = btn.getAttribute("data-zoom-alt") || "";
        if (cap) cap.textContent = btn.getAttribute("data-zoom-alt") || "";
        dialog.showModal();
      });
    });
    var closeBtn = dialog.querySelector("[data-zoom-close]");
    if (closeBtn) closeBtn.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
  }
})();
