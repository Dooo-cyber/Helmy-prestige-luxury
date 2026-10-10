/* HELMY PRESTIGE LUXURY — COMPLETE SCRIPT */
(() => {
  "use strict";

  // Supabase connection
  const SUPABASE_URL = "https://fnftfpthzlgkfexnknaw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_wugH6rf-d6hXXQU2tkvWtg_YxdWz8OP";
  const BUCKET = "product-images";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  let supabase = null;
  let allProducts = [];
  let currentUser = null;
  let currentRole = null;
  let toastTimeout = null;

  const byId = (id) => document.getElementById(id);

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatPrice(price) {
    if (price === null || price === undefined || String(price).trim() === "") {
      return "CONTACT FOR PRICE";
    }

    const value = String(price).trim();

    // Preserve prices entered as text, for example "2,500,000 EGP".
    if (/[a-zA-Z]/.test(value) || value.includes("€") ||
        value.includes("$") || value.includes("£") || value.includes("ج")) {
      return value.toUpperCase();
    }

    const numeric = Number(value.replace(/,/g, ""));
    if (Number.isFinite(numeric)) {
      return `${numeric.toLocaleString("en-US")} EGP`;
    }

    return value;
  }

  function toggleBusy(button, on, label = "PLEASE WAIT...") {
    if (!button) return;

    if (on) {
      if (!button.dataset.oldText) {
        button.dataset.oldText = button.textContent;
      }

      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.oldText || button.textContent;
      delete button.dataset.oldText;
      button.disabled = false;
    }
  }

  function showToast(message) {
    const toast = byId("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
  }

  function setMessage(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function openDialog(id) {
    const dialog = byId(id);
    if (!dialog) return;

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(id) {
    const dialog = byId(id);
    if (!dialog) return;

    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function normalizeCategory(value) {
    const category = String(value || "OTHER").trim().toUpperCase();

    const allowed = ["SUV", "SEDAN", "SPORTS", "LUXURY", "OTHER"];
    return allowed.includes(category) ? category : "OTHER";
  }

  function getProductImage(product) {
    return product.image_url || product.image || "";
  }

  function productIsVisible(product) {
    // Public products use status = "available".
    // Missing status is treated as visible for compatibility with older rows.
    return product.status === undefined ||
      product.status === null ||
      product.status === "" ||
      String(product.status).toLowerCase() === "available";
  }

  function initSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      showToast("Supabase library failed to load. Refresh the page.");
      return false;
    }

    supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    return true;
  }

  // -----------------------------
  // Navigation
  // -----------------------------

  function initNavigation() {
    const menuToggle = byId("menuToggle");
    const nav = $(".main-nav");

    if (menuToggle && nav) {
      menuToggle.addEventListener("click", () => {
        nav.classList.toggle("open");
      });

      $$(".main-nav a").forEach((link) => {
        link.addEventListener("click", () => nav.classList.remove("open"));
      });
    }

    const year = byId("currentYear");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  // -----------------------------
  // Public product collection
  // -----------------------------

  function renderProducts(products) {
    const grid = byId("productGrid");
    const empty = byId("emptyProducts");

    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    grid.innerHTML = products.map((product) => {
      const id = escapeHTML(product.id);
      const name = escapeHTML(product.name || "Premium Vehicle");
      const brand = escapeHTML(product.brand || "");
      const category = escapeHTML(normalizeCategory(product.category));
      const price = escapeHTML(formatPrice(product.price));
      const image = escapeHTML(getProductImage(product));

      const imageMarkup = image
        ? `<img class="product-image"
             src="${image}"
             alt="${name}"
             loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.hidden=false">
           <div class="public-product-image-placeholder" hidden>H</div>`
        : `<div class="public-product-image-placeholder">H</div>`;

      return `
        <article class="product-card">
          <div class="product-image-wrap">
            ${imageMarkup}
            <span class="product-category">${category}</span>
          </div>

          <div class="product-details public-product-details">
            <p class="product-brand">${brand || "HELMY PRESTIGE"}</p>
            <h3 class="product-name">${name}</h3>

            <div class="product-meta">
              <span class="product-price">${price}</span>
              <button class="product-view-button"
                type="button"
                data-view-product="${id}">
                VIEW DETAILS ↗
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function filterProducts() {
    const search = (byId("productSearch")?.value || "")
      .trim()
      .toLowerCase();

    const category = byId("categoryFilter")?.value || "all";

    const filtered = allProducts.filter((product) => {
      const text = [
        product.name,
        product.brand,
        product.category,
        product.description
      ].join(" ").toLowerCase();

      const matchesSearch = !search || text.includes(search);
      const matchesCategory = category === "all" ||
        normalizeCategory(product.category) === category;

      return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
  }

  async function loadPublicProducts() {
    const grid = byId("productGrid");
    if (grid) {
      grid.innerHTML = '<div class="loading-state">LOADING COLLECTION...</div>';
    }

    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      allProducts = (data || []).filter(productIsVisible);
      filterProducts();
    } catch (error) {
      console.error("Unable to load products:", error);

      if (grid) {
        grid.innerHTML = `
          <div class="loading-state">
            THE COLLECTION IS TEMPORARILY UNAVAILABLE.
          </div>`;
      }

      const empty = byId("emptyProducts");
      if (empty) empty.hidden = true;
    }
  }

  function openProductDetails(productId) {
    const product = allProducts.find(
      (item) => String(item.id) === String(productId)
    );

    if (!product) {
      showToast("This vehicle could not be found.");
      return;
    }

    const container = byId("productModalContent");
    if (!container) return;

    const name = escapeHTML(product.name || "Premium Vehicle");
    const brand = escapeHTML(product.brand || "HELMY PRESTIGE");
    const category = escapeHTML(normalizeCategory(product.category));
    const price = escapeHTML(formatPrice(product.price));
    const description = escapeHTML(
      product.description || "Contact our team for more information."
    );
    const image = escapeHTML(getProductImage(product));

    container.innerHTML = `
      <p class="eyebrow">${brand}</p>
      <h2 class="modal-product-title">${name}</h2>
      <p class="product-category">${category}</p>
      ${
        image
          ? `<img class="modal-product-image" src="${image}" alt="${name}"
               onerror="this.style.display='none'">`
          : ""
      }
      <h3 class="product-price">${price}</h3>
      <p class="modal-product-description">${description}</p>
      <a class="modal-contact-link"
         href="https://wa.me/201115000225"
         target="_blank"
         rel="noopener">
        ASK ABOUT THIS VEHICLE ↗
      </a>
    `;

    openDialog("productModal");
  }

  function initCollection() {
    byId("productSearch")?.addEventListener("input", filterProducts);
    byId("categoryFilter")?.addEventListener("change", filterProducts);

    byId("productGrid")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-view-product]");
      if (!button) return;

      openProductDetails(button.dataset.viewProduct);
    });
  }

  // -----------------------------
  // Dialog controls
  // -----------------------------

  function initDialogs() {
    $$("[data-close]").forEach((button) => {
      button.addEventListener("click", () => {
        closeDialog(button.dataset.close);
      });
    });

    ["productModal", "loginModal", "dashboardModal"].forEach((id) => {
      const dialog = byId(id);

      dialog?.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(id);
      });
    });

    byId("openLogin")?.addEventListener("click", () => {
      setMessage(byId("loginMessage"), "");
      openDialog("loginModal");
    });

    byId("enterShowroom")?.addEventListener("click", () => {
      byId("collection")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // -----------------------------
  // Authentication and permissions
  // -----------------------------

  async function getProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data.user) throw new Error("Login failed. Please try again.");

    currentUser = data.user;

    let profile;
    try {
      profile = await getProfile(currentUser.id);
    } catch (error) {
      await supabase.auth.signOut();
      currentUser = null;
      throw new Error(
        "Could not verify your profile permissions. Check the profiles table and its access policies."
      );
    }

    const role = String(profile?.role || "").toLowerCase();

    if (!["owner", "admin"].includes(role)) {
      await supabase.auth.signOut();
      currentUser = null;
      currentRole = null;
      throw new Error("This account does not have admin access.");
    }

    currentRole = role;
    return profile;
  }

  async function handleLogin(event) {
    event.preventDefault();

    const email = byId("loginEmail")?.value.trim();
    const password = byId("loginPassword")?.value;
    const button = byId("loginSubmit");
    const message = byId("loginMessage");

    if (!email || !password) {
      setMessage(message, "Enter your email and password.", true);
      return;
    }

    toggleBusy(button, true, "SIGNING IN...");
    setMessage(message, "");

    try {
      const profile = await login(email, password);

      closeDialog("loginModal");
      openDashboard(profile);
      await loadAdminProducts();
      showToast("Welcome back.");
    } catch (error) {
      console.error("Login error:", error);
      setMessage(
        message,
        error.message || "Unable to sign in. Please check your details.",
        true
      );
    } finally {
      toggleBusy(button, false);
    }
  }

  function openDashboard(profile) {
    const role = String(profile?.role || currentRole || "admin").toUpperCase();
    const displayName = profile?.full_name ||
      currentUser?.email ||
      "Administrator";

    const welcome = byId("adminWelcome");
    if (welcome) welcome.textContent = `${displayName} · ${role}`;

    resetProductForm();
    switchDashboardTab("manageProducts");
    openDialog("dashboardModal");
  }

  async function restoreSession() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const user = data?.session?.user;
      if (!user) return;

      currentUser = user;

      const profile = await getProfile(user.id);
      const role = String(profile?.role || "").toLowerCase();

      if (!["owner", "admin"].includes(role)) {
        currentUser = null;
        currentRole = null;
        await supabase.auth.signOut();
        return;
      }

      currentRole = role;
    } catch (error) {
      console.error("Session restore:", error);
    }
  }

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      currentUser = null;
      currentRole = null;
      closeDialog("dashboardModal");
      showToast("You have been signed out.");
    } catch (error) {
      console.error("Logout error:", error);
      showToast(error.message || "Could not sign out.");
    }
  }

  function requireAdmin() {
    if (!supabase || !currentUser ||
        !["owner", "admin"].includes(currentRole)) {
      throw new Error("Please sign in with an authorized admin account.");
    }
  }

  // -----------------------------
  // Admin dashboard and products
  // -----------------------------

  function switchDashboardTab(tabId) {
    $$(".dashboard-panel").forEach((panel) => {
      panel.hidden = panel.id !== tabId;
    });

    $$(".tab-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabId);
    });
  }

  async function loadAdminProducts() {
    const list = byId("adminProductsList");
    if (!list) return;

    list.innerHTML = '<p class="loading-state">Loading products...</p>';

    try {
      requireAdmin();

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      renderAdminProducts(data || []);
    } catch (error) {
      console.error("Admin products error:", error);

      list.innerHTML = `
        <p class="loading-state">
          ${escapeHTML(error.message || "Unable to load products.")}
        </p>`;
    }
  }

  function renderAdminProducts(products) {
    const list = byId("adminProductsList");
    if (!list) return;

    if (!products.length) {
      list.innerHTML = `
        <p class="loading-state">
          No vehicles yet. Select “ADD VEHICLE” to create your first listing.
        </p>`;
      return;
    }

    list.innerHTML = products.map((product) => {
      const id = escapeHTML(product.id);
      const name = escapeHTML(product.name || "Unnamed vehicle");
      const brand = escapeHTML(product.brand || "");
      const category = escapeHTML(normalizeCategory(product.category));
      const price = escapeHTML(formatPrice(product.price));
      const image = escapeHTML(getProductImage(product));
      const visible = productIsVisible(product);

      return `
        <article class="admin-product-item">
          ${
            image
              ? `<img class="admin-product-thumb" src="${image}"
                   alt="${name}" loading="lazy"
                   onerror="this.style.display='none'">`
              : `<div class="admin-product-thumb public-product-image-placeholder">H</div>`
          }

          <div class="admin-product-info">
            <strong>${name}</strong>
            <span>${brand} · ${category}</span>
            <span>${price} · ${visible ? "PUBLIC" : "HIDDEN"}</span>
          </div>

          <div class="admin-product-item-actions">
            <button class="small-action"
              type="button" data-edit-product="${id}">EDIT</button>
            <button class="small-action"
              type="button" data-toggle-product="${id}">
              ${visible ? "HIDE" : "PUBLISH"}
            </button>
            <button class="small-action delete"
              type="button" data-delete-product="${id}">DELETE</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function resetProductForm() {
    const form = byId("productForm");
    if (form) form.reset();

    if (byId("editProductId")) byId("editProductId").value = "";
    if (byId("productAvailable")) byId("productAvailable").checked = true;
    if (byId("productFormTitle")) {
      byId("productFormTitle").textContent = "ADD A VEHICLE";
    }
    if (byId("saveProductButton")) {
      byId("saveProductButton").textContent = "SAVE VEHICLE";
    }

    const image = byId("currentProductImage");
    if (image) {
      image.src = "";
      image.hidden = true;
    }

    setMessage(byId("productFormMessage"), "");
  }

  function startNewProduct() {
    resetProductForm();
    switchDashboardTab("addProductPanel");
    byId("productName")?.focus();
  }

  function startEditProduct(productId) {
    const product = allProducts.find(
      (item) => String(item.id) === String(productId)
    );

    // The admin list may include hidden products, so load from the database
    // if this product is not in the public collection.
    if (!product) {
      fetchProductForEdit(productId);
      return;
    }

    fillProductForm(product);
  }

  async function fetchProductForEdit(productId) {
    try {
      requireAdmin();

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error) throw error;
      fillProductForm(data);
    } catch (error) {
      showToast(error.message || "Unable to open this vehicle.");
    }
  }

  function fillProductForm(product) {
    resetProductForm();

    byId("editProductId").value = product.id ?? "";
    byId("productName").value = product.name || "";
    byId("productBrand").value = product.brand || "";
    byId("productCategory").value = normalizeCategory(product.category);
    byId("productPrice").value = product.price ?? "";
    byId("productDescription").value = product.description || "";
    byId("productAvailable").checked = productIsVisible(product);

    if (byId("productFormTitle")) {
      byId("productFormTitle").textContent = "EDIT VEHICLE";
    }

    if (byId("saveProductButton")) {
      byId("saveProductButton").textContent = "UPDATE VEHICLE";
    }

    const imageUrl = getProductImage(product);
    const image = byId("currentProductImage");

    if (image && imageUrl) {
      image.src = imageUrl;
      image.hidden = false;
    }

    switchDashboardTab("addProductPanel");
  }

  async function uploadProductImage(file) {
    if (!file) return null;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Please select a JPG, PNG, or WEBP image.");
    }

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("The image must be smaller than 8 MB.");
    }

    const extensionMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };

    const extension = extensionMap[file.type];
    const path = `products/${Date.now()}-${Math.random()
      .toString(36).slice(2, 10)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      throw new Error("The image uploaded but its public URL was not returned.");
    }

    return data.publicUrl;
  }

  async function handleSaveProduct(event) {
    event.preventDefault();

    const button = byId("saveProductButton");
    const message = byId("productFormMessage");
    const editId = byId("editProductId")?.value;
    const imageFile = byId("productImage")?.files?.[0] || null;

    const name = byId("productName")?.value.trim();
    const brand = byId("productBrand")?.value.trim();

    if (!name || !brand) {
      setMessage(message, "Vehicle name and brand are required.", true);
      return;
    }

    toggleBusy(button, true, "SAVING...");
    setMessage(message, "");

    try {
      requireAdmin();

      let imageUrl = null;

      if (imageFile) {
        setMessage(message, "Uploading image...");
        imageUrl = await uploadProductImage(imageFile);
      }

      const productData = {
        name,
        brand,
        category: normalizeCategory(byId("productCategory")?.value),
        price: byId("productPrice")?.value.trim() || null,
        description: byId("productDescription")?.value.trim() || "",
        status: byId("productAvailable")?.checked ? "available" : "hidden"
      };

      if (imageUrl) {
        productData.image_url = imageUrl;
      }

      let result;

      if (editId) {
        result = await supabase
          .from("products")
          .update(productData)
          .eq("id", editId)
          .select()
          .single();
      } else {
        if (!imageUrl) {
          // A product may be created without an image.
        }

        result = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setMessage(message, "Vehicle saved successfully.");
      showToast(editId ? "Vehicle updated." : "Vehicle added.");

      await loadPublicProducts();
      await loadAdminProducts();

      resetProductForm();
      switchDashboardTab("manageProducts");
    } catch (error) {
      console.error("Save product error:", error);

      setMessage(
        message,
        error.message || "Could not save the vehicle.",
        true
      );
    } finally {
      toggleBusy(button, false);
    }
  }

  async function toggleProductVisibility(productId) {
    try {
      requireAdmin();

      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (fetchError) throw fetchError;

      const nextStatus = productIsVisible(product) ? "hidden" : "available";

      const { error } = await supabase
        .from("products")
        .update({ status: nextStatus })
        .eq("id", productId);

      if (error) throw error;

      showToast(nextStatus === "available"
        ? "Vehicle published."
        : "Vehicle hidden from the public collection.");

      await loadPublicProducts();
      await loadAdminProducts();
    } catch (error) {
      console.error("Visibility update error:", error);
      showToast(error.message || "Unable to update vehicle visibility.");
    }
  }

  async function deleteProduct(productId) {
    const confirmed = window.confirm(
      "Delete this vehicle permanently? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      requireAdmin();

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      showToast("Vehicle deleted.");
      await loadPublicProducts();
      await loadAdminProducts();
    } catch (error) {
      console.error("Delete product error:", error);
      showToast(error.message || "Unable to delete this vehicle.");
    }
  }

  function initDashboard() {
    byId("loginForm")?.addEventListener("submit", handleLogin);
    byId("logoutButton")?.addEventListener("click", handleLogout);
    byId("productForm")?.addEventListener("submit", handleSaveProduct);

    byId("newProductButton")?.addEventListener("click", startNewProduct);
    byId("cancelProductEdit")?.addEventListener("click", () => {
      resetProductForm();
      switchDashboardTab("manageProducts");
    });

    $$(".tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        switchDashboardTab(button.dataset.tab);
      });
    });

    byId("adminProductsList")?.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-product]");
      const toggleButton = event.target.closest("[data-toggle-product]");
      const deleteButton = event.target.closest("[data-delete-product]");

      if (editButton) {
        startEditProduct(editButton.dataset.editProduct);
      } else if (toggleButton) {
        toggleProductVisibility(toggleButton.dataset.toggleProduct);
      } else if (deleteButton) {
        deleteProduct(deleteButton.dataset.deleteProduct);
      }
    });

    byId("productImage")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      const preview = byId("currentProductImage");

      if (!file || !preview) return;

      const localUrl = URL.createObjectURL(file);
      preview.src = localUrl;
      preview.hidden = false;
    });
  }

  // -----------------------------
  // Start website
  // -----------------------------

  async function init() {
    initNavigation();
    initCollection();
    initDialogs();
    initDashboard();

    if (!initSupabase()) return;

    await restoreSession();
    await loadPublicProducts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
