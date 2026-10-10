/* HELMY PRESTIGE LUXURY — COMPLETE SCRIPT
   Never place a Supabase service_role key in browser JavaScript.
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
      status: "available",
      quantity: 1,
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
      status: "available",
      quantity: 1,
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
      status: "available",
      quantity: 1,
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
      status: "available",
      quantity: 1,
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
      : list.filter(product =>
          normalizeCategory(product.category || "jet_ski") === selectedCategory
        );
  }

  function setCategory(value) {
    selectedCategory = normalizeCategory(value);

    $$(".category-filters [data-category], [data-filter], .category-button")
      .forEach(button => {
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
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest(
      ".category-filters [data-category], " +
      "#categoryFilter button, " +
      "#categoryFilter [data-category], " +
      "#categoryFilter [data-filter], " +
      ".category-button[data-category]"
    );

    if (!button) return;

    event.preventDefault();

    setCategory(
      button.dataset.category ||
      button.dataset.filter ||
      button.value ||
      button.textContent
    );
  });

  function msg(element, text, type = "") {
    if (!element) return;

    element.textContent = text;
    element.classList.remove("error", "success");

    if (type) element.classList.add(type);
  }

  const money = value =>
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
      ? new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 0
        }).format(Number(value))
      : "Price on request";

  const staff = () => role === "owner" || role === "admin";
  const owner = () => role === "owner";

  function node(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);

    return element;
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

    if (event.key === "Escape") {
      closeProductDetails();
    }
  });

  function validImage(source) {
    try {
      const url = new URL(source, location.href);

      return ["https:", "http:"].includes(url.protocol)
        ? url.href
        : "";
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

  function isSoldOut(product) {
    const status = String(product.status || "available")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    return status === "sold_out" ||
      Number(product.quantity) === 0;
  }

  /* BUY NOW opens WhatsApp directly — no arrow icon. */
  function whatsappUrl(product) {
    const text =
      `Hello, I am interested in ${product.name || "this product"}. ` +
      `Price: ${money(product.price)} EGP. ` +
      "Please confirm availability.";

    return `https://wa.me/201117000625?text=${encodeURIComponent(text)}`;
  }

  function makeBuyButton(product, className = "button", label = "BUY NOW") {
    const buy = node("a", className, label);

    if (isSoldOut(product)) {
      buy.href = "#";
      buy.setAttribute("aria-disabled", "true");
      buy.classList.add("is-disabled");

      buy.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
      });
    } else {
      buy.href = whatsappUrl(product);
      buy.target = "_blank";
      buy.rel = "noopener noreferrer";
    }

    return buy;
  }

  /* PRODUCT DETAILS + GALLERY */
  function showProductDetails(product) {
    const detailsModal = $("#productDetailsModal");
    const gallery = $("#detailsGallery");
    const info = $("#detailsInfo");

    if (!detailsModal || !gallery || !info) return;

    gallery.replaceChildren();
    info.replaceChildren();

    const images = productImages(product)
      .map(validImage)
      .filter(Boolean);

    let index = 0;

    const main = node("img", "details-main-image");
    main.alt = product.name || "Product image";
    main.decoding = "async";

    if (images.length) {
      main.src = images[0];
    } else {
      main.alt = "No product image available";
      main.classList.add("no-image");
    }

    main.addEventListener("error", () => {
      main.classList.add("no-image");
    }, { once: true });

    const zoom = node("button", "gallery-zoom", "⤢ ZOOM");
    zoom.type = "button";
    zoom.setAttribute("aria-label", "Zoom product image");

    const thumbs = node("div", "gallery-thumbnails");

    function updateImage() {
      if (images.length) {
        main.src = images[index];
        main.alt = `${product.name || "Product"} — image ${index + 1}`;
      }

      thumbs.querySelectorAll("img").forEach((image, imageIndex) => {
        image.classList.toggle("selected", imageIndex === index);
      });
    }

    function changeImage(direction) {
      if (images.length < 2) return;

      index = (index + direction + images.length) % images.length;
      main.classList.remove("zoomed");
      updateImage();
    }

    main.addEventListener("click", () => {
      main.classList.toggle("zoomed");
    });

    zoom.addEventListener("click", () => {
      main.classList.toggle("zoomed");
    });

    /* Touch swipe */
    let startX = null;
    let startY = null;

    main.addEventListener("pointerdown", event => {
      startX = event.clientX;
      startY = event.clientY;
    });

    main.addEventListener("pointerup", event => {
      if (startX === null || images.length < 2) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      startX = null;
      startY = null;

      if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
        changeImage(deltaX < 0 ? 1 : -1);
      }
    });

    gallery.append(main, zoom);

    if (images.length > 1) {
      const controls = node("div", "gallery-controls");

      const previous = node("button", "", "‹  PREVIOUS VIEW");
      const next = node("button", "", "NEXT VIEW  ›");

      previous.type = "button";
      next.type = "button";

      previous.setAttribute("aria-label", "Previous product image");
      next.setAttribute("aria-label", "Next product image");

      previous.addEventListener("click", () => changeImage(-1));
      next.addEventListener("click", () => changeImage(1));

      controls.append(previous, next);
      gallery.append(controls);

      images.forEach((source, imageIndex) => {
        const thumbnail = node("img", "details-thumbnail");

        thumbnail.src = source;
        thumbnail.alt = `${product.name || "Product"} angle ${imageIndex + 1}`;
        thumbnail.loading = "lazy";
        thumbnail.decoding = "async";

        thumbnail.addEventListener("error", () => {
          thumbnail.hidden = true;
        }, { once: true });

        thumbnail.addEventListener("click", () => {
          index = imageIndex;
          main.classList.remove("zoomed");
          updateImage();
        });

        thumbs.append(thumbnail);
      });

      gallery.append(thumbs);
      updateImage();
    }

    const sold = isSoldOut(product);

    const category = categories[normalizeCategory(product.category)] ||
      "PREMIUM INVENTORY";

    info.append(
      node("p", "eyebrow", category),
      node("h2", "", product.name || "Product"),
      node("p", "details-price", `${money(product.price)} EGP`),
      node(
        "span",
        `details-status${sold ? " sold-out" : ""}`,
        sold ? "● SOLD OUT" : "● AVAILABLE"
      ),
      node(
        "p",
        "",
        product.description ||
          "Contact our team for full details and availability."
      )
    );

    const specs = node("div", "details-specs");

    [
      ["Category", category],
      ["Year", product.year],
      ["Engine hours", product.hours],
      [
        "Mileage",
        product.mileage != null && product.mileage !== ""
          ? `${product.mileage} km`
          : null
      ],
      [
        "Horsepower",
        product.horsepower
          ? `${product.horsepower} HP`
          : null
      ]
    ].forEach(([label, value]) => {
      if (value === null || value === undefined || value === "") return;

      const cell = node("div");
      cell.append(
        node("span", "", label),
        node("strong", "", value)
      );

      specs.append(cell);
    });

    if (specs.childElementCount) info.append(specs);

    const quantity = Number.isFinite(Number(product.quantity))
      ? Math.max(0, Number(product.quantity))
      : 1;

    info.append(
      node("p", "details-quantity", `Available quantity: ${quantity}`)
    );

    const buy = makeBuyButton(
      product,
      "button details-buy",
      sold ? "CURRENTLY SOLD OUT" : "BUY NOW"
    );

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
    if (
      event.target instanceof Element &&
      event.target.closest("[data-close-details]")
    ) {
      closeProductDetails();
    }
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

    filtered.forEach((product, productIndex) => {
      const card = node("article", "public-product-card");

      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute(
        "aria-label",
        `View details for ${product.name || "product"}`
      );

      const images = productImages(product);
      const source = validImage(images[0]);

      if (source) {
        const image = node("img", "public-product-image");

        image.src = source;
        image.alt = product.name || "Product";
        image.loading = productIndex < 2 ? "eager" : "lazy";
        image.decoding = "async";

        if (productIndex < 2) {
          image.fetchPriority = "high";
        }

        image.addEventListener("error", () => {
          image.replaceWith(
            node(
              "div",
              "public-product-image-placeholder",
              "IMAGE NOT AVAILABLE"
            )
          );
        }, { once: true });

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
        node(
          "p",
          "product-meta",
          categories[normalizeCategory(product.category)] ||
            "PREMIUM INVENTORY"
        ),
        node("h3", "", product.name || "Product")
      );

      const specs = [];

      if (product.year) specs.push(`Year: ${product.year}`);

      if (product.mileage != null && product.mileage !== "") {
        specs.push(`Mileage: ${money(product.mileage)} km`);
      }

      if (product.horsepower != null && product.horsepower !== "") {
        specs.push(`${product.horsepower} HP`);
      }

      if (product.hours != null && product.hours !== "") {
        specs.push(`${product.hours} engine hours`);
      }

      if (specs.length) {
        details.append(
          node("p", "product-meta", specs.join(" · "))
        );
      }

      details.append(
        node("p", "product-price", `${money(product.price)} EGP`)
      );

      const sold = isSoldOut(product);

      details.append(
        node(
          "span",
          `product-status${sold ? " sold-out" : ""}`,
          sold ? "SOLD OUT" : "AVAILABLE"
        ),
        node(
          "p",
          "product-quantity",
          `Quantity: ${
            Number.isFinite(Number(product.quantity))
              ? Number(product.quantity)
              : 1
          }`
        ),
        node(
          "p",
          "public-product-description",
          product.description || "Contact us for details and availability."
        )
      );

      const view = node("button", "button", "VIEW DETAILS");
      view.type = "button";

      view.addEventListener("click", event => {
        event.stopPropagation();
        showProductDetails(product);
      });

      const buy = makeBuyButton(
        product,
        "button product-card-buy",
        sold ? "SOLD OUT" : "BUY NOW"
      );

      buy.addEventListener("click", event => {
        event.stopPropagation();
      });

      details.append(view, buy);
      card.append(details);

      card.addEventListener("click", () => {
        showProductDetails(product);
      });

      card.addEventListener("keydown", event => {
        if (event.target !== card) return;

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showProductDetails(product);
        }
      });

      publicList.append(card);
    });
  }

  /* LOAD PUBLIC INVENTORY */
  async function publicInventory() {
    if (!db) {
      demoMode = true;
      renderPublic(demo);
      msg(publicMsg, "Demo inventory is shown.");
      return;
    }

    const { data, error } = await db
      .from("products")
      .select(
        "id,name,price,hours,description,images,category,year,mileage,horsepower,status,quantity"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Public inventory error:", error);

      demoMode = true;
      renderPublic(demo);

      msg(
        publicMsg,
        "Showing demo inventory because live inventory could not be loaded."
      );

      return;
    }

    demoMode = false;
    items = data || [];

    renderPublic(items);
    msg(publicMsg, "");
  }

  /* STAFF PERMISSIONS */
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
          "Unable to load products. Check database permissions."
        )
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
      productList.append(
        node("p", "", "No products in database yet.")
      );

      return;
    }

    items.forEach(product => {
      const card = node("article", "admin-product-item");

      card.append(
        node("h4", "", product.name),
        node("p", "", `Price: ${money(product.price)} EGP`),
        node("p", "", `Hours: ${product.hours ?? "Not specified"}`),
        node("p", "", `Status: ${product.status || "available"}`),
        node("p", "", `Quantity: ${product.quantity ?? 1}`),
        node("p", "", product.description || "No description")
      );

      const actions = node("div", "admin-product-item-actions");
      const edit = node("button", "", "Edit");
      const del = node("button", "", "Delete");

      edit.type = "button";
      del.type = "button";

      edit.addEventListener("click", () => editProduct(product));

      del.addEventListener("click", () => {
        deleteProduct(product.id, product.name);
      });

      actions.append(edit, del);
      card.append(actions);
      productList.append(card);
    });
  }

  async function showDashboard(profileData) {
    const result = await db.auth.getUser();

    user = result.data.user;
    role = profileData.role;

    dashboard.hidden = false;
    closeLogin();

    $("[data-staff-email]").textContent =
      profileData.email || user?.email || "";

    $("[data-staff-role]").textContent = role.toUpperCase();

    $$(".owner-only").forEach(element => {
      element.hidden = !owner();
    });

    if (ownerPanel) ownerPanel.hidden = !owner();

    await loadProducts();
  }

  /* EDIT PRODUCT */
  function editProduct(product) {
    editingId = product.id;

    const values = {
      name: product.name,
      price: product.price,
      hours: product.hours,
      description: product.description,
      images: productImages(product).join("\n"),
      category: product.category || "jet_ski",
      year: product.year ?? "",
      mileage: product.mileage ?? "",
      horsepower: product.horsepower ?? "",
      status: product.status || "available",
      quantity: product.quantity ?? 1
    };

    for (const [name, value] of Object.entries(values)) {
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
    const status = field("status")?.value || "available";
    const quantity = field("quantity")?.value ?? "1";

    if (!name) throw Error("Enter a product name.");

    if (price === "" || !Number.isFinite(+price) || +price < 0) {
      throw Error("Enter a valid price.");
    }

    if (hours !== "" && (!Number.isFinite(+hours) || +hours < 0)) {
      throw Error("Enter valid engine hours.");
    }

    if (
      quantity === "" ||
      !Number.isInteger(+quantity) ||
      +quantity < 0
    ) {
      throw Error("Enter a whole number for quantity available.");
    }

    const images = imageText
      ? imageText.split(/\n+/).map(value => value.trim()).filter(Boolean)
      : [];

    images.forEach(source => {
      let url;

      try {
        url = new URL(source);
      } catch {
        throw Error("Every image must be a valid URL.");
      }

      if (!["http:", "https:"].includes(url.protocol)) {
        throw Error("Image URLs must use HTTP or HTTPS.");
      }
    });

    const optionalNumber = name => {
      const value = field(name)?.value ?? "";

      if (value === "") return null;

      if (!Number.isFinite(+value) || +value < 0) {
        throw Error(`Enter a valid value for ${name}.`);
      }

      return +value;
    };

    return {
      name,
      price: +price,
      hours: hours === "" ? null : +hours,
      description,
      images,
      category: normalizeCategory(field("category")?.value || "jet_ski"),
      year: optionalNumber("year"),
      mileage: optionalNumber("mileage"),
      horsepower: optionalNumber("horsepower"),
      status,
      quantity: +quantity
    };
  }

  /* IMAGE PICKER + PREVIEW */
  const imagePicker = $("#productImageFiles");
  const imagePreview = $("#imageUploadPreview");

  imagePicker?.addEventListener("change", () => {
    if (!imagePreview) return;

    imagePreview.replaceChildren();

    [...(imagePicker.files || [])].forEach(file => {
      const image = node("img");

      image.alt = file.name;
      image.loading = "lazy";
      image.decoding = "async";

      const objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;

      image.addEventListener("load", () => {
        URL.revokeObjectURL(objectUrl);
      }, { once: true });

      imagePreview.append(image);
    });
  });

  /* UPLOAD SELECTED IMAGES TO SUPABASE STORAGE */
  async function uploadSelectedImages() {
    const files = [...(imagePicker?.files || [])];

    if (!files.length) return [];

    if (!db?.storage) {
      throw Error("Supabase Storage is unavailable.");
    }

    const uploaded = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw Error("Choose image files only.");
      }

      if (file.size > 12 * 1024 * 1024) {
        throw Error(`${file.name} is larger than 12 MB.`);
      }

      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]+/g, "-");

      const path =
        `products/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const { error } = await db.storage
        .from("product-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (error) {
        throw Error(
          `Image upload failed (${file.name}): ${error.message}. ` +
          "Check the Storage INSERT policy for authenticated staff."
        );
      }

      const { data } = db.storage
        .from("product-images")
        .getPublicUrl(path);

      uploaded.push(data.publicUrl);
    }

    return uploaded;
  }

  /* SAVE OR UPDATE PRODUCT */
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

      if (uploaded.length) {
        product.images = [...product.images, ...uploaded];
      }

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
      productForm.reset();

      if (imagePreview) imagePreview.replaceChildren();
      if (imagePicker) imagePicker.value = "";

      saveButton.textContent = "SAVE PRODUCT";

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
      productForm.reset();

      if (imagePreview) imagePreview.replaceChildren();
      if (imagePicker) imagePicker.value = "";

      saveButton.textContent = "SAVE PRODUCT";

      msg($(".admin-message", productForm), "");
    });
  });

  /* STAFF LOGIN */
  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!db) {
      msg(
        $(".admin-message", loginForm),
        "Supabase could not be initialized. Check the connection.",
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
      console.error("Login error:", error);

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

  /* OWNER CREATES ADMIN USING SECURED EDGE FUNCTION */
  createAdminForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const statusMessage = $(".admin-message", createAdminForm);

    if (!owner()) {
      msg(
        statusMessage,
        "Only the Owner can create Admin accounts.",
        "error"
      );

      return;
    }

    if (busy) return;

    const email = createAdminForm.elements.email.value.trim();
    const password = createAdminForm.elements.password.value;

    if (password.length < 12) {
      msg(
        statusMessage,
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
      if (data?.error) throw Error(data.error);

      createAdminForm.reset();

      msg(
        statusMessage,
        "Admin account created successfully.",
        "success"
      );
    } catch (error) {
      console.error("Create admin error:", error);

      msg(
        statusMessage,
        error.message || "Could not create Admin. Check Edge Function setup.",
        "error"
      );
    } finally {
      busy = false;

      toggleBusy(button, false);
    }
  });

  /* SHOWROOM INTRO ANIMATION */
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

  /* INITIALIZE SUPABASE */
  async function init() {
    dashboard.hidden = true;

    if (ownerPanel) ownerPanel.hidden = true;

    if (!window.supabase) {
      demoMode = true;
      renderPublic(demo);

      msg(publicMsg, "Supabase library could not load.");

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
      data: { session }
    } = await db.auth.getSession();

    if (session?.user) {
      try {
        await showDashboard(await profile(session.user.id));
      } catch (error) {
        console.error("Session profile error:", error);
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
            console.error("Auth state error:", error);
            await db.auth.signOut();
          }
        }, 0);
      }
    });
  }

  init().catch(error => {
    console.error("Initialization error:", error);

    demoMode = true;
    renderPublic(demo);

    msg(
      publicMsg,
      "Site is in demo mode. Check Supabase setup."
    );
  });
})();
