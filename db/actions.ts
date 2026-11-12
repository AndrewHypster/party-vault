"use server";

import { auth, signOut } from "@/auth";
import { getDb } from "@/db";
import {
  companiesTable,
  membershipsTable,
  transactionsTable,
  usersTable,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
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
  } else if (existing.status === "rejected") {
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

  const [updatedRequest] = await db
    .update(membershipsTable)
    .set({ status: approve ? "active" : "rejected" })
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
  const allowedAvatars = ["🙂", "😎", "🦊", "🐼", "🐸", "🐱", "🐻", "🦄"];
  if (!allowedAvatars.includes(data.avatar)) {
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
