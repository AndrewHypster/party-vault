import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { signIn } from "@/auth";
import { DashboardClient } from "@/components/DashboardClient";
import { getHomeData } from "@/db/queries";
import { ArrowRight, ShieldCheck, Sparkles, Wallet } from "lucide-react";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0b0e14] text-sm text-slate-400">
          Завантажуємо твій простір…
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  await connection();
  const data = await getHomeData();

  if (data) {
    return <DashboardClient data={data} />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0e14] text-slate-100">
      <div className="pointer-events-none absolute -left-40 top-20 h-[480px] w-[480px] rounded-full bg-indigo-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-36 top-64 h-[440px] w-[440px] rounded-full bg-violet-600/10 blur-[120px]" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-white">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="text-base font-bold tracking-tight text-white">
            party vault
          </span>
        </Link>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button className="rounded-xl border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/[0.04]">
            Увійти
          </button>
        </form>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-12 sm:px-10 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[0.06] px-3 py-1.5 text-xs font-semibold text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            Спільні плани. Прозорий бюджет.
          </div>
          <h1 className="mt-7 text-5xl font-extrabold leading-[1.08] tracking-[-0.045em] text-white sm:text-6xl lg:text-[68px]">
            Гроші на
            <br />
            <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              хороші моменти
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            Збирайте на піцу, поїздки та кіно разом із друзями. Зберігайте
            внески, витрати й баланс у спільному місці — без таблиць і
            незручних нагадувань.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
            className="mt-8"
          >
            <button className="inline-flex h-12 items-center gap-3 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-slate-100">
              <GoogleMark />
              Продовжити з Google
              <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          </form>
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Твої дані та внески захищені налаштуваннями приватності
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[500px]">
          <div className="absolute -inset-8 rounded-[50%] bg-indigo-500/10 blur-3xl" />
          <div className="relative rounded-[30px] border border-white/[0.1] bg-[#111620]/90 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Пʼятнична піца
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  Спільна каса
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                7 учасників
              </span>
            </div>
            <div className="mt-7 rounded-2xl border border-white/[0.06] bg-[#0b0e14] p-5">
              <p className="text-xs font-medium text-slate-500">Зібрали разом</p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-white">
                4 850 <span className="text-xl text-slate-400">₴</span>
              </p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                <span>На вечір</span>
                <span>Ціль: 7 000 ₴</span>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {[
                ["🍕", "Піца на вечір", "Витрата · сьогодні", "−1 240 ₴", false],
                ["😎", "Внесок учасника", "Поповнення · вчора", "+500 ₴", true],
                ["🥤", "Напої та снеки", "Витрата · 10 лист.", "−320 ₴", false],
              ].map(([emoji, title, detail, amount, positive]) => (
                <div
                  key={String(title)}
                  className="flex items-center gap-3 rounded-xl px-2 py-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]">
                    {String(emoji)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-200">
                      {String(title)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {String(detail)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      positive ? "text-emerald-300" : "text-slate-300"
                    }`}
                  >
                    {String(amount)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 border-t border-white/[0.06] pt-4 text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-300" />
              Учасники бачать тільки те, що дозволив власник
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-7xl gap-4 px-6 pb-16 sm:grid-cols-3 sm:px-10">
        {[
          ["01", "Створи компанію", "Одна каса для всіх ваших спільних планів."],
          ["02", "Записуй кожен рух", "Хто вніс, скільки витратили та на що."],
          ["03", "Бачте повну картину", "Баланс, статистика та історія в одному місці."],
        ].map(([number, title, detail]) => (
          <article
            key={number}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"
          >
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-300">
              {number}
            </p>
            <h2 className="mt-3 text-sm font-bold text-white">{title}</h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <span aria-hidden="true" className="text-lg font-extrabold text-[#4285f4]">
      G
    </span>
  );
}
