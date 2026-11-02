const stage = document.querySelector("[data-map]");
const canvas = document.querySelector("#china-map");
const markerBox = document.querySelector("[data-markers]");
const list = document.querySelector("[data-project-list]");
const legend = document.querySelector("[data-legend]");
const minLat = 17;
const cos = Math.cos((35 * Math.PI) / 180);
const colors = {
  "总部": "#d23b3b",
  "半导体": "#0074e0",
  "光电科技": "#00349b",
  "新能源": "#0e8a78",
  "医药食品": "#c47b2b"
};

const regionOf = {
  "北京市": "华北", "天津市": "华北", "河北省": "华北", "山西省": "华北", "内蒙古自治区": "华北",
  "辽宁省": "东北", "吉林省": "东北", "黑龙江省": "东北",
  "上海市": "华东", "江苏省": "华东", "浙江省": "华东", "安徽省": "华东", "福建省": "华东", "江西省": "华东", "山东省": "华东", "台湾省": "华东",
  "河南省": "华中", "湖北省": "华中", "湖南省": "华中",
  "广东省": "华南", "广西壮族自治区": "华南", "海南省": "华南", "香港特别行政区": "华南", "澳门特别行政区": "华南",
  "重庆市": "西南", "四川省": "西南", "贵州省": "西南", "云南省": "西南", "西藏自治区": "西南",
  "陕西省": "西北", "甘肃省": "西北", "青海省": "西北", "宁夏回族自治区": "西北", "新疆维吾尔自治区": "西北"
};
const regionOrder = ["华北", "东北", "华东", "华中", "华南", "西南", "西北"];
const ctx = canvas.getContext("2d");
let geo = null;
let groups = [];
let covered = {};
let hotProvince = "";
let view = { w: 0, h: 0, minX: 0, minY: 0, scale: 1, ox: 0, oy: 0, zoom: 1, panX: 0, panY: 0 };

function eachPoint(coordinates, visit) {
  if (typeof coordinates[0] === "number") {
    visit(coordinates[0], coordinates[1]);
    return;
  }
  coordinates.forEach(function (part) {
    eachPoint(part, visit);
  });
}

function shortPlace(place) {
  return place.replace(/^.*省/, "").replace(/^.*自治区/, "").replace(/市$/, "");
}

function colorOf(field) {
  return colors[field] || "#5c6b82";
}

function groupProjects(items) {
  const result = [];
  items.forEach(function (item) {
    if (item.hq) {
      result.unshift({ place: item.place, lng: item.lng, lat: item.lat, hq: true, items: [item] });
      return;
    }
    let group = null;
    result.forEach(function (entry) {
      if (!entry.hq && entry.place === item.place) group = entry;
    });
    if (!group) {
      group = { place: item.place, lng: item.lng, lat: item.lat, items: [] };
      result.push(group);
    }
    group.items.push(item);
  });
  return result;
}

function groupColor(group) {
  if (group.hq) return colors["总部"];
  const field = group.items[0].field;
  const same = group.items.every(function (item) {
    return item.field === field;
  });
  return same ? colorOf(field) : "#5c6b82";
}

function fit(width, height) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  geo.features.forEach(function (feature) {
    eachPoint(feature.geometry.coordinates, function (lng, lat) {
      if (lat < minLat) return;
      minX = Math.min(minX, lng * cos);
      minY = Math.min(minY, -lat);
      maxX = Math.max(maxX, lng * cos);
      maxY = Math.max(maxY, -lat);
    });
  });
  const pad = 28;
  const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY));
  view.w = width;
  view.h = height;
  view.minX = minX;
  view.minY = minY;
  view.scale = scale;
  view.ox = (width - (maxX - minX) * scale) / 2;
  view.oy = (height - (maxY - minY) * scale) / 2;
  view.bound = { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
}

function basePoint(lng, lat) {
  return [
    view.ox + (lng * cos - view.minX) * view.scale,
    view.oy + (-lat - view.minY) * view.scale
  ];
}

function toScreen(lng, lat) {
  const xy = basePoint(lng, lat);
  const cx = view.w / 2;
  const cy = view.h / 2;
  return [
    cx + (xy[0] - cx) * view.zoom + view.panX,
    cy + (xy[1] - cy) * view.zoom + view.panY
  ];
}

function trace(polygon) {
  polygon.forEach(function (ring) {
    ring.forEach(function (point, index) {
      const xy = basePoint(point[0], point[1]);
      if (index === 0) ctx.moveTo(xy[0], xy[1]);
      else ctx.lineTo(xy[0], xy[1]);
    });
    ctx.closePath();
  });
}

function ringContains(ring, lng, lat) {
  let inside = false;
  let j = ring.length - 1;
  for (let i = 0; i < ring.length; i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    j = i;
  }
  return inside;
}

function featureContains(feature, lng, lat) {
  const geometry = feature.geometry;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(function (polygon) {
    let inside = false;
    polygon.forEach(function (ring) {
      if (ringContains(ring, lng, lat)) inside = !inside;
    });
    return inside;
  });
}

function markCovered() {
  covered = {};
  groups.forEach(function (group) {
    geo.features.forEach(function (feature) {
      const name = feature.properties.name;
      if (!name || covered[name]) return;
      if (featureContains(feature, group.lng, group.lat)) covered[name] = true;
    });
  });
}

function eachPolygon(visit) {
  geo.features.forEach(function (feature) {
    const geometry = feature.geometry;
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    polygons.forEach(function (polygon) {
      visit(feature, polygon);
    });
  });
}

function fillPolygon(polygon, color) {
  ctx.beginPath();
  trace(polygon);
  ctx.fillStyle = color;
  ctx.fill("evenodd");
}

function strokePolygon(polygon, color, width) {
  ctx.beginPath();
  trace(polygon);
  ctx.strokeStyle = color;
  ctx.lineWidth = width / view.zoom;
  ctx.stroke();
}

function shortProvince(name) {
  return name
    .replace("维吾尔自治区", "")
    .replace("壮族自治区", "")
    .replace("回族自治区", "")
    .replace("特别行政区", "")
    .replace("自治区", "")
    .replace("省", "")
    .replace("市", "");
}

function writeCoverage(items) {
  const el = document.querySelector("[data-coverage]");
  if (!el) return;
  const regions = [];
  regionOrder.forEach(function (region) {
    Object.keys(covered).forEach(function (name) {
      if (regionOf[name] === region && regions.indexOf(region) < 0) regions.push(region);
    });
  });
  const provinces = [];
  geo.features.forEach(function (feature) {
    if (covered[feature.properties.name]) provinces.push(shortProvince(feature.properties.name));
  });
  const cities = {};
  let projects = 0;
  items.forEach(function (item) {
    if (item.hq) return;
    cities[item.place] = true;
    projects += 1;
  });
  function words(list, className) {
    return list.map(function (text) {
      return '<span class="' + className + '">' + text + "</span>";
    }).join("");
  }
  const cityCount = Object.keys(cities).length;
  el.innerHTML =
    '<p class="coverage-line"><span class="coverage-label">工程项目跨越</span>' + words(regions, "coverage-name") + "</p>" +
    '<p class="coverage-line"><span class="coverage-label">覆盖</span>' + words(provinces, "coverage-name") + '</p>' +
    '<p class="coverage-stats"><span><strong>' + provinces.length + "</strong>省区市</span><span><strong>" + cityCount + "</strong>座城市</span><span><strong>" + projects + "</strong>个项目</span></p>";
}

function drawMap() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height || !geo) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  fit(width, height);
  const cx = width / 2;
  const cy = height / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(
    ratio * view.zoom,
    0,
    0,
    ratio * view.zoom,
    ratio * (view.panX + cx * (1 - view.zoom)),
    ratio * (view.panY + cy * (1 - view.zoom))
  );
  ctx.lineJoin = "round";
  ctx.save();
  ctx.translate(0, 4 / view.zoom);
  eachPolygon(function (feature, polygon) {
    if (!feature.properties.name) return;
    fillPolygon(polygon, "rgba(16, 32, 60, 0.05)");
  });
  ctx.restore();
  eachPolygon(function (feature, polygon) {
    if (!feature.properties.name) return;
    const on = covered[feature.properties.name];
    fillPolygon(polygon, on ? "#7eb3e8" : "#d7e2ee");
    strokePolygon(polygon, "#ffffff", on ? 1.8 : 1.3);
  });
  eachPolygon(function (feature, polygon) {
    if (feature.properties.name) return;
    strokePolygon(polygon, "#c5d0dc", 1.1);
  });
  eachPolygon(function (feature, polygon) {
    if (!hotProvince || feature.properties.name !== hotProvince) return;
    strokePolygon(polygon, "#e39b2b", 2.6);
  });
  placeMarkers();
}

function provinceAt(x, y) {
  if (!geo || !view.w) return "";
  const cx = view.w / 2;
  const cy = view.h / 2;
  const sx = cx + (x - cx - view.panX) / view.zoom;
  const sy = cy + (y - cy - view.panY) / view.zoom;
  const lng = ((sx - view.ox) / view.scale + view.minX) / cos;
  const lat = -((sy - view.oy) / view.scale + view.minY);
  let found = "";
  geo.features.forEach(function (feature) {
    const name = feature.properties.name;
    if (!name || found || !covered[name]) return;
    if (featureContains(feature, lng, lat)) found = name;
  });
  return found;
}

function setHot(name) {
  if (name === hotProvince) return;
  hotProvince = name;
  drawMap();
}

stage.addEventListener("mousemove", function (event) {
  const rect = stage.getBoundingClientRect();
  const name = provinceAt(event.clientX - rect.left, event.clientY - rect.top);
  const prevProvince = hoverProvince;
  const prevCity = hoverCity;
  if (!event.target.closest(".map-marker")) hoverCity = "";
  if (name) {
    hoverProvince = name;
    setHot(name);
  }
  if (hoverProvince !== prevProvince || hoverCity !== prevCity) showPlace(true);
});

function leftMap(event) {
  const next = event.relatedTarget;
  if (!next) return true;
  return !stage.contains(next) && !list.contains(next);
}

function releaseMap() {
  hoverProvince = "";
  hoverCity = "";
  setHot(pinnedFocus);
  showPlace(false);
}

stage.addEventListener("click", function (event) {
  if (event.target.closest(".map-marker")) return;
  const rect = stage.getBoundingClientRect();
  const name = provinceAt(event.clientX - rect.left, event.clientY - rect.top);
  if (!name) return;
  toggleProvince(name);
});

stage.addEventListener("mouseleave", function (event) {
  if (!leftMap(event)) return;
  releaseMap();
});

list.addEventListener("mouseleave", function (event) {
  if (!leftMap(event)) return;
  releaseMap();
});

function placeMarkers() {
  const markers = markerBox.querySelectorAll(".map-marker");
  groups.forEach(function (group, index) {
    const el = markers[index];
    if (!el) return;
    const xy = toScreen(group.lng, group.lat);
    el.style.left = xy[0] + "px";
    el.style.top = xy[1] + "px";
  });
}

let hoverProvince = "";
let hoverCity = "";
let pinnedProvinces = {};
let pinnedCities = {};
let pinnedFocus = "";
let pinnedCityFocus = "";

function toggleProvince(name) {
  if (!name || name === "总部") return;
  if (pinnedProvinces[name]) {
    delete pinnedProvinces[name];
    groups.forEach(function (group) {
      if (placeOf(group) === name) delete pinnedCities[group.place];
    });
    if (pinnedFocus === name) pinnedFocus = "";
    if (pinnedCityFocus && !pinnedCities[pinnedCityFocus]) pinnedCityFocus = "";
  } else {
    pinnedProvinces[name] = true;
    pinnedFocus = name;
  }
  setHot(hoverProvince || pinnedFocus);
  showPlace(true);
}

function toggleCity(place, provinceName) {
  if (pinnedCities[place]) {
    delete pinnedCities[place];
    if (pinnedCityFocus === place) pinnedCityFocus = "";
  } else {
    pinnedCities[place] = true;
    pinnedCityFocus = place;
    if (provinceName && provinceName !== "总部") {
      pinnedProvinces[provinceName] = true;
      pinnedFocus = provinceName;
    }
  }
  setHot(hoverProvince || pinnedFocus);
  showPlace(true);
}

function placeOf(group) {
  if (group.hq) return "总部";
  let found = "";
  geo.features.forEach(function (feature) {
    const name = feature.properties.name;
    if (!name || found) return;
    if (featureContains(feature, group.lng, group.lat)) found = name;
  });
  return found;
}

function scrollIntoList(el) {
  const top = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
  if (top < list.scrollTop || top + el.offsetHeight > list.scrollTop + list.clientHeight) {
    list.scrollTop = top;
  }
}

function showPlace(scroll) {
  markerBox.querySelectorAll(".map-marker").forEach(function (el) {
    const place = el.getAttribute("data-place");
    el.classList.toggle("is-active", place === hoverCity || !!pinnedCities[place]);
  });
  list.querySelectorAll(".project-province").forEach(function (el) {
    const name = el.getAttribute("data-province");
    const open = el.classList.contains("is-hq") || !!pinnedProvinces[name] || name === hoverProvince;
    el.classList.toggle("is-open", open);
    if (scroll && open && (name === hoverProvince || name === pinnedFocus)) scrollIntoList(el);
  });
  list.querySelectorAll(".project-city").forEach(function (el) {
    const place = el.getAttribute("data-place");
    const on = place === hoverCity || !!pinnedCities[place];
    el.classList.toggle("is-active", on);
    if (scroll && on && (place === hoverCity || place === pinnedCityFocus)) scrollIntoList(el);
  });
  focusView();
}

let focusToken = 0;
let focusGoal = { zoom: 1, panX: 0, panY: 0 };

function nearView(a, b) {
  return Math.abs(a.zoom - b.zoom) < 0.02 && Math.abs(a.panX - b.panX) < 1 && Math.abs(a.panY - b.panY) < 1;
}

function boxOfRegion(region) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  geo.features.forEach(function (feature) {
    const name = feature.properties.name;
    if (regionOf[name] !== region) return;
    eachPoint(feature.geometry.coordinates, function (lng, lat) {
      if (lat < minLat) return;
      const xy = basePoint(lng, lat);
      minX = Math.min(minX, xy[0]);
      minY = Math.min(minY, xy[1]);
      maxX = Math.max(maxX, xy[0]);
      maxY = Math.max(maxY, xy[1]);
    });
  });
  if (minX === Infinity) return null;
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
}

function targetView() {
  const province = hoverProvince || pinnedFocus;
  const region = province === "总部" ? "华东" : regionOf[province];
  const box = region ? boxOfRegion(region) : null;
  if (!box || !view.w) return { zoom: 1, panX: 0, panY: 0 };
  const pad = 72;
  const bw = Math.max(box.maxX - box.minX, 40);
  const bh = Math.max(box.maxY - box.minY, 40);
  let zoom = Math.min((view.w - pad * 2) / bw, (view.h - pad * 2) / bh);
  if (zoom < 1) zoom = 1;
  if (zoom > 2.5) zoom = 2.5;
  const bx = (box.minX + box.maxX) / 2;
  const by = (box.minY + box.maxY) / 2;
  const cx = view.w / 2;
  const cy = view.h / 2;
  return { zoom: zoom, panX: (cx - bx) * zoom, panY: (cy - by) * zoom };
}

function focusView() {
  if (!view.w) return;
  const next = targetView();
  if (nearView(focusGoal, next)) return;
  focusGoal = next;
  const from = { zoom: view.zoom, panX: view.panX, panY: view.panY };
  if (nearView(from, next)) {
    focusToken += 1;
    return;
  }
  const token = ++focusToken;
  const start = performance.now();
  function step(now) {
    if (token !== focusToken) return;
    const t = Math.min(1, (now - start) / 800);
    const k = t * t * (3 - 2 * t);
    view.zoom = from.zoom + (next.zoom - from.zoom) * k;
    view.panX = from.panX + (next.panX - from.panX) * k;
    view.panY = from.panY + (next.panY - from.panY) * k;
    drawMap();
    if (t < 1) setTimeout(function () { step(performance.now()); }, 16);
  }
  setTimeout(function () { step(performance.now()); }, 16);
}

function buildLegend() {
  legend.innerHTML = "";
  Object.keys(colors).forEach(function (field) {
    const item = document.createElement("span");
    item.innerHTML = '<i style="background:' + colorOf(field) + '"></i>' + field;
    legend.appendChild(item);
  });
}

function buildMarkers() {
  markerBox.innerHTML = "";
  groups.forEach(function (group) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = group.hq ? "map-marker is-hq" : "map-marker";
    button.setAttribute("data-place", group.place);
    const count = group.items.length > 1 ? " " + group.items.length : "";
    const label = group.hq ? "总部" : shortPlace(group.place) + count;
    const dot = group.hq ? "map-hq-dot" : "map-dot";
    button.innerHTML = '<span class="' + dot + '" style="background:' + groupColor(group) + '"></span><span class="map-label">' + label + "</span>";
    button.addEventListener("mouseenter", function () {
      hoverCity = group.place;
      hoverProvince = placeOf(group);
      if (!group.hq) setHot(hoverProvince);
      showPlace(true);
    });
    button.addEventListener("mouseleave", function () {
      if (hoverCity === group.place) hoverCity = "";
      showPlace(false);
    });
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleCity(group.place, placeOf(group));
    });
    markerBox.appendChild(button);
  });
}

function projectRows(items) {
  const rows = document.createElement("div");
  rows.className = "project-rows";
  items.forEach(function (item) {
    const row = item.caseId ? document.createElement("a") : document.createElement("p");
    row.className = item.caseId ? "project-row is-link" : "project-row";
    if (item.caseId) {
      row.href = "case.html?id=" + encodeURIComponent(item.caseId);
      row.addEventListener("click", function (event) {
        event.stopPropagation();
      });
    }
    row.innerHTML = '<i style="background:' + colorOf(item.field) + '"></i><span><strong>' + item.name + "</strong>" + item.work + "</span>";
    rows.appendChild(row);
  });
  return rows;
}

function buildList() {
  const provinces = [];
  groups.forEach(function (group) {
    const name = placeOf(group);
    let province = null;
    provinces.forEach(function (entry) {
      if (entry.name === name) province = entry;
    });
    if (!province) {
      province = { name: name, groups: [] };
      provinces.push(province);
    }
    province.groups.push(group);
  });
  const hq = groups.filter(function (group) { return group.hq; })[0];
  function fromHq(group) {
    const dx = (group.lng - hq.lng) * Math.cos(hq.lat * Math.PI / 180);
    const dy = group.lat - hq.lat;
    return dx * dx + dy * dy;
  }
  provinces.forEach(function (province) {
    province.distance = province.groups.reduce(function (near, group) {
      const dist = fromHq(group);
      return dist < near ? dist : near;
    }, Infinity);
  });
  provinces.sort(function (a, b) {
    if (a.name === "总部") return -1;
    if (b.name === "总部") return 1;
    const order = ["华东", "华中", "东北", "华北", "西北", "西南", "华南"];
    const regionA = order.indexOf(regionOf[a.name]);
    const regionB = order.indexOf(regionOf[b.name]);
    if (regionA !== regionB) return regionA - regionB;
    return a.distance - b.distance;
  });
  list.innerHTML = "";
  provinces.forEach(function (province) {
    const block = document.createElement("div");
    block.className = province.name === "总部" ? "project-province is-hq is-open" : "project-province";
    block.setAttribute("data-province", province.name);
    const total = province.groups.reduce(function (sum, group) { return sum + group.items.length; }, 0);
    const title = document.createElement("p");
    title.className = "project-province-name";
    title.textContent = province.name === "总部" ? "总部" : shortProvince(province.name);
    const count = document.createElement("span");
    count.textContent = total;
    title.appendChild(count);
    block.appendChild(title);
    const body = document.createElement("div");
    body.className = "province-body";
    if (province.name === "总部") {
      body.appendChild(projectRows(province.groups[0].items));
      body.querySelector(".project-rows").classList.add("is-fixed");
    } else {
      province.groups.forEach(function (group) {
        const city = document.createElement("div");
        city.className = "project-city";
        city.setAttribute("data-place", group.place);
        const cityTitle = document.createElement("p");
        cityTitle.className = "project-city-name";
        cityTitle.textContent = shortPlace(group.place);
        const cityCount = document.createElement("span");
        cityCount.textContent = group.items.length;
        cityTitle.appendChild(cityCount);
        city.appendChild(cityTitle);
        city.appendChild(projectRows(group.items));
        city.addEventListener("mouseenter", function () {
          hoverCity = group.place;
          hoverProvince = province.name;
          setHot(province.name);
          showPlace(false);
        });
        city.addEventListener("mouseleave", function () {
          if (hoverCity === group.place) hoverCity = "";
          showPlace(false);
        });
        city.addEventListener("click", function (event) {
          event.stopPropagation();
          toggleCity(group.place, province.name);
        });
        body.appendChild(city);
      });
    }
    block.appendChild(body);
    block.addEventListener("mouseenter", function () {
      if (province.name === "总部") return;
      hoverProvince = province.name;
      setHot(province.name);
      showPlace(false);
    });
    block.addEventListener("mouseleave", function () {
      province.groups.forEach(function (group) {
        if (hoverCity === group.place) hoverCity = "";
      });
      showPlace(false);
    });
    block.addEventListener("click", function () {
      toggleProvince(province.name);
    });
    list.appendChild(block);
  });
}

Promise.all([
  fetch("assets/china.json").then(function (response) { return response.json(); }),
  fetch("data/projects.json?v=3").then(function (response) { return response.json(); })
]).then(function (result) {
  geo = result[0];
  groups = groupProjects(result[1]);
  markCovered();
  writeCoverage(result[1]);
  buildLegend();
  buildMarkers();
  buildList();
  drawMap();
});

window.addEventListener("resize", function () {
  view.panX = 0;
  view.panY = 0;
  view.zoom = 1;
  drawMap();
});
