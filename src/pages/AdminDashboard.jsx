
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  LogOut,
  LoaderCircle,
  AlertCircle,
  Package,
  Users,
  ShoppingBag,
  Plus,
  Search,
  Pencil,
  RefreshCw,
  Power,
  X,
  Save,
  ImagePlus,
  Star,
  Trash2,
  Upload,
  Eye,
} from "lucide-react";

const API = "/api";
const MAX_IMAGES = 30;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const emptyForm = {
  name: "",
  slug: "",
  sku: "",
  brand: "",
  category: "",
  basePrice: "",
  stock: "0",
  description: "",
  compatibleVehicles: "",
  tags: "",
};

function toArray(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function imageUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

function orderStatusLabel(status) {
  return {
    pending_payment: "در انتظار پرداخت",
    processing: "در حال پردازش",
    shipped: "ارسال‌شده",
    delivered: "تحویل‌شده",
    cancelled: "لغوشده",
  }[status] || status;
}

function paymentStatusLabel(status) {
  return {
    pending: "در انتظار پرداخت",
    paid: "پرداخت تأییدشده",
    failed: "ناموفق",
    refunded: "بازپرداخت‌شده",
  }[status] || status;
}

function allowedOrderTransitions(status) {
  return {
    pending_payment: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  }[status] || [];
}

function createExistingImages(images = []) {
  return images.map((url, index) => ({
    id: `existing-${index}-${url}`,
    url,
    file: null,
    preview: imageUrl(url),
    isNew: false,
  }));
}

function AdminDashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [gallery, setGallery] = useState([]);
  const [activeSection, setActiveSection] = useState("products");
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [nextOrderStatus, setNextOrderStatus] = useState("");
  const [orderNote, setOrderNote] = useState("");

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "عملیات ناموفق بود.");
    }

    return result;
  }

  async function uploadImages(files) {
    if (!files.length) return [];

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("images", file);
    });

    const response = await fetch(`${API}/products/admin/images`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "بارگذاری تصاویر ناموفق بود.");
    }

    if (!Array.isArray(result.images)) {
      throw new Error("پاسخ سرور برای تصاویر معتبر نیست.");
    }

    return result.images;
  }

  async function loadProducts() {
    const result = await apiRequest("/products/admin");
    setProducts(result.data || []);
  }

  async function loadOrders(searchValue = orderSearch, statusValue = orderStatusFilter) {
    setOrdersLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();
      if (searchValue.trim()) query.set("q", searchValue.trim());
      if (statusValue) query.set("status", statusValue);
      const suffix = query.size ? `?${query.toString()}` : "";
      const result = await apiRequest(`/orders/admin${suffix}`);
      setOrders(result.data || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function openOrder(orderId) {
    setError("");
    try {
      const result = await apiRequest(`/orders/admin/${encodeURIComponent(orderId)}`);
      setSelectedOrder(result.data);
      setNextOrderStatus("");
      setOrderNote("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateOrderStatus(event) {
    event.preventDefault();
    if (!selectedOrder || !nextOrderStatus) return;

    setSaving(true);
    setError("");
    try {
      const result = await apiRequest(
        `/orders/admin/${encodeURIComponent(selectedOrder.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextOrderStatus, note: orderNote }),
        }
      );
      setSelectedOrder(result.data);
      setNextOrderStatus("");
      setOrderNote("");
      await loadOrders();
      setMessage("وضعیت سفارش به‌روزرسانی شد؛ وضعیت پرداخت جداگانه باقی می‌ماند.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const result = await apiRequest("/auth/me");

        if (!active) return;

        setUser(result.user);

        const productResult = await apiRequest("/products/admin");

        if (active) {
          setProducts(productResult.data || []);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      gallery.forEach((item) => {
        if (item.isNew && item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [gallery]);

  function clearGallery() {
    gallery.forEach((item) => {
      if (item.isNew && item.preview) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setGallery([]);
  }

  function closeForm() {
    clearGallery();
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function openNewForm() {
    clearGallery();
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(product) {
    clearGallery();
    setEditingId(product.id);

    setForm({
      name: product.name || "",
      slug: product.slug || "",
      sku: product.sku || "",
      brand: product.brand || "",
      category: product.category || "",
      basePrice: product.basePrice ?? "",
      stock: String(product.stock ?? 0),
      description: product.description || "",
      compatibleVehicles: (product.compatibleVehicles || []).join(", "),
      tags: (product.tags || []).join(", "),
    });

    setGallery(createExistingImages(product.images || []));
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleImageSelection(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selected.length) return;

    setError("");

    const remaining = MAX_IMAGES - gallery.length;

    if (remaining <= 0) {
      setError(`حداکثر ${MAX_IMAGES} تصویر برای هر محصول مجاز است.`);
      return;
    }

    const accepted = [];

    for (const file of selected) {
      if (gallery.length + accepted.length >= MAX_IMAGES) {
        setError(`حداکثر ${MAX_IMAGES} تصویر برای هر محصول مجاز است.`);
        break;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`فرمت تصویر «${file.name}» مجاز نیست. فقط JPG، PNG و WebP پذیرفته می‌شوند.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(`حجم تصویر «${file.name}» بیشتر از ۵ مگابایت است.`);
        continue;
      }

      accepted.push({
        id: `new-${Date.now()}-${Math.random()}`,
        file,
        url: "",
        preview: URL.createObjectURL(file),
        isNew: true,
      });
    }

    if (accepted.length) {
      setGallery((previous) => [...previous, ...accepted]);
    }
  }

  function removeImage(id) {
    setGallery((previous) => {
      const target = previous.find((item) => item.id === id);

      if (target?.isNew && target.preview) {
        URL.revokeObjectURL(target.preview);
      }

      return previous.filter((item) => item.id !== id);
    });
  }

  function setMainImage(id) {
    setGallery((previous) => {
      const selected = previous.find((item) => item.id === id);

      if (!selected) return previous;

      return [
        selected,
        ...previous.filter((item) => item.id !== id),
      ];
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const basePrice =
        form.basePrice.trim() === "" ? null : Number(form.basePrice);

      const stock = Number(form.stock);

      if (
        (basePrice !== null &&
          (!Number.isSafeInteger(basePrice) || basePrice < 0)) ||
        !Number.isSafeInteger(stock) ||
        stock < 0
      ) {
        throw new Error("قیمت پایه و موجودی باید عدد صحیح و غیرمنفی باشند.");
      }

      if (
        basePrice !== null &&
        !Number.isSafeInteger(Math.round(basePrice * 1.19))
      ) {
        throw new Error("قیمت پایه خارج از محدوده مجاز است.");
      }

      if (gallery.length > MAX_IMAGES) {
        throw new Error(`حداکثر ${MAX_IMAGES} تصویر مجاز است.`);
      }

      const newFiles = gallery
        .filter((item) => item.isNew)
        .map((item) => item.file);

      let uploadedUrls = [];

      if (newFiles.length) {
        setUploading(true);
        uploadedUrls = await uploadImages(newFiles);
        setUploading(false);
      }

      let uploadedIndex = 0;

      const finalImages = gallery.map((item) => {
        if (item.isNew) {
          const url = uploadedUrls[uploadedIndex];
          uploadedIndex += 1;
          return url;
        }

        return item.url;
      }).filter(Boolean);

      if (finalImages.length !== gallery.length) {
        throw new Error("برخی تصاویر به‌درستی از سرور دریافت نشدند.");
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        sku: form.sku.trim(),
        brand: form.brand.trim() || null,
        category: form.category.trim(),
        basePrice,
        stock,
        description: form.description,
        compatibleVehicles: toArray(form.compatibleVehicles),
        images: finalImages,
        tags: toArray(form.tags),
      };

      const path = editingId
        ? `/products/admin/${encodeURIComponent(editingId)}`
        : "/products/admin";

      await apiRequest(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      await loadProducts();

      closeForm();

      setMessage(
        editingId
          ? "اطلاعات محصول و گالری تصاویر ویرایش شد."
          : "محصول جدید با موفقیت ثبت شد."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function toggleStatus(product) {
    setError("");
    setMessage("");

    try {
      await apiRequest(
        `/products/admin/${encodeURIComponent(product.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !product.isActive }),
        }
      );

      await loadProducts();
      setMessage("وضعیت محصول تغییر کرد.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await apiRequest("/auth/logout", { method: "POST" });
      onLogout?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingOut(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      [
        product.name,
        product.sku,
        product.category,
        product.brand,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [products, search]);

  const activeCount = products.filter((item) => item.isActive).length;

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <LoaderCircle className="animate-spin ml-3" />
        در حال بررسی نشست امن مدیر...
      </div>
    );
  }

  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
        <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={36} />
          <h1 className="text-xl font-bold">دسترسی تأیید نشد</h1>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
          <button onClick={onLogout} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-white">
            بازگشت به فروشگاه
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-900">
      <header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white md:px-10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-amber-400" size={30} />
          <div>
            <h1 className="font-black">پنل مدیریت کوروش کبیر</h1>
            <p className="mt-1 text-xs text-slate-400">مرکز کنترل فروشگاه</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm text-red-300"
        >
          {loggingOut ? <LoaderCircle className="animate-spin" size={17} /> : <LogOut size={17} />}
          خروج
        </button>
      </header>

      <main className="mx-auto max-w-7xl p-5 md:p-10">
        {error && (
          <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <Package className="mb-3 text-amber-600" size={26} />
            <p className="text-sm text-slate-500">کل محصولات</p>
            <p className="mt-2 text-2xl font-black">{products.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <ShoppingBag className="mb-3 text-emerald-600" size={26} />
            <p className="text-sm text-slate-500">محصولات فعال</p>
            <p className="mt-2 text-2xl font-black">{activeCount}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <Users className="mb-3 text-blue-600" size={26} />
            <p className="text-sm text-slate-500">محصولات غیرفعال</p>
            <p className="mt-2 text-2xl font-black">{products.length - activeCount}</p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSection("products")}
            className={`rounded-xl px-5 py-3 text-sm font-bold ${activeSection === "products" ? "bg-slate-950 text-white" : "bg-white text-slate-700"}`}
          >
            محصولات
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection("orders");
              loadOrders();
            }}
            className={`rounded-xl px-5 py-3 text-sm font-bold ${activeSection === "orders" ? "bg-slate-950 text-white" : "bg-white text-slate-700"}`}
          >
            سفارش‌ها
          </button>
        </div>

        {activeSection === "products" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">مدیریت محصولات</h2>
              <p className="mt-2 text-sm text-slate-500">
                ثبت، ویرایش، کنترل موجودی و مدیریت گالری تصاویر
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadProducts().catch((err) => setError(err.message))}
                className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
              >
                <RefreshCw size={17} />
                بروزرسانی
              </button>

              <button
                onClick={openNewForm}
                className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white"
              >
                <Plus size={18} />
                افزودن محصول
              </button>
            </div>
          </div>

          <div className="relative mb-5">
            <Search className="absolute right-4 top-3.5 text-slate-400" size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجو بر اساس نام، کد کالا یا دسته‌بندی..."
              className="w-full rounded-xl border border-slate-200 py-3 pr-12 pl-4 outline-none focus:border-amber-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-4">محصول</th>
                  <th className="p-4">کد کالا</th>
                  <th className="p-4">قیمت فروش</th>
                  <th className="p-4">موجودی</th>
                  <th className="p-4">وضعیت</th>
                  <th className="p-4">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] ? (
                          <img
                            src={imageUrl(product.images[0])}
                            alt={product.name}
                            className="h-12 w-12 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <ImagePlus size={20} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold">{product.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{product.sku}</td>
                    <td className="p-4 font-bold">
                      {product.price == null
                        ? product.legacyPrice == null
                          ? "بدون قیمت پایه"
                          : `قیمت قدیمی نیازمند تأیید: ${Number(product.legacyPrice).toLocaleString("fa-IR")} ریال`
                        : `${Number(product.price).toLocaleString("fa-IR")} ریال`}
                    </td>
                    <td className="p-4">{Number(product.stock).toLocaleString("fa-IR")}</td>
                    <td className="p-4">
                      <span className={`rounded-lg px-3 py-1 text-xs ${
                        product.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {product.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditForm(product)}
                          title="ویرایش"
                          className="rounded-lg bg-blue-50 p-2 text-blue-700"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          onClick={() => toggleStatus(product)}
                          title="تغییر وضعیت"
                          className="rounded-lg bg-amber-50 p-2 text-amber-700"
                        >
                          <Power size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-500">
                      محصولی پیدا نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {activeSection === "orders" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">مدیریت سفارش‌ها</h2>
                <p className="mt-2 text-sm text-slate-500">اطلاعات سفارش و نشانی فقط برای مدیر نمایش داده می‌شود.</p>
              </div>
              <button type="button" onClick={() => loadOrders()} className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
                <RefreshCw size={17} /> بروزرسانی
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                loadOrders(orderSearch, orderStatusFilter);
              }}
              className="mb-5 flex flex-wrap gap-3"
            >
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute right-4 top-3.5 text-slate-400" size={19} />
                <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} maxLength={100} placeholder="شناسه، موبایل گیرنده یا کد کالا" className="w-full rounded-xl border border-slate-200 py-3 pr-12 pl-4" />
              </div>
              <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-4">
                <option value="">همه وضعیت‌ها</option>
                <option value="pending_payment">در انتظار پرداخت</option>
                <option value="processing">در حال پردازش</option>
                <option value="shipped">ارسال‌شده</option>
                <option value="delivered">تحویل‌شده</option>
                <option value="cancelled">لغوشده</option>
              </select>
              <button type="submit" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">جست‌وجو</button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-right text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-4">شناسه سفارش</th>
                    <th className="p-4">گیرنده</th>
                    <th className="p-4">تعداد کالا</th>
                    <th className="p-4">مبلغ (ریال)</th>
                    <th className="p-4">وضعیت سفارش</th>
                    <th className="p-4">پرداخت</th>
                    <th className="p-4">جزئیات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100">
                      <td className="p-4 font-mono text-xs">{order.id.slice(0, 8)}</td>
                      <td className="p-4">{order.recipientName}<div className="mt-1 text-xs text-slate-500" dir="ltr">{order.recipientMobile}</div></td>
                      <td className="p-4">{Number(order.itemCount).toLocaleString("fa-IR")}</td>
                      <td className="p-4 font-bold">{Number(order.totalAmount).toLocaleString("fa-IR")}</td>
                      <td className="p-4">{orderStatusLabel(order.status)}</td>
                      <td className="p-4">{paymentStatusLabel(order.paymentStatus)}</td>
                      <td className="p-4">
                        <button type="button" onClick={() => openOrder(order.id)} title="جزئیات سفارش" className="rounded-lg bg-blue-50 p-2 text-blue-700"><Eye size={17} /></button>
                      </td>
                    </tr>
                  ))}
                  {!ordersLoading && orders.length === 0 && (
                    <tr><td colSpan="7" className="p-10 text-center text-slate-500">سفارشی پیدا نشد.</td></tr>
                  )}
                  {ordersLoading && <tr><td colSpan="7" className="p-10 text-center text-slate-500">در حال دریافت سفارش‌ها...</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selectedOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
            <section role="dialog" aria-modal="true" aria-label="جزئیات سفارش" className="my-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
              <header className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-black">جزئیات سفارش {selectedOrder.id.slice(0, 8)}</h2>
                <button type="button" onClick={() => setSelectedOrder(null)} aria-label="بستن" className="rounded-lg bg-slate-100 p-2"><X size={20} /></button>
              </header>
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <p>موبایل حساب: <b dir="ltr">{selectedOrder.customerMobile}</b></p>
                <p>موبایل گیرنده: <b dir="ltr">{selectedOrder.shippingAddress.recipientMobile}</b></p>
                <p>گیرنده: <b>{selectedOrder.shippingAddress.recipientName}</b></p>
                <p>وضعیت سفارش: <b>{orderStatusLabel(selectedOrder.status)}</b></p>
                <p>وضعیت پرداخت: <b>{paymentStatusLabel(selectedOrder.paymentStatus)}</b></p>
                <p>مبلغ کل: <b>{Number(selectedOrder.totalAmount).toLocaleString("fa-IR")} ریال</b></p>
                <p className="sm:col-span-2">نشانی: {selectedOrder.shippingAddress.province}، {selectedOrder.shippingAddress.city}، {selectedOrder.shippingAddress.addressLine}، کدپستی {selectedOrder.shippingAddress.postalCode}</p>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[500px] text-right text-sm">
                  <thead><tr className="border-b text-slate-500"><th className="p-3">محصول</th><th className="p-3">کد کالا</th><th className="p-3">تعداد</th><th className="p-3">قیمت واحد (ریال)</th><th className="p-3">جمع</th></tr></thead>
                  <tbody>{selectedOrder.items.map((item) => (
                    <tr key={item.productId} className="border-b">
                      <td className="p-3">{item.name}</td>
                      <td className="p-3">{item.sku}</td>
                      <td className="p-3">{Number(item.quantity).toLocaleString("fa-IR")}</td>
                      <td className="p-3">{Number(item.unitPrice).toLocaleString("fa-IR")}</td>
                      <td className="p-3">{Number(item.lineTotal).toLocaleString("fa-IR")}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="mt-5">
                <h3 className="font-bold">تاریخچه وضعیت</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {selectedOrder.history.map((entry, index) => (
                    <li key={`${entry.createdAt}-${index}`} className="rounded-lg border p-3">
                      {entry.previousStatus ? `${orderStatusLabel(entry.previousStatus)} ← ` : ""}
                      {orderStatusLabel(entry.status)}
                      {entry.note && <span> — {entry.note}</span>}
                      <span className="mr-2 text-xs text-slate-400">{entry.createdAt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {allowedOrderTransitions(selectedOrder.status).length > 0 && (
                <form onSubmit={updateOrderStatus} className="mt-5 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                  <select required value={nextOrderStatus} onChange={(event) => setNextOrderStatus(event.target.value)} className="rounded-xl border p-3">
                    <option value="">وضعیت بعدی</option>
                    {allowedOrderTransitions(selectedOrder.status).map((status) => <option key={status} value={status}>{orderStatusLabel(status)}</option>)}
                  </select>
                  <input value={orderNote} onChange={(event) => setOrderNote(event.target.value)} maxLength={500} placeholder="یادداشت اختیاری" className="rounded-xl border p-3" />
                  <button type="submit" disabled={saving || !nextOrderStatus} className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50">ثبت وضعیت</button>
                </form>
              )}
              <p className="mt-4 text-xs leading-5 text-amber-800">تغییر وضعیت سفارش، به‌تنهایی پرداخت را تأیید نمی‌کند. وضعیت پرداخت جداگانه و فعلاً در انتظار درگاه معتبر است.</p>
            </section>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
            <div className="my-auto w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-black">
                  {editingId ? "ویرایش محصول" : "ثبت محصول جدید"}
                </h2>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg bg-slate-100 p-2"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
                {[
                  ["name", "نام محصول", true],
                  ["slug", "شناسه انگلیسی محصول", true],
                  ["sku", "کد کالا (SKU)", true],
                  ["brand", "برند", false],
                  ["category", "دسته‌بندی", true],
                  ["basePrice", "قیمت پایه به ریال", false, "number"],
                  ["stock", "موجودی", true, "number"],
                ].map(([name, label, required, type]) => (
                  <label key={name} className="text-sm font-medium">
                    {label}
                    <input
                      name={name}
                      type={type || "text"}
                      min={type === "number" ? 0 : undefined}
                      step={type === "number" ? 1 : undefined}
                      required={required}
                      value={form[name]}
                      onChange={updateField}
                      className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-amber-500"
                    />
                  </label>
                ))}

                <label className="text-sm font-medium sm:col-span-2">
                  توضیحات محصول
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    maxLength={5000}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                  />
                </label>

                <div className="sm:col-span-2">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold">گالری تصاویر محصول</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        اولین تصویر، تصویر اصلی محصول خواهد بود.
                      </p>
                    </div>
                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs">
                      {gallery.length} از {MAX_IMAGES} تصویر
                    </span>
                  </div>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-center transition hover:border-amber-500 hover:bg-amber-50">
                    <Upload size={30} className="mb-3 text-slate-500" />
                    <span className="font-bold">انتخاب تصاویر از کامپیوتر</span>
                    <span className="mt-2 text-xs text-slate-500">
                      JPG، PNG یا WebP ـ حداکثر ۵ مگابایت برای هر تصویر
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={gallery.length >= MAX_IMAGES || saving}
                      onChange={handleImageSelection}
                      className="hidden"
                    />
                  </label>

                  {gallery.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {gallery.map((item, index) => (
                        <div
                          key={item.id}
                          className={`relative overflow-hidden rounded-xl border-2 bg-white ${
                            index === 0 ? "border-amber-500" : "border-slate-200"
                          }`}
                        >
                          <img
                            src={item.preview}
                            alt={`تصویر محصول ${index + 1}`}
                            className="h-32 w-full object-cover"
                          />

                          {index === 0 && (
                            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-xs font-bold text-white">
                              <Star size={12} fill="currentColor" />
                              تصویر اصلی
                            </span>
                          )}

                          <div className="flex items-center justify-between gap-1 p-2">
                            <button
                              type="button"
                              onClick={() => setMainImage(item.id)}
                              disabled={index === 0 || saving}
                              className="rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-800 disabled:opacity-40"
                            >
                              انتخاب اصلی
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(item.id)}
                              disabled={saving}
                              title="حذف تصویر"
                              className="rounded-lg bg-red-50 p-2 text-red-600 disabled:opacity-40"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="text-sm font-medium sm:col-span-2">
                  خودروهای سازگار (با کاما جدا کنید)
                  <input
                    name="compatibleVehicles"
                    value={form.compatibleVehicles}
                    onChange={updateField}
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                  />
                </label>

                <label className="text-sm font-medium sm:col-span-2">
                  برچسب‌ها (با کاما جدا کنید)
                  <input
                    name="tags"
                    value={form.tags}
                    onChange={updateField}
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                  />
                </label>

                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
                  قیمت فروش به‌صورت خودکار برابر قیمت پایه × ۱٫۱۹ محاسبه می‌شود.
                  اگر قیمت پایه خالی باشد، محصول بدون قیمت پایه ثبت می‌شود.
                </div>

                <div className="flex flex-wrap gap-3 pt-3 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-white disabled:opacity-50"
                  >
                    {saving ? (
                      <LoaderCircle className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    {uploading
                      ? "در حال بارگذاری تصاویر..."
                      : saving
                        ? "در حال ذخیره..."
                        : editingId
                          ? "ذخیره تغییرات"
                          : "ثبت محصول"}
                  </button>

                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-xl border px-6 py-3 disabled:opacity-50"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
