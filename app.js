// Меню размечено в index.html. Здесь только сворачивание, группы More и подсказки.

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("nav");
const tooltip = document.getElementById("tooltip");

let tipTimer = 0;

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
  const collapsed = sidebar.classList.toggle("collapsed");
  const name = collapsed ? "Expand menu" : "Collapse menu";
  menuToggle.setAttribute("aria-expanded", String(!collapsed));
  menuToggle.setAttribute("aria-label", name);
  menuToggle.dataset.tooltip = name;
  hideTip();
});

// Клик по любой группе More, независимо от того, где она стоит в списке.
nav.addEventListener("click", (event) => {
  const button = event.target.closest(".more-toggle");
  if (!button || !nav.contains(button)) return;
  setGroup(button, button.getAttribute("aria-expanded") !== "true");
});

// Подсказка не должна ехать вместе со списком или окном.
nav.addEventListener("scroll", hideTip, { passive: true });
window.addEventListener("resize", hideTip);
