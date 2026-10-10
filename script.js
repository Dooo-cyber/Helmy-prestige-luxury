"use strict";
/* ==========================================
   HELMY PRESTIGE LUXURY
   Supabase / Inventory / Gallery / Staff
========================================== */
const SUPABASE_URL = "https://fnftfpthzlgkfexnknaw.supabase.co";
const SUPABASE_KEY = "sb_publishable_wugH6rf-d6hXXQU2tkvWtg_YxdWz8OP";
const STORAGE_BUCKET = "product-images";
const OWNER_WHATSAPP = "201115000225";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
let inventory = [];
let activeCategory = "all";
let activeProduct = null;
let activeImageIndex = 0;
let currentUser = null;
let currentRole = null;
let savedImages = [];
let newImageFiles = [];
let isSaving = false;
let toastTimer = null;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
function showToast(text, error = false) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}
function setMessage(element, text, error = false) {
  if (!element) return;
  element.textContent = text;
  element.style.color = error ? "#ff9292" : "#d5c6a0";
}
function getImages(value) {
  if (Array.isArray(value)) {
    return value.filter(item =>
      typeof item === "string" && item.trim()
    );
  }
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(item =>
        typeof item === "string" && item.trim()
      );
    }
  } catch (_) {
    return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}
function categoryLabel(category) {
  return ({
    car: "Automotive",
    beach_buggy: "Beach Buggy",
    jet_ski: "Jet Ski",
    boat: "Yachts & Boats"
  })[category] || "Prestige Collection";
}
function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Price upon request";
  }
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(number) + " EGP";
}
function makeWhatsAppLink(product) {
  const message = [
    "Hello Helmy Prestige Luxury,",
    "I would like to enquire about " + product.name + ".",
    "Price: " + (
      product.price === null || product.price === undefined
        ? "Upon request"
        : product.price + " EGP"
    ),
    "Product ID: " + product.id
  ].join("\n");
  return "https://wa.me/" + OWNER_WHATSAPP +
    "?text=" + encodeURIComponent(message);
}
/* ------------------------------------------
   INTRO AND MOBILE NAVIGATION
------------------------------------------ */
function setupIntro() {
  const intro = $("#introScreen");
  const enter = $("#enterShowroom");
  if (intro && enter) {
    enter.addEventListener("click", () => {
      intro.classList.add("intro-hidden");
      setTimeout(() => { intro.hidden = true; }, 750);
    });
  }
  const year = $("#currentYear");
  if (year) year.textContent = new Date().getFullYear();
  const menuButton = $("#mobileMenu");
  const nav = $(".nav");
  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const opened = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(opened));
      menuButton.textContent = opened ? "×" : "☰";
    });
    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.textContent = "☰";
      });
    });
  }
}
/* ------------------------------------------
   CATEGORY FILTERS
------------------------------------------ */
function setupFilters() {
  const filterBar = $("#categoryFilter");
  if (!filterBar) return;
  filterBar.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    $$(".filter", filterBar).forEach(filter => {
      filter.classList.toggle("active", filter === button);
    });
    renderPublicInventory();
  });
}
/* ------------------------------------------
   PUBLIC INVENTORY
------------------------------------------ */
function renderPublicInventory() {
  const container = $("#publicProductList");
  const status = $("#publicInventoryMessage");
  if (!container) return;
  const shown = inventory.filter(product =>
    activeCategory === "all" || product.category === activeCategory
  );
  if (!shown.length) {
    container.innerHTML = "";
    if (status) {
      status.textContent = inventory.length
        ? "No pieces in this category at the moment."
        : "Our collection is being updated. Please check back soon.";
    }
    return;
  }
  if (status) {
    status.textContent = `${shown.length} piece${shown.length === 1 ? "" : "s"} in the collection`;
  }
  container.innerHTML = shown.map(product => {
    const images = getImages(product.images);
    const image = images[0] || "";
    const soldOut = product.status === "sold_out";
    return `
      <article class="product-card"
        tabindex="0"
        role="button"
        aria-label="View ${escapeHTML(product.name)}"
        data-open-product="${escapeHTML(product.id)}">
        <div class="product-image-wrap">
          ${image
            ? `<img class="product-image"
                src="${escapeHTML(image)}"
                alt="${escapeHTML(product.name)}"
                loading="lazy">`
            : `<div class="product-image-placeholder">HP.</div>`
          }
          ${soldOut ? `<span class="product-status">SOLD OUT</span>` : ""}
        </div>
        <div class="product-card-content">
          <p class="product-category">${escapeHTML(categoryLabel(product.category))}</p>
          <h3>${escapeHTML(product.name || "Prestige Collection")}</h3>
          <p class="product-price">${escapeHTML(formatPrice(product.price))}</p>
          <button class="product-view-btn" type="button"
            data-open-product="${escapeHTML(product.id)}">DISCOVER PIECE</button>
        </div>
      </article>
    `;
  }).join("");
}
async function loadInventory() {
  const status = $("#publicInventoryMessage");
  if (status) status.textContent = "Curating the collection...";
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .in("status", ["available", "sold_out"])
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Inventory error:", error);
    if (status) {
      status.textContent = "We couldn't load the collection. Please refresh and try again.";
    }
    showToast("Could not load products. Check Supabase permissions.", true);
    return;
  }
  inventory = data || [];
  renderPublicInventory();
  renderAdminInventory();
}
/* ------------------------------------------
   PRODUCT DETAIL GALLERY
------------------------------------------ */
function openProduct(productId) {
  const product = inventory.find(item => String(item.id) === String(productId));
  if (!product) return;
  activeProduct = product;
  activeImageIndex = 0;
  const modal = $("#productDetailsModal");
  if (!modal) return;
  $("#detailsTitle").textContent = product.name || "Prestige Collection";
  $("#detailsCategory").textContent = categoryLabel(product.category);
  $("#detailsPrice").textContent = formatPrice(product.price);
  $("#detailsDescription").textContent =
    product.description || "Contact our team to learn more about this piece.";
  const specs = [
    ["Year", product.year],
    ["Mileage", product.mileage === null || product.mileage === undefined || product.mileage === ""
      ? "" : Number(product.mileage).toLocaleString() + " km"],
    ["Horsepower", product.horsepower === null || product.horsepower === undefined || product.horsepower === ""
      ? "" : product.horsepower + " HP"],
    ["Operating hours", product.hours]
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  $("#detailsSpecs").innerHTML = specs.map(([label, value]) => `
    <div class="spec-item">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
    </div>
  `).join("");
  const buy = $("#detailsBuy");
  if (product.status === "sold_out") {
    buy.removeAttribute("href");
    buy.textContent = "CURRENTLY SOLD OUT";
    buy.style.opacity = ".5";
    buy.style.pointerEvents = "none";
  } else {
    buy.href = makeWhatsAppLink(product);
    buy.textContent = "ENQUIRE ON WHATSAPP ↗";
    buy.style.opacity = "";
    buy.style.pointerEvents = "";
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
  showGalleryImage(0);
}
function showGalleryImage(index) {
  if (!activeProduct) return;
  const images = getImages(activeProduct.images);
  const mainImage = $("#detailsMainImage");
  const thumbnails = $("#detailsThumbnails");
  const counter = $("#detailsCounter");
  if (!images.length) {
    mainImage.removeAttribute("src");
    mainImage.alt = "No images available";
    thumbnails.innerHTML = "";
    counter.textContent = "NO IMAGES";
    return;
  }
  activeImageIndex = (index + images.length) % images.length;
  mainImage.src = images[activeImageIndex];
  mainImage.alt = `${activeProduct.name} — image ${activeImageIndex + 1}`;
  counter.textContent =
    String(activeImageIndex + 1).padStart(2, "0") + " / " +
    String(images.length).padStart(2, "0");
  thumbnails.innerHTML = images.map((url, i) => `
    <button class="detail-thumbnail ${i === activeImageIndex ? "active" : ""}"
      type="button" data-thumbnail-index="${i}"
      aria-label="View image ${i + 1}"
      aria-pressed="${i === activeImageIndex}">
      <img src="${escapeHTML(url)}" alt="">
    </button>
  `).join("");
}
function closeProduct() {
  const modal = $("#productDetailsModal");
  if (modal) modal.hidden = true;
  activeProduct = null;
  document.body.classList.remove("modal-open");
}
function setupGallery() {
  const list = $("#publicProductList");
  if (list) {
    list.addEventListener("click", event => {
      const button = event.target.closest("[data-open-product]");
      if (button) {
        event.preventDefault();
        openProduct(button.dataset.openProduct);
      }
    });
    list.addEventListener("keydown", event => {
      if (!["Enter", " "].includes(event.key)) return;
      const card = event.target.closest(".product-card");
      if (!card || event.target.closest("button")) return;
      event.preventDefault();
      openProduct(card.dataset.openProduct);
    });
  }
  const modal = $("#productDetailsModal");
  if (modal) {
    modal.addEventListener("click", event => {
      if (event.target.closest("[data-detail-close]")) closeProduct();
      const thumb = event.target.closest("[data-thumbnail-index]");
      if (thumb) showGalleryImage(Number(thumb.dataset.thumbnailIndex));
    });
  }
  $("#detailsPrev")?.addEventListener("click", () => {
    if (!activeProduct) return;
    const images = getImages(activeProduct.images);
    if (images.length) showGalleryImage(activeImageIndex - 1);
  });
  $("#detailsNext")?.addEventListener("click", () => {
    if (!activeProduct) return;
    const images = getImages(activeProduct.images);
    if (images.length) showGalleryImage(activeImageIndex + 1);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeProduct();
      closeLogin();
    }
    if (!activeProduct) return;
    if (event.key === "ArrowLeft") $("#detailsPrev")?.click();
    if (event.key === "ArrowRight") $("#detailsNext")?.click();
  });
}
/* ------------------------------------------
   STAFF LOGIN AND PERMISSIONS
------------------------------------------ */
function openLogin() {
  const modal = $("#staffLoginModal");
  if (modal) {
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }
}
function closeLogin() {
  const modal = $("#staffLoginModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
}
async function verifyStaff(user) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Could not verify staff permissions. Check the profiles table and its policies.");
  const role = String(data?.role || "").toLowerCase();
  if (!["owner", "admin", "manager"].includes(role)) {
    throw new Error("This account does not have authorized staff access.");
  }
  currentUser = user;
  currentRole = role;
  showDashboard();
}
function showDashboard() {
  const dashboard = $("#adminDashboard");
  if (dashboard) dashboard.hidden = false;
  $$("[data-staff-email]").forEach(el => {
    el.textContent = currentUser?.email || "";
  });
  $$("[data-staff-role]").forEach(el => {
    el.textContent = currentRole || "";
  });
  const ownerPanel = $("#ownerManagementPanel");
  if (ownerPanel) ownerPanel.hidden = currentRole !== "owner";
  const trigger = $(".staff-login-trigger");
  if (trigger) trigger.textContent = "MANAGEMENT ↗";
  renderAdminInventory();
}
function setupLogin() {
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
    submit.disabled = true;
    setMessage(output, "Verifying credentials...");
    try {
      const email = $("#staffEmail").value.trim();
      const password = $("#staffPassword").value;
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      try {
        await verifyStaff(data.user);
      } catch (permissionError) {
        await supabaseClient.auth.signOut();
        currentUser = null;
        currentRole = null;
        throw permissionError;
      }
      closeLogin();
      await loadInventory();
      const dashboard = $("#adminDashboard");
      dashboard?.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Welcome to the control room.");
    } catch (error) {
      console.error("Staff login error:", error);
      setMessage(output, error.message || "Unable to sign in.", true);
    } finally {
      submit.disabled = false;
    }
  });
}
function setupLogout() {
  $$("[data-staff-logout]").forEach(button => {
    button.addEventListener("click", async () => {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        showToast("Unable to log out: " + error.message, true);
        return;
      }
      currentUser = null;
      currentRole = null;
      savedImages = [];
      newImageFiles = [];
      const dashboard = $("#adminDashboard");
      if (dashboard) dashboard.hidden = true;
      const trigger = $(".staff-login-trigger");
      if (trigger) trigger.textContent = "PRIVATE ACCESS ↗";
      resetProductForm();
      showToast("You have been signed out.");
    });
  });
}
/* ------------------------------------------
   IMAGE UPLOAD AND PREVIEW
------------------------------------------ */
function renderUploadPreview() {
  const preview = $("#productImagePreview");
  if (!preview) return;
  const existing = savedImages.map((url, index) => ({
    url,
    existing: true,
    index
  }));
  const pending = newImageFiles.map((file, index) => ({
    url: URL.createObjectURL(file),
    existing: false,
    index
  }));
  preview.innerHTML = [...existing, ...pending].map(item => `
    <div class="preview-item">
      <img src="${escapeHTML(item.url)}" alt="Product photo">
      <button class="preview-remove" type="button"
        data-remove-image="${item.index}"
        data-existing="${item.existing}"
        aria-label="Remove image">×</button>
    </div>
  `).join("");
}
function setupImageUpload() {
  const input = $("#productImages");
  const preview = $("#productImagePreview");
  if (!input || !preview) return;
  input.addEventListener("change", () => {
    const selected = [...input.files];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        showToast("Please select image files only.", true);
        input.value = "";
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast("Each image must be 10 MB or smaller.", true);
        input.value = "";
        return;
      }
    }
    newImageFiles.push(...selected);
    input.value = "";
    renderUploadPreview();
  });
  preview.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-image]");
    if (!button) return;
    const index = Number(button.dataset.removeImage);
    if (button.dataset.existing === "true") {
      savedImages.splice(index, 1);
    } else {
      newImageFiles.splice(index, 1);
    }
    renderUploadPreview();
  });
}
async function uploadSelectedImages() {
  const uploadedUrls = [];
  for (const file of newImageFiles) {
    const extension = (file.name.split(".").pop() || "jpg")
      .toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });
    if (error) throw error;
    const { data } = supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);
    uploadedUrls.push(data.publicUrl);
  }
  return uploadedUrls;
}
/* ------------------------------------------
   CREATE / EDIT / DELETE PRODUCTS
------------------------------------------ */
function resetProductForm() {
  $("#adminProductForm")?.reset();
  if ($("#productId")) $("#productId").value = "";
  savedImages = [];
  newImageFiles = [];
  renderUploadPreview();
  const title = $("#productFormTitle");
  if (title) title.innerHTML = 'ADD A <em>NEW PIECE.</em>';
  const button = $("#adminSaveProduct");
  if (button) button.textContent = "SAVE PRODUCT ↗";
  const output = $(".admin-message", $("#adminProductForm"));
  setMessage(output, "");
}
function setupProductForm() {
  const form = $("#adminProductForm");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentUser || !["owner", "admin", "manager"].includes(currentRole)) {
      showToast("Please sign in with an authorized staff account.", true);
      return;
    }
    if (isSaving) return;
    isSaving = true;
    const button = $("#adminSaveProduct");
    const output = $(".admin-message", form);
    button.disabled = true;
    setMessage(output, "Saving your changes...");
    try {
      const productId = $("#productId").value.trim();
      const name = $("#productName").value.trim();
      const priceText = $("#productPrice").value;
      if (!name || priceText === "" || !Number.isFinite(Number(priceText))) {
        throw new Error("Enter a valid product name and price.");
      }
      const uploaded = await uploadSelectedImages();
      const product = {
        name,
        category: $("#productCategory").value,
        price: Number(priceText),
        year: $("#productYear").value ? Number($("#productYear").value) : null,
        mileage: $("#productMileage").value ? Number($("#productMileage").value) : null,
        horsepower: $("#productHorsepower").value ? Number($("#productHorsepower").value) : null,
        hours: $("#productHours").value ? Number($("#productHours").value) : null,
        description: $("#productDescription").value.trim(),
        images: [...savedImages, ...uploaded],
        status: $("#productStatus").value
      };
      let result;
      if (productId) {
        result = await supabaseClient
          .from("products")
          .update(product)
          .eq("id", productId)
          .select("id");
      } else {
        result = await supabaseClient
          .from("products")
          .insert(product)
          .select("id");
      }
      if (result.error) throw result.error;
      if (!result.data?.length) {
        throw new Error("No changes were returned. Check your Supabase RLS policies.");
      }
      resetProductForm();
      await loadInventory();
      showToast(productId ? "Product updated." : "Product added to the collection.");
    } catch (error) {
      console.error("Product save error:", error);
      setMessage(output, error.message || "Unable to save product.", true);
      showToast(error.message || "Unable to save product.", true);
    } finally {
      isSaving = false;
      button.disabled = false;
    }
  });
  $$("[data-cancel-product]").forEach(button => {
    button.addEventListener("click", resetProductForm);
  });
}
function renderAdminInventory() {
  const list = $("#adminProductList");
  const count = $("#adminInventoryCount");
  if (!list) return;
  if (!currentUser) {
    list.innerHTML = "";
    if (count) count.textContent = "0 ITEMS";
    return;
  }
  if (count) count.textContent = `${inventory.length} ITEMS`;
  if (!inventory.length) {
    list.innerHTML = '<p class="muted">Your inventory is empty. Add your first piece.</p>';
    return;
  }
  list.innerHTML = inventory.map(product => {
    const image = getImages(product.images)[0] || "";
    return `
      <article class="admin-product-item">
        ${image
          ? `<img class="admin-product-thumb" src="${escapeHTML(image)}" alt="">`
          : `<div class="admin-product-thumb"></div>`
        }
        <div>
          <div class="admin-product-name">${escapeHTML(product.name)}</div>
          <div class="admin-product-meta">${escapeHTML(categoryLabel(product.category))} · ${escapeHTML(formatPrice(product.price))}</div>
          <div class="admin-product-meta">${product.status === "sold_out" ? "Sold out" : "Available"}</div>
          <div class="admin-product-actions">
            <button type="button" data-edit-product="${escapeHTML(product.id)}">EDIT</button>
            <button type="button" data-delete-product="${escapeHTML(product.id)}">DELETE</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}
function editProduct(id) {
  const product = inventory.find(item => String(item.id) === String(id));
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
  savedImages = getImages(product.images);
  newImageFiles = [];
  renderUploadPreview();
  const title = $("#productFormTitle");
  if (title) title.innerHTML = 'REFINE THIS <em>PIECE.</em>';
  const button = $("#adminSaveProduct");
  if (button) button.textContent = "UPDATE PRODUCT ↗";
  $("#adminProductForm").scrollIntoView({ behavior: "smooth", block: "start" });
}
function setupAdminInventory() {
  const list = $("#adminProductList");
  if (!list) return;
  list.addEventListener("click", async event => {
    const edit = event.target.closest("[data-edit-product]");
    const remove = event.target.closest("[data-delete-product]");
    if (edit) {
      editProduct(edit.dataset.editProduct);
      return;
    }
    if (!remove || !currentUser) return;
    const id = remove.dataset.deleteProduct;
    const product = inventory.find(item => String(item.id) === String(id));
    if (!product) return;
    if (!confirm(`Permanently delete "${product.name}"?`)) return;
    remove.disabled = true;
    const { error } = await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Delete product error:", error);
      showToast("Could not delete product: " + error.message, true);
      remove.disabled = false;
      return;
    }
    await loadInventory();
    showToast("Product deleted.");
  });
}
/* ------------------------------------------
   OWNER: CREATE STAFF
------------------------------------------ */
function setupCreateStaff() {
  const form = $("#ownerCreateAdminForm");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentUser || currentRole !== "owner") {
      showToast("Only the owner can create staff accounts.", true);
      return;
    }
    const button = $('button[type="submit"]', form);
    const output = $(".admin-message", form);
    button.disabled = true;
    setMessage(output, "Creating account...");
    try {
      const email = $("#newAdminEmail").value.trim();
      const password = $("#newAdminPassword").value;
      const { data, error } = await supabaseClient.functions.invoke("create-admin", {
        body: { email, password }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      form.reset();
      setMessage(output, "Staff account created successfully.");
      showToast("Staff account created.");
    } catch (error) {
      console.error("Create staff error:", error);
      setMessage(output, error.message || "Unable to create staff account.", true);
    } finally {
      button.disabled = false;
    }
  });
}
/* ------------------------------------------
   RESTORE SESSION
------------------------------------------ */
async function restoreSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) return;
  try {
    await verifyStaff(data.session.user);
  } catch (permissionError) {
    console.error("Session verification:", permissionError.message);
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentRole = null;
  }
}
/* ------------------------------------------
   STARTUP
------------------------------------------ */
document.addEventListener("DOMContentLoaded", async () => {
  setupIntro();
  setupFilters();
  setupGallery();
  setupLogin();
  setupLogout();
  setupImageUpload();
  setupProductForm();
  setupAdminInventory();
  setupCreateStaff();
  await loadInventory();
  await restoreSession();
  supabaseClient.auth.onAuthStateChange(event => {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      currentRole = null;
      const dashboard = $("#adminDashboard");
      if (dashboard) dashboard.hidden = true;
      const trigger = $(".staff-login-trigger");
      if (trigger) trigger.textContent = "PRIVATE ACCESS ↗";
      renderAdminInventory();
    }
  });
});
