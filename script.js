
/* HELMY PRESTIGE LUXURY
   Supabase inventory, owner/admin login and product management.
   Never place a service_role key in browser code.
*/
(() => {
  "use strict";

  const SUPABASE_URL = "https://fnftfpthzlgkfexnknaw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_wugH6rf-d6hXXQU2tkvWtg_YxdWz8OP";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

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
  const categoryFilter = $("#categoryFilter");
  const imageInput = $("#productImages");
  const imagePreview = $("#productImagePreview");

  if ($("#currentYear")) {
    $("#currentYear").textContent = new Date().getFullYear();
  }

  const demo = [
    {
      name: "RXP-X RS 2022",
      category: "jet_ski",
      price: 1150000,
      hours: 100,
      year: 2022,
      description: "Premium personal watercraft.",
      images: ["IMG_2815.jpeg", "IMG_2814.jpeg", "IMG_2813.jpeg"],
      status: "available"
    },
    {
      name: "RXT-X RS 2018",
      category: "jet_ski",
      price: 750000,
      hours: 85,
      year: 2018,
      description: "Premium personal watercraft.",
      images: ["IMG_2812.jpeg", "IMG_2811.jpeg"],
      status: "available"
    },
    {
      name: "RXP-X RS 2025",
      category: "jet_ski",
      price: 1250000,
      hours: 128,
      year: 2025,
      description: "Premium personal watercraft.",
      images: ["IMG_2809.jpeg", "IMG_2810.jpeg"],
      status: "available"
    },
    {
      name: "GTX Limited 2024",
      category: "jet_ski",
      price: 1050000,
      hours: 110,
      year: 2024,
      description: "Premium personal watercraft.",
      images: ["IMG_2721.jpeg", "IMG_2720.jpeg"],
      status: "available"
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
  let editingImages = [];
  let busy = false;
  let selectedCategory = "all";
  let demoMode = false;

  const msg = (element, text, type = "") => {
    if (!element) return;

    element.textContent = text;
    element.classList.remove("error", "success");

    if (type) element.classList.add(type);
  };

  const money = value => {
    return value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value))
      ? new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 0
        }).format(Number(value))
      : "Price on request";
  };

  const staff = () => role === "owner" || role === "admin";
  const owner = () => role === "owner";

  function node(tag, className = "", text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);

    return element;
  }

  function toggleBusy(button, isBusy, label = "PLEASE WAIT...") {
    if (!button) return;

    if (isBusy) {
      if (!button.dataset.oldText) {
        button.dataset.oldText = button.textContent;
      }

      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.oldText || button.textContent;
      button.disabled = false;
      delete button.dataset.oldText;
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

  $$(".staff-login-trigger").forEach(button => {
    button.addEventListener("click", openLogin);
  });

  $$(".admin-close").forEach(button => {
    button.addEventListener("click", closeLogin);
  });

  $(".admin-modal-backdrop")?.addEventListener("click", closeLogin);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeLogin();
    }
  });

  function validImage(source) {
    if (typeof source !== "string" || !source.trim()) return "";

    try {
      const url = new URL(source, location.href);

      if (!["https:", "http:"].includes(url.protocol)) return "";

      return url.href;
    } catch {
      return "";
    }
  }

  function formatCategory(category) {
    return categories[category] || "LUXURY COLLECTION";
  }

  function getVisibleProducts(list) {
    if (selectedCategory === "all") return list;

    return list.filter(product => {
      const category = product.category || "jet_ski";
      return category === selectedCategory;
    });
  }

  function renderPublic(list) {
    if (!publicList) return;

    publicList.replaceChildren();

    const visibleProducts = getVisibleProducts(list);

    if (!visibleProducts.length) {
      publicList.append(
        node(
          "p",
          "loading-copy",
          "No products in this category yet. Contact our team for availability."
        )
      );

      return;
    }

    visibleProducts.forEach(product => {
      const card = node("article", "public-product-card");
      const images = Array.isArray(product.images) ? product.images : [];
      const imageSource = validImage(images[0]);
      const category = product.category || "jet_ski";

      if (imageSource) {
        const image = node("img", "public-product-image");

        image.src = imageSource;
        image.alt = product.name || "Helmy Prestige Luxury product";
        image.loading = "lazy";

        image.onerror = () => {
          image.replaceWith(
            node(
              "div",
              "public-product-image-placeholder",
              "IMAGE NOT AVAILABLE"
            )
          );
        };

        card.append(image);
      } else {
        card.append(
          node(
            "div",
            "public-product-image-placeholder",
            "HELMY PRESTIGE"
          )
        );
      }

      const details = node("div", "public-product-details");

      details.append(
        node("p", "product-category-label", formatCategory(category))
      );

      details.append(
        node("h3", "", product.name || "Luxury Product")
      );

      const status = product.status || "available";

      details.append(
        node(
          "p",
          `product-status ${status}`,
          status === "sold_out" ? "SOLD OUT" : "AVAILABLE"
        )
      );

      const specs = node("div", "product-specifications");

      if (product.year != null && product.year !== "") {
        specs.append(
          node("span", "product-spec", `YEAR: ${product.year}`)
        );
      }

      if (category === "car" || category === "beach_buggy") {
        if (product.mileage != null && product.mileage !== "") {
          specs.append(
            node(
              "span",
              "product-spec",
              `MILEAGE: ${money(product.mileage)} KM`
            )
          );
        }

        if (product.horsepower != null && product.horsepower !== "") {
          specs.append(
            node(
              "span",
              "product-spec",
              `POWER: ${product.horsepower} HP`
            )
          );
        }
      }

      if (
        (category === "jet_ski" || category === "boat") &&
        product.hours != null &&
        product.hours !== ""
      ) {
        specs.append(
          node(
            "span",
            "product-spec",
            `ENGINE HOURS: ${product.hours}`
          )
        );
      }

      if (specs.childElementCount) {
        details.append(specs);
      }

      details.append(
        node("p", "product-price", `${money(product.price)} EGP`)
      );

      details.append(
        node(
          "p",
          "public-product-description",
          product.description || "Contact us for details and availability."
        )
      );

      const buyNow = node("a", "buy-now-button", "BUY NOW");

      const message =
        `Hello Helmy Prestige Luxury! I'm interested in ${product.name || "this product"}. ` +
        `Category: ${formatCategory(category)}. ` +
        `Price: ${money(product.price)} EGP.`;

      buyNow.href =
        "https://wa.me/201117000625?text=" +
        encodeURIComponent(message);

      buyNow.target = "_blank";
      buyNow.rel = "noopener noreferrer";

      details.append(buyNow);
      card.append(details);
      publicList.append(card);
    });
  }

  // Category filtering
  function setCategory(category) {
    const allowedCategories = ["all", ...Object.keys(categories)];

    if (!allowedCategories.includes(category)) {
      category = "all";
    }

    selectedCategory = category;

    $$(".category-button, #categoryFilter [data-category]").forEach(button => {
      const buttonCategory = button.dataset.category || "all";
      const active = buttonCategory === selectedCategory;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    renderPublic(demoMode ? demo : items);
  }

  // Use delegated clicks so category buttons continue working if the
  // buttons are changed or rebuilt after this script loads.
  document.addEventListener("click", event => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const button = target.closest(
      "#categoryFilter [data-category], .category-button[data-category]"
    );

    if (!button) return;

    event.preventDefault();

    setCategory(button.dataset.category || "all");
  });

  async function publicInventory() {
    if (!db) {
      demoMode = true;
      renderPublic(demo);
      msg(publicMsg, "Showing demonstration products.");
      return;
    }

    const { data, error } = await db
      .from("products")
      .select(
        "id,name,category,price,hours,year,mileage,horsepower,description,images,status,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Public inventory error:", error);

      renderPublic([]);
      msg(
        publicMsg,
        "Could not load products. Please check the database connection.",
        "error"
      );

      return;
    }

    items = data || [];
    demoMode = false;

    renderPublic(items);
    msg(publicMsg, "");
    setCategory(selectedCategory);
  }

  async function getProfile(userId) {
    const { data, error } = await db
      .from("profiles")
      .select("id,email,role")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data || !["owner", "admin"].includes(data.role)) {
      throw new Error("This account has no authorized staff role.");
    }

    return data;
  }

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
      console.error("Staff inventory error:", error);

      productList.replaceChildren(
        node(
          "p",
          "",
          "Unable to load products. Check database permissions and columns."
        )
      );

      return;
    }

    items = data || [];

    renderStaff();
    renderPublic(items);
    setCategory(selectedCategory);
  }

  function renderStaff() {
    if (!productList) return;

    productList.replaceChildren();

    if (!items.length) {
      productList.append(
        node("p", "", "No products in database yet.")
      );

      return;
    }

    items.forEach(product => {
      const card = node("article", "admin-product-item");
      const category = product.category || "jet_ski";

      card.append(node("h4", "", product.name || "Unnamed product"));

      card.append(
        node("p", "", `Category: ${formatCategory(category)}`)
      );

      card.append(
        node("p", "", `Price: ${money(product.price)} EGP`)
      );

      if (product.year != null) {
        card.append(node("p", "", `Year: ${product.year}`));
      }

      if (product.mileage != null) {
        card.append(
          node("p", "", `Mileage: ${money(product.mileage)} KM`)
        );
      }

      if (product.horsepower != null) {
        card.append(
          node("p", "", `Horsepower: ${product.horsepower} HP`)
        );
      }

      if (product.hours != null) {
        card.append(
          node("p", "", `Engine hours: ${product.hours}`)
        );
      }

      card.append(
        node("p", "", product.description || "No description")
      );

      card.append(
        node(
          "p",
          `product-status ${product.status || "available"}`,
          product.status === "sold_out" ? "SOLD OUT" : "AVAILABLE"
        )
      );

      const actions = node("div", "admin-product-item-actions");

      const editButton = node("button", "", "Edit");
      const deleteButton = node("button", "", "Delete");

      editButton.type = "button";
      deleteButton.type = "button";

      editButton.addEventListener("click", () => editProduct(product));

      deleteButton.addEventListener("click", () => {
        deleteProduct(product.id, product.name);
      });

      actions.append(editButton, deleteButton);
      card.append(actions);

      productList.append(card);
    });
  }

  async function showDashboard(profile) {
    const { data, error } = await db.auth.getUser();

    if (error) throw error;

    user = data.user;
    role = profile.role;

    if (!dashboard) return;

    dashboard.hidden = false;
    closeLogin();

    const emailElement = $("[data-staff-email]");
    const roleElement = $("[data-staff-role]");

    if (emailElement) {
      emailElement.textContent = profile.email || user?.email || "";
    }

    if (roleElement) {
      roleElement.textContent = role.toUpperCase();
    }

    $$(".owner-only").forEach(element => {
      element.hidden = !owner();
    });

    if (ownerPanel) ownerPanel.hidden = !owner();

    await loadProducts();
  }

  function showExistingImages(images) {
    if (!imagePreview) return;

    imagePreview.replaceChildren();

    (Array.isArray(images) ? images : []).forEach(source => {
      const url = validImage(source);

      if (!url) return;

      const image = node("img");
      image.src = url;
      image.alt = "Existing product image";
      image.style.width = "100px";
      image.style.height = "90px";
      image.style.objectFit = "cover";
      image.style.margin = "5px";

      imagePreview.append(image);
    });
  }

  function editProduct(product) {
    if (!productForm) return;

    editingId = product.id;

    editingImages = Array.isArray(product.images)
      ? [...product.images]
      : [];

    const values = {
      name: product.name ?? "",
      price: product.price ?? "",
      category: product.category || "jet_ski",
      year: product.year ?? "",
      mileage: product.mileage ?? "",
      horsepower: product.horsepower ?? "",
      hours: product.hours ?? "",
      description: product.description ?? "",
      status: product.status || "available"
    };

    for (const [name, value] of Object.entries(values)) {
      const field = productForm.elements.namedItem(name);

      if (field && field.type !== "file") {
        field.value = value;
      }
    }

    if (imageInput) imageInput.value = "";

    showExistingImages(editingImages);

    if (saveButton) {
      saveButton.textContent = "UPDATE PRODUCT";
    }

    msg(
      $(".admin-message", productForm),
      "Editing product. Existing images will be kept unless you upload replacements."
    );

    productForm.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  imageInput?.addEventListener("change", () => {
    if (!imagePreview) return;

    showExistingImages(editingImages);

    Array.from(imageInput.files || []).forEach(file => {
      if (!file.type.startsWith("image/")) return;

      const image = node("img");

      image.src = URL.createObjectURL(file);
      image.alt = file.name;
      image.style.width = "100px";
      image.style.height = "90px";
      image.style.objectFit = "cover";
      image.style.margin = "5px";

      imagePreview.append(image);
    });
  });

  async function uploadProductImages(existingImages = []) {
    const files = Array.from(imageInput?.files || []);
    const imageUrls = [...existingImages];

    if (files.length && !db) {
      throw new Error("The image database is not connected.");
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select image files only.");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Each image must be 10 MB or smaller.");
      }

      const extension =
        file.name
          .split(".")
          .pop()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";

      const path = `${crypto.randomUUID()}.${extension}`;

      const { error } = await db.storage
        .from("product-images")
        .upload(path, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) throw error;

      const { data } = db.storage
        .from("product-images")
        .getPublicUrl(path);

      if (data?.publicUrl) {
        imageUrls.push(data.publicUrl);
      }
    }

    return imageUrls;
  }

  function readProduct() {
    const name = productForm.elements.name.value.trim();
    const price = productForm.elements.price.value;
    const category = productForm.elements.category.value;
    const year = productForm.elements.year.value;
    const mileage = productForm.elements.mileage.value;
    const horsepower = productForm.elements.horsepower.value;
    const hours = productForm.elements.hours.value;
    const description = productForm.elements.description.value.trim();

    if (!name) {
      throw new Error("Enter a product name.");
    }

    if (price === "" || !Number.isFinite(+price) || +price < 0) {
      throw new Error("Enter a valid price.");
    }

    if (!Object.prototype.hasOwnProperty.call(categories, category)) {
      throw new Error("Choose a valid product category.");
    }

    const optionalNumber = (value, label) => {
      if (value === "") return null;

      const number = Number(value);

      if (!Number.isFinite(number) || number < 0) {
        throw new Error(`Enter a valid ${label}.`);
      }

      return number;
    };

    return {
      name,
      price: Number(price),
      category,
      year: optionalNumber(year, "year"),
      mileage: optionalNumber(mileage, "mileage"),
      horsepower: optionalNumber(horsepower, "horsepower"),
      hours: optionalNumber(hours, "engine hours"),
      description,
      images: [...editingImages]
    };
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

      product.status =
        $("#productStatus")?.value || "available";

      product.images = await uploadProductImages(product.images);

      const result = editingId
        ? await db
            .from("products")
            .update(product)
            .eq("id", editingId)
            .select()
            .single()
        : await db
            .from("products")
            .insert(product)
            .select()
            .single();

      if (result.error) throw result.error;

      editingId = null;
      editingImages = [];

      productForm.reset();

      if (imagePreview) imagePreview.replaceChildren();

      if (saveButton) {
        saveButton.textContent = "SAVE PRODUCT";
      }

      msg(statusMessage, "Product saved successfully.", "success");

      await loadProducts();
    } catch (error) {
      console.error("Save product error:", error);

      msg(
        statusMessage,
        error.message || "Could not save product.",
        "error"
      );
    } finally {
      busy = false;
      toggleBusy(saveButton, false);
    }
  });

  async function deleteProduct(id, name) {
    if (
      !staff() ||
      busy ||
      !confirm(`Delete "${name}"? This cannot be undone.`)
    ) {
      return;
    }

    busy = true;

    try {
      const { error } = await db
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadProducts();
    } catch (error) {
      console.error("Delete product error:", error);

      alert(error.message || "Could not delete product.");
    } finally {
      busy = false;
    }
  }

  $$("[data-cancel-product]").forEach(button => {
    button.addEventListener("click", () => {
      editingId = null;
      editingImages = [];

      productForm?.reset();

      if (imagePreview) imagePreview.replaceChildren();

      if (saveButton) {
        saveButton.textContent = "SAVE PRODUCT";
      }

      msg($(".admin-message", productForm), "");
    });
  });

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!db) {
      msg(
        $(".admin-message", loginForm),
        "Supabase is not connected. Check your configuration.",
        "error"
      );

      return;
    }

    if (busy) return;

    busy = true;

    const loginButton = $("#staffLoginSubmit");

    toggleBusy(loginButton, true, "SIGNING IN...");

    try {
      const { data, error } = await db.auth.signInWithPassword({
        email: loginForm.elements.email.value.trim(),
        password: loginForm.elements.password.value
      });

      if (error) throw error;

      const profile = await getProfile(data.user.id);

      await showDashboard(profile);

      msg($(".admin-message", loginForm), "");
    } catch (error) {
      console.error("Login error:", error);

      await db.auth.signOut();

      msg(
        $(".admin-message", loginForm),
        error.message || "Sign-in failed.",
        "error"
      );
    } finally {
      busy = false;
      toggleBusy(loginButton, false);
    }
  });

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

    if (imagePreview) imagePreview.replaceChildren();

    openLogin();
  }

  $$("[data-staff-logout]").forEach(button => {
    button.addEventListener("click", logout);
  });

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
      msg(
        status,
        "Use a password with at least 12 characters.",
        "error"
      );

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

      msg(status, "Admin account created successfully.", "success");
    } catch (error) {
      console.error("Create admin error:", error);

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

  async function init() {
    if (dashboard) dashboard.hidden = true;
    if (ownerPanel) ownerPanel.hidden = true;

    if (
      SUPABASE_URL.startsWith("YOUR_") ||
      SUPABASE_KEY.startsWith("YOUR_") ||
      !window.supabase
    ) {
      demoMode = true;
      renderPublic(demo);
      setCategory("all");

      msg(
        publicMsg,
        "Demo inventory. Supabase is not connected."
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

    const {
      data: { session },
      error: sessionError
    } = await db.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
    }

    if (session?.user) {
      try {
        const profile = await getProfile(session.user.id);
        await showDashboard(profile);
      } catch (error) {
        console.error("Restore session error:", error);
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
            const profile = await getProfile(session.user.id);
            await showDashboard(profile);
          } catch (error) {
            console.error("Auth state error:", error);
            await db.auth.signOut();
          }
        }, 0);
      }
    });
  }

  init().catch(error => {
    console.error("Initialization error:", error);

    if (!items.length) {
      demoMode = true;
      renderPublic(demo);
      setCategory("all");
    }

    msg(
      publicMsg,
      "Could not initialize the live inventory. Check Supabase and database columns.",
      "error"
    );
  });
})();
