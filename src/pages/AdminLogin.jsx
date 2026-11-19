
import { useState } from "react";
import {
  ShieldCheck,
  LockKeyhole,
  Smartphone,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

function AdminLogin({ onBack, onLogin }) {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedMobile = mobile.trim();

    if (!/^09\d{9}$/.test(normalizedMobile)) {
      setError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
      return;
    }

    if (!password) {
      setError("رمز عبور را وارد کنید.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobile: normalizedMobile,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "ورود انجام نشد.");
        return;
      }

      onLogin?.(result.user);
    } catch {
      setError("ارتباط با سرور برقرار نشد. اتصال سرور را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-950 flex items-center justify-center p-5"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 mb-5 shadow-lg shadow-amber-400/20">
            <ShieldCheck size={34} />
          </div>

          <h1 className="text-2xl font-black text-white">
            پنل مدیریت کوروش کبیر
          </h1>

          <p className="text-slate-400 mt-3 text-sm">
            برای ورود به بخش مدیریت، اطلاعات حساب خود را وارد کنید.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-2xl">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-900">
              ورود مدیر
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              دسترسی اختصاصی و محافظت‌شده
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                شماره موبایل
              </label>

              <div className="relative">
                <Smartphone
                  size={19}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="username"
                  maxLength={11}
                  value={mobile}
                  onChange={(event) =>
                    setMobile(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="09xxxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pr-12 pl-4 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                رمز عبور
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="رمز عبور مدیر"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pr-12 pl-12 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? "مخفی کردن رمز" : "نمایش رمز"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700"
              >
                <AlertCircle size={19} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoaderCircle size={20} className="animate-spin" />
                  در حال بررسی...
                </>
              ) : (
                <>
                  ورود به پنل مدیریت
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={15} className="text-emerald-600" />
              ارتباط با سرور و احراز هویت سمت سرور
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="w-full mt-6 text-sm text-slate-400 hover:text-white transition"
        >
          بازگشت به فروشگاه
        </button>
      </div>
    </div>
  );
}

export default AdminLogin;
