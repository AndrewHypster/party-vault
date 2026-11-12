import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CompanyDashboardClient } from "@/components/CompanyDashboardClient";
import { CompanyInviteClient } from "@/components/CompanyInviteClient";
import { getCompanyDashboard } from "@/db/queries";

export default function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0b0e14] text-sm text-slate-400">
          Завантажуємо касу…
        </main>
      }
    >
      <CompanyContent params={params} />
    </Suspense>
  );
}

async function CompanyContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const data = await getCompanyDashboard(id);

  if (!data) {
    notFound();
  }

  if (data.kind === "invite") {
    return <CompanyInviteClient data={data} />;
  }

  return <CompanyDashboardClient data={data} />;
}
