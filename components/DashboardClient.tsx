"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  Plus,
  Search,
  Settings2,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  createCompany,
  requestToJoin,
  signOutUser,
  updateProfile,
} from "@/db/actions";

type CompanyCard = {
  id: string;
  name: string;
  description: string;
  isMember: boolean;
  memberCount: number;
  balance: number | null;
  membershipStatus?: string | null;
};

type DashboardData = {
  user: {
    id: string;
    name: string;
    email: string | null;
    firstName: string;
    lastName: string;
    middleName: string | null;
    avatar: string | null;
  };
  myCompanies: CompanyCard[];
  discover: CompanyCard[];
};

const money = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 0,
});
const avatarOptions = ["🙂", "😎", "🦊", "🐼", "🐸", "🐱", "🐻", "🦄"];

function Avatar({
  emoji,
  size = "md",
}: {
  emoji: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-9 w-9 text-lg",
    md: "h-11 w-11 text-xl",
    lg: "h-14 w-14 text-2xl",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.06] ${sizes[size]}`}
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}

function Modal({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080b12]/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-heading"
        className="w-full max-w-md rounded-[28px] border border-white/[0.1] bg-[#111620] p-6 shadow-2xl shadow-black/50"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300">
              {eyebrow}
            </p>
            <h2
              id="modal-heading"
              className="mt-2 text-xl font-bold tracking-tight text-white"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const [dialog, setDialog] = useState<"company" | "profile" | null>(null);
  const [search, setSearch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [firstName, setFirstName] = useState(data.user.firstName);
  const [lastName, setLastName] = useState(data.user.lastName);
  const [middleName, setMiddleName] = useState(data.user.middleName ?? "");
  const [avatar, setAvatar] = useState(data.user.avatar ?? "🙂");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  const fullName =
    [data.user.firstName, data.user.lastName].filter(Boolean).join(" ") ||
    data.user.name;
  const visibleCompanies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uk");
    if (!query) return data.discover;
    return data.discover.filter((company) =>
      `${company.name} ${company.description}`
        .toLocaleLowerCase("uk")
        .includes(query),
    );
  }, [data.discover, search]);

  const runAction = (
    action: () => Promise<void>,
    successMessage: string,
    onSuccess?: () => void,
  ) => {
    setNotice("");
    startTransition(async () => {
      try {
        await action();
        setNotice(successMessage);
        onSuccess?.();
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Не вдалося виконати дію.",
        );
      }
    });
  };

  const handleCreateCompany = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runAction(
      () =>
        createCompany({
          name: companyName,
          description: companyDescription,
        }),
      "Компанію створено.",
    );
  };

  const handleUpdateProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runAction(
      () => updateProfile({ firstName, lastName, middleName, avatar }),
      "Профіль оновлено.",
      () => setDialog(null),
    );
  };

  const memberCount = data.myCompanies.reduce(
    (total, company) => total + company.memberCount,
    0,
  );
  const combinedBalance = data.myCompanies.reduce(
    (total, company) => total + (company.balance ?? 0),
    0,
  );

  return (
    <main className="min-h-screen bg-[#0b0e14] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1480px]">
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/[0.06] px-5 py-7 lg:flex">
          <Link href="/" className="flex items-center gap-3 px-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-950/60">
              <Wallet className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight text-white">
                party vault
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                shared moments
              </span>
            </span>
          </Link>

          <div className="mt-12 space-y-1">
            <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
              Меню
            </p>
            <a
              href="#overview"
              className="flex items-center gap-3 rounded-xl bg-indigo-500/10 px-3 py-3 text-sm font-semibold text-indigo-200"
            >
              <Wallet className="h-4 w-4" /> Огляд
            </a>
            <a
              href="#my-companies"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <Users className="h-4 w-4" /> Мої компанії
            </a>
            <a
              href="#discover"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <Compass className="h-4 w-4" /> Знайти компанію
            </a>
          </div>

          <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Shield className="h-4 w-4 text-emerald-400" />
              Приватність під контролем
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Власник компанії сам обирає, які внески бачать учасники.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0b0e14]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
            <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  Четвер, 12 листопада
                </p>
                <h1 className="mt-1 truncate text-lg font-bold tracking-tight text-white">
                  Привіт, {data.user.firstName || fullName.split(" ")[0]}{" "}
                  <span aria-hidden="true">✦</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setDialog("company")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 sm:px-4"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Створити компанію</span>
                  <span className="sm:hidden">Створити</span>
                </button>
                <button
                  type="button"
                  aria-label="Налаштувати профіль"
                  onClick={() => setDialog("profile")}
                  className="rounded-2xl transition hover:ring-2 hover:ring-indigo-400/70"
                >
                  <Avatar emoji={data.user.avatar ?? "🙂"} />
                </button>
              </div>
            </div>
          </header>

          <div
            id="overview"
            className="mx-auto max-w-[1120px] space-y-9 px-5 py-8 sm:px-8 sm:py-10"
          >
            {notice && (
              <div
                role="status"
                className="flex items-center justify-between rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-sm text-indigo-100"
              >
                {notice}
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  aria-label="Закрити повідомлення"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <section className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <div className="relative overflow-hidden rounded-[26px] border border-indigo-400/20 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 shadow-2xl shadow-indigo-950/35 sm:p-8">
                <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex h-full flex-col justify-between gap-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
                      <Wallet className="h-4 w-4" />
                      Загальний баланс компаній
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/85">
                      Мої каси
                    </span>
                  </div>
                  <div>
                    <p className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                      {money.format(combinedBalance)}{" "}
                      <span className="text-2xl font-semibold text-indigo-100">
                        ₴
                      </span>
                    </p>
                    <p className="mt-2 text-sm text-indigo-100/80">
                      Баланс усіх компаній, до яких ти приєднався
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-5 border-t border-white/15 pt-4 text-xs font-medium text-indigo-100">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      {data.myCompanies.length}{" "}
                      {data.myCompanies.length === 1 ? "компанія" : "компаній"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {memberCount} учасників разом
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-[26px] border border-white/[0.07] bg-[#111620] p-6 sm:p-7">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-300">
                      Твій простір
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Збирайте на спільні плани
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                    <Bell className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-8">
                  <p className="text-2xl font-bold text-white">
                    {data.myCompanies.length === 0
                      ? "Почни з друзями"
                      : "Кожна зустріч — у балансі"}
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                    Створюй касу для поїздок, піци, кіно та інших спільних
                    моментів.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDialog("company")}
                  className="mt-6 flex items-center gap-2 text-sm font-semibold text-indigo-300 transition hover:text-indigo-200"
                >
                  Створити компанію <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section id="my-companies">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                    Твоя компанія
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                    Мої компанії
                  </h2>
                </div>
                <span className="text-xs text-slate-500">
                  {data.myCompanies.length} активних
                </span>
              </div>

              {data.myCompanies.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {data.myCompanies.map((company, index) => (
                    <Link
                      key={company.id}
                      href={`/company/${company.id}`}
                      className="group rounded-[22px] border border-white/[0.07] bg-[#111620] p-5 transition hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-[#141a26]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${
                            index % 3 === 0
                              ? "bg-amber-400/10"
                              : index % 3 === 1
                                ? "bg-cyan-400/10"
                                : "bg-violet-400/10"
                          }`}
                        >
                          {["🍕", "🎬", "🚗"][index % 3]}
                        </span>
                        <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                          Учасник
                        </span>
                      </div>
                      <h3 className="mt-5 truncate text-base font-bold text-white">
                        {company.name}
                      </h3>
                      <p className="mt-1 min-h-5 truncate text-xs text-slate-500">
                        {company.description || "Спільна каса друзів"}
                      </p>
                      <div className="mt-5 flex items-end justify-between border-t border-white/[0.06] pt-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Баланс
                          </p>
                          <p className="mt-1 text-lg font-bold text-white">
                            {money.format(company.balance ?? 0)} ₴
                          </p>
                        </div>
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Users className="h-3.5 w-3.5" />
                          {company.memberCount}
                          <ArrowRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-1 group-hover:text-indigo-300" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/[0.12] bg-white/[0.015] px-6 py-10 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-300">
                    <Users className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-white">
                    Тут зʼявляться твої компанії
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    Створи власну касу або надішли запит до компанії друзів.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDialog("company")}
                    className="mt-5 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
                  >
                    Створити компанію
                  </button>
                </div>
              )}
            </section>

            <section id="discover">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                    Спільнота
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                    Знайти компанію
                  </h2>
                </div>
                <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[#111620] px-3 text-slate-500 sm:w-64">
                  <Search className="h-4 w-4 shrink-0" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Пошук компаній"
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                    aria-label="Пошук компаній"
                  />
                </label>
              </div>

              {visibleCompanies.length ? (
                <div className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#111620]">
                  {visibleCompanies.map((company, index) => {
                    const status = company.membershipStatus;
                    return (
                      <article
                        key={company.id}
                        className={`flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5 ${
                          index > 0 ? "border-t border-white/[0.06]" : ""
                        }`}
                      >
                        <div className="flex min-w-[220px] flex-1 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-lg">
                            {["🪩", "🏕️", "🍿", "🎮"][index % 4]}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-white">
                              {company.name}
                            </h3>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {company.description || "Компанія друзів"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {company.memberCount}
                          </span>
                          {company.balance !== null && (
                            <span className="min-w-20 text-right font-semibold text-slate-200">
                              {money.format(company.balance)} ₴
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={pending || status === "pending"}
                          onClick={() =>
                            runAction(
                              () => requestToJoin(company.id),
                              "Запит на вступ надіслано власнику.",
                            )
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.1] px-3 text-xs font-semibold text-slate-200 transition hover:border-indigo-400/40 hover:bg-indigo-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {status === "pending" ? (
                            <>
                              <Bell className="h-3.5 w-3.5" /> Запит надіслано
                            </>
                          ) : status === "rejected" ? (
                            "Надіслати знову"
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" /> Подати запит
                            </>
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[22px] border border-white/[0.07] bg-[#111620] px-5 py-9 text-center text-sm text-slate-500">
                  {search
                    ? "За цим запитом компаній не знайдено."
                    : "Поки немає відкритих компаній для вступу."}
                </div>
              )}
            </section>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-xs text-slate-600">
              <span>Party Vault · Спільний бюджет без зайвих питань</span>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <CircleHelp className="h-3.5 w-3.5" /> Довідка
                </span>
                <form action={signOutUser}>
                  <button className="inline-flex items-center gap-1.5 transition hover:text-slate-300">
                    Вийти <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" />
                  </button>
                </form>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {dialog === "company" && (
        <Modal
          title="Нова компанія"
          eyebrow="Спільна каса"
          onClose={() => setDialog(null)}
        >
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <label className="block space-y-2 text-xs font-semibold text-slate-400">
              Назва компанії
              <input
                autoFocus
                required
                maxLength={60}
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Наприклад, Пʼятнична піца"
                className="h-11 w-full rounded-xl border border-white/[0.1] bg-[#0b0e14] px-3 text-sm text-white outline-none transition focus:border-indigo-400/60"
              />
            </label>
            <label className="block space-y-2 text-xs font-semibold text-slate-400">
              Короткий опис <span className="font-normal">(необовʼязково)</span>
              <textarea
                maxLength={240}
                rows={3}
                value={companyDescription}
                onChange={(event) => setCompanyDescription(event.target.value)}
                placeholder="На що збираєтесь разом?"
                className="w-full resize-none rounded-xl border border-white/[0.1] bg-[#0b0e14] px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400/60"
              />
            </label>
            <p className="text-xs leading-5 text-slate-500">
              Ти станеш власником і зможеш додавати внески, витрати та
              налаштовувати приватність.
            </p>
            <button
              disabled={pending || !companyName.trim()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {pending ? "Створюємо…" : "Створити компанію"}
            </button>
          </form>
        </Modal>
      )}

      {dialog === "profile" && (
        <Modal
          title="Твій профіль"
          eyebrow="Особисті дані"
          onClose={() => setDialog(null)}
        >
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">
                Обери смайлик
              </p>
              <div className="flex flex-wrap gap-2">
                {avatarOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAvatar(option)}
                    aria-label={`Аватар ${option}`}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                      avatar === option
                        ? "border-indigo-400 bg-indigo-400/15"
                        : "border-white/[0.08] bg-[#0b0e14] hover:border-white/20"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            {[
              {
                label: "Імʼя",
                value: firstName,
                onChange: setFirstName,
                required: true,
              },
              {
                label: "Прізвище",
                value: lastName,
                onChange: setLastName,
                required: false,
              },
              {
                label: "По батькові",
                value: middleName,
                onChange: setMiddleName,
                required: false,
              },
            ].map(({ label, value, onChange, required }) => (
              <label
                key={label}
                className="block space-y-2 text-xs font-semibold text-slate-400"
              >
                {label}
                <input
                  required={required}
                  maxLength={50}
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.1] bg-[#0b0e14] px-3 text-sm text-white outline-none transition focus:border-indigo-400/60"
                />
              </label>
            ))}
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Settings2 className="h-3.5 w-3.5" />
              {data.user.email}
            </p>
            <button
              disabled={pending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Зберегти зміни
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
