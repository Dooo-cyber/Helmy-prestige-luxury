"use strict";

/* =========================================
   HELMY PRESTIGE LUXURY
   Supabase + Products + Gallery + Admin
========================================= */

const SUPABASE_URL = "https://fnftfpthzlgkfexnknaw.supabase.co";
const SUPABASE_KEY = "sb_publishable_wugH6rf-d6hXXQU2tkvWtg_YxdWz8OP";
const STORAGE_BUCKET = "product-images";

const OWNER_WHATSAPP = "201115000225";
const MANAGER_WHATSAPP = "201117000625";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let products = [];
let selectedCategory = "all";
let currentUser = null;
let currentRole = null;
let editingImages = [];
let detailProduct = null;
let detailImageIndex = 0;
let isSaving = false;

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function message(element, text, error = false) {
  if (!element) return;
  element.textContent = text;
  element.style.color = error ? "#ff7777" : "#c9b37e";
}

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "Price upon request";
  }

  const number = Number(price);

  if (!Number.isFinite(number)) {
    return escapeHTML(price);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(number) + " EGP";
}

function normalizeImages(value) {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === "string" && item.trim());
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === "string" && item.trim());
      }
    } catch (_) {
      return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function categoryName(category) {
  return ({
    car: "Luxury Car",
    beach_buggy: "Beach Buggy",
    jet_ski: "Jet Ski",
    boat: "Luxury Boat"
  })[category] || "Luxury Collection";
}

function whatsappLink(product) {
  const text = [
    "Hello Helmy Prestige Luxury,",
    "I am interested in: " + product.name,
    "Price: " + (
      product.price !== null &&
      product.price !== undefined &&
      product.price !== ""
        ? product.price + " EGP"
        : "Upon request"
    ),
    "Product ID: " + product.id
  ].join("\n");

  return "https://wa.me/" + OWNER_WHATSAPP +
    "?text=" + encodeURIComponent(text);
}

/* =========================================
   INTRO SCREEN
========================================= */

function setupIntro() {
  const intro = $("#introScreen");
  const enter = $("#enterShowroom");

  if (!intro || !enter) return;

  enter.addEventListener("click", () => {
    intro.classList.add("intro-hidden");

    setTimeout(() => {
      intro.hidden = true;
    }, 850);
  });
}

/* =========================================
   PRODUCT DETAILS MODAL
========================================= */

function createDetailsModal() {
  if ($("#productDetailsModal")) return;

  const modal = document.createElement("div");
  modal.id = "productDetailsModal";
  modal.hidden = true;

  modal.innerHTML = `
    <div class="admin-modal-backdrop" data-detail-close></div>

    <div class="admin-modal-card details-modal-card"
         role="dialog"
         aria-modal="true"
         aria-labelledby="detailsTitle">

      <button type="button"
              class="admin-close"
              data-detail-close
              aria-label="Close details">&times;</button>

      <div class="details-layout">

        <div id="detailsGallery">
          <div class="details-main-image">
            <button type="button" id="detailsPrev"
                    aria-label="Previous image">&#10094;</button>

            <img id="detailsMainImage" src="" alt="Product image">

            <button type="button" id="detailsNext"
                    aria-label="Next image">&#10095;</button>
          </div>

          <div class="details-thumbnails" id="detailsThumbnails"></div>
        </div>

        <div id="detailsInfo">
          <p id="detailsCategory" class="section-eyebrow"></p>
          <h2 id="detailsTitle"></h2>
          <p id="detailsPrice"></p>
          <p id="detailsDescription"></p>
          <div id="detailsSpecs" class="details-specs"></div>
          <a id="detailsBuy" target="_blank"
             rel="noopener noreferrer"
             class="hero-button">CONTACT TO BUY</a>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", event => {
    if (event.target.closest("[data-detail-close]")) {
      closeDetails();
    }

    const thumb = event.target.closest("[data-image-index]");

    if (thumb) {
      showDetailImage(Number(thumb.dataset.imageIndex));
    }
  });

  $("#detailsPrev").addEventListener("click", () => {
    if (!detailProduct) return;

    const images = normalizeImages(detailProduct.images);
    if (images.length) {
      showDetailImage(
        (detailImageIndex - 1 + images.length) % images.length
      );
    }
  });

  $("#detailsNext").addEventListener("click", () => {
    if (!detailProduct) return;

    const images = normalizeImages(detailProduct.images);
    if (images.length) {
      showDetailImage((detailImageIndex + 1) % images.length);
    }
  });
}

function openDetails(id) {
  const product = products.find(item => String(item.id) === String(id));
  if (!product) return;

  createDetailsModal();

  detailProduct = product;
  detailImageIndex = 0;

  const modal = $("#productDetailsModal");
  const images = normalizeImages(product.images);

  $("#detailsTitle").textContent = product.name || "Luxury Product";
  $("#detailsCategory").textContent = categoryName(product.category);
  $("#detailsPrice").textContent = formatPrice(product.price);
  $("#detailsDescription").textContent =
    product.description || "Contact us for more information.";

  const specs = [
    ["Year", product.year],
    ["Mileage", product.mileage === null || product.mileage === undefined
      || product.mileage === "" ? "" : Number(product.mileage).toLocaleString() + " km"],
    ["Horsepower", product.horsepower],
    ["Operating hours", product.hours]
  ].filter(item => item[1] !== null && item[1] !== undefined && item[1] !== "");

  $("#detailsSpecs").innerHTML = specs.length
    ? specs.map(([label, value]) => `
        <div class="details-spec">
          <span>${escapeHTML(label)}</span>
          <strong>${escapeHTML(value)}</strong>
        </div>
      `).join("")
    : "";

  const buyButton = $("#detailsBuy");

  if (product.status === "sold_out") {
    buyButton.textContent = "CURRENTLY SOLD OUT";
    buyButton.removeAttribute("href");
    buyButton.style.pointerEvents = "none";
    buyButton.style.opacity = "0.55";
  } else {
    buyButton.textContent = "CONTACT TO BUY";
    buyButton.href = whatsappLink(product);
    buyButton.style.pointerEvents = "";
    buyButton.style.opacity = "";
  }

  if (!images.length) {
    $("#detailsMainImage").removeAttribute("src");
    $("#detailsMainImage").alt = "No product image available";
    $("#detailsThumbnails").innerHTML = "";
  }

  modal.hidden = false;
  document.body.classList.add("details-open");

  showDetailImage(0);
}

function showDetailImage(index) {
  if (!detailProduct) return;

  const images = normalizeImages(detailProduct.images);
  if (!images.length) return;

  detailImageIndex = (index + images.length) % images.length;

  const main = $("#detailsMainImage");
  main.src = images[detailImageIndex];
  main.alt = (detailProduct.name || "Product") +
    " - image " + (detailImageIndex + 1);

  $("#detailsThumbnails").innerHTML = images.map((src, i) => `
    <button type="button"
            class="details-thumbnail ${i === detailImageIndex ? "active" : ""}"
            data-image-index="${i}"
            aria-label="View image ${i + 1}"
            aria-pressed="${i === detailImageIndex}">
      <img src="${escapeHTML(src)}" alt="">
    </button>
  `).join("");
}

function closeDetails() {
  const modal = $("#productDetailsModal");
  if (modal) modal.hidden = true;

  document.body.classList.remove("details-open");
  detailProduct = null;
}

/* =========================================
   PUBLIC PRODUCT LIST
========================================= */

function renderProducts() {
  const list = $("#publicProductList");
  const info = $("#publicInventoryMessage");

  if (!list) return;

  const filtered = products.filter(product => {
    const categoryMatches =
      selectedCategory === "all" ||
      product.category === selectedCategory;

    return categoryMatches;
  });

  if (!filtered.length) {
    list.innerHTML = "";
    if (info) {
      info.textContent = products.length
        ? "No products found in this category."
        : "Our collection is being updated. Please check back soon.";
    }
    return;
  }

  if (info) {
    info.textContent = filtered.length + " exclusive product(s)";
  }

  list.innerHTML = filtered.map(product => {
    const images = normalizeImages(product.images);
    const image = images[0] || "";
    const soldOut = product.status === "sold_out";

    return `
      <article class="product-card"
               data-open-product="${escapeHTML(product.id)}"
               tabindex="0"
               role="button"
               aria-label="View ${escapeHTML(product.name)}">

        <div class="product-image-wrap">
          ${image
            ? `<img class="product-image"
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.name)}"
                    loading="lazy">`
            : `<div class="product-image-placeholder">HELMY PRESTIGE</div>`
          }

          ${soldOut
            ? '<span class="product-status">SOLD OUT</span>'
            : ""
          }
        </div>

        <div class="product-card-content">
          <p class="product-category">
            ${escapeHTML(categoryName(product.category))}
          </p>

          <h3>${escapeHTML(product.name || "Luxury Product")}</h3>

          <p class="product-price">${formatPrice(product.price)}</p>

          <button type="button"
                  class="product-view-btn"
                  data-open-product="${escapeHTML(product.id)}">
            VIEW DETAILS
          </button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadProducts() {
  const info = $("#publicInventoryMessage");

  if (info) info.textContent = "Loading our collection...";

  const { data, error } = await db
    .from("products")
    .select("*")
    .in("status", ["available", "sold_out"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Products loading error:", error);
    if (info) {
      info.textContent =
        "Unable to load products. Please try again later.";
    }
    return;
  }

  products = data || [];
  renderProducts();

  if (currentUser) renderAdminProducts();
}

/* =========================================
   CATEGORY FILTERS
========================================= */

function setupCategoryFilters() {
  const filters = $("#categoryFilter");
  if (!filters) return;

  filters.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    selectedCategory = button.dataset.category;

    $$("[data-category]", filters).forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderProducts();
  });
}

/* =========================================
   PRODUCT CLICK EVENTS
========================================= */

function setupProductClicks() {
  const list = $("#publicProductList");
  if (!list) return;

  list.addEventListener("click", event => {
    const target = event.target.closest("[data-open-product]");
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    openDetails(target.dataset.openProduct);
  });

  list.addEventListener("keydown", event => {
    if (event.target !== event.currentTarget &&
        !event.target.matches(".product-card")) return;

    if (event.key !== "Enter" && event.key !== " ") return;

    const card = event.target.closest("[data-open-product]");
    if (!card) return;

    event.preventDefault();
    openDetails(card.dataset.openProduct);
  });
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeDetails();
    closeLogin();
  }

  if (!detailProduct) return;

  if (event.key === "ArrowLeft") {
    $("#detailsPrev")?.click();
  }

  if (event.key === "ArrowRight") {
    $("#detailsNext")?.click();
  }
});

/* =========================================
   STAFF LOGIN
========================================= */

function openLogin() {
  const modal = $("#staffLoginModal");
  if (modal) modal.hidden = false;
}

function closeLogin() {
  const modal = $("#staffLoginModal");
  if (modal) modal.hidden = true;
}

function setupLoginModal() {
  $$(".staff-login-trigger").forEach(button => {
    button.addEventListener("click", openLogin);
  });

  $$("[data-close-login]").forEach(button => {
    button.addEventListener("click", closeLogin);
  });

  const form = $("#staffLoginForm");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const submit = $("#staffLoginSubmit");
    const output = $(".admin-message", form);

    if (submit) submit.disabled = true;
    message(output, "Signing in...");

    try {
      const email = $("#staffEmail").value.trim();
      const password = $("#staffPassword").value;

      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      currentUser = data.user;

      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError) {
        await db.auth.signOut();
        currentUser = null;
        throw new Error(
          "Unable to verify staff permissions. Check your profiles table and RLS policies."
        );
      }

      currentRole = String(profile?.role || "").toLowerCase();

      if (!["owner", "admin", "manager"].includes(currentRole)) {
        await db.auth.signOut();
        currentUser = null;
        currentRole = null;
        throw new Error("This account is not authorized for staff access.");
      }

      closeLogin();
      showDashboard();
      await loadProducts();
      message(output, "");
    } catch (error) {
      console.error("Login error:", error);
      message(output, error.message || "Login failed.", true);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

function showDashboard() {
  const dashboard = $("#adminDashboard");
  if (dashboard) {
    dashboard.hidden = false;
    dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $$("[data-staff-email]").forEach(el => {
    el.textContent = currentUser?.email || "";
  });

  $$("[data-staff-role]").forEach(el => {
    el.textContent = currentRole || "";
  });

  const ownerPanel = $("#ownerManagementPanel");

  if (ownerPanel) {
    ownerPanel.hidden = currentRole !== "owner";
  }

  const trigger = $(".staff-login-trigger");
  if (trigger) trigger.textContent = "STAFF DASHBOARD";
}

/* =========================================
   LOG OUT
========================================= */

function setupLogout() {
  $$("[data-staff-logout]").forEach(button => {
    button.addEventListener("click", async () => {
      const { error } = await db.auth.signOut();

      if (error) {
        alert("Unable to log out: " + error.message);
        return;
      }

      currentUser = null;
      currentRole = null;
      editingImages = [];

      const dashboard = $("#adminDashboard");
      if (dashboard) dashboard.hidden = true;

      const trigger = $(".staff-login-trigger");
      if (trigger) trigger.textContent = "STAFF LOGIN";

      resetProductForm();
      closeDetails();
    });
  });
}

/* =========================================
   IMAGE UPLOAD
========================================= */

async function uploadImages(files) {
  const urls = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed.");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Each image must be 10 MB or smaller.");
    }

    const extension = file.name.split(".").pop()
      .toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

    const path = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data } = db.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    urls.push(data.publicUrl);
  }

  return urls;
}

function setupImagePreview() {
  const input = $("#productImages");
  const preview = $("#productImagePreview");

  if (!input || !preview) return;

  input.addEventListener("change", () => {
    preview.innerHTML = "";

    const files = [...input.files];

    files.forEach(file => {
      const image = document.createElement("img");
      image.alt = file.name;
      image.style.maxWidth = "120px";
      image.style.margin = "5px";

      const reader = new FileReader();

      reader.onload = () => {
        image.src = reader.result;
      };

      reader.readAsDataURL(file);
      preview.appendChild(image);
    });
  });
}

/* =========================================
   ADMIN PRODUCT FORM
========================================= */

function resetProductForm() {
  const form = $("#adminProductForm");
  if (form) form.reset();

  const id = $("#productId");
  if (id) id.value = "";

  editingImages = [];

  const preview = $("#productImagePreview");
  if (preview) preview.innerHTML = "";

  const save = $("#adminSaveProduct");
  if (save) save.textContent = "SAVE PRODUCT";
}

function setupProductForm() {
  const form = $("#adminProductForm");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser || !["owner", "admin", "manager"].includes(currentRole)) {
      alert("Please sign in with an authorized staff account.");
      return;
    }

    if (isSaving) return;
    isSaving = true;

    const saveButton = $("#adminSaveProduct");
    const output = $(".admin-message", form);

    if (saveButton) saveButton.disabled = true;
    message(output, "Saving product...");

    try {
      const id = $("#productId").value.trim();
      const files = [...($("#productImages")?.files || [])];

      let images = [...editingImages];

      if (files.length) {
        const uploaded = await uploadImages(files);
        images = images.concat(uploaded);
      }

      const product = {
        name: $("#productName").value.trim(),
        category: $("#productCategory").value,
        price: Number($("#productPrice").value),
        year: $("#productYear").value
          ? Number($("#productYear").value) : null,
        mileage: $("#productMileage").value
          ? Number($("#productMileage").value) : null,
        horsepower: $("#productHorsepower").value
          ? Number($("#productHorsepower").value) : null,
        hours: $("#productHours").value
          ? Number($("#productHours").value) : null,
        description: $("#productDescription").value.trim(),
        images,
        status: $("#productStatus").value
      };

      if (!product.name || !Number.isFinite(product.price)) {
        throw new Error("Please enter a valid product name and price.");
      }

      let result;

      if (id) {
        result = await db
          .from("products")
          .update(product)
          .eq("id", id)
          .select();
      } else {
        result = await db
          .from("products")
          .insert(product)
          .select();
      }

      if (result.error) throw result.error;

      if (!result.data || !result.data.length) {
        throw new Error(
          "No product was returned. Check your Supabase permissions."
        );
      }

      message(output, "Product saved successfully.");
      resetProductForm();
      await loadProducts();
    } catch (error) {
      console.error("Saving product error:", error);
      message(output, error.message || "Unable to save product.", true);
    } finally {
      isSaving = false;
      if (saveButton) saveButton.disabled = false;
    }
  });

  $$("[data-cancel-product]").forEach(button => {
    button.addEventListener("click", resetProductForm);
  });
}

/* =========================================
   ADMIN INVENTORY LIST
========================================= */

function renderAdminProducts() {
  const list = $(".admin-product-list");
  if (!list) return;

  if (!currentUser) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = products.map(product => {
    const sold = product.status === "sold_out";

    return `
      <div class="admin-product-item">
        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <p>${formatPrice(product.price)}</p>
          <small>${escapeHTML(categoryName(product.category))} ·
            ${sold ? "Sold Out" : "Available"}</small>
        </div>

        <div class="admin-product-actions">
          <button type="button"
                  data-edit-product="${escapeHTML(product.id)}">
            EDIT
          </button>

          <button type="button"
                  data-delete-product="${escapeHTML(product.id)}">
            DELETE
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function setupAdminInventory() {
  const list = $(".admin-product-list");
  if (!list) return;

  list.addEventListener("click", async event => {
    const editButton = event.target.closest("[data-edit-product]");
    const deleteButton = event.target.closest("[data-delete-product]");

    if (editButton) {
      const product = products.find(item =>
        String(item.id) === editButton.dataset.editProduct
      );

      if (!product) return;

      $("#productId").value = product.id;
      $("#productName").value = product.name || "";
      $("#productCategory").value = product.category || "car";
      $("#productPrice").value = product.price ?? "";
      $("#productYear").value = product.year ?? "";
      $("#productMileage").value = product.mileage ?? "";
      $("#productHorsepower").value = product.horsepower ?? "";
      $("#productHours").value = product.hours ?? "";
      $("#productDescription").value = product.description || "";
      $("#productStatus").value = product.status || "available";

      editingImages = normalizeImages(product.images);

      const preview = $("#productImagePreview");
      if (preview) {
        preview.innerHTML = editingImages.map(src => `
          <img src="${escapeHTML(src)}"
               alt="Current product image"
               style="max-width:120px;margin:5px">
        `).join("");
      }

      $("#adminSaveProduct").textContent = "UPDATE PRODUCT";

      $("#adminProductForm").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    if (deleteButton) {
      if (!currentUser) return;

      const productId = deleteButton.dataset.deleteProduct;
      const product = products.find(item =>
        String(item.id) === productId
      );

      if (!product) return;

      if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) {
        return;
      }

      const { error } = await db
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) {
        console.error("Delete error:", error);
        alert("Unable to delete product: " + error.message);
        return;
      }

      await loadProducts();
    }
  });
}

/* =========================================
   OWNER: CREATE STAFF ACCOUNT
========================================= */

function setupCreateAdmin() {
  const form = $("#ownerCreateAdminForm");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser || currentRole !== "owner") {
      alert("Only the owner can create staff accounts.");
      return;
    }

    const output = $(".admin-message", form);
    const submit = $('button[type="submit"]', form);

    if (submit) submit.disabled = true;
    message(output, "Creating staff account...");

    try {
      const email = $("#newAdminEmail").value.trim();
      const password = $("#newAdminPassword").value;

      const { data, error } = await db.functions.invoke("create-admin", {
        body: { email, password }
      });

      if (error) throw error;

      if (data && data.error) {
        throw new Error(data.error);
      }

      message(output, "Staff account created successfully.");
      form.reset();
    } catch (error) {
      console.error("Create staff error:", error);
      message(
        output,
        error.message || "Unable to create staff account.",
        true
      );
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

/* =========================================
   AUTH SESSION RESTORE
========================================= */

async function restoreSession() {
  const { data, error } = await db.auth.getSession();

  if (error || !data.session) return;

  currentUser = data.session.user;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error:", profileError);
    currentUser = null;
    return;
  }

  currentRole = String(profile?.role || "").toLowerCase();

  if (!["owner", "admin", "manager"].includes(currentRole)) {
    currentUser = null;
    currentRole = null;
    await db.auth.signOut();
    return;
  }

  showDashboard();
}

/* =========================================
   INITIALIZE
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  setupIntro();
  createDetailsModal();
  setupCategoryFilters();
  setupProductClicks();
  setupLoginModal();
  setupLogout();
  setupImagePreview();
  setupProductForm();
  setupAdminInventory();
  setupCreateAdmin();

  await loadProducts();
  await restoreSession();

  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      currentRole = null;

      const dashboard = $("#adminDashboard");
      if (dashboard) dashboard.hidden = true;

      const trigger = $(".staff-login-trigger");
      if (trigger) trigger.textContent = "STAFF LOGIN";
    }
  });
});
