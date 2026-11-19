
import { useCallback, useEffect, useState, useRef } from "react";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import {
  CartPanel,
  CheckoutModal,
  CustomerAccountModal,
  ProductDetailsModal,
} from "./components/ShopOverlays.jsx";
import { requestApi } from "./lib/api.js";

import {
  ShoppingCart,
  UserRound,
  Menu,
  ChevronLeft,
  ShieldCheck,
  Truck,
  Headphones,
  RotateCcw,
  Wrench,
  Disc3,
  BatteryCharging,
  Gauge,
  ArrowLeft,
  X,
  ShieldCheck as AdminIcon,
} from "lucide-react";

const categories = [
  { title: "قطعات موتوری", subtitle: "قطعات اصلی موتور", icon: Wrench },
  { title: "سیستم ترمز", subtitle: "دیسک، لنت و متعلقات", icon: Disc3 },
  { title: "برق و باتری", subtitle: "باتری و قطعات برقی", icon: BatteryCharging },
  { title: "لوازم مصرفی", subtitle: "فیلتر، روغن و...", icon: Gauge },
];

const productColors = [
  "from-slate-100 to-slate-200",
  "from-amber-50 to-orange-100",
  "from-blue-50 to-cyan-100",
  "from-emerald-50 to-teal-100",
];

function Header({ onAdminLogin, onCustomerAccount, onOpenCart, cartCount }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-amber-400">
            <Wrench size={25} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-950">کوروش کبیر</div>
            <div className="text-[10px] font-bold tracking-widest text-slate-500">
              AUTO PARTS STORE
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 lg:flex">
          <a href="#" className="text-amber-600">صفحه اصلی</a>
          <a href="#categories" className="transition hover:text-amber-600">دسته‌بندی کالاها</a>
          <a href="#products" className="transition hover:text-amber-600">محصولات</a>
          <a href="#about" className="transition hover:text-amber-600">درباره ما</a>
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onCustomerAccount} aria-label="حساب مشتری" title="حساب مشتری" className="rounded-xl border border-slate-200 p-3 text-slate-700 transition hover:bg-slate-100">
            <UserRound size={19} />
          </button>
          <button type="button" onClick={onOpenCart} aria-label="سبد خرید" className="relative rounded-xl bg-amber-400 p-3 text-slate-950 transition hover:bg-amber-300">
            <ShoppingCart size={19} />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 text-[10px] text-white">{Number(cartCount).toLocaleString("fa-IR")}</span>
          </button>
          <button type="button" onClick={onAdminLogin} aria-label="ورود مدیر" title="ورود مدیر" className="hidden rounded-xl border border-slate-200 p-3 text-slate-700 transition hover:bg-slate-100 sm:block">
            <AdminIcon size={19} />
          </button>
          <button aria-label="منو" className="rounded-xl border border-slate-200 p-3 text-slate-700 lg:hidden">
            <Menu size={19} />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute -bottom-48 left-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            همراه مطمئن خودروی شما
          </div>

          <h1 className="text-4xl font-black leading-[1.5] sm:text-5xl lg:text-6xl">
            قطعه درست،
            <span className="block text-amber-400">انتخاب مطمئن.</span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-8 text-slate-300 sm:text-base">
            خرید آسان لوازم و قطعات خودرو با اطلاعات شفاف، انتخاب دقیق و پشتیبانی تخصصی فروشگاه کوروش کبیر.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#products" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 py-4 font-black text-slate-950 transition hover:bg-amber-300">
              مشاهده محصولات <ArrowLeft size={18} />
            </a>
            <a href="#categories" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-7 py-4 font-bold text-white transition hover:bg-white/10">
              دسته‌بندی قطعات
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-amber-400" /> خرید مطمئن</span>
            <span className="flex items-center gap-2"><Truck size={17} className="text-amber-400" /> ارسال سفارش</span>
            <span className="flex items-center gap-2"><Headphones size={17} className="text-amber-400" /> پشتیبانی</span>
          </div>
        </div>

        <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
          <div className="absolute inset-5 rounded-[2rem] border border-dashed border-amber-400/20" />
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-[2.5rem] bg-amber-400 text-slate-950 shadow-2xl shadow-amber-400/20">
              <Wrench size={76} strokeWidth={1.5} />
            </div>
            <div className="text-2xl font-black">KOUROSH KABIR</div>
            <div className="mt-2 text-sm text-slate-400">AUTOMOTIVE PARTS</div>
          </div>
          <div className="absolute bottom-7 right-7 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-bold backdrop-blur">
            کیفیت و اطمینان در انتخاب
          </div>
        </div>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section id="categories" className="mx-auto max-w-7xl px-5 py-20">
      <div className="mb-9 flex items-end justify-between">
        <div>
          <p className="mb-2 text-xs font-black text-amber-600">CATEGORIES</p>
          <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">دسته‌بندی قطعات</h2>
          <p className="mt-3 text-sm text-slate-500">سریع‌تر به قطعه موردنظرت برس.</p>
        </div>
        <a href="#products" className="hidden items-center gap-2 text-sm font-bold text-slate-600 sm:flex">
          همه محصولات <ChevronLeft size={18} />
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <a key={category.title} href="#products" className="group rounded-2xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-slate-200/60">
              <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 transition group-hover:bg-amber-400">
                <Icon size={27} />
              </div>
              <h3 className="font-black text-slate-900">{category.title}</h3>
              <p className="mt-2 text-xs text-slate-500">{category.subtitle}</p>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function Products({ onAddToCart, onShowDetails, onProductsLoaded, reloadKey }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/products", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("دریافت محصولات از سرور ناموفق بود.");
        }

        const result = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error("ساختار اطلاعات دریافتی معتبر نیست.");
        }

        setProducts(result.data);
        onProductsLoaded(result.data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "ارتباط با سرور برقرار نشد.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, [retry, reloadKey, onProductsLoaded]);

  const formatPrice = (price) => {
    if (typeof price !== "number" || !Number.isFinite(price)) {
      return "قیمت نامشخص";
    }

    return new Intl.NumberFormat("fa-IR").format(price);
  };

  return (
    <section id="products" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-9 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-black text-amber-600">SELECTED PRODUCTS</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">محصولات منتخب</h2>
            <p className="mt-3 text-sm text-slate-500">
              محصولات ثبت‌شده در فروشگاه کوروش کبیر
            </p>
          </div>
          <a href="#categories" className="hidden items-center gap-2 text-sm font-bold text-slate-600 sm:flex">
            مشاهده همه <ChevronLeft size={18} />
          </a>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-600">
            در حال دریافت محصولات از سرور...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
            <p className="font-bold text-red-600">{error}</p>
            <button
              onClick={() => setRetry((value) => value + 1)}
              className="mt-5 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            هنوز محصولی در فروشگاه ثبت نشده است.
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((product, index) => (
              <article
                key={product.id}
                onClick={() => onShowDetails(product)}
                className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br ${productColors[index % productColors.length]}`}>
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <Wrench size={68} strokeWidth={1.1} className="text-slate-500/50" />
                  )}

                  {product.tags?.[0] && (
                    <span className="absolute right-3 top-3 rounded-lg bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-white">
                      {product.tags[0]}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onShowDetails(product);
                    }}
                    className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-white"
                  >
                    جزئیات
                  </button>
                </div>

                <div className="p-4">
                  <p className="text-[10px] font-bold text-slate-400">
                    {product.brand || "برند ثبت نشده"}
                  </p>

                  <h3 className="mt-2 text-sm font-black text-slate-900">
                    {product.name}
                  </h3>

                  <p className="mt-2 text-[10px] text-slate-500">
                    {product.category}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-black text-slate-950">
                        {product.price == null ? "نیازمند تأیید" : formatPrice(product.price)}
                        {product.price != null && <span className="text-[10px] font-medium text-slate-500"> ریال</span>}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        موجودی: {formatPrice(product.stock)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAddToCart(product);
                      }}
                      disabled={!product.stock || product.price == null}
                      aria-label="افزودن محصول به سبد خرید"
                      className="rounded-xl bg-amber-400 p-3 text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-200"
                    >
                      <ShoppingCart size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TrustSection() {
  const items = [
    { icon: ShieldCheck, title: "خرید مطمئن", text: "اطلاعات روشن و فرایند خرید شفاف" },
    { icon: Truck, title: "ارسال سفارش", text: "امکان پیگیری وضعیت سفارش" },
    { icon: Headphones, title: "پشتیبانی تخصصی", text: "راهنمایی برای انتخاب قطعه مناسب" },
    { icon: RotateCcw, title: "پیگیری و مرجوعی", text: "قوانین مشخص برای پیگیری سفارش" },
  ];

  return (
    <section id="about" className="mx-auto max-w-7xl px-5 py-16">
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Icon size={26} />
            </div>
            <h3 className="font-black text-slate-900">{title}</h3>
            <p className="mt-2 text-xs leading-6 text-slate-500">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <div className="text-xl font-black">کوروش کبیر</div>
          <p className="mt-2 text-xs text-slate-400">فروشگاه تخصصی لوازم و قطعات خودرو</p>
        </div>
        <p className="text-xs text-slate-500">© تمامی حقوق برای فروشگاه کوروش کبیر محفوظ است.</p>
      </div>
    </footer>
  );
}

// Smart chat widget with conversation history
function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "سلام! من دستیار هوشمند فروشگاه کوروش هستم. چطور می‌توانم کمکتان کنم؟",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!input.trim() || loading) return;

    const userMessage = input.trim();

    // Capture previous conversation before adding the new message.
    const history = messages
      .slice(-12)
      .map((msg) => ({
        sender: msg.sender,
        text: msg.text,
      }));

    setInput("");
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMessage },
    ]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "پاسخ مناسبی دریافت نشد.");
      }

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.reply },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: error.message || "خطا در ارتباط با سرور چت.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-black text-slate-950 shadow-2xl transition hover:bg-amber-300"
        >
          <Headphones size={20} />
          مشاوره آنلاین
        </button>
      )}

      {isOpen && (
        <div className="flex h-[450px] w-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[360px]">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <h3 className="text-sm font-black">دستیار هوشمند کوروش</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-6 ${
                  msg.sender === "user"
                    ? "self-start bg-amber-400 font-bold text-slate-950"
                    : "self-end border border-slate-200 bg-white text-slate-800 shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div className="self-end rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs italic text-slate-400 shadow-sm">
                در حال نوشتن...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex border-t border-slate-200 bg-white p-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="سوال خود را درباره قطعات بپرسید..."
              disabled={loading}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="mr-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ارسال
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("koroush.cart") || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (item) =>
        item &&
        typeof item.productId === "string" &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0
    );
  } catch {
    return [];
  }
}

function App() {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [cart, setCart] = useState(loadCart);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productsReload, setProductsReload] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerAccount, setShowCustomerAccount] = useState(false);
  const [resumeCheckout, setResumeCheckout] = useState(false);
  const [notice, setNotice] = useState("");

  const handleProductsLoaded = useCallback((products) => {
    setCatalogProducts(products);
  }, []);

  useEffect(() => {
    let active = true;
    requestApi("/api/auth/customer/me")
      .then((result) => {
        if (active) setCustomer(result.user);
      })
      .catch((error) => {
        if (active && error.status !== 401) {
          setNotice("بررسی نشست مشتری انجام نشد؛ برای سفارش دوباره وارد شوید.");
        }
      });
    return () => { active = false; };
  }, []);

  function updateCart(nextCart) {
    setCart(nextCart);
    try {
      localStorage.setItem("koroush.cart", JSON.stringify(nextCart));
    } catch {
      setNotice("ذخیره سبد در مرورگر انجام نشد؛ پیش از بستن صفحه خرید را کامل کنید.");
    }
  }

  function addToCart(product) {
    if (!product.stock || product.price == null) {
      setNotice("این محصول موجود نیست یا قیمتش هنوز تأیید نشده است.");
      return;
    }

    const currentQuantity = cart.find((item) => item.productId === product.id)?.quantity || 0;
    if (currentQuantity >= product.stock) {
      setNotice("تعداد درخواستی از موجودی بیشتر است.");
      return;
    }

    const existing = cart.find((item) => item.productId === product.id);
    updateCart(existing
      ? cart.map((item) => item.productId === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item)
      : [...cart, { productId: product.id, quantity: 1 }]);
    setNotice(`${product.name} به سبد خرید اضافه شد.`);
  }

  function changeCartQuantity(productId, quantity) {
    if (quantity < 1) {
      updateCart(cart.filter((item) => item.productId !== productId));
      return;
    }

    const product = catalogProducts.find((item) => item.id === productId);
    if (!product || quantity > product.stock) {
      setNotice("تعداد درخواستی از موجودی بیشتر است.");
      return;
    }

    updateCart(cart.map((item) =>
      item.productId === productId ? { ...item, quantity } : item
    ));
  }

  function startCheckout() {
    setShowCart(false);
    if (!customer) {
      setResumeCheckout(true);
      setShowCustomerAccount(true);
      return;
    }

    setShowCheckout(true);
  }

  async function placeOrder({ items, shippingAddress, requestKey }) {
    const result = await requestApi("/api/orders", {
      method: "POST",
      headers: { "Idempotency-Key": requestKey },
      body: JSON.stringify({ items, shippingAddress }),
    });
    updateCart([]);
    setShowCheckout(false);
    setProductsReload((value) => value + 1);
    setNotice(`سفارش ${result.data.id.slice(0, 8)} ثبت شد؛ پرداخت هنوز تأیید نشده است.`);
  }

  if (adminUser) {
    return <AdminDashboard onLogout={() => setAdminUser(null)} />;
  }

  if (showAdminLogin) {
    return <AdminLogin onBack={() => setShowAdminLogin(false)} onLogin={setAdminUser} />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans text-slate-900">
      <Header
        onAdminLogin={() => setShowAdminLogin(true)}
        onCustomerAccount={() => setShowCustomerAccount(true)}
        onOpenCart={() => setShowCart(true)}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
      />
      {notice && (
        <div role="status" className="fixed inset-x-4 top-20 z-[60] mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <p>{notice}</p>
            <button type="button" onClick={() => setNotice("")} aria-label="بستن پیام"><X size={18} /></button>
          </div>
        </div>
      )}
      <main>
        <Hero />
        <Categories />
        <Products
          onAddToCart={addToCart}
          onShowDetails={setSelectedProduct}
          onProductsLoaded={handleProductsLoaded}
          reloadKey={productsReload}
        />
        <TrustSection />
      </main>
      <Footer />
      <ChatWidget />
      {selectedProduct && (
        <ProductDetailsModal
          key={selectedProduct.id}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}
      {showCart && (
        <CartPanel
          items={cart}
          products={catalogProducts}
          onChangeQuantity={changeCartQuantity}
          onRemove={(productId) => updateCart(cart.filter((item) => item.productId !== productId))}
          onClose={() => setShowCart(false)}
          onCheckout={startCheckout}
        />
      )}
      {showCustomerAccount && (
        <CustomerAccountModal
          customer={customer}
          onAuthenticated={(user) => {
            setCustomer(user);
            setShowCustomerAccount(false);
            if (resumeCheckout) {
              setShowCheckout(true);
              setResumeCheckout(false);
            }
          }}
          onLoggedOut={() => {
            setCustomer(null);
            setShowCustomerAccount(false);
            setNotice("از حساب مشتری خارج شدید.");
          }}
          onClose={() => {
            setShowCustomerAccount(false);
            setResumeCheckout(false);
          }}
        />
      )}
      {showCheckout && customer && (
        <CheckoutModal
          items={cart}
          customer={customer}
          onClose={() => setShowCheckout(false)}
          onPlaceOrder={placeOrder}
        />
      )}
    </div>
  );
}

export default App;
