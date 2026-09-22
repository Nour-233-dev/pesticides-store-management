/* =========================================================
   إدارة عملاء ومبيعات محل المبيدات — منطق البرنامج
   =========================================================
   هيكل البيانات المخزّن في localStorage:

   customers: [
     {
       id: "c_xxxxx",
       name: "اسم العميل",
       phone: "01012345678",
       address: "كفر الشيخ",
       notes: "...",
       createdAt: "2026-09-22T10:00:00.000Z",
       purchases: [
         {
           id: "p_xxxxx",
           product: "مبيد حشري X",
           type: "مبيد حشري",
           price: 250,
           qty: 2,
           total: 500,
           date: "2026-09-22",
           notes: "..."
         }
       ]
     }
   ]

   البيانات منظمة في مصفوفة واحدة بحيث يسهل لاحقًا نقلها
   إلى قاعدة بيانات حقيقية (كل عميل = صف، وكل عملية شراء
   يمكن فصلها لجدول منفصل مرتبط بمعرّف العميل).
   ========================================================= */

const STORAGE_KEY = "pesticide_shop_data_v1";

let state = {
  customers: [],
  currentCustomerId: null,
  deleteAction: null // { type: 'customer'|'purchase', customerId, purchaseId }
};

/* ===================== التخزين ===================== */

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.customers = Array.isArray(parsed.customers) ? parsed.customers : [];
    }
  } catch (e) {
    console.error("تعذر تحميل البيانات المحفوظة:", e);
    state.customers = [];
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ customers: state.customers }));
  } catch (e) {
    console.error("تعذر حفظ البيانات:", e);
    showToast("حدث خطأ أثناء حفظ البيانات", true);
  }
}

function generateId(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

/* ===================== أدوات مساعدة ===================== */

function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
}

function formatDateDisplay(isoDate) {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function customerTotal(customer) {
  return customer.purchases.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
}

function findCustomer(id) {
  return state.customers.find((c) => c.id === id) || null;
}

let toastTimer = null;
function showToast(message, isDanger) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("toast-danger", !!isDanger);
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

/* ===================== التنقل بين الصفحات ===================== */

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((el) => el.classList.add("hidden"));
  document.getElementById(pageId).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function goHome() {
  showPage("page-home");
  document.getElementById("search-input").value = "";
  document.getElementById("search-results").classList.add("hidden");
  renderHomeStats();
}

function goAllCustomers() {
  renderAllCustomersTable();
  showPage("page-all-customers");
}

function goCustomerPage(customerId) {
  const customer = findCustomer(customerId);
  if (!customer) {
    showToast("تعذر العثور على العميل", true);
    goHome();
    return;
  }
  state.currentCustomerId = customerId;
  renderCustomerPage(customer);
  showPage("page-customer");
}

/* ===================== عرض الصفحة الرئيسية ===================== */

function renderHomeStats() {
  const customers = state.customers;
  const totalPurchases = customers.reduce((sum, c) => sum + c.purchases.length, 0);

  document.getElementById("stat-customers-count").textContent = customers.length;
  document.getElementById("stat-sales-count").textContent = totalPurchases;
}

/* ===================== البحث ===================== */

function handleSearchInput() {
  const query = document.getElementById("search-input").value.trim();
  const resultsBox = document.getElementById("search-results");

  if (!query) {
    resultsBox.classList.add("hidden");
    resultsBox.innerHTML = "";
    return;
  }

  const matches = state.customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  resultsBox.innerHTML = "";

  if (matches.length === 0) {
    resultsBox.innerHTML = `<div class="search-no-results">لا يوجد عميل مطابق لـ "${escapeHtml(query)}"</div>`;
  } else {
    matches.slice(0, 8).forEach((c) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `
        <span class="search-result-name">${escapeHtml(c.name)}</span>
        <span class="search-result-meta">${c.purchases.length} عملية شراء</span>
      `;
      item.addEventListener("click", () => goCustomerPage(c.id));
      resultsBox.appendChild(item);
    });
  }

  resultsBox.classList.remove("hidden");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ===================== عرض جدول كل العملاء ===================== */

function renderAllCustomersTable() {
  const tbody = document.getElementById("all-customers-tbody");
  const emptyState = document.getElementById("all-customers-empty");
  const tableWrap = document.getElementById("all-customers-table").closest(".table-wrap");

  tbody.innerHTML = "";

  if (state.customers.length === 0) {
    emptyState.classList.remove("hidden");
    tableWrap.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tableWrap.classList.remove("hidden");

  const sorted = [...state.customers].sort((a, b) => a.name.localeCompare(b.name, "ar"));

  sorted.forEach((c) => {
    const tr = document.createElement("tr");
    tr.className = "row-clickable";
    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.phone || "—")}</td>
      <td>${escapeHtml(c.address || "—")}</td>
      <td>${c.purchases.length}</td>
    `;
    tr.addEventListener("click", () => goCustomerPage(c.id));
    tbody.appendChild(tr);
  });
}

/* ===================== عرض صفحة العميل ===================== */

function renderCustomerPage(customer) {
  document.getElementById("cust-name").textContent = customer.name;
  document.getElementById("cust-phone").textContent = customer.phone || "—";
  document.getElementById("cust-address").textContent = customer.address || "—";
  document.getElementById("cust-notes").textContent = customer.notes || "—";

  const tbody = document.getElementById("purchases-tbody");
  const emptyState = document.getElementById("purchases-empty");
  const tableWrap = document.getElementById("purchases-table").closest(".table-wrap");

  tbody.innerHTML = "";

  if (customer.purchases.length === 0) {
    emptyState.classList.remove("hidden");
    tableWrap.classList.add("hidden");
  } else {
    emptyState.classList.add("hidden");
    tableWrap.classList.remove("hidden");

    const sorted = [...customer.purchases].sort((a, b) => (a.date < b.date ? 1 : -1));

    sorted.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(p.product)}</td>
        <td>${escapeHtml(p.type || "—")}</td>
        <td>${formatMoney(p.price)}</td>
        <td>${p.qty}</td>
        <td>${formatMoney(p.total)}</td>
        <td>${formatDateDisplay(p.date)}</td>
        <td>${escapeHtml(p.notes || "—")}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm" data-edit-purchase="${p.id}">تعديل</button>
            <button class="btn btn-danger-outline btn-sm" data-delete-purchase="${p.id}">حذف</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-edit-purchase]").forEach((btn) => {
      btn.addEventListener("click", () => openPurchaseModal(customer.id, btn.dataset.editPurchase));
    });
    tbody.querySelectorAll("[data-delete-purchase]").forEach((btn) => {
      btn.addEventListener("click", () => confirmDeletePurchase(customer.id, btn.dataset.deletePurchase));
    });
  }

  document.getElementById("cust-total").textContent = formatMoney(customerTotal(customer));
}

/* ===================== نافذة العميل (إضافة/تعديل) ===================== */

let customerModalMode = "add"; // "add" | "edit"
let customerModalEditingId = null;

function openAddCustomerModal() {
  customerModalMode = "add";
  customerModalEditingId = null;
  document.getElementById("modal-customer-title").textContent = "إضافة عميل جديد";
  document.getElementById("form-customer").reset();
  openModal("modal-customer");
  setTimeout(() => document.getElementById("input-cust-name").focus(), 50);
}

function openEditCustomerModal(customerId) {
  const customer = findCustomer(customerId);
  if (!customer) return;
  customerModalMode = "edit";
  customerModalEditingId = customerId;
  document.getElementById("modal-customer-title").textContent = "تعديل بيانات العميل";
  document.getElementById("input-cust-name").value = customer.name;
  document.getElementById("input-cust-phone").value = customer.phone || "";
  document.getElementById("input-cust-address").value = customer.address || "";
  document.getElementById("input-cust-notes").value = customer.notes || "";
  openModal("modal-customer");
}

function handleCustomerFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("input-cust-name").value.trim();
  const phone = document.getElementById("input-cust-phone").value.trim();
  const address = document.getElementById("input-cust-address").value.trim();
  const notes = document.getElementById("input-cust-notes").value.trim();

  if (!name) {
    showToast("من فضلك اكتب اسم العميل", true);
    return;
  }

  if (customerModalMode === "add") {
    const newCustomer = {
      id: generateId("c"),
      name,
      phone,
      address,
      notes,
      createdAt: new Date().toISOString(),
      purchases: []
    };
    state.customers.push(newCustomer);
    saveData();
    closeModal("modal-customer");
    showToast("تم حفظ العميل بنجاح");
    goCustomerPage(newCustomer.id);
  } else {
    const customer = findCustomer(customerModalEditingId);
    if (!customer) return;
    customer.name = name;
    customer.phone = phone;
    customer.address = address;
    customer.notes = notes;
    saveData();
    closeModal("modal-customer");
    showToast("تم تحديث بيانات العميل");
    renderCustomerPage(customer);
  }
}

/* ===================== نافذة عملية الشراء (إضافة/تعديل) ===================== */

let purchaseModalMode = "add";
let purchaseModalEditingId = null;
let purchaseModalCustomerId = null;

function openPurchaseModal(customerId, purchaseId) {
  purchaseModalCustomerId = customerId;
  const form = document.getElementById("form-purchase");
  form.reset();

  if (purchaseId) {
    const customer = findCustomer(customerId);
    const purchase = customer.purchases.find((p) => p.id === purchaseId);
    if (!purchase) return;
    purchaseModalMode = "edit";
    purchaseModalEditingId = purchaseId;
    document.getElementById("modal-purchase-title").textContent = "تعديل عملية الشراء";
    document.getElementById("input-prod-name").value = purchase.product;
    document.getElementById("input-prod-type").value = purchase.type || "";
    document.getElementById("input-prod-price").value = purchase.price;
    document.getElementById("input-prod-qty").value = purchase.qty;
    document.getElementById("input-prod-date").value = purchase.date;
    document.getElementById("input-prod-notes").value = purchase.notes || "";
  } else {
    purchaseModalMode = "add";
    purchaseModalEditingId = null;
    document.getElementById("modal-purchase-title").textContent = "إضافة عملية شراء";
    document.getElementById("input-prod-date").value = todayISO();
    document.getElementById("input-prod-qty").value = 1;
  }

  openModal("modal-purchase");
  setTimeout(() => document.getElementById("input-prod-name").focus(), 50);
}

function handlePurchaseFormSubmit(e) {
  e.preventDefault();

  const product = document.getElementById("input-prod-name").value.trim();
  const type = document.getElementById("input-prod-type").value.trim();
  const price = parseFloat(document.getElementById("input-prod-price").value);
  const qty = parseInt(document.getElementById("input-prod-qty").value, 10);
  const date = document.getElementById("input-prod-date").value;
  const notes = document.getElementById("input-prod-notes").value.trim();

  if (!product || isNaN(price) || price < 0 || !qty || qty < 1 || !date) {
    showToast("من فضلك أكمل كل الحقول المطلوبة بشكل صحيح", true);
    return;
  }

  const customer = findCustomer(purchaseModalCustomerId);
  if (!customer) return;

  const total = Math.round(price * qty * 100) / 100;

  if (purchaseModalMode === "add") {
    customer.purchases.push({
      id: generateId("p"),
      product,
      type,
      price,
      qty,
      total,
      date,
      notes
    });
    showToast("تم تسجيل عملية الشراء");
  } else {
    const purchase = customer.purchases.find((p) => p.id === purchaseModalEditingId);
    if (!purchase) return;
    purchase.product = product;
    purchase.type = type;
    purchase.price = price;
    purchase.qty = qty;
    purchase.total = total;
    purchase.date = date;
    purchase.notes = notes;
    showToast("تم تحديث عملية الشراء");
  }

  saveData();
  closeModal("modal-purchase");
  renderCustomerPage(customer);
}

/* ===================== الحذف مع التأكيد ===================== */

function confirmDeleteCustomer(customerId) {
  const customer = findCustomer(customerId);
  if (!customer) return;
  state.deleteAction = { type: "customer", customerId };
  document.getElementById("confirm-message").textContent =
    `هل أنت متأكد من حذف العميل "${customer.name}"؟ سيتم حذف كل سجل مشترياته أيضًا.`;
  openModal("modal-confirm");
}

function confirmDeletePurchase(customerId, purchaseId) {
  state.deleteAction = { type: "purchase", customerId, purchaseId };
  document.getElementById("confirm-message").textContent =
    "هل أنت متأكد من حذف عملية الشراء هذه؟";
  openModal("modal-confirm");
}

function executeConfirmedDelete() {
  const action = state.deleteAction;
  if (!action) return;

  if (action.type === "customer") {
    state.customers = state.customers.filter((c) => c.id !== action.customerId);
    saveData();
    closeModal("modal-confirm");
    showToast("تم حذف العميل");
    goHome();
  } else if (action.type === "purchase") {
    const customer = findCustomer(action.customerId);
    if (customer) {
      customer.purchases = customer.purchases.filter((p) => p.id !== action.purchaseId);
      saveData();
      renderCustomerPage(customer);
    }
    closeModal("modal-confirm");
    showToast("تم حذف عملية الشراء");
  }

  state.deleteAction = null;
}

/* ===================== النوافذ المنبثقة: فتح/غلق عام ===================== */

function openModal(modalId) {
  document.getElementById(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
}

/* ===================== ربط الأحداث ===================== */

function initEventListeners() {
  // التنقل عبر شعار البرنامج
  document.querySelectorAll('[data-nav="home"]').forEach((el) => {
    el.addEventListener("click", goHome);
  });

  // البحث
  document.getElementById("search-input").addEventListener("input", handleSearchInput);

  // أزرار الصفحة الرئيسية
  document.getElementById("btn-add-customer").addEventListener("click", openAddCustomerModal);
  document.getElementById("btn-all-customers").addEventListener("click", goAllCustomers);

  // أزرار صفحة كل العملاء
  document.getElementById("btn-add-customer-2").addEventListener("click", openAddCustomerModal);
  document.getElementById("btn-add-customer-empty").addEventListener("click", openAddCustomerModal);

  // أزرار صفحة العميل
  document.getElementById("btn-edit-customer").addEventListener("click", () => {
    if (state.currentCustomerId) openEditCustomerModal(state.currentCustomerId);
  });
  document.getElementById("btn-delete-customer").addEventListener("click", () => {
    if (state.currentCustomerId) confirmDeleteCustomer(state.currentCustomerId);
  });
  document.getElementById("btn-add-purchase").addEventListener("click", () => {
    if (state.currentCustomerId) openPurchaseModal(state.currentCustomerId, null);
  });

  // نماذج
  document.getElementById("form-customer").addEventListener("submit", handleCustomerFormSubmit);
  document.getElementById("form-purchase").addEventListener("submit", handlePurchaseFormSubmit);

  // تأكيد الحذف
  document.getElementById("btn-confirm-delete").addEventListener("click", executeConfirmedDelete);

  // إغلاق النوافذ المنبثقة
  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => closeModal(el.dataset.close));
  });
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.add("hidden");
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay:not(.hidden)").forEach((m) => m.classList.add("hidden"));
    }
  });

  // إغلاق نتائج البحث عند الضغط خارجها
  document.addEventListener("click", (e) => {
    const searchBox = document.querySelector(".search-box");
    const resultsBox = document.getElementById("search-results");
    if (!searchBox.contains(e.target) && !resultsBox.contains(e.target)) {
      resultsBox.classList.add("hidden");
    }
  });
}

/* ===================== بدء التشغيل ===================== */

function init() {
  loadData();
  initEventListeners();
  goHome();
}

document.addEventListener("DOMContentLoaded", init);
