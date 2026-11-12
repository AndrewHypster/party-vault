"use server";

import { auth, signOut } from "@/auth";
import { getDb } from "@/db";
import {
  companiesTable,
  companyDeletionProposalsTable,
  companyDeletionVotesTable,
  membershipsTable,
  transactionsTable,
  usersTable,
} from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { isAvatarOption } from "@/lib/avatars";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Увійдіть через Google, щоб продовжити.");
  }
  return session.user.id;
}

function requireText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new Error(`Поле «${label}» має бути текстом.`);
  }
  const result = value.trim();
  if (!result || result.length > maxLength) {
    throw new Error(`Поле «${label}» має містити до ${maxLength} символів.`);
  }
  return result;
}

export async function signOutUser() {
  await signOut({ redirectTo: "/" });
}

export async function createCompany(data: {
  name: string;
  description?: string;
}) {
  const userId = await requireUserId();
  if (!data || typeof data !== "object") {
    throw new Error("Дані компанії некоректні.");
  }
  const name = requireText(data.name, "Назва компанії", 60);
  if (data.description !== undefined && typeof data.description !== "string") {
    throw new Error("Опис компанії має бути текстом.");
  }
  const description =
    typeof data.description === "string" ? data.description.trim().slice(0, 240) : "";
  const companyId = randomUUID();
  const db = getDb();

  await db.batch([
    db.insert(companiesTable).values({
      id: companyId,
      name,
      description,
      ownerId: userId,
    }),
    db.insert(membershipsTable).values({
      id: randomUUID(),
      companyId,
      userId,
      role: "owner",
      status: "active",
    }),
  ]);

  revalidatePath("/");
  redirect(`/company/${companyId}`);
}

export async function requestToJoin(companyId: string) {
  const userId = await requireUserId();
  if (typeof companyId !== "string" || !companyId) {
    throw new Error("Компанію не знайдено.");
  }

  const db = getDb();
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  if (!company) {
    throw new Error("Компанію не знайдено.");
  }

  const [existing] = await db
    .select({ id: membershipsTable.id, status: membershipsTable.status })
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.companyId, companyId),
        eq(membershipsTable.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(membershipsTable).values({
      id: randomUUID(),
      companyId,
      userId,
      status: "pending",
    });
  } else if (
    existing.status === "rejected" ||
    existing.status === "removed"
  ) {
    await db
      .update(membershipsTable)
      .set({ status: "pending" })
      .where(eq(membershipsTable.id, existing.id));
  } else if (existing.status === "active") {
    throw new Error("Ви вже є учасником цієї компанії.");
  }

  revalidatePath("/");
  revalidatePath(`/company/${companyId}`);
}

export async function reviewJoinRequest(
  companyId: string,
  membershipId: string,
  approve: boolean,
) {
  const userId = await requireUserId();
  if (
    typeof companyId !== "string" ||
    !companyId ||
    typeof membershipId !== "string" ||
    !membershipId ||
    typeof approve !== "boolean"
  ) {
    throw new Error("Дані запиту на вступ некоректні.");
  }
  const db = getDb();
  const [company] = await db
    .select({ ownerId: companiesTable.ownerId })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  if (!company || company.ownerId !== userId) {
    throw new Error("Лише власник компанії може розглядати запити.");
  }
  if (approve && (await hasActiveDeletionVote(db, companyId))) {
    throw new Error(
      "Під час голосування за видалення не можна змінювати склад компанії.",
    );
  }

  const [updatedRequest] = await db
    .update(membershipsTable)
    .set(
      approve
        ? { status: "active", createdAt: new Date() }
        : { status: "rejected" },
    )
    .where(
      and(
        eq(membershipsTable.id, membershipId),
        eq(membershipsTable.companyId, companyId),
        eq(membershipsTable.status, "pending"),
      ),
    )
    .returning({ id: membershipsTable.id });
  if (!updatedRequest) {
    throw new Error("Запит не знайдено або його вже розглянули.");
  }
  revalidatePath(`/company/${companyId}`);
  revalidatePath("/");
}

export async function removeCompanyMember(companyId: string, memberId: string) {
  const userId = await requireUserId();
  if (
    typeof companyId !== "string" ||
    !companyId ||
    typeof memberId !== "string" ||
    !memberId
  ) {
    throw new Error("Учасника або компанію не знайдено.");
  }

  const db = getDb();
  const [company] = await db
    .select({ ownerId: companiesTable.ownerId })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  if (!company || company.ownerId !== userId) {
    throw new Error("Видаляти учасників може лише власник компанії.");
  }
  if (memberId === company.ownerId) {
    throw new Error("Власника компанії не можна видалити зі складу.");
  }
  if (await hasActiveDeletionVote(db, companyId)) {
    throw new Error(
      "Під час голосування за видалення не можна змінювати склад компанії.",
    );
  }

  const [removedMember] = await db
    .update(membershipsTable)
    .set({ status: "removed" })
    .where(
      and(
        eq(membershipsTable.companyId, companyId),
        eq(membershipsTable.userId, memberId),
        eq(membershipsTable.status, "active"),
      ),
    )
    .returning({ id: membershipsTable.id });
  if (!removedMember) {
    throw new Error("Активного учасника не знайдено.");
  }

  revalidatePath(`/company/${companyId}`);
  revalidatePath("/");
}

async function hasActiveDeletionVote(
  db: ReturnType<typeof getDb>,
  companyId: string,
) {
  const [proposal] = await db
    .select({ id: companyDeletionProposalsTable.id })
    .from(companyDeletionProposalsTable)
    .where(
      and(
        eq(companyDeletionProposalsTable.companyId, companyId),
        eq(companyDeletionProposalsTable.status, "pending"),
        gt(companyDeletionProposalsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(proposal);
}

async function deleteCompany(db: ReturnType<typeof getDb>, companyId: string) {
  await db.batch([
    db.delete(transactionsTable).where(eq(transactionsTable.companyId, companyId)),
    db.delete(membershipsTable).where(eq(membershipsTable.companyId, companyId)),
    db.delete(companiesTable).where(eq(companiesTable.id, companyId)),
  ]);
}

export async function startCompanyDeletionVote(companyId: string) {
  const userId = await requireUserId();
  if (typeof companyId !== "string" || !companyId) {
    throw new Error("Компанію не знайдено.");
  }

  const db = getDb();
  const [company] = await db
    .select({ ownerId: companiesTable.ownerId })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  if (!company || company.ownerId !== userId) {
    throw new Error("Запустити голосування може лише власник компанії.");
  }

  const now = new Date();
  const [activeProposal] = await db
    .select({
      id: companyDeletionProposalsTable.id,
      expiresAt: companyDeletionProposalsTable.expiresAt,
    })
    .from(companyDeletionProposalsTable)
    .where(
      and(
        eq(companyDeletionProposalsTable.companyId, companyId),
        eq(companyDeletionProposalsTable.status, "pending"),
      ),
    )
    .limit(1);
  if (activeProposal && activeProposal.expiresAt > now) {
    throw new Error("Для цієї компанії вже триває голосування.");
  }
  if (activeProposal) {
    await db
      .update(companyDeletionProposalsTable)
      .set({ status: "expired" })
      .where(eq(companyDeletionProposalsTable.id, activeProposal.id));
  }

  const members = await db
    .select({ userId: membershipsTable.userId })
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.companyId, companyId),
        eq(membershipsTable.status, "active"),
      ),
    );
  if (!members.some((member) => member.userId === userId)) {
    throw new Error("Власник має бути активним учасником компанії.");
  }
  if (members.length < 2) {
    throw new Error(
      "Для голосування потрібен щонайменше один учасник, крім власника.",
    );
  }

  const proposalId = randomUUID();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db.batch([
    db.insert(companyDeletionProposalsTable).values({
      id: proposalId,
      companyId,
      initiatedById: userId,
      expiresAt,
    }),
    db.insert(companyDeletionVotesTable).values(
      members.map((member) => ({
        id: randomUUID(),
        proposalId,
        userId: member.userId,
        vote: member.userId === userId ? true : null,
      })),
    ),
  ]);

  revalidatePath("/");
  revalidatePath(`/company/${companyId}`);
  return { deleted: false };
}

export async function voteOnCompanyDeletion(
  companyId: string,
  proposalId: string,
  vote: boolean,
) {
  const userId = await requireUserId();
  if (
    typeof companyId !== "string" ||
    !companyId ||
    typeof proposalId !== "string" ||
    !proposalId ||
    typeof vote !== "boolean"
  ) {
    throw new Error("Голос некоректний.");
  }

  const db = getDb();
  const [proposal] = await db
    .select({
      id: companyDeletionProposalsTable.id,
      initiatedById: companyDeletionProposalsTable.initiatedById,
      expiresAt: companyDeletionProposalsTable.expiresAt,
    })
    .from(companyDeletionProposalsTable)
    .where(
      and(
        eq(companyDeletionProposalsTable.id, proposalId),
        eq(companyDeletionProposalsTable.companyId, companyId),
        eq(companyDeletionProposalsTable.status, "pending"),
      ),
    )
    .limit(1);
  if (!proposal) {
    throw new Error("Активне голосування не знайдено.");
  }
  if (proposal.expiresAt <= new Date()) {
    await db
      .update(companyDeletionProposalsTable)
      .set({ status: "expired" })
      .where(eq(companyDeletionProposalsTable.id, proposal.id));
    revalidatePath(`/company/${companyId}`);
    return { deleted: false, expired: true };
  }

  const [membership] = await db
    .select({ id: membershipsTable.id })
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.companyId, companyId),
        eq(membershipsTable.userId, userId),
        eq(membershipsTable.status, "active"),
      ),
    )
    .limit(1);
  if (!membership) {
    throw new Error("Голосувати можуть лише активні учасники компанії.");
  }

  const [ballot] = await db
    .update(companyDeletionVotesTable)
    .set({ vote })
    .where(
      and(
        eq(companyDeletionVotesTable.proposalId, proposalId),
        eq(companyDeletionVotesTable.userId, userId),
        isNull(companyDeletionVotesTable.vote),
      ),
    )
    .returning({ id: companyDeletionVotesTable.id });
  if (!ballot) {
    throw new Error("Ви не входите до складу учасників цього голосування.");
  }

  const ballots = await db
    .select({
      userId: companyDeletionVotesTable.userId,
      vote: companyDeletionVotesTable.vote,
    })
    .from(companyDeletionVotesTable)
    .where(eq(companyDeletionVotesTable.proposalId, proposalId));
  const yesCount = ballots.filter((item) => item.vote === true).length;
  const majority = Math.floor((ballots.length - 1) / 2) + 2;
  const ownerVotedYes = ballots.some(
    (item) =>
      item.userId === proposal.initiatedById && item.vote === true,
  );
  const deleted = ownerVotedYes && yesCount >= majority;
  if (deleted) {
    await deleteCompany(db, companyId);
    revalidatePath("/");
    revalidatePath(`/company/${companyId}`);
    return { deleted: true, expired: false };
  }

  revalidatePath(`/company/${companyId}`);
  return { deleted: false, expired: false };
}

export async function cancelCompanyDeletionVote(
  companyId: string,
  proposalId: string,
) {
  const userId = await requireUserId();
  if (
    typeof companyId !== "string" ||
    !companyId ||
    typeof proposalId !== "string" ||
    !proposalId
  ) {
    throw new Error("Голосування не знайдено.");
  }

  const db = getDb();
  const [company] = await db
    .select({ ownerId: companiesTable.ownerId })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .limit(1);
  if (!company || company.ownerId !== userId) {
    throw new Error("Скасувати голосування може лише власник компанії.");
  }

  const [canceled] = await db
    .update(companyDeletionProposalsTable)
    .set({ status: "canceled" })
    .where(
      and(
        eq(companyDeletionProposalsTable.id, proposalId),
        eq(companyDeletionProposalsTable.companyId, companyId),
        eq(companyDeletionProposalsTable.status, "pending"),
      ),
    )
    .returning({ id: companyDeletionProposalsTable.id });
  if (!canceled) {
    throw new Error("Активне голосування не знайдено.");
  }
  revalidatePath(`/company/${companyId}`);
}

export async function createTransaction(data: {
  companyId: string;
  type: "INCOME" | "EXPENSE";
  userId?: string;
  title: string;
  amount: number;
  comment?: string;
  isCash?: boolean;
}) {
  const actorId = await requireUserId();
  if (!data || typeof data !== "object") {
    throw new Error("Дані транзакції некоректні.");
  }
  if (typeof data.companyId !== "string" || !data.companyId) {
    throw new Error("Компанію не знайдено.");
  }
  const title = requireText(data.title, "Опис", 80);
  const amount = Number(data.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000) {
    throw new Error("Вкажіть коректну суму в гривнях.");
  }
  if (data.type !== "INCOME" && data.type !== "EXPENSE") {
    throw new Error("Невідомий тип транзакції.");
  }
  if (data.comment !== undefined && typeof data.comment !== "string") {
    throw new Error("Коментар має бути текстом.");
  }
  if (data.isCash !== undefined && typeof data.isCash !== "boolean") {
    throw new Error("Оберіть коректний спосіб внесення.");
  }

  const db = getDb();
  const [company] = await db
    .select({ ownerId: companiesTable.ownerId })
    .from(companiesTable)
    .where(eq(companiesTable.id, data.companyId))
    .limit(1);
  const [membership] = await db
    .select({ status: membershipsTable.status })
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.companyId, data.companyId),
        eq(membershipsTable.userId, actorId),
      ),
    )
    .limit(1);
  if (!company || membership?.status !== "active") {
    throw new Error("Ви не маєте доступу до цієї компанії.");
  }
  if (data.type === "EXPENSE" && company.ownerId !== actorId) {
    throw new Error("Записувати витрати може лише власник компанії.");
  }

  const contributorId =
    data.type === "INCOME" ? data.userId || actorId : null;
  if (
    data.type === "INCOME" &&
    company.ownerId !== actorId &&
    contributorId !== actorId
  ) {
    throw new Error("Учасник може записати внесок лише на своє ім'я.");
  }
  if (contributorId) {
    const [contributor] = await db
      .select({ id: membershipsTable.userId })
      .from(membershipsTable)
      .where(
        and(
          eq(membershipsTable.companyId, data.companyId),
          eq(membershipsTable.userId, contributorId),
          eq(membershipsTable.status, "active"),
        ),
      )
      .limit(1);
    if (!contributor) {
      throw new Error("Оберіть активного учасника компанії.");
    }
  }

  await db.insert(transactionsTable).values({
    id: randomUUID(),
    companyId: data.companyId,
    userId: contributorId,
    recordedById: actorId,
    type: data.type,
    title,
    amount,
    comment:
      typeof data.comment === "string" ? data.comment.trim().slice(0, 240) : null,
    isCash: data.isCash === true,
  });

  revalidatePath(`/company/${data.companyId}`);
  revalidatePath("/");
}

export async function updateCompanySettings(data: {
  companyId: string;
  isPublic: boolean;
  showBalancePublicly: boolean;
  contributionVisibility: "everyone" | "owner" | "names";
}) {
  const userId = await requireUserId();
  if (!data || typeof data !== "object" || typeof data.companyId !== "string") {
    throw new Error("Налаштування компанії некоректні.");
  }
  if (
    typeof data.isPublic !== "boolean" ||
    typeof data.showBalancePublicly !== "boolean" ||
    !["everyone", "owner", "names"].includes(data.contributionVisibility)
  ) {
    throw new Error("Налаштування компанії некоректні.");
  }

  const db = getDb();
  const [company] = await db
    .select({ ownerId: companiesTable.ownerId })
    .from(companiesTable)
    .where(eq(companiesTable.id, data.companyId))
    .limit(1);
  if (!company || company.ownerId !== userId) {
    throw new Error("Змінювати налаштування може лише власник компанії.");
  }

  await db
    .update(companiesTable)
    .set({
      isPublic: data.isPublic,
      showBalancePublicly: data.showBalancePublicly,
      contributionVisibility: data.contributionVisibility,
    })
    .where(eq(companiesTable.id, data.companyId));
  revalidatePath(`/company/${data.companyId}`);
  revalidatePath("/");
}

export async function updateProfile(data: {
  firstName: string;
  lastName?: string;
  middleName?: string;
  avatar: string;
}) {
  const userId = await requireUserId();
  if (!data || typeof data !== "object") {
    throw new Error("Дані профілю некоректні.");
  }
  if (
    (data.lastName !== undefined && typeof data.lastName !== "string") ||
    (data.middleName !== undefined && typeof data.middleName !== "string")
  ) {
    throw new Error("Дані імені мають бути текстом.");
  }
  const firstName = requireText(data.firstName, "Ім'я", 50);
  const lastName =
    typeof data.lastName === "string" ? data.lastName.trim().slice(0, 50) : "";
  const middleName =
    typeof data.middleName === "string"
      ? data.middleName.trim().slice(0, 50)
      : "";
  if (!isAvatarOption(data.avatar)) {
    throw new Error("Оберіть смайлик зі списку.");
  }

  await getDb()
    .update(usersTable)
    .set({
      firstName,
      lastName,
      middleName: middleName || null,
      avatar: data.avatar,
      name: [firstName, lastName].filter(Boolean).join(" "),
    })
    .where(eq(usersTable.id, userId));
  revalidatePath("/");
}
