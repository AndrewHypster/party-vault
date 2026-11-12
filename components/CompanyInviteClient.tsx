"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, LockKeyhole, Plus, Users } from "lucide-react";
import { requestToJoin } from "@/db/actions";

type InviteData = {
  company: {
    id: string;
    name: string;
    description: string;
    isPublic: boolean;
    showBalancePublicly: boolean;
  };
  balance: number | null;
  memberCount: number;
  membershipStatus: string;
};

const money = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

export function CompanyInviteClient({ data }: { data: InviteData }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");

  const submitRequest = () => {
    setNotice("");
    startTransition(async () => {
      try {
        await requestToJoin(data.company.id);
        setNotice("Запит на вступ надіслано власнику компанії.");
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Не вдалося подати запит.",
        );
      }
    });
  };

  const isPending = data.membershipStatus === "pending";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e14] px-4 py-10 text-slate-100">
      <section className="w-full max-w-lg rounded-[28px] border border-white/[0.08] bg-[#111620] p-6 shadow-2xl shadow-black/30 sm:p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> До компаній
        </Link>
        <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-300">
          {data.company.isPublic ? (
            <Users className="h-6 w-6" />
          ) : (
            <LockKeyhole className="h-6 w-6" />
          )}
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
          Запрошення до компанії
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
          {data.company.name}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {data.company.description || "Спільна каса друзів"}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Учасників
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {data.memberCount}
            </p>
          </div>
          {data.company.showBalancePublicly && data.balance !== null && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Баланс
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {money.format(data.balance)} ₴
              </p>
            </div>
          )}
        </div>

        {notice && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-3 py-2.5 text-xs leading-5 text-indigo-100"
          >
            {notice}
          </p>
        )}

        <button
          type="button"
          onClick={submitRequest}
          disabled={pending || isPending}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Check className="h-4 w-4" /> Запит очікує на розгляд
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {data.membershipStatus === "rejected"
                ? "Подати запит повторно"
                : "Подати запит на вступ"}
            </>
          )}
        </button>
      </section>
    </main>
  );
}
