import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { requestApi } from "../lib/api.js";

function ProductDetailsModal({ product, onClose, onAddToCart }) {
  const images = product.images || [];
  const [selectedImage, setSelectedImage] = useState(images[0] || "");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`جزئیات ${product.name}`}
        className="my-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">{product.name}</h2>
          <button type="button" onClick={onClose} aria-label="بستن" className="rounded-lg bg-slate-100 p-2">
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {selectedImage ? (
                <img src={selectedImage} alt={product.name} className="h-full w-full object-contain" />
              ) : (
                <span className="text-sm text-slate-500">تصویری برای این محصول ثبت نشده است.</span>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    aria-label={`تصویر ${index + 1}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${selectedImage === image ? "border-amber-500" : "border-slate-200"}`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-amber-700">{product.category}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">برند</dt><dd className="font-bold">{product.brand || "ثبت نشده"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">کد کالا</dt><dd className="font-bold">{product.sku}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">موجودی</dt><dd className="font-bold">{product.stock > 0 ? `${Number(product.stock).toLocaleString("fa-IR")} عدد` : "ناموجود"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">قیمت</dt><dd className="font-black">{product.price == null ? "نیازمند تأیید قیمت" : `${Number(product.price).toLocaleString("fa-IR")} ریال`}</dd></div>
            </dl>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{product.description || "توضیحی برای این محصول ثبت نشده است."}</p>
            {!!product.compatibleVehicles?.length && (
              <p className="mt-4 text-xs leading-6 text-slate-600">
                خودروهای سازگار: {product.compatibleVehicles.join("، ")}
              </p>
            )}
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={!product.stock || product.price == null}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              <ShoppingCart size={18} />
              {!product.stock ? "ناموجود" : product.price == null ? "قیمت تأیید نشده" : "افزودن به سبد"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CartPanel({ items, products, onChangeQuantity, onRemove, onClose, onCheckout }) {
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const hasUnavailableItem = items.some((item) => {
    const product = productById.get(item.productId);
    return !product || product.price == null || item.quantity > product.stock;
  });
  const total = items.reduce((sum, item) => {
    const product = productById.get(item.productId);
    return product?.price != null ? sum + product.price * item.quantity : sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/60">
      <section role="dialog" aria-modal="true" aria-label="سبد خرید" className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <h2 className="flex items-center gap-2 text-lg font-black"><ShoppingCart size={20} /> سبد خرید</h2>
          <button type="button" onClick={onClose} aria-label="بستن سبد خرید" className="rounded-lg bg-slate-100 p-2"><X size={20} /></button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {items.length === 0 && <p className="py-12 text-center text-sm text-slate-500">سبد خرید خالی است.</p>}
          {items.map((item) => {
            const product = productById.get(item.productId);
            return (
              <article key={item.productId} className="flex gap-3 rounded-xl border p-3">
                {product?.images?.[0] && <img src={product.images[0]} alt="" className="h-20 w-20 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{product?.name || "محصول حذف‌شده"}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {product?.price == null ? "قیمت نیازمند تأیید" : `${Number(product.price).toLocaleString("fa-IR")} ریال`}
                  </p>
                  {product && item.quantity > product.stock && <p className="mt-1 text-xs text-red-600">موجودی کافی نیست.</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => onChangeQuantity(item.productId, item.quantity - 1)} aria-label="کاهش تعداد" className="rounded-md bg-slate-100 p-1.5"><Minus size={15} /></button>
                    <span className="min-w-6 text-center text-sm">{item.quantity}</span>
                    <button type="button" onClick={() => onChangeQuantity(item.productId, item.quantity + 1)} disabled={!product || item.quantity >= product.stock} aria-label="افزایش تعداد" className="rounded-md bg-slate-100 p-1.5 disabled:opacity-40"><Plus size={15} /></button>
                    <button type="button" onClick={() => onRemove(item.productId)} aria-label="حذف محصول" className="mr-auto rounded-md p-1.5 text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <footer className="space-y-3 border-t p-5">
          <div className="flex justify-between font-black">
            <span>جمع اقلام</span><span>{Number(total).toLocaleString("fa-IR")} ریال</span>
          </div>
          <p className="text-xs leading-5 text-slate-500">هزینه ارسال در این نسخه محاسبه نمی‌شود و در مبلغ بالا لحاظ نشده است.</p>
          <button type="button" onClick={onCheckout} disabled={!items.length || hasUnavailableItem} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-40">
            ادامه و ثبت سفارش <ArrowLeft size={17} />
          </button>
        </footer>
      </section>
    </div>
  );
}

function CustomerAccountModal({ customer, onAuthenticated, onLoggedOut, onClose }) {
  const [mode, setMode] = useState("login");
  const [mobile, setMobile] = useState(customer?.mobile || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!customer) return;
    let active = true;
    requestApi("/api/orders")
      .then((result) => {
        if (active) setOrders(result.data || []);
      }).catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => { active = false; };
  }, [customer]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/customer/login";
      const result = await requestApi(endpoint, {
        method: "POST",
        body: JSON.stringify({ mobile, password }),
      });
      onAuthenticated(result.user);
      setPassword("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setError("");
    try {
      await requestApi("/api/auth/customer/logout", { method: "POST" });
      onLoggedOut();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function showOrder(orderId) {
    setError("");
    try {
      const result = await requestApi(`/api/orders/${encodeURIComponent(orderId)}`);
      setSelectedOrder(result.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
      <section role="dialog" aria-modal="true" aria-label="حساب مشتری" className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <header className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">{customer ? "حساب مشتری" : mode === "register" ? "ثبت‌نام مشتری" : "ورود مشتری"}</h2>
          <button type="button" onClick={onClose} aria-label="بستن" className="rounded-lg bg-slate-100 p-2"><X size={20} /></button>
        </header>
        {customer ? (
          <>
            <p className="text-sm text-slate-600">شماره موبایل: <b dir="ltr">{customer.mobile}</b></p>
            <h3 className="mt-6 font-bold">سفارش‌های شما</h3>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {orders.length === 0 && <p className="text-sm text-slate-500">هنوز سفارشی ثبت نشده است.</p>}
              {orders.map((order) => (
                <button key={order.id} type="button" onClick={() => showOrder(order.id)} className="flex w-full items-center justify-between rounded-lg border p-3 text-right text-sm hover:bg-slate-50">
                  <span>{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleDateString("fa-IR")}</span>
                  <span>{Number(order.totalAmount).toLocaleString("fa-IR")} ریال · {order.paymentStatus === "pending" ? "در انتظار پرداخت" : order.paymentStatus}</span>
                </button>
              ))}
            </div>
            {selectedOrder && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-6">
                <p>وضعیت سفارش: {selectedOrder.status} · پرداخت: {selectedOrder.paymentStatus === "pending" ? "در انتظار پرداخت" : selectedOrder.paymentStatus}</p>
                {selectedOrder.items.map((item) => <p key={item.productId}>{item.name} × {item.quantity} — {Number(item.lineTotal).toLocaleString("fa-IR")} ریال</p>)}
              </div>
            )}
            <button type="button" onClick={logout} disabled={loading} className="mt-5 w-full rounded-xl border border-red-200 py-3 font-bold text-red-700 disabled:opacity-50">
              {loading ? "در حال خروج..." : "خروج از حساب"}
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-bold">شماره موبایل
              <input required autoComplete="username" inputMode="numeric" pattern="09[0-9]{9}" maxLength={11} value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))} className="mt-2 w-full rounded-xl border p-3" placeholder="09xxxxxxxxx" />
            </label>
            <label className="block text-sm font-bold">رمز عبور
              <input required minLength={mode === "register" ? 12 : 1} maxLength={128} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border p-3" />
            </label>
            {mode === "register" && <p className="text-xs leading-5 text-slate-500">رمز عبور باید حداقل ۱۲ نویسه باشد. در این نسخه تأیید شماره از طریق پیامک ارائه نمی‌شود.</p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-slate-950 py-3 font-bold text-white disabled:opacity-50">
              {loading ? "در حال بررسی..." : mode === "register" ? "ساخت حساب" : "ورود"}
            </button>
            <button type="button" onClick={() => { setError(""); setMode(mode === "register" ? "login" : "register"); }} className="w-full text-sm font-bold text-amber-700">
              {mode === "register" ? "حساب دارم؛ ورود" : "حساب ندارم؛ ثبت‌نام"}
            </button>
          </form>
        )}
        {error && customer && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>
    </div>
  );
}

function makeRequestKey() {
  return window.crypto.randomUUID();
}

function CheckoutModal({ items, customer, onClose, onPlaceOrder }) {
  const [address, setAddress] = useState({
    recipientName: "",
    recipientMobile: customer?.mobile || "",
    province: "",
    city: "",
    addressLine: "",
    postalCode: "",
  });
  const [requestKey] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("koroush.checkout-key") || "null");
      if (saved?.key) return saved.key;
      const key = makeRequestKey();
      sessionStorage.setItem("koroush.checkout-key", JSON.stringify({ key }));
      return key;
    } catch {
      return makeRequestKey();
    }
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateAddress(event) {
    const { name, value } = event.target;
    setAddress((previous) => ({ ...previous, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onPlaceOrder({
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
        shippingAddress: address,
        requestKey,
      });
      sessionStorage.removeItem("koroush.checkout-key");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    ["recipientName", "نام گیرنده", "text"],
    ["recipientMobile", "موبایل گیرنده", "tel"],
    ["province", "استان", "text"],
    ["city", "شهر", "text"],
    ["postalCode", "کد پستی ۱۰ رقمی", "text"],
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
      <section role="dialog" aria-modal="true" aria-label="ثبت سفارش" className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <header className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">نشانی و ثبت سفارش</h2>
          <button type="button" onClick={onClose} aria-label="بستن" className="rounded-lg bg-slate-100 p-2"><X size={20} /></button>
        </header>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, type]) => (
            <label key={name} className="text-sm font-bold">{label}
              <input
                name={name}
                type={type}
                required
                minLength={name === "recipientName" || name === "province" || name === "city" ? 2 : undefined}
                maxLength={name === "recipientMobile" || name === "postalCode" ? 11 : 120}
                pattern={name === "recipientMobile" ? "09[0-9]{9}" : name === "postalCode" ? "[0-9]{10}" : undefined}
                inputMode={name === "recipientMobile" || name === "postalCode" ? "numeric" : undefined}
                value={address[name]}
                onChange={updateAddress}
                className="mt-2 w-full rounded-xl border p-3"
              />
            </label>
          ))}
          <label className="text-sm font-bold sm:col-span-2">نشانی کامل
            <textarea name="addressLine" required minLength={10} maxLength={500} rows={3} value={address.addressLine} onChange={updateAddress} className="mt-2 w-full rounded-xl border p-3" />
          </label>
          <div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 sm:col-span-2">
            هزینه ارسال در این نسخه محاسبه نمی‌شود. درگاه پرداخت تنظیم نشده است؛ سفارش پس از ثبت در وضعیت «در انتظار پرداخت» می‌ماند و پرداخت موفقی اعلام نمی‌شود.
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
          <button type="submit" disabled={saving || !requestKey} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2">
            {saving ? <LoaderCircle size={18} className="animate-spin" /> : <ChevronLeft size={18} />}
            {saving ? "در حال ثبت..." : "ثبت سفارش"}
          </button>
        </form>
      </section>
    </div>
  );
}

export {
  CartPanel,
  CheckoutModal,
  CustomerAccountModal,
  ProductDetailsModal,
};
