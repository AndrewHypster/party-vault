import "server-only";

import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  companiesTable,
  membershipsTable,
  transactionsTable,
  usersTable,
} from "@/db/schema";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

type Company = typeof companiesTable.$inferSelect;

function isContributionVisibility(
  value: string,
): value is "everyone" | "owner" | "names" {
  return value === "everyone" || value === "owner" || value === "names";
}

async function getCompanyTotals(companyId: string) {
  const [totals] = await getDb()
    .select({
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'INCOME' THEN ABS(${transactionsTable.amount}) ELSE 0 END), 0)`,
      expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'EXPENSE' THEN ABS(${transactionsTable.amount}) ELSE 0 END), 0)`,
      memberCount: sql<number>`(SELECT COUNT(*) FROM ${membershipsTable} WHERE ${membershipsTable.companyId} = ${companyId} AND ${membershipsTable.status} = 'active')`,
    })
    .from(transactionsTable)
    .where(eq(transactionsTable.companyId, companyId));

  const income = Number(totals?.income ?? 0);
  const expenses = Number(totals?.expenses ?? 0);

  return {
    income,
    expenses,
    balance: income - expenses,
    memberCount: Number(totals?.memberCount ?? 0),
  };
}

async function toCompanyCard(company: Company, isMember: boolean) {
  const totals = await getCompanyTotals(company.id);
  return {
    id: company.id,
    name: company.name,
    description: company.description,
    isMember,
    memberCount: totals.memberCount,
    balance:
      isMember || company.showBalancePublicly ? totals.balance : null,
  };
}

export async function getHomeData() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const db = getDb();
  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      middleName: usersTable.middleName,
      avatar: usersTable.avatar,
    })
    .from(usersTable)
    .where(eq(usersTable.id, session.user.id))
    .limit(1);

  if (!user) {
    throw new Error("Профіль не знайдено. Спробуйте увійти ще раз.");
  }

  const memberships = await db
    .select({ company: companiesTable })
    .from(membershipsTable)
    .innerJoin(
      companiesTable,
      eq(membershipsTable.companyId, companiesTable.id),
    )
    .where(
      and(
        eq(membershipsTable.userId, user.id),
        eq(membershipsTable.status, "active"),
      ),
    )
    .orderBy(desc(companiesTable.createdAt));

  const memberCompanyIds = memberships.map(({ company }) => company.id);
  const publicCompanies = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.isPublic, true))
    .orderBy(desc(companiesTable.createdAt))
    .limit(30);

  const discoveryCompanies = publicCompanies.filter(
    (company) => !memberCompanyIds.includes(company.id),
  );
  const membershipStatuses = await db
    .select({
      companyId: membershipsTable.companyId,
      status: membershipsTable.status,
    })
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, user.id));
  const statusByCompany = new Map(
    membershipStatuses.map(({ companyId, status }) => [companyId, status]),
  );

  const [myCompanies, discover] = await Promise.all([
    Promise.all(
      memberships.map(({ company }) => toCompanyCard(company, true)),
    ),
    Promise.all(
      discoveryCompanies.map(async (company) => ({
        ...(await toCompanyCard(company, false)),
        membershipStatus: statusByCompany.get(company.id) ?? null,
      })),
    ),
  ]);

  return { user, myCompanies, discover };
}

export async function getCompanyDashboard(companyId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const db = getDb();
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);

  if (!company) {
    return null;
  }
  if (!isContributionVisibility(company.contributionVisibility)) {
    throw new Error("У компанії збережено некоректні налаштування приватності.");
  }

  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.companyId, companyId),
        eq(membershipsTable.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership || membership.status !== "active") {
    const totals = await getCompanyTotals(companyId);
    return {
      kind: "invite" as const,
      company: {
        id: company.id,
        name: company.name,
        description: company.description,
        isPublic: company.isPublic,
        showBalancePublicly: company.showBalancePublicly,
      },
      balance: company.showBalancePublicly ? totals.balance : null,
      memberCount: totals.memberCount,
      membershipStatus: membership?.status ?? "none",
    };
  }

  const isOwner = company.ownerId === session.user.id;
  const members = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      name: usersTable.name,
      avatar: usersTable.avatar,
      role: membershipsTable.role,
    })
    .from(membershipsTable)
    .innerJoin(usersTable, eq(membershipsTable.userId, usersTable.id))
    .where(
      and(
        eq(membershipsTable.companyId, companyId),
        eq(membershipsTable.status, "active"),
      ),
    );
  const [totals, transactionRows, pendingRequests] = await Promise.all([
    getCompanyTotals(companyId),
    db
      .select({
        id: transactionsTable.id,
        type: transactionsTable.type,
        title: transactionsTable.title,
        amount: transactionsTable.amount,
        comment: transactionsTable.comment,
        isCash: transactionsTable.isCash,
        createdAt: transactionsTable.createdAt,
        userId: transactionsTable.userId,
        recordedById: transactionsTable.recordedById,
        contributorFirstName: usersTable.firstName,
        contributorName: usersTable.name,
        contributorAvatar: usersTable.avatar,
      })
      .from(transactionsTable)
      .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
      .where(eq(transactionsTable.companyId, companyId))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(100),
    isOwner
      ? db
          .select({
            id: membershipsTable.id,
            name: usersTable.name,
            firstName: usersTable.firstName,
            lastName: usersTable.lastName,
            avatar: usersTable.avatar,
            createdAt: membershipsTable.createdAt,
          })
          .from(membershipsTable)
          .innerJoin(usersTable, eq(membershipsTable.userId, usersTable.id))
          .where(
            and(
              eq(membershipsTable.companyId, companyId),
              eq(membershipsTable.status, "pending"),
            ),
          )
      : Promise.resolve([]),
  ]);

  const recordedByIds = [
    ...new Set(
      transactionRows
        .map((transaction) => transaction.recordedById)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const recorders = recordedByIds.length
    ? await db
        .select({
          id: usersTable.id,
          firstName: usersTable.firstName,
          name: usersTable.name,
        })
        .from(usersTable)
        .where(inArray(usersTable.id, recordedByIds))
    : [];
  const recorderNames = new Map(
    recorders.map((recorder) => [
      recorder.id,
      recorder.firstName || recorder.name,
    ]),
  );
  const canSeeContributionDetails =
    isOwner || company.contributionVisibility !== "owner";
  const canSeeContributionStats =
    isOwner || company.contributionVisibility === "everyone";
  const hideContributionDetails =
    !isOwner && company.contributionVisibility !== "everyone";

  const transactions = transactionRows.map((transaction) => {
    const hideIncomeDetails =
      transaction.type === "INCOME" && hideContributionDetails;

    return {
      id: transaction.id,
      type: transaction.type,
      title: hideIncomeDetails ? "Внесок учасника" : transaction.title,
      amount: hideIncomeDetails ? null : Math.abs(transaction.amount),
      comment: hideIncomeDetails ? null : transaction.comment,
      isCash: hideIncomeDetails ? false : transaction.isCash,
      createdAt: hideIncomeDetails
        ? null
        : transaction.createdAt.toISOString(),
      contributorId: hideIncomeDetails ? null : transaction.userId,
      contributorName: canSeeContributionDetails
        ? transaction.contributorFirstName ||
          transaction.contributorName ||
          "Учасник"
        : "Анонімно",
      recordedByName:
        transaction.recordedById && !hideIncomeDetails
          ? recorderNames.get(transaction.recordedById) ?? "Учасник"
          : null,
    };
  });

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const monthlyRows = await db
    .select({
      month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${transactionsTable.createdAt}), 'YYYY-MM')`,
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'INCOME' THEN ABS(${transactionsTable.amount}) ELSE 0 END), 0)`,
      expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'EXPENSE' THEN ABS(${transactionsTable.amount}) ELSE 0 END), 0)`,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.companyId, companyId),
        gte(transactionsTable.createdAt, sixMonthsAgo),
      ),
    )
    .groupBy(sql`DATE_TRUNC('month', ${transactionsTable.createdAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${transactionsTable.createdAt})`);
  const monthly = monthlyRows.map((row) => ({
    month: row.month,
    income: Number(row.income),
    expenses: Number(row.expenses),
  }));

  const contributionRows = canSeeContributionStats
    ? await db
        .select({
          userId: transactionsTable.userId,
          total: sql<number>`COALESCE(SUM(ABS(${transactionsTable.amount})), 0)`,
        })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.companyId, companyId),
            eq(transactionsTable.type, "INCOME"),
          ),
        )
        .groupBy(transactionsTable.userId)
    : [];
  const memberTotals = new Map(
    contributionRows
      .filter((row) => row.userId)
      .map((row) => [row.userId as string, Number(row.total)]),
  );

  return {
    kind: "dashboard" as const,
    company: {
      id: company.id,
      name: company.name,
      description: company.description,
      isOwner,
      contributionVisibility: company.contributionVisibility,
      isPublic: company.isPublic,
      showBalancePublicly: company.showBalancePublicly,
      createdAt: company.createdAt.toISOString(),
    },
    balance: totals.balance,
    income: totals.income,
    expenses: totals.expenses,
    memberCount: totals.memberCount,
    members: members.map((member) => ({
      ...member,
      displayName: member.firstName || member.name,
      contributed: memberTotals.get(member.id) ?? 0,
    })),
    currentUserId: session.user.id,
    transactions,
    monthly,
    pendingRequests: pendingRequests.map((request) => ({
      ...request,
      displayName: request.firstName || request.name,
      createdAt: request.createdAt.toISOString(),
    })),
  };
}
