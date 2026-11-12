import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  name: text("name").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  middleName: text("middle_name"),
  avatar: text("avatar").default("🙂"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companiesTable = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  ownerId: text("owner_id").notNull().references(() => usersTable.id),
  isPublic: boolean("is_public").notNull().default(true),
  showBalancePublicly: boolean("show_balance_publicly").notNull().default(false),
  contributionVisibility: text("contribution_visibility")
    .notNull()
    .default("everyone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const membershipsTable = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id),
    companyId: text("company_id")
      .notNull()
      .references(() => companiesTable.id),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("memberships_company_user_unique").on(
      table.companyId,
      table.userId,
    ),
  ],
);

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id),
  userId: text("user_id").references(() => usersTable.id),
  recordedById: text("recorded_by_id").references(() => usersTable.id),
  type: text("type").notNull(),
  title: text("title").notNull().default("Запис"),
  amount: integer("amount").notNull(),
  comment: text("comment"),
  isCash: boolean("is_cash").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
