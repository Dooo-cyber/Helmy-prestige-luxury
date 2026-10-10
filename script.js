/* HELMY PRESTIGE — OWNER & ADMIN
   Never use service_role in browser JavaScript.
*/
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
    name: "RXP-X RS 2022",
    category: "jet_ski",
    year: 2022,
    mileage: null,
    horsepower: null,
    price: 1150000,
    hours: 100,
    description: "Premium personal watercraft.",
    images: ["IMG_2815.jpeg", "IMG_2814.jpeg", "IMG_2813.jpeg"]
  },
  {
    name: "RXT-X RS 2018",
    category: "jet_ski",
    year: 2018,
    mileage: null,
    horsepower: null,
    price: 750000,
    hours: 85,
    description: "Premium personal watercraft.",
    images: ["IMG_2812.jpeg", "IMG_2811.jpeg"]
  },
  {
    name: "RXP-X RS 2025",
    category: "jet_ski",
    year: 2025,
    mileage: null,
    horsepower: null,
    price: 1250000,
    hours: 128,
    description: "Premium personal watercraft.",
    images: ["IMG_2809.jpeg", "IMG_2810.jpeg"]
  },
  {
    name: "GTX Limited 2024",
    category: "jet_ski",
    year: 2024,
    mileage: null,
    horsepower: null,
    price: 1050000,
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
let selectedCategory = "all";
let demoMode = false;

const categories = {
  car: "CAR",
  beach_buggy: "BEACH BUGGY",
  jet_ski: "JET SKI",
  boat: "BOAT"
};

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
    const raw =
      button.dataset.category ||
      button.dataset.filter ||
      button.value ||
      button.textContent;

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
    "#categoryFilter button, #categoryFilter [data-category], #categoryFilter [data-filter], .category-button[data-category], [data-category]"
  );

  if (!button) return;

  const raw =
    button.dataset.category ||
    button.dataset.filter ||
    button.value ||
    button.textContent;

  const normalized = normalizeCategory(raw);
  const text = String(raw || "").trim().toLowerCase();

  if (
    normalized === "all" &&
    ![
      "all", "cars", "car", "beach buggy", "beach buggies",
      "beach_buggy", "jet ski", "jet skis", "jet_ski",
      "jet_skis", "jetski", "jetskis", "boat", "boats"
    ].includes(text)
  ) return;

  event.preventDefault();
  setCategory(normalized);
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
        maximumFractionDigits: 0
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
  if (modal) {
    modal.hidden = false;
    document.body.classList.add("staff-login-open");
    $("#staffEmail")?.focus();
  }
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

/* PRODUCT DETAILS AND IMAGE GALLERY */

function showProductDetails(product) {
  const modalEl = $("#productDetailsModal");
  const gallery = $("#detailsGallery");
  const info = $("#detailsInfo");

  if (!modalEl || !gallery || !info) return;

  gallery.replaceChildren();
  info.replaceChildren();

  const images = (Array.isArray(product.images) ? product.images : [])
    .map(validImage)
    .filter(Boolean);

  let index = 0;

  const main = node("img", "details-main-image");
  main.alt = product.name || "Product";
  main.src = images[0] || "";

  if (!images.length) {
    main.alt = "No product image available";
    main.classList.add("no-image");
  }

  gallery.append(main);

  if (images.length > 1) {
    const controls = node("div", "gallery-controls");
    const prev = node("button", "", "‹ PREVIOUS");
    const next = node("button", "", "NEXT ›");
    const thumbs = node("div", "gallery-thumbnails");

    prev.type = "button";
    next.type = "button";

    function show(indexToShow) {
      index = (indexToShow + images.length) % images.length;
      main.src = images[index];

      $$("img", thumbs).forEach((img, i) => {
        img.classList.toggle("selected", i === index);
      });
    }

    prev.addEventListener("click", () => show(index - 1));
    next.addEventListener("click", () => show(index + 1));

    images.forEach((src, i) => {
      const img = node("img");
      img.src = src;
      img.alt = `${product.name || "Product"} view ${i + 1}`;

      img.addEventListener("click", () => show(i));
      thumbs.append(img);
    });

    controls.append(prev, next);
    gallery.append(controls, thumbs);
    show(0);
  }

  info.append(
    node(
      "p",
      "eyebrow",
      categories[normalizeCategory(product.category)] || "PREMIUM INVENTORY"
    ),
    node("h2", "", product.name || "Product"),
    node("p", "details-price", `${money(product.price)} EGP`),
    node(
      "p",
      "",
      product.description || "Contact our team for full details and availability."
    )
  );

  const specs = node("div", "details-specs");

  [
    ["Category", categories[normalizeCategory(product.category)] || "Premium"],
    ["Year", product.year],
    ["Engine hours", product.hours],
    [
      "Mileage",
      product.mileage !== null && product.mileage !== undefined
        ? `${product.mileage} km`
        : null
    ],
    [
      "Horsepower",
      product.horsepower ? `${product.horsepower} HP` : null
    ]
  ].forEach(([label, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      const cell = node("div");
      cell.append(
        node("span", "", label),
        node("strong", "", value)
      );
      specs.append(cell);
    }
  });

  if (specs.childElementCount) info.append(specs);

  const buy = node("a", "btn btn-primary details-buy", "CONTACT ON WHATSAPP ↗");

  buy.href =
    "https://wa.me/201117000625?text=" +
    encodeURIComponent(
      `Hello, I'm interested in ${product.name || "this product"}. Please send me more details.`
    );

  buy.target = "_blank";
  buy.rel = "noopener noreferrer";

  info.append(buy);

  modalEl.hidden = false;
  document.body.classList.add("details-open");
}

function closeProductDetails() {
  const detailsModal = $("#productDetailsModal");
  if (detailsModal) detailsModal.hidden = true;
  document.body.classList.remove("details-open");
}

document.addEventListener("click", event => {
  const target = event.target;
  if (target instanceof Element && target.closest("[data-close-details]")) {
    closeProductDetails();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeProductDetails();
});

/* PUBLIC PRODUCT CARDS */

function renderPublic(list) {
  if (!publicList) return;

  const filtered = visibleProducts(Array.isArray(list) ? list : []);
  publicList.replaceChildren();

  if (!filtered.length) {
    publicList.append(
      node(
        "p",
        "loading-copy",
        "No products in this category yet. Contact our team for availability."
      )
    );
    return;
  }

  filtered.forEach(product => {
    const card = node("article", "public-product-card");

    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute(
      "aria-label",
      `View details for ${product.name || "product"}`
    );

    const images = Array.isArray(product.images) ? product.images : [];
    const src = validImage(images[0]);

    if (src) {
      const img = node("img", "public-product-image");
      img.src = src;
      img.alt = product.name || "Vehicle";
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

    details.append(
      node(
        "p",
        "product-meta",
        categories[normalizeCategory(product.category)] || "PREMIUM INVENTORY"
      ),
      node("h3", "", product.name || "Product")
    );

    const specs = [];

    if (product.year) specs.push(`Year: ${product.year}`);

    if (
      product.mileage !== null &&
      product.mileage !== undefined &&
      product.mileage !== ""
    ) {
      specs.push(`Mileage: ${money(product.mileage)} km`);
    }

    if (
      product.horsepower !== null &&
      product.horsepower !== undefined &&
      product.horsepower !== ""
    ) {
      specs.push(`${product.horsepower} HP`);
    }

    if (
      product.hours !== null &&
      product.hours !== undefined &&
      product.hours !== ""
    ) {
      specs.push(`${product.hours} engine hours`);
    }

    if (specs.length) {
      details.append(node("p", "product-meta", specs.join(" · ")));
    }

    details.append(
      node("p", "product-price", `${money(product.price)} EGP`),
      node(
        "p",
        "public-product-description",
        product.description || "Contact us for details and availability."
      )
    );

    const detailButton = node("button", "btn btn-secondary", "VIEW DETAILS");
    detailButton.type = "button";

    detailButton.addEventListener("click", event => {
      event.stopPropagation();
      showProductDetails(product);
    });

    card.addEventListener("click", () => showProductDetails(product));

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showProductDetails(product);
      }
    });

    const whatsapp = node("a", "btn btn-primary", "WHATSAPP ↗");

    whatsapp.href =
      "https://wa.me/201117000625?text=" +
      encodeURIComponent(
        `Hello, I'm interested in ${product.name || "this product"}. Please send me more details.`
      );

    whatsapp.target = "_blank";
    whatsapp.rel = "noopener noreferrer";
    whatsapp.addEventListener("click", event => event.stopPropagation());

    details.append(detailButton, whatsapp);
    card.append(details);
    publicList.append(card);
  });
}

/* SUPABASE INVENTORY */

async function publicInventory() {
  if (!db) {
    demoMode = true;
    renderPublic(demo);
    msg(publicMsg, "Demo inventory is shown. Configure Supabase to enable live inventory.");
    return;
  }

  const { data, error } = await db
    .from("products")
    .select("id,name,price,hours,description,images,category,year,mileage,horsepower")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    demoMode = true;
    renderPublic(demo);
    msg(publicMsg, "Showing demo inventory because live inventory could not be loaded.");
  } else {
    demoMode = false;
    items = data || [];
    renderPublic(items);
    msg(publicMsg, "");
  }
}

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
  renderPublic(items);
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

    card.append(
      node("h4", "", product.name),
      node("p", "", `Price: ${money(product.price)} EGP`),
      node("p", "", `Hours: ${product.hours ?? "Not specified"}`),
      node("p", "", product.description || "No description")
    );

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

  dashboard.hidden = false;
  closeLogin();

  $("[data-staff-email]").textContent = profileData.email || user?.email || "";
  $("[data-staff-role]").textContent = role.toUpperCase();

  $$(".owner-only").forEach(element => {
    element.hidden = !owner();
  });

  if (ownerPanel) ownerPanel.hidden = !owner();

  await loadProducts();
}

function editProduct(product) {
  editingId = product.id;

  for (const [name, value] of Object.entries({
    name: product.name,
    price: product.price,
    hours: product.hours,
    description: product.description,
    images: Array.isArray(product.images) ? product.images.join("\n") : "",
    category: product.category || "jet_ski",
    year: product.year ?? "",
    mileage: product.mileage ?? "",
    horsepower: product.horsepower ?? ""
  })) {
    const field = productForm.elements.namedItem(name);
    if (field) field.value = value ?? "";
  }

  saveButton.textContent = "UPDATE PRODUCT";
  msg($(".admin-message", productForm), "Editing product.");

  productForm.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function readProduct() {
  const field = name => productForm.elements.namedItem(name);

  const name = field("name")?.value.trim() || "";
  const price = field("price")?.value ?? "";
  const hours = field("hours")?.value ?? "";
  const description = field("description")?.value.trim() || "";
  const imageText = field("images")?.value.trim() || "";

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

  const optionalNumber = name => {
    const value = field(name)?.value ?? "";

    return value === ""
      ? null
      : Number.isFinite(+value) && +value >= 0
        ? +value
        : null;
  };

  const rawCategory = field("category")?.value || "jet_ski";

  return {
    name,
    price: +price,
    hours: hours === "" ? null : +hours,
    description,
    images,
    category: normalizeCategory(rawCategory),
    year: optionalNumber("year"),
    mileage: optionalNumber("mileage"),
    horsepower: optionalNumber("horsepower")
  };
}

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
      ? await db.from("products").update(product).eq("id", editingId).select().single()
      : await db.from("products").insert(product).select().single();

    if (result.error) throw result.error;

    editingId = null;
    productForm.reset();
    saveButton.textContent = "SAVE PRODUCT";

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

async function deleteProduct(id, name) {
  if (!staff() || busy || !confirm(`Delete "${name}"? This cannot be undone.`)) {
    return;
  }

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

$$("[data-cancel-product]").forEach(button => {
  button.addEventListener("click", () => {
    editingId = null;
    productForm.reset();
    saveButton.textContent = "SAVE PRODUCT";
    msg($(".admin-message", productForm), "");
  });
});

/* STAFF LOGIN */

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!db) {
    msg(
      $(".admin-message", loginForm),
      "Configure Supabase URL and key in script.js first.",
      "error"
    );
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

    const profileData = await profile(data.user.id);
    await showDashboard(profileData);
  } catch (error) {
    console.error(error);
    await db.auth.signOut();

    msg(
      $(".admin-message", loginForm),
      error.message || "Sign-in failed.",
      "error"
    );
  } finally {
    busy = false;
    toggleBusy($("#staffLoginSubmit"), false);
  }
});

async function logout() {
  const { error } = await db.auth.signOut();

  if (error) {
    alert("Could not sign out.");
    return;
  }

  user = null;
  role = null;
  items = [];
  dashboard.hidden = true;
  productForm.reset();
  openLogin();
}

$$("[data-staff-logout]").forEach(button => {
  button.addEventListener("click", logout);
});

/* OWNER-ONLY ADMIN CREATION */

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

    msg(
      status,
      error.message || "Could not create Admin. Check Edge Function setup.",
      "error"
    );
  } finally {
    busy = false;
    toggleBusy(button, false);
  }
});

/* WELCOME SCREEN */

function initShowroomIntro() {
  const intro = $("#introScreen");
  const enterButton = $("#enterShowroom");

  if (!intro || !enterButton) return;

  const enter = () => {
    intro.classList.add("intro-exit");
    intro.setAttribute("aria-hidden", "true");
    document.body.classList.add("showroom-entered");

    window.setTimeout(() => {
      intro.hidden = true;
    }, 800);
  };

  enterButton.addEventListener("click", event => {
    event.preventDefault();
    enter();
  });
}

initShowroomIntro();

/* STARTUP */

async function init() {
  dashboard.hidden = true;

  if (ownerPanel) ownerPanel.hidden = true;

  if (
    SUPABASE_URL.startsWith("YOUR_") ||
    SUPABASE_KEY.startsWith("YOUR_") ||
    !window.supabase
  ) {
    renderPublic(demo);
    msg(
      publicMsg,
      "Demo inventory. Add your Supabase settings to enable live inventory and login."
    );
    return;
  }

  db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

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
      dashboard.hidden = true;
    } else if (event === "SIGNED_IN" && session?.user) {
      setTimeout(async () => {
        try {
          await showDashboard(await profile(session.user.id));
        } catch (error) {
          console.error(error);
          await db.auth.signOut();
        }
      }, 0);
    }
  });
}

init().catch(error => {
  console.error(error);
  renderPublic(demo);
  msg(publicMsg, "Site is in demo mode. Check Supabase setup.");
});

})();
