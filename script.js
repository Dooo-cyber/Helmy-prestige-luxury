/* HELMY PRESTIGE — OWNER & ADMIN
   Add your Supabase project URL and publishable/anon key below.
   NEVER put your service_role key in browser code.
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
      price: 1150000,
      hours: 100,
      description: "Premium personal watercraft.",
      images: ["IMG_2815.jpeg", "IMG_2814.jpeg", "IMG_2813.jpeg"]
    },
    {
      name: "RXT-X RS 2018",
      price: 750000,
      hours: 85,
      description: "Premium personal watercraft.",
      images: ["IMG_2812.jpeg", "IMG_2811.jpeg"]
    },
    {
      name: "RXP-X RS 2025",
      price: 1250000,
      hours: 128,
      description: "Premium personal watercraft.",
      images: ["IMG_2809.jpeg", "IMG_2810.jpeg"]
    },
    {
      name: "GTX Limited 2024",
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

  const msg = (element, text, type = "") => {
    if (!element) return;
    element.textContent = text;
    element.classList.remove("error", "success");
    if (type) element.classList.add(type);
  };

  const money = value => {
    return Number.isFinite(Number(value))
      ? new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 0
        }).format(Number(value))
      : "Price on request";
  };

  const staff = () => role === "owner" || role === "admin";
  const owner = () => role === "owner";

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function toggleBusy(button, isBusy, label = "PLEASE WAIT...") {
    if (!button) return;

    if (isBusy) {
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
    try {
      const url = new URL(source, location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function renderPublic(list) {
    if (!publicList) return;

    publicList.replaceChildren();

    if (!list.length) {
      publicList.append(
        node(
          "p",
          "loading-copy",
          "No inventory currently listed. Contact our team for availability."
        )
      );
      return;
    }

    list.forEach(product => {
      const card = node("article", "public-product-card");
      const images = Array.isArray(product.images) ? product.images : [];
      const imageSource = validImage(images[0]);

      if (imageSource) {
        const image = node("img", "public-product-image");
        image.src = imageSource;
        image.alt = product.name || "Watercraft";
        image.loading = "lazy";

        image.onerror = () => {
          image.replaceWith(
            node("div", "public-product-image-placeholder", "IMAGE NOT AVAILABLE")
          );
        };

        card.append(image);
      } else {
        card.append(
          node("div", "public-product-image-placeholder", "HELMY PRESTIGE")
        );
      }

      const details = node("div", "public-product-details");

      details.append(node("h3", "", product.name || "Watercraft"));

      details.append(
        node(
          "p",
          "product-meta",
          product.hours == null
            ? "Hours not listed"
            : `${product.hours} engine hours`
        )
      );

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

      card.append(details);
      publicList.append(card);
    });
  }

  async function publicInventory() {
    if (!db) {
      renderPublic(demo);
      msg(
        publicMsg,
        "Demo inventory is shown. Configure Supabase to enable live inventory."
      );
      return;
    }

    const { data, error } = await db
      .from("products")
      .select("id,name,price,hours,description,images")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      renderPublic(demo);
      msg(
        publicMsg,
        "Showing demo inventory because live inventory could not be loaded."
      );
    } else {
      renderPublic(data && data.length > 0 ? data : demo);
      msg(publicMsg, "");
    }
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

      card.append(node("h4", "", product.name));
      card.append(
        node("p", "", `Price: ${money(product.price)} EGP`)
      );
      card.append(
        node(
          "p",
          "",
          `Hours: ${product.hours ?? "Not specified"}`
        )
      );
      card.append(
        node("p", "", product.description || "No description")
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
    user = (await db.auth.getUser()).data.user;
    role = profile.role;

    dashboard.hidden = false;
    closeLogin();

    $("[data-staff-email]").textContent = profile.email || user?.email || "";
    $("[data-staff-role]").textContent = role.toUpperCase();

    $$(".owner-only").forEach(element => {
      element.hidden = !owner();
    });

    if (ownerPanel) ownerPanel.hidden = !owner();

    await loadProducts();
  }

  function editProduct(product) {
    editingId = product.id;

    const values = {
      name: product.name,
      price: product.price,
      hours: product.hours,
      description: product.description,
      images: Array.isArray(product.images)
        ? product.images.join("\n")
        : ""
    };

    for (const [name, value] of Object.entries(values)) {
      productForm.elements.namedItem(name).value = value ?? "";
    }

    saveButton.textContent = "UPDATE PRODUCT";

    msg($(".admin-message", productForm), "Editing product.");

    productForm.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function readProduct() {
    const name = productForm.elements.name.value.trim();
    const price = productForm.elements.price.value;
    const hours = productForm.elements.hours.value;
    const description = productForm.elements.description.value.trim();
    const imageText = productForm.elements.images.value.trim();

    if (!name) {
      throw new Error("Enter a product name.");
    }

    if (price === "" || !Number.isFinite(+price) || +price < 0) {
      throw new Error("Enter a valid price.");
    }

    if (
      hours !== "" &&
      (!Number.isFinite(+hours) || +hours < 0)
    ) {
      throw new Error("Enter valid engine hours.");
    }

    const images = imageText
      ? imageText.split(/\n+/).map(source => source.trim()).filter(Boolean)
      : [];

    images.forEach(source => {
      let url;

      try {
        url = new URL(source);
      } catch {
        throw new Error("Every image must be a valid URL.");
      }

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Image URLs must use HTTP or HTTPS.");
      }
    });

    return {
      name,
      price: +price,
      hours: hours === "" ? null : +hours,
      description,
      images
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
      saveButton.textContent = "SAVE PRODUCT";

      msg(status, "Product saved successfully.", "success");

      await loadProducts();
    } catch (error) {
      console.error(error);
      msg(
        status,
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

      const profile = await getProfile(data.user.id);
      await showDashboard(profile);
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
      if (data?.error) throw new Error(data.error);

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

    const {
      data: { session }
    } = await db.auth.getSession();

    if (session?.user) {
      try {
        await showDashboard(await getProfile(session.user.id));
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
            await showDashboard(await getProfile(session.user.id));
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
