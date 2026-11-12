"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  ReceiptText,
  Settings,
  Shield,
  Trash2,
  UserMinus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  cancelCompanyDeletionVote,
  createTransaction,
  removeCompanyMember,
  reviewJoinRequest,
  startCompanyDeletionVote,
  updateCompanySettings,
  voteOnCompanyDeletion,
} from "@/db/actions";

type Visibility = "everyone" | "owner" | "names";

type CompanyData = {
  company: {
    id: string;
    name: string;
    description: string;
    isOwner: boolean;
    contributionVisibility: Visibility;
    isPublic: boolean;
    showBalancePublicly: boolean;
    createdAt: string;
  };
  balance: number;
  income: number;
  expenses: number;
  memberCount: number;
  currentUserId: string;
  members: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    avatar: string | null;
    role: string;
    displayName: string;
    joinedAt: string;
    contributed: number;
  }[];
  transactions: {
    id: string;
    type: string;
    title: string;
    amount: number | null;
    comment: string | null;
    isCash: boolean;
    createdAt: string | null;
    contributorId: string | null;
    contributorName: string;
    recordedByName: string | null;
  }[];
  monthly: { month: string; income: number; expenses: number }[];
  pendingRequests: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    createdAt: string;
    displayName: string;
  }[];
  deletionVote: {
    id: string;
    initiatedById: string;
    createdAt: string;
    expiresAt: string;
    totalVoters: number;
    majority: number;
    yesCount: number;
    currentUserVote: boolean | null;
    voters: {
      id: string;
      displayName: string;
      avatar: string | null;
      vote: boolean | null;
    }[];
  } | null;
};

const money = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
const monthFormat = new Intl.DateTimeFormat("uk-UA", { month: "short" });
const dateFormat = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Kyiv",
});
const joinedDateFormat = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Kyiv",
});

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
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
        aria-labelledby="company-modal-heading"
        className="w-full max-w-md rounded-[26px] border border-white/[0.1] bg-[#111620] p-6 shadow-2xl shadow-black/50"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="company-modal-heading"
            className="text-lg font-bold tracking-tight text-white"
          >
            {title}
          </h2>
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

export function CompanyDashboardClient({ data }: { data: CompanyData }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"income" | "expense" | "settings" | null>(
    null,
  );
  const [transactionTitle, setTransactionTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [cash, setCash] = useState(false);
  const [contributorId, setContributorId] = useState(data.currentUserId);
  const [isPublic, setIsPublic] = useState(data.company.isPublic);
  const [showBalance, setShowBalance] = useState(
    data.company.showBalancePublicly,
  );
  const [visibility, setVisibility] = useState<Visibility>(
    data.company.contributionVisibility,
  );
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const canSeeContributionStats =
    data.company.isOwner || visibility === "everyone";

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

  const submitTransaction = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const type = dialog === "income" ? "INCOME" : "EXPENSE";
    runAction(
      () =>
        createTransaction({
          companyId: data.company.id,
          type,
          userId: type === "INCOME" ? contributorId : undefined,
          title: transactionTitle,
          amount: Number(amount),
          comment,
          isCash: cash,
        }),
      type === "INCOME" ? "Внесок додано до каси." : "Витрату записано.",
      () => {
        setDialog(null);
        setTransactionTitle("");
        setAmount("");
        setComment("");
        setCash(false);
      },
    );
  };

  const submitSettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runAction(
      () =>
        updateCompanySettings({
          companyId: data.company.id,
          isPublic,
          showBalancePublicly: showBalance,
          contributionVisibility: visibility,
        }),
      "Налаштування збережено.",
      () => setDialog(null),
    );
  };

  const handleStartDeletionVote = () => {
    if (
      !window.confirm(
        "Почати голосування за видалення компанії? Ваш голос «за» буде зараховано одразу.",
      )
    ) {
      return;
    }

    setNotice("");
    startTransition(async () => {
      try {
        const result = await startCompanyDeletionVote(data.company.id);
        setDialog(null);
        if (result.deleted) {
          router.replace("/");
          return;
        }
        setNotice("Голосування за видалення компанії розпочато.");
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Не вдалося почати голосування.",
        );
      }
    });
  };

  const handleDeletionVote = (vote: boolean) => {
    if (!data.deletionVote) return;

    setNotice("");
    startTransition(async () => {
      try {
        const result = await voteOnCompanyDeletion(
          data.company.id,
          data.deletionVote!.id,
          vote,
        );
        if (result.deleted) {
          router.replace("/");
          return;
        }
        setNotice(
          result.expired
            ? "Термін голосування завершився. Компанію не видалено."
            : "Ваш голос зараховано.",
        );
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Не вдалося зарахувати голос.",
        );
      }
    });
  };

  const maxMonthlyAmount = Math.max(
    1,
    ...data.monthly.flatMap((month) => [month.income, month.expenses]),
  );
  const canContribute = data.company.isOwner || data.members.length > 0;

  return (
    <main className="min-h-screen bg-[#0b0e14] text-slate-100">
      <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-7 sm:py-8">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="На головну"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#111620] text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Спільна каса
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="max-w-[70vw] truncate text-lg font-bold text-white sm:max-w-none sm:text-xl">
                  {data.company.name}
                </h1>
                <span className="rounded-full border border-indigo-400/15 bg-indigo-400/[0.08] px-2.5 py-1 text-[10px] font-semibold text-indigo-200">
                  {data.company.isOwner ? "Власник" : "Учасник"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-400 transition hover:text-white sm:flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Компанії
            </Link>
            {data.company.isOwner && (
              <button
                type="button"
                onClick={() => setDialog("settings")}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#111620] px-3 text-xs font-semibold text-slate-300 transition hover:border-white/15 hover:text-white"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Налаштування</span>
              </button>
            )}
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-sm text-indigo-100"
          >
            {notice}
            <button type="button" onClick={() => setNotice("")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="relative overflow-hidden rounded-[26px] border border-indigo-400/20 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 shadow-xl shadow-indigo-950/25 sm:p-8">
            <div className="absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between text-indigo-100">
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Баланс каси
                </span>
                <Wallet className="h-4 w-4" />
              </div>
              <p className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                {money.format(data.balance)}{" "}
                <span className="text-2xl font-semibold text-indigo-100">₴</span>
              </p>
              <p className="mt-2 text-sm text-indigo-100/80">
                {data.company.description || "На ваші спільні плани"}
              </p>
              <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/15 pt-5">
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-indigo-100/80">
                    <ArrowDownLeft className="h-3.5 w-3.5" /> Усього внесків
                  </p>
                  <p className="mt-1.5 text-lg font-bold text-white">
                    {money.format(data.income)} ₴
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-indigo-100/80">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Усього витрат
                  </p>
                  <p className="mt-1.5 text-lg font-bold text-white">
                    {money.format(data.expenses)} ₴
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-[26px] border border-white/[0.07] bg-[#111620] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Учасники</p>
                <p className="mt-1 text-xs text-slate-500">
                  Спільна мета — спільна каса
                </p>
              </div>
              <a
                href="#members"
                aria-label="Переглянути список учасників"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300 transition hover:bg-indigo-400/15"
              >
                <Users className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-5 flex items-center">
              {data.members.slice(0, 5).map((member, index) => (
                <span
                  key={member.id}
                  title={member.displayName}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#111620] bg-[#202838] text-lg ${
                    index > 0 ? "-ml-2" : ""
                  }`}
                >
                  {member.avatar ?? "🙂"}
                </span>
              ))}
              {data.memberCount > 5 && (
                <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#111620] bg-[#202838] text-[10px] font-bold text-slate-300">
                  +{data.memberCount - 5}
                </span>
              )}
              <span className="ml-3 text-xs text-slate-400">
                {data.memberCount}{" "}
                {data.memberCount === 1 ? "учасник" : "учасників"}
              </span>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 text-xs text-slate-400">
              <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              {data.company.contributionVisibility === "everyone"
                ? "Внески видимі всім учасникам"
                : data.company.contributionVisibility === "names"
                  ? "Імена внесків видимі учасникам"
                  : "Внески видимі лише власнику"}
            </div>
            {data.company.isOwner && (
              <button
                type="button"
                onClick={() => setDialog("settings")}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
              >
                Налаштувати приватність
              </button>
            )}
          </div>
        </section>

        {data.deletionVote && (
          <section className="mt-4 rounded-[24px] border border-rose-400/20 bg-rose-400/[0.04] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
                  <AlertTriangle className="h-4 w-4" />
                  Голосування за видалення
                </p>
                <h2 className="mt-2 text-base font-bold text-white">
                  Потрібно «за»: {data.deletionVote.yesCount} /{" "}
                  {data.deletionVote.majority}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Голос власника вже враховано; ще потрібна більшість інших
                  активних учасників до{" "}
                  {dateFormat.format(new Date(data.deletionVote.expiresAt))}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.deletionVote.currentUserVote === null ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDeletionVote(true)}
                      className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      За
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDeletionVote(false)}
                      className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50"
                    >
                      Проти
                    </button>
                  </>
                ) : (
                  <span className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-300">
                    Ваш голос:{" "}
                    {data.deletionVote.currentUserVote ? "за" : "проти"}
                  </span>
                )}
                {data.company.isOwner && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      runAction(
                        () =>
                          cancelCompanyDeletionVote(
                            data.company.id,
                            data.deletionVote!.id,
                          ),
                        "Голосування скасовано.",
                      )
                    }
                    className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-400 transition hover:text-white disabled:opacity-50"
                  >
                    Скасувати
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-rose-400 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (data.deletionVote.yesCount /
                      data.deletionVote.majority) *
                      100,
                  )}%`,
                }}
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.deletionVote.voters.map((voter) => (
                <div
                  key={voter.id}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#111620]/70 px-3 py-2"
                >
                  <span className="text-base">{voter.avatar ?? "🙂"}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
                    {voter.displayName}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      voter.vote === true
                        ? "text-emerald-300"
                        : voter.vote === false
                          ? "text-rose-300"
                          : "text-slate-500"
                    }`}
                  >
                    {voter.vote === true
                      ? "За"
                      : voter.vote === false
                        ? "Проти"
                        : "Очікує"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[24px] border border-white/[0.07] bg-[#111620] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Огляд за місяцями
                </p>
                <h2 className="mt-1 text-base font-bold text-white">
                  Внески та витрати
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-sm bg-indigo-400" /> Внески
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-sm bg-rose-400/80" /> Витрати
                </span>
              </div>
            </div>
            <div className="mt-7 flex h-44 items-end gap-3 border-b border-white/[0.07] pb-2 sm:gap-5">
              {data.monthly.length ? (
                data.monthly.map((month) => {
                  const incomeHeight = Math.max(
                    3,
                    (month.income / maxMonthlyAmount) * 100,
                  );
                  const expenseHeight = Math.max(
                    3,
                    (month.expenses / maxMonthlyAmount) * 100,
                  );
                  const monthDate = new Date(`${month.month}-01T12:00:00`);
                  return (
                    <div
                      key={month.month}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div className="flex h-[calc(100%-22px)] w-full max-w-12 items-end justify-center gap-1">
                        <div
                          title={`Внески: ${money.format(month.income)} ₴`}
                          className="min-h-[3px] w-1/2 rounded-t-md bg-indigo-400 transition hover:bg-indigo-300"
                          style={{ height: `${incomeHeight}%` }}
                        />
                        <div
                          title={`Витрати: ${money.format(month.expenses)} ₴`}
                          className="min-h-[3px] w-1/2 rounded-t-md bg-rose-400/70 transition hover:bg-rose-300"
                          style={{ height: `${expenseHeight}%` }}
                        />
                      </div>
                      <span className="text-[10px] capitalize text-slate-500">
                        {monthFormat.format(monthDate).replace(".", "")}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                  Дані зʼявляться після перших внесків і витрат
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
              <span>Гривень за місяць</span>
              <span>Останні 6 місяців</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/[0.07] bg-[#111620] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Учасники
                </p>
                <h2 className="mt-1 text-base font-bold text-white">
                  Хто поповнював
                </h2>
              </div>
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            {canSeeContributionStats ? (
              <div className="mt-4 space-y-3">
                {[...data.members]
                  .sort((a, b) => b.contributed - a.contributed)
                  .slice(0, 5)
                  .map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-lg">
                        {member.avatar ?? "🙂"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-200">
                          {member.displayName}
                        </p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-indigo-400"
                            style={{
                              width: `${
                                data.income
                                  ? Math.min(
                                      100,
                                      (member.contributed / data.income) * 100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-300">
                        {money.format(member.contributed)} ₴
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-5 text-slate-400">
                Статистика внесків доступна лише власнику. Учасники бачать
                історію каси відповідно до налаштувань приватності.
              </div>
            )}
          </div>
        </section>

        <section
          id="members"
          className="mt-4 rounded-[24px] border border-white/[0.07] bg-[#111620] p-5 sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Склад компанії
              </p>
              <h2 className="mt-1 text-base font-bold text-white">
                Учасники ({data.members.length})
              </h2>
            </div>
            <Users className="h-4 w-4 text-slate-500" />
          </div>
          <div className="divide-y divide-white/[0.06]">
            {data.members.map((member) => (
              <article
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-lg">
                    {member.avatar ?? "🙂"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {member.displayName}
                      {member.id === data.currentUserId && (
                        <span className="ml-2 text-[10px] font-medium text-slate-500">
                          це ви
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Приєднався{" "}
                      {joinedDateFormat.format(new Date(member.joinedAt))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {member.role === "owner" && (
                    <span className="rounded-full border border-indigo-400/15 bg-indigo-400/[0.08] px-2.5 py-1 text-[10px] font-semibold text-indigo-200">
                      Власник
                    </span>
                  )}
                  {data.company.isOwner && member.role !== "owner" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Видалити ${member.displayName} з компанії?`,
                          )
                        ) {
                          runAction(
                            () =>
                              removeCompanyMember(
                                data.company.id,
                                member.id,
                              ),
                            `${member.displayName} видалено з компанії.`,
                          );
                        }
                      }}
                      aria-label={`Видалити ${member.displayName} з компанії`}
                      title="Видалити учасника"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/10 text-rose-300/70 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-50"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {data.company.isOwner && data.pendingRequests.length > 0 && (
          <section className="mt-4 rounded-[24px] border border-amber-400/15 bg-amber-400/[0.035] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
                  Потрібна дія
                </p>
                <h2 className="mt-1 text-base font-bold text-white">
                  Запити на вступ ({data.pendingRequests.length})
                </h2>
              </div>
              <Users className="h-4 w-4 text-amber-300" />
            </div>
            <div className="space-y-2">
              {data.pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#111620] px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-lg">
                      {request.avatar ?? "🙂"}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      {request.displayName}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        runAction(
                          () =>
                            reviewJoinRequest(
                              data.company.id,
                              request.id,
                              false,
                            ),
                          "Запит відхилено.",
                        )
                      }
                      className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-400 transition hover:text-white disabled:opacity-50"
                    >
                      Відхилити
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        runAction(
                          () =>
                            reviewJoinRequest(
                              data.company.id,
                              request.id,
                              true,
                            ),
                          "Учасника додано до компанії.",
                        )
                      }
                      className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      Прийняти
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 rounded-[24px] border border-white/[0.07] bg-[#111620] p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Останні записи
              </p>
              <h2 className="mt-1 text-base font-bold text-white">
                Історія каси
              </h2>
            </div>
            {canContribute && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDialog("income")}
                  className="flex h-9 items-center gap-2 rounded-xl bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Додати внесок
                </button>
                {data.company.isOwner && (
                  <button
                    type="button"
                    onClick={() => setDialog("expense")}
                    className="flex h-9 items-center gap-2 rounded-xl bg-rose-500/10 px-3 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                  >
                    <ReceiptText className="h-3.5 w-3.5" />
                    Витрата
                  </button>
                )}
              </div>
            )}
          </div>

          {data.transactions.length ? (
            <div className="divide-y divide-white/[0.06]">
              {data.transactions.map((transaction) => {
                const isIncome = transaction.type === "INCOME";
                return (
                  <article
                    key={transaction.id}
                    className="flex items-center gap-3 py-3.5 first:pt-1"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isIncome
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-rose-400/10 text-rose-300"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-200">
                          {transaction.title}
                        </p>
                        {transaction.isCash && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Banknote className="h-3 w-3" /> Готівка
                          </span>
                        )}
                      </div>
                      {transaction.comment && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {transaction.comment}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-500">
                        {isIncome
                          ? `Вніс: ${transaction.contributorName}`
                          : `Записав: ${transaction.recordedByName ?? "Учасник"}`}
                        {isIncome &&
                          transaction.recordedByName &&
                          transaction.recordedByName !==
                            transaction.contributorName &&
                          ` · Записав: ${transaction.recordedByName}`}
                        <span className="mx-1.5 text-slate-700">·</span>
                        {transaction.createdAt
                          ? dateFormat.format(new Date(transaction.createdAt))
                          : "Деталі приховано"}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-bold ${
                        isIncome ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {transaction.amount === null
                        ? "Внесок"
                        : `${isIncome ? "+" : "−"}${money.format(transaction.amount)} ₴`}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/[0.09] px-4 py-10 text-center">
              <ReceiptText className="mx-auto h-5 w-5 text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-300">
                Поки немає транзакцій
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Додайте перший внесок, щоб почати вести касу.
              </p>
            </div>
          )}
        </section>

        <footer className="flex items-center justify-between py-6 text-[11px] text-slate-600">
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-slate-300">
            <ArrowLeft className="h-3.5 w-3.5" /> До компаній
          </Link>
          <span>Party Vault · Баланс друзів</span>
        </footer>
      </div>

      {(dialog === "income" || dialog === "expense") && (
        <Modal
          title={dialog === "income" ? "Додати внесок" : "Записати витрату"}
          onClose={() => setDialog(null)}
        >
          <form onSubmit={submitTransaction} className="space-y-4">
            <label className="block space-y-2 text-xs font-semibold text-slate-400">
              {dialog === "income" ? "За що внесок?" : "На що пішли гроші?"}
              <input
                autoFocus
                required
                maxLength={80}
                value={transactionTitle}
                onChange={(event) => setTransactionTitle(event.target.value)}
                placeholder={
                  dialog === "income" ? "Поповнення каси" : "Піца, кіно, поїздка"
                }
                className="h-11 w-full rounded-xl border border-white/[0.1] bg-[#0b0e14] px-3 text-sm text-white outline-none transition focus:border-indigo-400/60"
              />
            </label>
            {dialog === "income" && data.company.isOwner && (
              <label className="block space-y-2 text-xs font-semibold text-slate-400">
                Хто вніс?
                <span className="relative block">
                  <select
                    value={contributorId}
                    onChange={(event) => setContributorId(event.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-white/[0.1] bg-[#0b0e14] px-3 pr-9 text-sm text-white outline-none focus:border-indigo-400/60"
                  >
                    {data.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </span>
              </label>
            )}
            <label className="block space-y-2 text-xs font-semibold text-slate-400">
              Сума, ₴
              <input
                type="number"
                min="1"
                max="1000000000"
                step="1"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="500"
                className="h-11 w-full rounded-xl border border-white/[0.1] bg-[#0b0e14] px-3 text-sm text-white outline-none transition focus:border-indigo-400/60"
              />
            </label>
            <label className="block space-y-2 text-xs font-semibold text-slate-400">
              Коментар <span className="font-normal">(необовʼязково)</span>
              <input
                maxLength={240}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Наприклад, дві великі піци"
                className="h-11 w-full rounded-xl border border-white/[0.1] bg-[#0b0e14] px-3 text-sm text-white outline-none transition focus:border-indigo-400/60"
              />
            </label>
            <button
              type="button"
              onClick={() => setCash((value) => !value)}
              className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${
                cash
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                  : "border-white/[0.08] text-slate-400 hover:bg-white/[0.03]"
              }`}
            >
              <Banknote className="h-4 w-4" />
              {cash ? "Готівка" : "Позначити як готівку"}
            </button>
            <button
              disabled={pending || !transactionTitle.trim() || !amount}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 ${
                dialog === "income"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {pending ? "Зберігаємо…" : "Зберегти запис"}
            </button>
          </form>
        </Modal>
      )}

      {dialog === "settings" && data.company.isOwner && (
        <Modal
          title="Налаштування компанії"
          onClose={() => setDialog(null)}
        >
          <form onSubmit={submitSettings} className="space-y-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-200">
                  Дозволити пошук компанії
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Інші зможуть знайти компанію та подати запит на вступ.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={showBalance}
                onChange={(event) => setShowBalance(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-200">
                  Показувати баланс у пошуку
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Інакше баланс побачать лише учасники компанії.
                </span>
              </span>
            </label>
            <label className="block space-y-2 text-xs font-semibold text-slate-400">
              Хто бачить деталі внесків
              <span className="relative block">
                <select
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(event.target.value as Visibility)
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-white/[0.1] bg-[#0b0e14] px-3 pr-9 text-sm text-white outline-none focus:border-indigo-400/60"
                >
                  <option value="everyone">
                    Усі учасники — імʼя та сума внеску
                  </option>
                  <option value="names">
                    Імʼя видно, статистика внесків — лише власнику
                  </option>
                  <option value="owner">Імʼя та внески — лише власнику</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </span>
            </label>
            <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs leading-5 text-slate-500">
              {visibility === "owner" ? (
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              )}
              Історія каси та загальні суми доходів і витрат доступні всім
              учасникам.
            </div>
            <button
              disabled={pending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Зберегти налаштування
            </button>
            <div className="border-t border-rose-400/15 pt-5">
              <p className="text-sm font-semibold text-rose-200">
                Видалити компанію
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Голос власника «за» враховується окремо. Для видалення також
                потрібна більшість інших активних учасників. На голосування
                дається 7 днів.
              </p>
              <button
                type="button"
                disabled={pending || Boolean(data.deletionVote)}
                onClick={handleStartDeletionVote}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {data.deletionVote
                  ? "Голосування вже триває"
                  : "Розпочати голосування"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
