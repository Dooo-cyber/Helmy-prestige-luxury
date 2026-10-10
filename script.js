/* HELMY PRESTIGE LUXURY — Supabase inventory, staff login and product gallery */
(() => {
  "use strict";
  const SUPABASE_URL = "https://fnftfpthzlgkfexnknaw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_wugH6rf-d6hXXQU2tkvWtg_YxdWz8OP";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const publicList = $("#publicProductList");
  const publicMsg = $("#publicInventoryMessage");
  const loginModal = $("#staffLoginModal");
  const loginForm = $("#staffLoginForm");
  const dashboard = $("#staffDashboard");
  const productForm = $("#adminProductForm");
  const productList = $(".admin-product-list");
  const saveButton = $("#adminSaveProduct");
  const createAdminForm = $("#ownerCreateAdminForm");
  const ownerPanel = $("#ownerManagementPanel");
  const imagePicker = $("#productImageFiles");
  const imagePreview = $("#imageUploadPreview");
  const demo = [
    {
      name: "RXP-X RS 2022", category: "jet_ski", year: 2022,
      price: 1150000, hours: 100,
      description: "Premium personal watercraft.",
      images: ["IMG_2815.jpeg", "IMG_2814.jpeg", "IMG_2813.jpeg"]
    },
    {
      name: "RXT-X RS 2018", category: "jet_ski", year: 2018,
      price: 750000, hours: 85,
      description: "Premium personal watercraft.",
      images: ["IMG_2812.jpeg", "IMG_2811.jpeg"]
    },
    {
      name: "RXP-X RS 2025", category: "jet_ski", year: 2025,
      price: 1250000, hours: 128,
      description: "Premium personal watercraft.",
      images: ["IMG_2809.jpeg", "IMG_2810.jpeg"]
    },
    {
      name: "GTX Limited 2024", category: "jet_ski", year: 2024,
      price: 1050000, hours: 110,
      description: "Premium personal watercraft.",
      images: ["IMG_2721.jpeg", "IMG_2720.jpeg"]
    }
  ];
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
  let busy = false;
  let selectedCategory = "all";
  let demoMode = false;
  $("#currentYear")?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));
  function node(tag, className = "", text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function msg(element, text, type = "") {
    if (!element) return;
    element.textContent = text;
    element.classList.remove("error", "success");
    if (type) element.classList.add(type);
  }
  function money(value) {
    const number = Number(value);
    return Number.isFinite(number)
      ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number)
      : "Price on request";
  }
  function staff() {
    return role === "owner" || role === "admin";
  }
  function owner() {
    return role === "owner";
  }
  function normalizeCategory(value) {
    const key = String(value || "all").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const aliases = {
      all: "all",
      car: "car", cars: "car",
      beach_buggy: "beach_buggy", beach_buggies: "beach_buggy",
      buggy: "beach_buggy", buggies: "beach_buggy",
      jet_ski: "jet_ski", jet_skis: "jet_ski",
      jetski: "jet_ski", jetskis: "jet_ski",
      boat: "boat", boats: "boat"
    };
    return aliases[key] || "all";
  }
  function productImages(product) {
    if (Array.isArray(product?.images)) return product.images;
    if (typeof product?.images === "string") {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
      return product.images.split(/\n+/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  }
  function validImage(source) {
    try {
      const url = new URL(source, location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }
  function toggleBusy(button, active, label = "PLEASE WAIT...") {
    if (!button) return;
    if (active) {
      if (!button.dataset.oldText) button.dataset.oldText = button.textContent;
      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.oldText || button.textContent;
      button.disabled = false;
    }
  }
  /* Intro screen: button works independently from Supabase. */
  function enterShowroom() {
    const screen = $("#introScreen");
    if (!screen || screen.hidden) return;
    screen.classList.add("intro-exit");
    screen.setAttribute("aria-hidden", "true");
    document.body.classList.add("showroom-entered");
    window.setTimeout(() => { screen.hidden = true; }, 650);
  }
  $("#enterShowroom")?.addEventListener("click", event => {
    event.preventDefault();
    enterShowroom();
  });
  /* Mobile navigation */
  const menuButton = $("#mobileMenuToggle");
  const mainNav = $("#mainNav");
  menuButton?.addEventListener("click", () => {
    const opened = mainNav?.classList.toggle("nav-open") || false;
    menuButton.setAttribute("aria-expanded", String(opened));
  });
  $$("#mainNav a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav?.classList.remove("nav-open");
      menuButton?.setAttribute("aria-expanded", "false");
    });
  });
  /* Login modal */
  function openLogin() {
    if (!loginModal) return;
    loginModal.hidden = false;
    document.body.classList.add("staff-login-open");
    $("#staffEmail")?.focus();
  }
  function closeLogin() {
    if (loginModal) loginModal.hidden = true;
    document.body.classList.remove("staff-login-open");
  }
  $$(".staff-login-trigger").forEach(button => button.addEventListener("click", openLogin));
  $$(".admin-close, [data-close-login]").forEach(button => {
    button.addEventListener("click", closeLogin);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeLogin();
      closeProductDetails();
    }
  });
  function whatsappUrl(product) {
    const message = `Hello, I'm interested in ${product.name || "this product"}. Please confirm the price and availability.`;
    return `https://wa.me/201117000625?text=${encodeURIComponent(message)}`;
  }
  function isSoldOut(product) {
    return String(product.status || "available").toLowerCase() === "sold_out"
      || Number(product.quantity) === 0;
  }
  /* Category filters */
  function setCategory(value) {
    selectedCategory = normalizeCategory(value);
    $$(".category-filters [data-category]").forEach(button => {
      const active = normalizeCategory(button.dataset.category) === selectedCategory;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderPublic(demoMode ? demo : items);
  }
  $$(".category-filters [data-category]").forEach(button => {
    button.addEventListener("click", () => setCategory(button.dataset.category));
  });
  /* Product details modal and multi-image gallery */
  function showProductDetails(product) {
    const modal = $("#productDetailsModal");
    const gallery = $("#detailsGallery");
    const info = $("#detailsInfo");
    if (!modal || !gallery || !info) return;
    gallery.replaceChildren();
    info.replaceChildren();
    const images = productImages(product).map(validImage).filter(Boolean);
    let index = 0;
    const mainImage = node("img", "details-main-image");
    mainImage.alt = product.name || "Product image";
    if (images.length) {
      mainImage.src = images[0];
    } else {
      mainImage.alt = "No product image available";
      mainImage.style.minHeight = "220px";
    }
    const thumbnails = node("div", "gallery-thumbnails");
    const zoomButton = node("button", "gallery-zoom", "⤢ ZOOM");
    zoomButton.type = "button";
    function updateImage() {
      if (images.length) mainImage.src = images[index];
      $$(".gallery-thumbnails img", gallery).forEach((image, i) => {
        image.classList.toggle("selected", i === index);
      });
    }
    mainImage.addEventListener("click", () => mainImage.classList.toggle("zoomed"));
    zoomButton.addEventListener("click", () => mainImage.classList.toggle("zoomed"));
    if (images.length > 1) {
      const controls = node("div", "gallery-controls");
      const previous = node("button", "", "‹ PREVIOUS");
      const next = node("button", "", "NEXT ›");
      previous.type = next.type = "button";
      previous.addEventListener("click", () => {
        index = (index + images.length - 1) % images.length;
        mainImage.classList.remove("zoomed");
        updateImage();
      });
      next.addEventListener("click", () => {
        index = (index + 1) % images.length;
        mainImage.classList.remove("zoomed");
        updateImage();
      });
      images.forEach((source, i) => {
        const image = node("img");
        image.src = source;
        image.alt = `${product.name || "Product"} view ${i + 1}`;
        image.addEventListener("click", () => {
          index = i;
          mainImage.classList.remove("zoomed");
          updateImage();
        });
        thumbnails.append(image);
      });
      controls.append(previous, next);
      gallery.append(mainImage, zoomButton, controls, thumbnails);
      updateImage();
    } else {
      gallery.append(mainImage, zoomButton);
    }
    const sold = isSoldOut(product);
    info.append(
      node("p", "eyebrow", categories[normalizeCategory(product.category)] || "PREMIUM INVENTORY"),
      node("h2", "", product.name || "Product"),
      node("p", "details-price", `${money(product.price)} EGP`),
      node("span", `details-status${sold ? " sold-out" : ""}`, sold ? "● SOLD OUT" : "● AVAILABLE"),
      node("p", "", product.description || "Contact our team for more details.")
    );
    const specs = node("div", "details-specs");
    [
      ["Category", categories[normalizeCategory(product.category)] || "Premium"],
      ["Year", product.year],
      ["Engine hours", product.hours],
      ["Mileage", product.mileage != null && product.mileage !== "" ? `${product.mileage} km` : null],
      ["Horsepower", product.horsepower != null && product.horsepower !== "" ? `${product.horsepower} HP` : null]
    ].forEach(([label, value]) => {
      if (value === null || value === undefined || value === "") return;
      const cell = node("div");
      cell.append(node("span", "", label), node("strong", "", value));
      specs.append(cell);
    });
    if (specs.childElementCount) info.append(specs);
    const quantity = Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : 1;
    info.append(node("p", "details-quantity", `Available quantity: ${quantity}`));
    const buy = node("a", "button details-buy", sold ? "CURRENTLY SOLD OUT" : "BUY NOW ↗");
    if (sold) {
      buy.href = "#";
      buy.setAttribute("aria-disabled", "true");
      buy.addEventListener("click", event => event.preventDefault());
    } else {
      buy.href = whatsappUrl(product);
      buy.target = "_blank";
      buy.rel = "noopener noreferrer";
    }
    info.append(buy);
    modal.hidden = false;
    document.body.classList.add("product-details-open");
  }
  function closeProductDetails() {
    const modal = $("#productDetailsModal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("product-details-open");
  }
  document.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("[data-close-details]")) {
      closeProductDetails();
    }
  });
  function visibleProducts(list) {
    return selectedCategory === "all"
      ? list
      : list.filter(product => normalizeCategory(product.category || "jet_ski") === selectedCategory);
  }
  /* Public product cards */
  function renderPublic(list) {
    if (!publicList) return;
    const filtered = visibleProducts(Array.isArray(list) ? list : []);
    publicList.replaceChildren();
    if (!filtered.length) {
      publicList.append(node("p", "loading-copy",
        "No products in this category yet. Contact our team for availability."));
      return;
    }
    filtered.forEach(product => {
      const card = node("article", "public-product-card");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `View ${product.name || "product"} details`);
      const images = productImages(product);
      const imageUrl = validImage(images[0]);
      if (imageUrl) {
        const image = node("img", "public-product-image");
        image.src = imageUrl;
        image.alt = product.name || "Product";
        image.loading = "lazy";
        image.onerror = () => image.replaceWith(node("div", "public-product-image-placeholder", "IMAGE UNAVAILABLE"));
        card.append(image);
      } else {
        card.append(node("div", "public-product-image-placeholder", "HELMY PRESTIGE"));
      }
      const details = node("div", "public-product-details");
      details.append(
        node("p", "product-meta", categories[normalizeCategory(product.category)] || "PREMIUM INVENTORY"),
        node("h3", "", product.name || "Product")
      );
      const specs = [];
      if (product.year) specs.push(`Year: ${product.year}`);
      if (product.mileage != null && product.mileage !== "") specs.push(`Mileage: ${money(product.mileage)} km`);
      if (product.horsepower != null && product.horsepower !== "") specs.push(`${product.horsepower} HP`);
      if (product.hours != null && product.hours !== "") specs.push(`${product.hours} engine hours`);
      if (specs.length) details.append(node("p", "product-meta", specs.join(" · ")));
      const sold = isSoldOut(product);
      details.append(
        node("p", "product-price", `${money(product.price)} EGP`),
        node("span", `product-status${sold ? " sold-out" : ""}`, sold ? "SOLD OUT" : "AVAILABLE"),
        node("p", "product-meta", `Quantity: ${Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : 1}`),
        node("p", "public-product-description", product.description || "Contact us for details and availability.")
      );
      const viewButton = node("button", "btn btn-secondary", "VIEW DETAILS");
      viewButton.type = "button";
      viewButton.addEventListener("click", event => {
        event.stopPropagation();
        showProductDetails(product);
      });
      const buyButton = node("a", `btn btn-primary${sold ? " is-disabled" : ""}`, sold ? "SOLD OUT" : "BUY NOW ↗");
      buyButton.href = sold ? "#" : whatsappUrl(product);
      if (sold) {
        buyButton.setAttribute("aria-disabled", "true");
        buyButton.addEventListener("click", event => event.preventDefault());
      } else {
        buyButton.target = "_blank";
        buyButton.rel = "noopener noreferrer";
      }
      buyButton.addEventListener("click", event => event.stopPropagation());
      details.append(viewButton, buyButton);
      card.append(details);
      card.addEventListener("click", () => showProductDetails(product));
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showProductDetails(product);
        }
      });
      publicList.append(card);
    });
  }
  /* Load products. If live loading fails, show demo items without hiding the site. */
  async function publicInventory() {
    if (!db) {
      demoMode = true;
      renderPublic(demo);
      msg(publicMsg, "Demo inventory is shown. Check Supabase configuration for live products.");
      return;
    }
    const { data, error } = await db.from("products")
      .select("id,name,price,hours,description,images,category,year,mileage,horsepower,status,quantity")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Inventory load error:", error);
      demoMode = true;
      renderPublic(demo);
      msg(publicMsg, "Live inventory could not be loaded. Showing demo items.");
      return;
    }
    demoMode = false;
    items = data || [];
    renderPublic(items);
    msg(publicMsg, items.length ? "" : "No products have been added yet.");
  }
  async function profile(id) {
    const { data, error } = await db.from("profiles")
      .select("id,email,role").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data || !["owner", "admin"].includes(data.role)) {
      throw new Error("This account has no authorized staff role in profiles.");
    }
    return data;
  }
  async function loadProducts() {
    if (!staff() || !productList) return;
    productList.replaceChildren(node("p", "", "Loading inventory..."));
    const { data, error } = await db.from("products")
      .select("*").order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      productList.replaceChildren(node("p", "", "Unable to load products. Check database permissions."));
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
        node("p", "", `Availability: ${isSoldOut(product) ? "Sold out" : "Available"}`),
        node("p", "", `Quantity: ${product.quantity ?? 1}`),
        node("p", "", product.description || "No description")
      );
      const actions = node("div", "admin-product-item-actions");
      const edit = node("button", "", "EDIT");
      const remove = node("button", "", "DELETE");
      edit.type = remove.type = "button";
      edit.addEventListener("click", () => editProduct(product));
      remove.addEventListener("click", () => deleteProduct(product.id, product.name));
      actions.append(edit, remove);
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
    $$(".owner-only").forEach(element => { element.hidden = !owner(); });
    if (ownerPanel) ownerPanel.hidden = !owner();
    await loadProducts();
    dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function editProduct(product) {
    editingId = product.id;
    const values = {
      name: product.name,
      price: product.price,
      hours: product.hours ?? "",
      description: product.description || "",
      images: productImages(product).join("\n"),
      category: product.category || "jet_ski",
      year: product.year ?? "",
      mileage: product.mileage ?? "",
      horsepower: product.horsepower ?? "",
      status: product.status || "available",
      quantity: product.quantity ?? 1
    };
    Object.entries(values).forEach(([name, value]) => {
      const field = productForm.elements.namedItem(name);
      if (field) field.value = value ?? "";
    });
    if (imagePicker) imagePicker.value = "";
    if (imagePreview) imagePreview.replaceChildren();
    saveButton.textContent = "UPDATE PRODUCT";
    msg($(".admin-message", productForm), "Editing product.");
    productForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function readProduct() {
    const field = name => productForm.elements.namedItem(name);
    const name = field("name")?.value.trim() || "";
    const price = field("price")?.value ?? "";
    const hours = field("hours")?.value ?? "";
    const description = field("description")?.value.trim() || "";
    const imageText = field("images")?.value.trim() || "";
    const status = field("status")?.value || "available";
    const quantity = field("quantity")?.value ?? "1";
    if (!name) throw new Error("Enter a product name.");
    if (price === "" || !Number.isFinite(+price) || +price < 0) {
      throw new Error("Enter a valid price.");
    }
    if (hours !== "" && (!Number.isFinite(+hours) || +hours < 0)) {
      throw new Error("Enter valid engine hours.");
    }
    if (quantity === "" || !Number.isInteger(+quantity) || +quantity < 0) {
      throw new Error("Quantity must be a whole number of zero or more.");
    }
    const images = imageText
      ? imageText.split(/\n+/).map(source => source.trim()).filter(Boolean)
      : [];
    images.forEach(source => {
      let url;
      try { url = new URL(source); }
      catch (_) { throw new Error("Every image URL must be valid."); }
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Image URLs must use HTTP or HTTPS.");
      }
    });
    const optionalNumber = name => {
      const value = field(name)?.value ?? "";
      if (value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? number : null;
    };
    return {
      name,
      price: Number(price),
      hours: hours === "" ? null : Number(hours),
      description,
      images,
      category: normalizeCategory(field("category")?.value || "jet_ski"),
      year: optionalNumber("year"),
      mileage: optionalNumber("mileage"),
      horsepower: optionalNumber("horsepower"),
      status,
      quantity: Number(quantity)
    };
  }
  imagePicker?.addEventListener("change", () => {
    if (!imagePreview) return;
    imagePreview.replaceChildren();
    [...(imagePicker.files || [])].forEach(file => {
      const image = node("img");
      image.alt = file.name;
      image.src = URL.createObjectURL(file);
      imagePreview.append(image);
    });
  });
  async function uploadSelectedImages() {
    const files = [...(imagePicker?.files || [])];
    if (!files.length) return [];
    if (!db?.storage) throw new Error("Supabase Storage is unavailable.");
    const uploaded = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw new Error("Choose image files only.");
      }
      if (file.size > 12 * 1024 * 1024) {
        throw new Error(`${file.name} is larger than 12 MB.`);
      }
      const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-");
      const path = `products/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error } = await db.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });
      if (error) {
        throw new Error(`Image upload failed: ${error.message}. Check the bucket and Storage INSERT policy.`);
      }
      const { data } = db.storage.from("product-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    return uploaded;
  }
  productForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!staff() || busy) return;
    busy = true;
    toggleBusy(saveButton, true, "SAVING...");
    const statusMessage = $(".admin-message", productForm);
    msg(statusMessage, "");
    try {
      const product = readProduct();
      const uploaded = await uploadSelectedImages();
      if (uploaded.length) product.images = [...product.images, ...uploaded];
      const result = editingId
        ? await db.from("products").update(product).eq("id", editingId).select().single()
        : await db.from("products").insert(product).select().single();
      if (result.error) throw result.error;
      editingId = null;
      productForm.reset();
      if (imagePreview) imagePreview.replaceChildren();
      if (imagePicker) imagePicker.value = "";
      saveButton.textContent = "SAVE PRODUCT";
      msg(statusMessage, "Product saved successfully.", "success");
      await loadProducts();
    } catch (error) {
      console.error(error);
      msg(statusMessage, error.message || "Could not save product.", "error");
    } finally {
      busy = false;
      toggleBusy(saveButton, false);
    }
  });
  async function deleteProduct(id, name) {
    if (!staff() || busy || !confirm(`Delete "${name}"? This cannot be undone.`)) return;
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
      if (imagePreview) imagePreview.replaceChildren();
      if (imagePicker) imagePicker.value = "";
      saveButton.textContent = "SAVE PRODUCT";
      msg($(".admin-message", productForm), "");
    });
  });
  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!db) {
      msg($(".admin-message", loginForm), "Supabase did not initialize. Refresh and try again.", "error");
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
      loginForm.reset();
    } catch (error) {
      console.error(error);
      msg($(".admin-message", loginForm), error.message || "Sign-in failed.", "error");
    } finally {
      busy = false;
      toggleBusy($("#staffLoginSubmit"), false);
    }
  });
  async function logout() {
    if (!db) return;
    const { error } = await db.auth.signOut();
    if (error) {
      alert(error.message || "Could not sign out.");
      return;
    }
    user = null;
    role = null;
    items = [];
    dashboard.hidden = true;
    openLogin();
  }
  $$("[data-staff-logout]").forEach(button => button.addEventListener("click", logout));
  createAdminForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const statusMessage = $(".admin-message", createAdminForm);
    if (!owner()) {
      msg(statusMessage, "Only the Owner can create Admin accounts.", "error");
      return;
    }
    if (busy) return;
    const email = createAdminForm.elements.email.value.trim();
    const password = createAdminForm.elements.password.value;
    if (password.length < 12) {
      msg(statusMessage, "Use a password with at least 12 characters.", "error");
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
      if (data?.error) throw new Error(data.error);
      createAdminForm.reset();
      msg(statusMessage, "Admin account created successfully.", "success");
    } catch (error) {
      console.error(error);
      msg(statusMessage, error.message || "Could not create Admin. Check Edge Function setup.", "error");
    } finally {
      busy = false;
      toggleBusy(button, false);
    }
  });
  /* Initialization */
  async function init() {
    if (dashboard) dashboard.hidden = true;
    if (ownerPanel) ownerPanel.hidden = true;
    if (!window.supabase) {
      renderPublic(demo);
      demoMode = true;
      msg(publicMsg, "Supabase library could not load. Showing demo inventory.");
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
    const { data, error } = await db.auth.getSession();
    if (error) console.error("Session check:", error);
    if (data?.session?.user) {
      try {
        await showDashboard(await profile(data.session.user.id));
      } catch (error) {
        console.error("Staff profile check:", error);
      }
    }
    db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        user = null;
        role = null;
        if (dashboard) dashboard.hidden = true;
      } else if (event === "SIGNED_IN" && session?.user) {
        window.setTimeout(async () => {
          try {
            await showDashboard(await profile(session.user.id));
          } catch (error) {
            console.error("Staff login profile:", error);
          }
        }, 0);
      }
    });
  }
  init().catch(error => {
    console.error("Site initialization error:", error);
    demoMode = true;
    renderPublic(demo);
    msg(publicMsg, "Live inventory could not load. The showroom is still available.");
  });
})();
