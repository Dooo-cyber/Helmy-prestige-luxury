
/* HELMY PRESTIGE LUXURY — COMPLETE SCRIPT */
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

if ($("#currentYear")) {
  $("#currentYear").textContent = new Date().getFullYear();
}

const categories = {
  car: "CAR",
  beach_buggy: "BEACH BUGGY",
  jet_ski: "JET SKI",
  boat: "BOAT"
};

const demo = [
  {
    name: "RXP-X RS 2022",
    category: "jet_ski",
    price: 1150000,
    year: 2022,
    hours: 100,
    description: "Premium personal watercraft.",
    images: ["IMG_2815.jpeg", "IMG_2814.jpeg", "IMG_2813.jpeg"]
  },
  {
    name: "RXT-X RS 2018",
    category: "jet_ski",
    price: 750000,
    year: 2018,
    hours: 85,
    description: "Premium personal watercraft.",
    images: ["IMG_2812.jpeg", "IMG_2811.jpeg"]
  },
  {
    name: "RXP-X RS 2025",
    category: "jet_ski",
    price: 1250000,
    year: 2025,
    hours: 128,
    description: "Premium personal watercraft.",
    images: ["IMG_2809.jpeg", "IMG_2810.jpeg"]
  },
  {
    name: "GTX Limited 2024",
    category: "jet_ski",
    price: 1050000,
    year: 2024,
    hours: 110,
    description: "Premium personal watercraft.",
    images: ["IMG_2721.jpeg", "IMG_2720.jpeg"]
  }
];

let db = null;
let user = null;
let role = null;
let items = [];
let editingId = null;
let busy = false;
let demoMode = true;
let selectedCategory = "all";

const msg = (el, text, type = "") => {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("error", "success");
  if (type) el.classList.add(type);
};

const money = n =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0
      }).format(Number(n))
    : "Price on request";

const staff = () => role === "owner" || role === "admin";
const owner = () => role === "owner";

function node(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = String(text);
  return el;
}

function toggleBusy(btn, on, label = "PLEASE WAIT...") {
  if (!btn) return;
  if (on) {
    btn.dataset.oldText ||= btn.textContent;
    btn.textContent = label;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.oldText || btn.textContent;
    btn.disabled = false;
  }
}

/* STAFF LOGIN */
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

$$(".staff-login-trigger").forEach(btn =>
  btn.addEventListener("click", openLogin)
);

$$(".admin-close").forEach(btn =>
  btn.addEventListener("click", closeLogin)
);

$(".admin-modal-backdrop")?.addEventListener("click", closeLogin);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modal && !modal.hidden) {
    closeLogin();
  }
});

/* CATEGORY FILTER */
function normalizeCategory(value) {
  const key = String(value || "all")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    all: "all",
    car: "car",
    cars: "car",
    beach_buggy: "beach_buggy",
    beach_buggies: "beach_buggy",
    buggy: "beach_buggy",
    buggies: "beach_buggy",
    jet_ski: "jet_ski",
    jet_skis: "jet_ski",
    jetski: "jet_ski",
    jetskis: "jet_ski",
    boat: "boat",
    boats: "boat"
  };

  return aliases[key] || "all";
}

function getVisibleProducts(list) {
  if (selectedCategory === "all") return list;

  return list.filter(product =>
    normalizeCategory(product.category || "jet_ski") === selectedCategory
  );
}

function setCategory(value) {
  selectedCategory = normalizeCategory(value);

  $$(".category-button, [data-category], [data-filter]").forEach(btn => {
    const btnValue =
      btn.dataset.category ||
      btn.dataset.filter ||
      btn.value ||
      btn.textContent;

    const active = normalizeCategory(btnValue) === selectedCategory;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  renderPublic(getVisibleProducts(demoMode ? demo : items));
}

document.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const btn = target.closest(
    "#categoryFilter button, #categoryFilter [data-category], " +
    "#categoryFilter [data-filter], .category-button[data-category], " +
    ".category-button[data-filter]"
  );

  if (!btn) return;

  event.preventDefault();

  const value =
    btn.dataset.category ||
    btn.dataset.filter ||
    btn.value ||
    btn.textContent;

  setCategory(value);
});

/* PRODUCT IMAGES */
function validImage(src) {
  try {
    const url = new URL(src, location.href);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

/* PUBLIC PRODUCT DISPLAY */
function renderPublic(list) {
  if (!publicList) return;

  publicList.replaceChildren();

  if (!list.length) {
    publicList.append(
      node(
        "p",
        "loading-copy",
        "No products in this category yet. Contact our team for availability."
      )
    );
    return;
  }

  list.forEach(product => {
    const card = node("article", "public-product-card");
    const images = Array.isArray(product.images) ? product.images : [];
    const imageUrl = validImage(images[0]);

    if (imageUrl) {
      const img = node("img", "public-product-image");
      img.src = imageUrl;
      img.alt = product.name || "Helmy Prestige vehicle";
      img.loading = "lazy";
      img.onerror = () => {
        img.replaceWith(
          node("div", "public-product-image-placeholder", "IMAGE NOT AVAILABLE")
        );
      };
      card.append(img);
    } else {
      card.append(
        node("div", "public-product-image-placeholder", "HELMY PRESTIGE")
      );
    }

    const details = node("div", "public-product-details");
    const category = normalizeCategory(product.category || "jet_ski");

    details.append(node("span", "product-category",
      categories[category] || "COLLECTION"
    ));

    details.append(node("h3", "", product.name || "Vehicle"));

    details.append(
      node("p", "product-price", `${money(product.price)} EGP`)
    );

    if (product.year) {
      details.append(node("p", "product-meta", `Year: ${product.year}`));
    }

    if (product.mileage != null && product.mileage !== "") {
      details.append(
        node("p", "product-meta", `Mileage: ${product.mileage}`)
      );
    }

    if (product.horsepower != null && product.horsepower !== "") {
      details.append(
        node("p", "product-meta", `Horsepower: ${product.horsepower} HP`)
      );
    }

    if (product.hours != null) {
      details.append(
        node("p", "product-meta", `Engine hours: ${product.hours}`)
      );
    }

    details.append(
      node(
        "p",
        "public-product-description",
        product.description || "Contact us for details and availability."
      )
    );

    const wa = node("a", "product-whatsapp", "CONTACT ON WHATSAPP");
    wa.href =
      "https://wa.me/201115000225?text=" +
      encodeURIComponent(`Hello, I'm interested in ${product.name}.`);
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    details.append(wa);

    card.append(details);
    publicList.append(card);
  });
}

/* LOAD PUBLIC INVENTORY */
async function publicInventory() {
  if (!db) {
    demoMode = true;
    renderPublic(getVisibleProducts(demo));
    msg(publicMsg, "Demo inventory is displayed.");
    return;
  }

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    demoMode = true;
    renderPublic(getVisibleProducts(demo));
    msg(publicMsg, "Unable to load live inventory. Showing demo products.");
    return;
  }

  demoMode = false;
  items = data || [];
  renderPublic(getVisibleProducts(items));
  msg(publicMsg, "");
}

/* STAFF PROFILE */
async function profile(id) {
  const { data, error } = await db
    .from("profiles")
    .select("id,email,role")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  if (!data || !["owner", "admin"].includes(data.role)) {
    throw Error("This account has no authorized staff role.");
  }

  return data;
}

/* ADMIN PRODUCT LIST */
async function loadProducts() {
  if (!staff() || !productList) return;

  productList.replaceChildren(node("p", "", "Loading inventory..."));

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    productList.replaceChildren(
      node("p", "", "Unable to load products. Check database permissions.")
    );
    return;
  }

  items = data || [];
  renderStaff();
  renderPublic(getVisibleProducts(items));
}

function renderStaff() {
  if (!productList) return;

  productList.replaceChildren();

  if (!items.length) {
    productList.append(node("p", "", "No products in database yet."));
    return;
  }

  items.forEach(product => {
    const card = node("article", "admin-product-item");

    card.append(node("h4", "", product.name));
    card.append(
      node("p", "", `Price: ${money(product.price)} EGP`)
    );
    card.append(
      node("p", "", `Category: ${categories[normalizeCategory(product.category)] || product.category || "JET SKI"}`)
    );
    card.append(
      node("p", "", `Year: ${product.year ?? "Not specified"}`)
    );
    card.append(
      node("p", "", `Hours: ${product.hours ?? "Not specified"}`)
    );
    card.append(node("p", "", product.description || "No description"));

    const actions = node("div", "admin-product-item-actions");
    const edit = node("button", "", "Edit");
    const del = node("button", "", "Delete");

    edit.type = "button";
    del.type = "button";

    edit.addEventListener("click", () => editProduct(product));
    del.addEventListener("click", () => deleteProduct(product.id, product.name));

    actions.append(edit, del);
    card.append(actions);
    productList.append(card);
  });
}

async function showDashboard(profileData) {
  user = (await db.auth.getUser()).data.user;
  role = profileData.role;

  if (dashboard) dashboard.hidden = false;
  closeLogin();

  const emailEl = $("[data-staff-email]");
  const roleEl = $("[data-staff-role]");

  if (emailEl) emailEl.textContent = profileData.email || user?.email || "";
  if (roleEl) roleEl.textContent = role.toUpperCase();

  $$(".owner-only").forEach(el => el.hidden = !owner());

  if (ownerPanel) ownerPanel.hidden = !owner();

  await loadProducts();
}

/* EDIT PRODUCT */
function editProduct(product) {
  editingId = product.id;

  const fields = {
    name: product.name,
    price: product.price,
    hours: product.hours,
    description: product.description,
    images: Array.isArray(product.images) ? product.images.join("\n") : "",
    category: product.category || "jet_ski",
    year: product.year,
    mileage: product.mileage,
    horsepower: product.horsepower
  };

  for (const [name, value] of Object.entries(fields)) {
    const field = productForm?.elements.namedItem(name);
    if (field) field.value = value ?? "";
  }

  if (saveButton) saveButton.textContent = "UPDATE PRODUCT";

  msg($(".admin-message", productForm), "Editing product.");
  productForm?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* READ PRODUCT FORM */
function readProduct() {
  const field = name => productForm.elements.namedItem(name);

  const name = field("name")?.value.trim() || "";
  const price = field("price")?.value ?? "";
  const hours = field("hours")?.value ?? "";
  const description = field("description")?.value.trim() || "";
  const imageText = field("images")?.value.trim() || "";
  const category = normalizeCategory(field("category")?.value || "jet_ski");
  const year = field("year")?.value ?? "";
  const mileage = field("mileage")?.value ?? "";
  const horsepower = field("horsepower")?.value ?? "";

  if (!name) throw Error("Enter a product name.");

  if (price === "" || !Number.isFinite(+price) || +price < 0) {
    throw Error("Enter a valid price.");
  }

  if (hours !== "" && (!Number.isFinite(+hours) || +hours < 0)) {
    throw Error("Enter valid engine hours.");
  }

  const images = imageText
    ? imageText.split(/\n+/).map(s => s.trim()).filter(Boolean)
    : [];

  images.forEach(src => {
    let url;
    try {
      url = new URL(src);
    } catch {
      throw Error("Every image must be a valid URL.");
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      throw Error("Image URLs must use HTTP or HTTPS.");
    }
  });

  const product = {
    name,
    price: +price,
    hours: hours === "" ? null : +hours,
    description,
    images,
    category: category === "all" ? "jet_ski" : category
  };

  if (year !== "") product.year = +year;
  if (mileage !== "") product.mileage = +mileage;
  if (horsepower !== "") product.horsepower = +horsepower;

  return product;
}

/* SAVE OR UPDATE PRODUCT */
productForm?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!staff() || busy) return;

  busy = true;
  toggleBusy(saveButton, true, "SAVING...");

  const status = $(".admin-message", productForm);
  msg(status, "");

  try {
    const product = readProduct();

    const result = editingId
      ? await db.from("products").update(product)
          .eq("id", editingId).select().single()
      : await db.from("products").insert(product)
          .select().single();

    if (result.error) throw result.error;

    editingId = null;
    productForm.reset();

    if (saveButton) saveButton.textContent = "SAVE PRODUCT";

    msg(status, "Product saved successfully.", "success");
    await loadProducts();
  } catch (error) {
    console.error(error);
    msg(status, error.message || "Could not save product.", "error");
  } finally {
    busy = false;
    toggleBusy(saveButton, false);
  }
});

/* DELETE PRODUCT */
async function deleteProduct(id, name) {
  if (!staff() || busy) return;

  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

  busy = true;

  try {
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) throw error;
    await loadProducts();
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not delete product.");
  } finally {
    busy = false;
  }
}

$$("[data-cancel-product]").forEach(btn => {
  btn.addEventListener("click", () => {
    editingId = null;
    productForm?.reset();
    if (saveButton) saveButton.textContent = "SAVE PRODUCT";
    msg($(".admin-message", productForm), "");
  });
});

/* STAFF LOGIN */
loginForm?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!db) {
    msg($(".admin-message", loginForm), "Supabase is not initialized.", "error");
    return;
  }

  if (busy) return;

  busy = true;
  toggleBusy($("#staffLoginSubmit"), true, "SIGNING IN...");

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: loginForm.elements.email.value.trim(),
      password: loginForm.elements.password.value
    });

    if (error) throw error;

    await showDashboard(await profile(data.user.id));
  } catch (error) {
    console.error(error);
    msg($(".admin-message", loginForm), error.message || "Sign-in failed.", "error");
  } finally {
    busy = false;
    toggleBusy($("#staffLoginSubmit"), false);
  }
});

/* LOGOUT */
async function logout() {
  if (!db) return;

  const { error } = await db.auth.signOut();

  if (error) {
    alert("Could not sign out.");
    return;
  }

  user = null;
  role = null;
  items = [];

  if (dashboard) dashboard.hidden = true;
  productForm?.reset();
  openLogin();
}

$$("[data-staff-logout]").forEach(btn =>
  btn.addEventListener("click", logout)
);

/* CREATE ADMIN — REQUIRES DEPLOYED SUPABASE EDGE FUNCTION */
createAdminForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const status = $(".admin-message", createAdminForm);

  if (!owner()) {
    msg(status, "Only the Owner can create Admin accounts.", "error");
    return;
  }

  if (busy) return;

  const email = createAdminForm.elements.email.value.trim();
  const password = createAdminForm.elements.password.value;

  if (password.length < 12) {
    msg(status, "Use a password with at least 12 characters.", "error");
    return;
  }

  busy = true;
  const button = $('button[type="submit"]', createAdminForm);
  toggleBusy(button, true, "CREATING...");

  try {
    const { data, error } = await db.functions.invoke("create-admin", {
      body: { email, password }
    });

    if (error) throw error;
    if (data?.error) throw Error(data.error);

    createAdminForm.reset();
    msg(status, "Admin account created successfully.", "success");
  } catch (error) {
    console.error(error);
    msg(status, error.message || "Could not create Admin.", "error");
  } finally {
    busy = false;
    toggleBusy(button, false);
  }
});

/* SHOWROOM INTRO */
function initShowroomIntro() {
  const intro = $("#introScreen");
  const enterButton = $("#enterShowroom");

  if (!intro || !enterButton) return;

  enterButton.addEventListener("click", event => {
    event.preventDefault();

    intro.classList.add("intro-exit");
    intro.setAttribute("aria-hidden", "true");
    document.body.classList.add("showroom-entered");

    window.setTimeout(() => {
      intro.hidden = true;
    }, 800);
  });
}

/* START */
async function init() {
  if (dashboard) dashboard.hidden = true;
  if (ownerPanel) ownerPanel.hidden = true;

  initShowroomIntro();

  if (!window.supabase) {
    demoMode = true;
    renderPublic(getVisibleProducts(demo));
    msg(publicMsg, "Supabase library is missing. Showing demo inventory.");
    return;
  }

  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  await publicInventory();

  const { data: { session } } = await db.auth.getSession();

  if (session?.user) {
    try {
      await showDashboard(await profile(session.user.id));
    } catch (error) {
      console.error(error);
      await db.auth.signOut();
    }
  }

  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      user = null;
      role = null;
      if (dashboard) dashboard.hidden = true;
    } else if (event === "SIGNED_IN" && session?.user) {
      setTimeout(async () => {
        try {
          await showDashboard(await profile(session.user.id));
        } catch (error) {
          console.error(error);
        }
      }, 0);
    }
  });
}

init().catch(error => {
  console.error(error);
  demoMode = true;
  renderPublic(getVisibleProducts(demo));
  msg(publicMsg, "Site initialization failed. Check the browser console.");
});

})();
