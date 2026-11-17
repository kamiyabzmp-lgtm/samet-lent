
import {
  Search,
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
  Star,
  ArrowLeft,
} from "lucide-react";

const categories = [
  { title: "قطعات موتوری", subtitle: "قطعات اصلی موتور", icon: Wrench },
  { title: "سیستم ترمز", subtitle: "دیسک، لنت و متعلقات", icon: Disc3 },
  { title: "برق و باتری", subtitle: "باتری و قطعات برقی", icon: BatteryCharging },
  { title: "لوازم مصرفی", subtitle: "فیلتر، روغن و...", icon: Gauge },
];

const products = [
  { name: "لنت ترمز جلو", brand: "نمونه محصول", price: "۱,۸۵۰,۰۰۰", oldPrice: "۲,۱۰۰,۰۰۰", tag: "پرفروش", color: "from-slate-100 to-slate-200" },
  { name: "فیلتر روغن خودرو", brand: "نمونه محصول", price: "۳۸۰,۰۰۰", oldPrice: null, tag: "پیشنهاد ویژه", color: "from-amber-50 to-orange-100" },
  { name: "باتری خودرو", brand: "نمونه محصول", price: "۴,۹۰۰,۰۰۰", oldPrice: null, tag: "جدید", color: "from-blue-50 to-cyan-100" },
  { name: "شمع موتور", brand: "نمونه محصول", price: "۶۵۰,۰۰۰", oldPrice: "۷۲۰,۰۰۰", tag: null, color: "from-emerald-50 to-teal-100" },
];

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-amber-400">
            <Wrench size={25} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-950">کوروش کبیر</div>
            <div className="text-[10px] font-bold tracking-widest text-slate-500">AUTO PARTS STORE</div>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 lg:flex">
          <a href="#" className="text-amber-600">صفحه اصلی</a>
          <a href="#categories" className="transition hover:text-amber-600">دسته‌بندی کالاها</a>
          <a href="#products" className="transition hover:text-amber-600">محصولات</a>
          <a href="#about" className="transition hover:text-amber-600">درباره ما</a>
        </nav>

        <div className="flex items-center gap-2">
          <button aria-label="حساب کاربری" className="hidden rounded-xl border border-slate-200 p-3 text-slate-700 transition hover:bg-slate-100 sm:block">
            <UserRound size={19} />
          </button>
          <button aria-label="سبد خرید" className="relative rounded-xl bg-amber-400 p-3 text-slate-950 transition hover:bg-amber-300">
            <ShoppingCart size={19} />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 text-[10px] text-white">۰</span>
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

function Products() {
  return (
    <section id="products" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-9 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-black text-amber-600">SELECTED PRODUCTS</p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">محصولات منتخب</h2>
            <p className="mt-3 text-sm text-slate-500">نمونه نمایشی محصولات فروشگاه</p>
          </div>
          <a href="#categories" className="hidden items-center gap-2 text-sm font-bold text-slate-600 sm:flex">
            مشاهده همه <ChevronLeft size={18} />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <article key={product.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl">
              <div className={`relative flex aspect-square items-center justify-center bg-gradient-to-br ${product.color}`}>
                <Wrench size={68} strokeWidth={1.1} className="text-slate-500/50" />
                {product.tag && <span className="absolute right-3 top-3 rounded-lg bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-white">{product.tag}</span>}
                <button aria-label="افزودن به علاقه‌مندی‌ها" className="absolute left-3 top-3 rounded-full bg-white/80 p-2 text-slate-600 hover:text-red-500">
                  <Star size={16} />
                </button>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold text-slate-400">{product.brand}</p>
                <h3 className="mt-2 text-sm font-black text-slate-900">{product.name}</h3>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-black text-slate-950">{product.price} <span className="text-[10px] font-medium text-slate-500">تومان</span></div>
                    {product.oldPrice && <div className="mt-1 text-[10px] text-slate-400 line-through">{product.oldPrice} تومان</div>}
                  </div>
                  <button aria-label="افزودن محصول به سبد خرید" className="rounded-xl bg-amber-400 p-3 text-slate-950 transition hover:bg-amber-300">
                    <ShoppingCart size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
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

function App() {
  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans text-slate-900">
      <Header />
      <main>
        <Hero />
        <Categories />
        <Products />
        <TrustSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
