/* HELMY PRESTIGE LUXURY — COMPLETE SCRIPT */
(() => {
  "use strict";

  const SUPABASE_URL =
    "https://fnftfpthzlgkfexnknaw.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_wugH6rf-d6hXXQU2tkvWtg_YxdWz8OP";

  const BUCKET = "product-images";

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
  const imageInput = $("#productImages");
  const imagePreview = $("#productImagePreview");

  const categories = {
    car: "CAR",
    beach_buggy: "BEACH BUGGY",
    jet_ski: "JET SKI",
    boat: "BOAT"
  };

  let db = null;
  let user = null;
  let role = null;
  let items = [];
  let editingId = null;
  let editingImages = [];
  let busy = false;
  let demoMode = false;
  let selectedCategory = "all";
  let previewUrls = [];

  const msg = (el, text, type = "") => {
    if (!el) return;
    el.textContent = text;
    el.classList.remove("error", "success");
    if (type) el.classList.add(type);
  };

  const money = value =>
    value !== null && value !== "" &&
    Number.isFinite(Number(value))
      ? new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 0
        }).format(Number(value))
      : "Price on request";

  const staff = () =>
    role === "owner" || role === "admin";

  const owner = () => role === "owner";

  function node(tag, cls = "", text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = String(text);
    return el;
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
      button.textContent =
        button.dataset.oldText || button.textContent;
      button.disabled = false;
    }
  }

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
    if (selectedCategory === "all") return list;

    return list.filter(product =>
      normalizeCategory(product.category) === selectedCategory
    );
  }

  function setCategory(value) {
    selectedCategory = normalizeCategory(value);

    $$("#categoryFilter [data-category], #categoryFilter [data-filter]")
      .forEach(button => {
        const key = normalizeCategory(
          button.dataset.category ||
          button.dataset.filter ||
          button.textContent
        );

        const active = key === selectedCategory;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });

    renderPublic(visibleProducts(demoMode ? [] : items));
  }

  /* YEAR IN FOOTER */
  if ($("#currentYear")) {
    $("#currentYear").textContent = new Date().getFullYear();
  }

  /* STAFF LOGIN MODAL */
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

  $(".admin-modal-backdrop")?.addEventListener(
    "click",
    closeLogin
  );

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeLogin();
    }
  });

  /* CATEGORY FILTER */
  $("#categoryFilter")?.addEventListener("click", event => {
    const button = event.target.closest(
      "[data-category], [data-filter]"
    );

    if (!button) return;

    event.preventDefault();

    setCategory(
      button.dataset.category ||
      button.dataset.filter ||
      button.textContent
    );
  });

  /* IMAGE HELPERS */
  function getImages(product) {
    if (Array.isArray(product.images)) return product.images;

    if (typeof product.images === "string") {
      try {
        const parsed = JSON.parse(product.images);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return product.images ? [product.images] : [];
      }
    }

    return [];
  }

  function validImage(src) {
    try {
      const url = new URL(src, location.href);
      return ["https:", "http:"].includes(url.protocol)
        ? url.href
        : "";
    } catch {
      return "";
    }
  }

  function clearPreviews() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
  }

  function showImagePreview() {
    if (!imagePreview || !imageInput) return;

    clearPreviews();
    imagePreview.replaceChildren();

    const files = [...(imageInput.files || [])];

    files.forEach(file => {
      if (!file.type.startsWith("image/")) return;

      const url = URL.createObjectURL(file);
      previewUrls.push(url);

      const img = node("img", "product-upload-preview");
      img.src = url;
      img.alt = file.name;
      img.style.width = "100px";
      img.style.height = "80px";
      img.style.objectFit = "cover";
      img.style.margin = "5px";
      img.style.borderRadius = "6px";

      imagePreview.append(img);
    });

    if (!files.length && editingImages.length) {
      editingImages.forEach(src => {
        const url = validImage(src);
        if (!url) return;

        const img = node("img", "product-upload-preview");
        img.src = url;
        img.alt = "Existing product photo";
        img.style.width = "100px";
        img.style.height = "80px";
        img.style.objectFit = "cover";
        img.style.margin = "5px";
        img.style.borderRadius = "6px";

        imagePreview.append(img);
      });
    }
  }

  imageInput?.addEventListener("change", showImagePreview);

  /* UPLOAD IMAGES TO SUPABASE STORAGE */
  async function uploadImages(files) {
    const urls = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw Error(`Not an image file: ${file.name}`);
      }

      // Keep uploads reasonably small for mobile connections.
      if (file.size > 10 * 1024 * 1024) {
        throw Error(
          `${file.name} is larger than 10 MB. Choose a smaller image.`
        );
      }

      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-");

      const path =
        `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const { error } = await db.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (error) throw error;

      const { data } = db.storage
        .from(BUCKET)
        .getPublicUrl(path);

      if (!data?.publicUrl) {
        throw Error("Image uploaded but its public URL is missing.");
      }

      urls.push(data.publicUrl);
    }

    return urls;
  }

  /* PUBLIC PRODUCT CARDS */
  function renderPublic(list) {
    if (!publicList) return;

    publicList.replaceChildren();

    if (!list.length) {
      publicList.append(node(
        "p",
        "loading-copy",
        demoMode
          ? "Live inventory is temporarily unavailable. Please try again later."
          : "No products in this category yet. Contact our team for availability."
      ));
      return;
    }

    list.forEach(product => {
      const card = node("article", "public-product-card");
      const images = getImages(product);
      const imageUrl = validImage(images[0] || "");

      if (imageUrl) {
        const img = node("img", "public-product-image");
        img.src = imageUrl;
        img.alt = product.name || "Helmy Prestige product";
        img.loading = "lazy";

        img.onerror = () => {
          img.replaceWith(node(
            "div",
            "public-product-image-placeholder",
            "IMAGE NOT AVAILABLE"
          ));
        };

        card.append(img);
      } else {
        card.append(node(
          "div",
          "public-product-image-placeholder",
          "HELMY PRESTIGE"
        ));
      }

      const details = node("div", "public-product-details");
      const category = normalizeCategory(product.category);

      details.append(node(
        "span",
        "product-category",
        categories[category] || "COLLECTION"
      ));

      details.append(node("h3", "", product.name || "Vehicle"));

      details.append(node(
        "p",
        "product-price",
        `${money(product.price)} EGP`
      ));

      const status = product.status || "available";
      details.append(node(
        "span",
        `product-status ${status === "sold_out" ? "sold-out" : "available"}`,
        status === "sold_out" ? "SOLD OUT" : "AVAILABLE"
      ));

      if (product.year) {
        details.append(node("p", "product-meta", `Year: ${product.year}`));
      }

      if (product.mileage != null && product.mileage !== "") {
        details.append(node(
          "p",
          "product-meta",
          `Mileage: ${product.mileage} km`
        ));
      }

      if (product.horsepower != null && product.horsepower !== "") {
        details.append(node(
          "p",
          "product-meta",
          `Horsepower: ${product.horsepower} HP`
        ));
      }

      if (product.hours != null && product.hours !== "") {
        details.append(node(
          "p",
          "product-meta",
          `Engine hours: ${product.hours}`
        ));
      }

      details.append(node(
        "p",
        "public-product-description",
        product.description || "Contact us for details and availability."
      ));

      const wa = node(
        "a",
        "product-whatsapp",
        status === "sold_out" ? "ASK ABOUT SIMILAR PRODUCTS" : "CONTACT ON WHATSAPP"
      );

      wa.href = "https://wa.me/201115000225?text=" +
        encodeURIComponent(
          `Hello, I'm interested in ${product.name || "your collection"}.`
        );

      wa.target = "_blank";
      wa.rel = "noopener noreferrer";

      details.append(wa);
      card.append(details);
      publicList.append(card);
    });
  }

  /* LOAD PUBLIC INVENTORY */
  async function publicInventory() {
    const { data, error } = await db
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Public inventory error:", error);
      demoMode = true;
      items = [];
      renderPublic([]);
      msg(publicMsg, "Unable to load live inventory. Please try again later.", "error");
      return;
    }

    demoMode = false;
    items = data || [];
    renderPublic(visibleProducts(items));
    msg(publicMsg, "");
  }

  /* STAFF PROFILE */
  async function getStaffProfile(id) {
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

  /* LOAD ADMIN INVENTORY */
  async function loadProducts() {
    if (!staff() || !productList) return;

    productList.replaceChildren(
      node("p", "", "Loading inventory...")
    );

    const { data, error } = await db
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      productList.replaceChildren(node(
        "p",
        "",
        "Unable to load products. Check database permissions."
      ));
      return;
    }

    items = data || [];
    renderStaff();
    renderPublic(visibleProducts(items));
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

      card.append(node("h4", "", product.name || "Unnamed product"));
      card.append(node("p", "", `Price: ${money(product.price)} EGP`));
      card.append(node(
        "p",
        "",
        `Category: ${categories[normalizeCategory(product.category)] || product.category || "Unknown"}`
      ));
      card.append(node("p", "", `Year: ${product.year ?? "Not specified"}`));
      card.append(node("p", "", `Mileage: ${product.mileage ?? "Not specified"}`));
      card.append(node("p", "", `Horsepower: ${product.horsepower ?? "Not specified"}`));
      card.append(node("p", "", `Hours: ${product.hours ?? "Not specified"}`));
      card.append(node("p", "", `Status: ${product.status || "available"}`));
      card.append(node("p", "", `Images: ${getImages(product).length}`));

      const actions = node("div", "admin-product-item-actions");

      const edit = node("button", "", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => editProduct(product));

      const del = node("button", "", "Delete");
      del.type = "button";
      del.addEventListener("click", () => deleteProduct(product.id, product.name));

      actions.append(edit, del);
      card.append(actions);
      productList.append(card);
    });
  }

  /* DASHBOARD */
  async function showDashboard(profileData) {
    const result = await db.auth.getUser();
    user = result.data.user;
    role = profileData.role;

    if (dashboard) dashboard.hidden = false;
    closeLogin();

    const emailEl = $("[data-staff-email]");
    const roleEl = $("[data-staff-role]");

    if (emailEl) emailEl.textContent = profileData.email || user?.email || "";
    if (roleEl) roleEl.textContent = role.toUpperCase();

    $$(".owner-only").forEach(el => {
      el.hidden = !owner();
    });

    if (ownerPanel) ownerPanel.hidden = !owner();

    await loadProducts();
  }

  /* EDIT PRODUCT */
  function editProduct(product) {
    editingId = product.id;
    editingImages = getImages(product).slice();

    const fields = {
      name: product.name,
      price: product.price,
      hours: product.hours,
      description: product.description,
      category: product.category || "jet_ski",
      year: product.year,
      mileage: product.mileage,
      horsepower: product.horsepower,
      status: product.status || "available"
    };

    for (const [name, value] of Object.entries(fields)) {
      const field = productForm?.elements.namedItem(name);
      if (field && "value" in field) {
        field.value = value ?? "";
      }
    }

    if (imageInput) imageInput.value = "";

    if (saveButton) saveButton.textContent = "UPDATE PRODUCT";

    showImagePreview();
    msg($(".admin-message", productForm), "Editing product.");
    productForm?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  /* READ FORM */
  function readProduct() {
    const field = name => productForm.elements.namedItem(name);

    const name = field("name")?.value.trim() || "";
    const price = field("price")?.value ?? "";
    const hours = field("hours")?.value ?? "";
    const description = field("description")?.value.trim() || "";
    const category = normalizeCategory(field("category")?.value || "jet_ski");
    const year = field("year")?.value ?? "";
    const mileage = field("mileage")?.value ?? "";
    const horsepower = field("horsepower")?.value ?? "";
    const status = field("status")?.value || "available";

    if (!name) throw Error("Enter a product name.");

    if (price === "" || !Number.isFinite(+price) || +price < 0) {
      throw Error("Enter a valid price.");
    }

    for (const [label, value] of [
      ["Year", year],
      ["Mileage", mileage],
      ["Horsepower", horsepower],
      ["Engine hours", hours]
    ]) {
      if (value !== "" && (!Number.isFinite(+value) || +value < 0)) {
        throw Error(`Enter a valid value for ${label}.`);
      }
    }

    if (!["available", "sold_out"].includes(status)) {
      throw Error("Choose a valid product status.");
    }

    return {
      name,
      price: +price,
      hours: hours === "" ? null : +hours,
      description,
      category: category === "all" ? "jet_ski" : category,
      year: year === "" ? null : +year,
      mileage: mileage === "" ? null : +mileage,
      horsepower: horsepower === "" ? null : +horsepower,
      status,
      images: editingImages
    };
  }

  /* SAVE OR UPDATE PRODUCT */
  productForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!staff() || busy || !db) return;

    busy = true;
    toggleBusy(saveButton, true, "SAVING...");

    const statusEl = $(".admin-message", productForm);
    msg(statusEl, "");

    try {
      const product = readProduct();
      const files = [...(imageInput?.files || [])];

      if (files.length) {
        msg(statusEl, "Uploading product photos...");

        const uploadedUrls = await uploadImages(files);

        // Keep existing photos and append the newly uploaded ones.
        product.images = [...editingImages, ...uploadedUrls];
      }

      const result = editingId
        ? await db.from("products")
            .update(product)
            .eq("id", editingId)
            .select()
            .single()
        : await db.from("products")
            .insert(product)
            .select()
            .single();

      if (result.error) throw result.error;

      editingId = null;
      editingImages = [];
      productForm.reset();
      clearPreviews();

      if (imagePreview) imagePreview.replaceChildren();
      if (saveButton) saveButton.textContent = "SAVE PRODUCT";

      msg(statusEl, "Product saved successfully.", "success");
      await loadProducts();
    } catch (error) {
      console.error("Save product error:", error);
      msg(
        statusEl,
        error.message || "Could not save product.",
        "error"
      );
    } finally {
      busy = false;
      toggleBusy(saveButton, false);
    }
  });

  /* DELETE PRODUCT */
  async function deleteProduct(id, name) {
    if (!staff() || busy || !db) return;

    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    busy = true;

    try {
      const { error } = await db
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadProducts();
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not delete product.");
    } finally {
      busy = false;
    }
  }

  /* CANCEL EDIT */
  $$("[data-cancel-product]").forEach(button => {
    button.addEventListener("click", () => {
      editingId = null;
      editingImages = [];
      productForm?.reset();
      clearPreviews();

      if (imagePreview) imagePreview.replaceChildren();
      if (saveButton) saveButton.textContent = "SAVE PRODUCT";

      msg($(".admin-message", productForm), "");
    });
  });

  /* STAFF LOGIN */
  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!db) {
      msg(
        $(".admin-message", loginForm),
        "Supabase is not initialized.",
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

      const staffProfile = await getStaffProfile(data.user.id);
      await showDashboard(staffProfile);
      msg($(".admin-message", loginForm), "");
    } catch (error) {
      console.error(error);
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
    editingId = null;
    editingImages = [];

    if (dashboard) dashboard.hidden = true;
    productForm?.reset();
    closeLogin();
  }

  $$("[data-staff-logout]").forEach(button =>
    button.addEventListener("click", logout)
  );

  /* CREATE ADMIN — DEPLOYED EDGE FUNCTION REQUIRED */
  createAdminForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const statusEl = $(".admin-message", createAdminForm);

    if (!owner()) {
      msg(statusEl, "Only the Owner can create Admin accounts.", "error");
      return;
    }

    if (busy) return;

    const email = createAdminForm.elements.email.value.trim();
    const password = createAdminForm.elements.password.value;

    if (password.length < 12) {
      msg(statusEl, "Use a password with at least 12 characters.", "error");
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
      msg(statusEl, "Admin account created successfully.", "success");
    } catch (error) {
      console.error(error);
      msg(
        statusEl,
        error.message || "Could not create Admin.",
        "error"
      );
    } finally {
      busy = false;
      toggleBusy(button, false);
    }
  });

  /* SHOWROOM INTRO */
  function initShowroomIntro() {
    const intro = $("#introScreen");
    const button = $("#enterShowroom");

    if (!intro || !button) return;

    button.addEventListener("click", () => {
      intro.classList.add("is-leaving");
      intro.classList.add("intro-exit");
      intro.setAttribute("aria-hidden", "true");
      document.body.classList.add("showroom-entered");

      window.setTimeout(() => {
        intro.hidden = true;
      }, 850);
    });
  }

  /* START */
  async function init() {
    if (dashboard) dashboard.hidden = true;
    if (ownerPanel) ownerPanel.hidden = true;

    initShowroomIntro();

    if (!window.supabase) {
      demoMode = true;
      renderPublic([]);
      msg(publicMsg, "Supabase library is missing.", "error");
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

    const { data, error } = await db.auth.getSession();

    if (error) console.error(error);

    const session = data?.session;

    if (session?.user) {
      try {
        const staffProfile = await getStaffProfile(session.user.id);
        await showDashboard(staffProfile);
      } catch (error) {
        console.error("Session profile error:", error);
        await db.auth.signOut();
      }
    }

    db.auth.onAuthStateChange((event, sessionData) => {
      if (event === "SIGNED_OUT") {
        user = null;
        role = null;
        if (dashboard) dashboard.hidden = true;
      }

      if (event === "SIGNED_IN" && sessionData?.user) {
        window.setTimeout(async () => {
          try {
            const staffProfile = await getStaffProfile(sessionData.user.id);
            await showDashboard(staffProfile);
          } catch (error) {
            console.error("Staff authorization error:", error);
          }
        }, 0);
      }
    });
  }

  init().catch(error => {
    console.error("Site initialization error:", error);
    demoMode = true;
    renderPublic([]);
    msg(
      publicMsg,
      "Site initialization failed. Check Supabase settings and permissions.",
      "error"
    );
  });
})();
