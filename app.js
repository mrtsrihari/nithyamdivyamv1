const STORAGE_KEYS = {
  auth: "spice_admin_auth",
  products: "spice_products",
  orders: "spice_orders",
  users: "spice_users"
};

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Pepper",
    prices: { "250g": 120, "500g": 230, "750g": 340, "1kg": 450 }
  },
  {
    id: 2,
    name: "Cardamom",
    prices: { "250g": 300, "500g": 580, "750g": 860, "1kg": 1120 }
  }
];

const DEFAULT_ORDERS = [
  { id: "ORD-1001", productName: "Pepper", quantity: "500g", price: 230, status: "Placed" },
  { id: "ORD-1002", productName: "Cardamom", quantity: "250g", price: 300, status: "Processing" },
  { id: "ORD-1003", productName: "Pepper", quantity: "1kg", price: 450, status: "Shipped" },
  { id: "ORD-1004", productName: "Cardamom", quantity: "750g", price: 860, status: "Delivered" }
];

const DEFAULT_USERS = [
  { id: 1, name: "Asha Verma", email: "asha@example.com" },
  { id: 2, name: "Ravi Menon", email: "ravi@example.com" },
  { id: 3, name: "Neha Bhat", email: "neha@example.com" }
];

const ORDER_STATUSES = ["Placed", "Processing", "Shipped", "Delivered"];

document.addEventListener("DOMContentLoaded", () => {
  initializeStorage();
  applyAuthGuards();
  setActiveSidebar();
  wireGlobalLogout();
  renderPage();
});

function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.products)) {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.orders)) {
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(DEFAULT_ORDERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(DEFAULT_USERS));
  }
}

function applyAuthGuards() {
  const page = getCurrentPage();
  const loggedIn = localStorage.getItem(STORAGE_KEYS.auth) === "true";

  if (page === "login.html" && loggedIn) {
    window.location.href = "dashboard.html";
  }

  if (page !== "login.html" && !loggedIn) {
    window.location.href = "login.html";
  }
}

function setActiveSidebar() {
  const page = getCurrentPage();
  const links = document.querySelectorAll("[data-page]");
  links.forEach((link) => {
    if (link.getAttribute("data-page") === page) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function wireGlobalLogout() {
  const logoutButtons = document.querySelectorAll(".logout-btn");
  logoutButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem(STORAGE_KEYS.auth);
      window.location.href = "login.html";
    });
  });
}

function renderPage() {
  const page = getCurrentPage();
  if (page === "login.html") renderLogin();
  if (page === "dashboard.html") renderDashboard();
  if (page === "products.html") renderProducts();
  if (page === "orders.html") renderOrders();
  if (page === "users.html") renderUsers();
}

function renderLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const error = document.getElementById("loginError");

    if (username === "admin" && password === "admin123") {
      localStorage.setItem(STORAGE_KEYS.auth, "true");
      window.location.href = "dashboard.html";
      return;
    }
    error.classList.remove("d-none");
  });
}

function renderDashboard() {
  const products = getFromStorage(STORAGE_KEYS.products);
  const orders = getFromStorage(STORAGE_KEYS.orders);
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.price || 0), 0);

  const totalProducts = document.getElementById("totalProducts");
  const totalOrders = document.getElementById("totalOrders");
  const totalRevenueEl = document.getElementById("totalRevenue");

  if (totalProducts) totalProducts.textContent = products.length;
  if (totalOrders) totalOrders.textContent = orders.length;
  if (totalRevenueEl) totalRevenueEl.textContent = `Rs. ${totalRevenue.toLocaleString()}`;

  const recentBody = document.getElementById("recentOrdersBody");
  if (!recentBody) return;
  recentBody.innerHTML = "";

  orders.slice(0, 5).forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${order.id}</td>
      <td>${order.productName}</td>
      <td>${order.quantity}</td>
      <td>Rs. ${Number(order.price).toLocaleString()}</td>
      <td><span class="badge text-bg-secondary">${order.status}</span></td>
    `;
    recentBody.appendChild(tr);
  });
}

function renderProducts() {
  const tableBody = document.getElementById("productsTableBody");
  if (!tableBody) return;

  const modalEl = document.getElementById("productModal");
  const productModal = modalEl ? new bootstrap.Modal(modalEl) : null;

  const addBtn = document.getElementById("addProductBtn");
  const saveBtn = document.getElementById("saveProductBtn");
  const form = document.getElementById("productForm");
  const modalTitle = document.getElementById("productModalLabel");
  const editProductId = document.getElementById("editProductId");

  function drawTable() {
    const products = getFromStorage(STORAGE_KEYS.products);
    tableBody.innerHTML = "";

    products.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>
          <span class="price-badge">250g: Rs. ${p.prices["250g"]}</span>
          <span class="price-badge">500g: Rs. ${p.prices["500g"]}</span>
          <span class="price-badge">750g: Rs. ${p.prices["750g"]}</span>
          <span class="price-badge">1kg: Rs. ${p.prices["1kg"]}</span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-2 edit-product" data-id="${p.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-product" data-id="${p.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    wireProductActions();
  }

  function wireProductActions() {
    document.querySelectorAll(".edit-product").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const products = getFromStorage(STORAGE_KEYS.products);
        const product = products.find((x) => x.id === id);
        if (!product) return;

        modalTitle.textContent = "Edit Product";
        editProductId.value = product.id;
        document.getElementById("productName").value = product.name;
        document.getElementById("price250").value = product.prices["250g"];
        document.getElementById("price500").value = product.prices["500g"];
        document.getElementById("price750").value = product.prices["750g"];
        document.getElementById("price1kg").value = product.prices["1kg"];
        productModal.show();
      });
    });

    document.querySelectorAll(".delete-product").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        let products = getFromStorage(STORAGE_KEYS.products);
        products = products.filter((x) => x.id !== id);
        setToStorage(STORAGE_KEYS.products, products);
        drawTable();
        showToast("Product deleted successfully.");
      });
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      form.reset();
      editProductId.value = "";
      modalTitle.textContent = "Add Product";
      productModal.show();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const products = getFromStorage(STORAGE_KEYS.products);
      const id = editProductId.value ? Number(editProductId.value) : Date.now();
      const payload = {
        id,
        name: document.getElementById("productName").value.trim(),
        prices: {
          "250g": Number(document.getElementById("price250").value),
          "500g": Number(document.getElementById("price500").value),
          "750g": Number(document.getElementById("price750").value),
          "1kg": Number(document.getElementById("price1kg").value)
        }
      };

      const existingIndex = products.findIndex((x) => x.id === id);
      if (existingIndex > -1) {
        products[existingIndex] = payload;
        showToast("Product updated successfully.");
      } else {
        products.push(payload);
        showToast("Product added successfully.");
      }

      setToStorage(STORAGE_KEYS.products, products);
      productModal.hide();
      drawTable();
    });
  }

  drawTable();
}

function renderOrders() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  function drawOrders() {
    const orders = getFromStorage(STORAGE_KEYS.orders);
    tbody.innerHTML = "";

    orders.forEach((order) => {
      const statusOptions = ORDER_STATUSES.map(
        (st) => `<option value="${st}" ${order.status === st ? "selected" : ""}>${st}</option>`
      ).join("");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${order.id}</td>
        <td>${order.productName}</td>
        <td>${order.quantity}</td>
        <td>Rs. ${Number(order.price).toLocaleString()}</td>
        <td>
          <select class="form-select form-select-sm order-status" data-id="${order.id}">
            ${statusOptions}
          </select>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll(".order-status").forEach((select) => {
      select.addEventListener("change", () => {
        const orderId = select.getAttribute("data-id");
        const status = select.value;
        const orders = getFromStorage(STORAGE_KEYS.orders).map((ord) =>
          ord.id === orderId ? { ...ord, status } : ord
        );
        setToStorage(STORAGE_KEYS.orders, orders);
        showToast(`Order ${orderId} marked as ${status}.`);
      });
    });
  }

  drawOrders();
}

function renderUsers() {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;

  function drawUsers() {
    const users = getFromStorage(STORAGE_KEYS.users);
    tbody.innerHTML = "";

    users.forEach((user) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger delete-user" data-id="${user.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll(".delete-user").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const users = getFromStorage(STORAGE_KEYS.users).filter((u) => u.id !== id);
        setToStorage(STORAGE_KEYS.users, users);
        drawUsers();
        showToast("User deleted successfully.");
      });
    });
  }

  drawUsers();
}

function showToast(message) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toastEl = document.createElement("div");
  toastEl.className = "toast align-items-center text-bg-success border-0";
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 2200 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

function getCurrentPage() {
  const path = window.location.pathname.split("/").pop();
  return path || "login.html";
}

function getFromStorage(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function setToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
