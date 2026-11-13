// Меню размечено в index.html. Здесь сворачивание, группы More, подсказки
// и выделение пункта по адресу (/tasks и т.д.).

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("nav");
const tooltip = document.getElementById("tooltip");

let tipTimer = 0;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Фиксирует ширину подписи, чтобы при смене ширины колонки текст не переносился заново.
function pinLabels() {
  document.querySelectorAll(".label").forEach((label) => {
    const box = label.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    label.style.width = `${box.width}px`;
    label.style.maxHeight = `${box.height}px`;
  });
}

function pinnedLabels() {
  return [...document.querySelectorAll(".label")].filter((label) => label.style.maxHeight);
}

// После раскрытия колонки отдаёт подписям их настоящую высоту с переносом.
function settleLabels() {
  const labels = pinnedLabels();
  if (sidebar.classList.contains("collapsed")) return;

  labels.forEach((label) => {
    label.style.width = "";
    label.style.maxHeight = "20px";
  });
  sidebar.getBoundingClientRect();
  labels.forEach((label) => {
    label.style.maxHeight = `${label.scrollHeight}px`;
  });
}

// Раскрывает или закрывает одну группу и меняет её подпись More/Less.
function setGroup(button, open) {
  const submenu = document.getElementById(button.getAttribute("aria-controls"));
  submenu.classList.toggle("open", open);
  button.classList.toggle("open", open);
  button.setAttribute("aria-expanded", String(open));
  // inert убирает закрытые пункты из Tab и из дерева доступности
  submenu.toggleAttribute("inert", !open);
  submenu.setAttribute("aria-hidden", String(!open));
  const name = open ? button.dataset.openLabel : button.dataset.closedLabel;
  button.querySelector(".label").textContent = name;
  button.dataset.tooltip = name;
}

let revealToken = 0;

// Прокручивает список, только если пункт не целиком виден.
function scrollItemIntoView(item) {
  const margin = 8;
  const itemBox = item.getBoundingClientRect();
  const navBox = nav.getBoundingClientRect();
  const viewHeight = navBox.height - margin * 2;

  if (itemBox.height >= viewHeight) {
    nav.scrollTop += itemBox.top - navBox.top - margin;
    return;
  }

  if (itemBox.top < navBox.top + margin) {
    nav.scrollTop -= navBox.top + margin - itemBox.top;
  } else if (itemBox.bottom > navBox.bottom - margin) {
    nav.scrollTop += itemBox.bottom - (navBox.bottom - margin);
  }
}

// Если пункт внутри закрытой группы More, раскрывает именно её.
function openGroupFor(item) {
  const submenu = item.closest(".submenu");
  if (!submenu || submenu.classList.contains("open")) return null;
  const button = nav.querySelector(`[aria-controls="${submenu.id}"]`);
  if (!button) return null;
  setGroup(button, true);
  return submenu;
}

function currentPath() {
  const path = decodeURIComponent(location.pathname).replace(/\/+$/, "");
  return path || "/";
}

// Совпадает data-path пункта с адресом в строке браузера.
function revealFromUrl() {
  const token = ++revealToken;
  const path = currentPath();
  let current = null;

  nav.querySelectorAll(".item[data-path]").forEach((item) => {
    const selected = item.dataset.path === path;
    item.classList.toggle("active", selected);
    if (selected) {
      item.setAttribute("aria-current", "page");
      current = item;
    } else {
      item.removeAttribute("aria-current");
    }
  });

  if (!current) return;

  const finish = () => {
    if (token !== revealToken) return;
    scrollItemIntoView(current);
  };

  const submenu = openGroupFor(current);
  if (!submenu || reduceMotion.matches) {
    finish();
    return;
  }

  let timer = 0;
  const onEnd = (event) => {
    if (event.target !== submenu || event.propertyName !== "grid-template-rows") return;
    submenu.removeEventListener("transitionend", onEnd);
    clearTimeout(timer);
    finish();
  };
  submenu.addEventListener("transitionend", onEnd);
  timer = setTimeout(() => {
    submenu.removeEventListener("transitionend", onEnd);
    finish();
  }, 400);
}

function hideTip() {
  clearTimeout(tipTimer);
  tooltip.hidden = true;
}

// Подпись не влезает в кнопку — тогда подсказка нужна и в широком меню.
function labelTruncated(element) {
  const label = element.querySelector(".label");
  if (!label) return false;
  return label.scrollWidth > label.clientWidth + 1;
}

function showTip(element) {
  const collapsed = sidebar.classList.contains("collapsed");
  // По умолчанию подсказка только у свёрнутого меню. data-tip="always" — исключение.
  const mode = element.dataset.tip || "collapsed";
  if (mode === "collapsed" && !collapsed && !labelTruncated(element)) return;

  tooltip.textContent = element.dataset.tooltip;
  tooltip.hidden = false;
  const anchor = element.getBoundingClientRect();
  const tipBox = tooltip.getBoundingClientRect();
  const half = tipBox.height / 2;
  let top = anchor.top + anchor.height / 2;
  top = Math.min(Math.max(top, 8 + half), window.innerHeight - 8 - half);
  let left = anchor.right + 10;
  if (left + tipBox.width > window.innerWidth - 8) {
    left = Math.max(8, anchor.left - tipBox.width - 10);
  }
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

function scheduleTip(element) {
  const collapsed = sidebar.classList.contains("collapsed");
  const mode = element.dataset.tip || "collapsed";
  if (mode === "collapsed" && !collapsed && !labelTruncated(element)) return;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => showTip(element), 250);
}

document.querySelectorAll("[data-tooltip]").forEach((element) => {
  element.addEventListener("mouseenter", () => scheduleTip(element));
  element.addEventListener("mouseleave", hideTip);
  element.addEventListener("focus", () => scheduleTip(element));
  element.addEventListener("blur", hideTip);
});

menuToggle.addEventListener("click", () => {
  const collapsing = !sidebar.classList.contains("collapsed");
  if (collapsing && !reduceMotion.matches) {
    pinLabels();
    sidebar.getBoundingClientRect();
    pinnedLabels().forEach((label) => {
      label.style.maxHeight = "20px";
    });
  }

  const collapsed = sidebar.classList.toggle("collapsed");
  const name = collapsed ? "Expand menu" : "Collapse menu";
  menuToggle.setAttribute("aria-expanded", String(!collapsed));
  menuToggle.setAttribute("aria-label", name);
  menuToggle.dataset.tooltip = name;
  hideTip();

  if (reduceMotion.matches) settleLabels();
});

sidebar.addEventListener("transitionend", (event) => {
  if (event.target !== sidebar || event.propertyName !== "width") return;
  settleLabels();
});

// Клик по группе More или по пункту. Адрес меняется без перезагрузки.
nav.addEventListener("click", (event) => {
  const more = event.target.closest(".more-toggle");
  if (more && nav.contains(more)) {
    setGroup(more, more.getAttribute("aria-expanded") !== "true");
    return;
  }

  const item = event.target.closest(".item");
  if (!item || !nav.contains(item) || !item.dataset.path) return;
  if (item.dataset.path !== currentPath()) {
    history.pushState(null, "", item.dataset.path);
  }
  revealFromUrl();
});

// Подсказка не должна ехать вместе со списком или окном.
nav.addEventListener("scroll", hideTip, { passive: true });
window.addEventListener("resize", hideTip);

// Вставка адреса перезагружает страницу. Назад и вперёд приходят сюда.
window.addEventListener("popstate", revealFromUrl);
revealFromUrl();
