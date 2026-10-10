/* HELMY PRESTIGE — OWNER & ADMIN
   Never put a Supabase service_role key in browser JavaScript. */
(() => {
"use strict";

const SUPABASE_URL = "https://fnftfpthzlgkfexnknaw.supabase.co";
const SUPABASE_KEY = "sb_publishable_wugH6rf-d6hXXQU2tkvWtg_YxdWz8OP";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const publicList = $("#publicProductList");
const publicMsg = $("#publicInventoryMessage");
const modal = $(".admin-modal");
const loginForm = $("#staffLoginForm");
const dashboard = $(".admin-dashboard");
const productForm = $("#adminProductForm");
const productList = $(".admin-product-list");
const saveButton = $("#adminSaveProduct");
const createAdminForm = $("#ownerCreateAdminForm");
const ownerPanel = $("#ownerManagementPanel");

$("#currentYear").textContent = new Date().getFullYear();

const demo = [
  {
    name:"RXP-X RS 2022", category:"jet_ski", year:2022,
    mileage:null, horsepower:null, price:1150000, hours:100,
    description:"Premium personal watercraft.",
    images:["IMG_2815.jpeg","IMG_2814.jpeg","IMG_2813.jpeg"]
  },
  {
    name:"RXT-X RS 2018", category:"jet_ski", year:2018,
    mileage:null, horsepower:null, price:750000, hours:85,
    description:"Premium personal watercraft.",
    images:["IMG_2812.jpeg","IMG_2811.jpeg"]
  },
  {
    name:"RXP-X RS 2025", category:"jet_ski", year:2025,
    mileage:null, horsepower:null, price:1250000, hours:128,
    description:"Premium personal watercraft.",
    images:["IMG_2809.jpeg","IMG_2810.jpeg"]
  },
  {
    name:"GTX Limited 2024", category:"jet_ski", year:2024,
    mileage:null, horsepower:null, price:1050000, hours:110,
    description:"Premium personal watercraft.",
    images:["IMG_2721.jpeg","IMG_2720.jpeg"]
  }
];

let db = null;
let user = null;
let role = null;
let items = [];
let editingId = null;
let busy = false;
let selectedCategory = "all";
let demoMode = false;

const categories = {
  car:"CAR",
  beach_buggy:"BEACH BUGGY",
  jet_ski:"JET SKI",
  boat:"BOAT"
};

function normalizeCategory(value) {
  const key = String(value || "all")
    .trim().toLowerCase().replace(/[\s-]+/g, "_");

  const aliases = {
    all:"all",
    car:"car", cars:"car",
    beach_buggy:"beach_buggy",
    beach_buggies:"beach_buggy",
    buggy:"beach_buggy", buggies:"beach_buggy",
    jet_ski:"jet_ski", jet_skis:"jet_ski",
    jetski:"jet_ski", jetskis:"jet_ski",
    boat:"boat", boats:"boat"
  };

  return aliases[key] || "all";
}

function visibleProducts(list) {
  return selectedCategory === "all"
    ? list
    : list.filter(p =>
        normalizeCategory(p.category || "jet_ski") === selectedCategory
      );
}

function setCategory(value) {
  selectedCategory = normalizeCategory(value);

  $$("[data-category], [data-filter], .category-button").forEach(button => {
    const raw = button.dataset.category ||
      button.dataset.filter || button.value || button.textContent;

    const active = normalizeCategory(raw) === selectedCategory;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  renderPublic(demoMode ? demo : items);
}

document.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const button = target.closest(
    ".category-filters [data-category], #categoryFilter button, " +
    "#categoryFilter [data-category], #categoryFilter [data-filter], " +
    ".category-button[data-category]"
  );

  if (!button) return;

  const raw = button.dataset.category ||
    button.dataset.filter || button.value || button.textContent;

  event.preventDefault();
  setCategory(raw);
});

const msg = (el, text, type = "") => {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("error", "success");
  if (type) el.classList.add(type);
};

const money = n =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat("en-US", {
        maximumFractionDigits:0
      }).format(Number(n))
    : "Price on request";

const staff = () => role === "owner" || role === "admin";
const owner = () => role === "owner";

function node(tag, cls, text) {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function toggleBusy(button, on, label = "PLEASE WAIT...") {
  if (!button) return;

  if (on) {
    button.dataset.oldText ||= button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.oldText || button.textContent;
    button.disabled = false;
  }
}

function openLogin() {
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("staff-login-open");
  $("#staffEmail")?.focus();
}

function closeLogin() {
  if (modal) modal.hidden = true;
  document.body.classList.remove("staff-login-open");
}

$$(".staff-login-trigger").forEach(button =>
  button.addEventListener("click", openLogin)
);

$$(".admin-close").forEach(button =>
  button.addEventListener("click", closeLogin)
);

$(".admin-modal-backdrop")?.addEventListener("click", closeLogin);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modal && !modal.hidden) closeLogin();
});

function validImage(src) {
  try {
    const url = new URL(src, location.href);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function productImages(product) {
  if (Array.isArray(product?.images)) return product.images;

  if (typeof product?.images === "string") {
    try {
      const parsed = JSON.parse(product.images);
      return Array.isArray(parsed)
        ? parsed
        : product.images.split(/\n+/).filter(Boolean);
    } catch {
      return product.images.split(/\n+/).filter(Boolean);
    }
  }

  return [];
}

/* BUY NOW opens WhatsApp with product details */
const whatsappUrl = product =>
  `https://wa.me/201117000625?text=${encodeURIComponent(
    `Hello, I want to buy ${product.name || "this product"}. ` +
    `Price: ${money(product.price)} EGP. Please confirm availability.`
  )}`;

/* Product details gallery */
function showProductDetails(product) {
  const detailsModal = $("#productDetailsModal");
  const gallery = $("#detailsGallery");
  const info = $("#detailsInfo");

  if (!detailsModal || !gallery || !info) return;

  gallery.replaceChildren();
  info.replaceChildren();

  const images = productImages(product).map(validImage).filter(Boolean);
  let index = 0;

  const main = node("img", "details-main-image");
  main.alt = product.name || "Product";

  if (images.length) {
    main.src = images[0];
  } else {
    main.alt = "No product image available";
    main.classList.add("no-image");
  }

  const zoom = node("button", "gallery-zoom", "⤢ ZOOM");
  zoom.type = "button";
  zoom.setAttribute("aria-label", "Zoom product image");

  const thumbs = node("div", "gallery-thumbnails");

  const updateImage = () => {
    if (images.length) main.src = images[index];

    thumbs.querySelectorAll("img").forEach((image, i) => {
      image.classList.toggle("selected", i === index);
    });
  };

  main.addEventListener("click", () =>
    main.classList.toggle("zoomed")
  );

  zoom.addEventListener("click", () =>
    main.classList.toggle("zoomed")
  );

  /* Swipe left and right on touchscreens */
  let startX = null;

  main.addEventListener("pointerdown", event => {
    startX = event.clientX;
  });

  main.addEventListener("pointerup", event => {
    if (startX === null || images.length < 2) return;

    const delta = event.clientX - startX;
    startX = null;

    if (Math.abs(delta) > 35) {
      index = (index + (delta < 0 ? 1 : -1) + images.length) % images.length;
      main.classList.remove("zoomed");
      updateImage();
    }
  });

  if (images.length > 1) {
    const controls = node("div", "gallery-controls");
    const previous = node("button", "", "‹ PREVIOUS VIEW");
    const next = node("button", "", "NEXT VIEW ›");

    previous.type = next.type = "button";

    previous.addEventListener("click", () => {
      index = (index + images.length - 1) % images.length;
      main.classList.remove("zoomed");
      updateImage();
    });

    next.addEventListener("click", () => {
      index = (index + 1) % images.length;
      main.classList.remove("zoomed");
      updateImage();
    });

    images.forEach((src, i) => {
      const image = node("img", "details-thumbnail");
      image.src = src;
      image.alt = `${product.name || "Product"} angle ${i + 1}`;

      image.addEventListener("click", () => {
        index = i;
        main.classList.remove("zoomed");
        updateImage();
      });

      thumbs.append(image);
    });

    controls.append(previous, next);
    updateImage();
    gallery.append(main, zoom, controls, thumbs);
  } else {
    gallery.append(main, zoom);
  }

  const status = String(product.status || "available").toLowerCase();
  const sold = status === "sold_out" || status === "sold out";

  const badge = node(
    "span",
    `details-status${sold ? " sold-out" : ""}`,
    sold ? "● SOLD OUT" : "● AVAILABLE"
  );

  info.append(
    node("p", "eyebrow",
      categories[normalizeCategory(product.category)] || "PREMIUM INVENTORY"
    ),
    node("h2", "", product.name || "Product"),
    node("p", "details-price", `${money(product.price)} EGP`),
    badge,
    node("p", "", product.description ||
      "Contact our team for full details and availability.")
  );

  const specs = node("div", "details-specs");

  [
    ["Category", categories[normalizeCategory(product.category)] || "Premium"],
    ["Year", product.year],
    ["Engine hours", product.hours],
    ["Mileage", product.mileage != null ? `${product.mileage} km` : null],
    ["Horsepower", product.horsepower ? `${product.horsepower} HP` : null]
  ].forEach(([label, value]) => {
    if (value === null || value === undefined || value === "") return;

    const cell = node("div");
    cell.append(node("span", "", label), node("strong", "", value));
    specs.append(cell);
  });

  if (specs.childElementCount) info.append(specs);

  const quantity = Number.isFinite(Number(product.quantity))
    ? Math.max(0, Number(product.quantity))
    : 1;

  info.append(node("p", "details-quantity", `Available quantity: ${quantity}`));

  const buy = node("a", "button details-buy", "BUY NOW  ↗");
  buy.href = whatsappUrl(product);
  buy.target = "_blank";
  buy.rel = "noopener noreferrer";

  if (sold || quantity === 0) {
    buy.classList.add("is-disabled");
    buy.setAttribute("aria-disabled", "true");
    buy.textContent = "CURRENTLY SOLD OUT";
    buy.href = "#";
    buy.addEventListener("click", event => event.preventDefault());
  }

  info.append(buy);

  detailsModal.hidden = false;
  document.body.classList.add("details-open");
}

function closeProductDetails() {
  const detailsModal = $("#productDetailsModal");
  if (detailsModal) detailsModal.hidden = true;
  document.body.classList.remove("details-open");
}

document.addEventListener("click", event => {
  if (event.target instanceof Element &&
      event.target.closest("[data-close-details]")) {
    closeProductDetails();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeProductDetails();
});
