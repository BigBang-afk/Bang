import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { formatKarigarCode, parseKarigarCode } from "@/lib/karigar-code";
import { Prisma } from "@/generated/prisma/client";
import type { KarigarSpecialization, KarigarStatus } from "@/generated/prisma/client";

/**
 * Karigar identity/CRUD — see KARIGAR-SYSTEM.md. Gold and cash positions
 * are read from gold-ledger.service.ts / party-cash-ledger.service.ts, not
 * stored here; a Karigar row itself carries only profile fields.
 */

export class DuplicateKarigarPhoneError extends Error {
  constructor() {
    super("A karigar with this phone number already exists.");
    this.name = "DuplicateKarigarPhoneError";
  }
}

export class KarigarNotFoundError extends Error {
  constructor() {
    super("Karigar could not be found.");
    this.name = "KarigarNotFoundError";
  }
}

export type KarigarRow = {
  id: string;
  karigarCode: string;
  name: string;
  phone: string;
  secondaryPhone: string | null;
  address: string | null;
  city: string | null;
  specialization: KarigarSpecialization;
  status: KarigarStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const KARIGAR_SELECT = {
  id: true,
  karigarCode: true,
  name: true,
  phone: true,
  secondaryPhone: true,
  address: true,
  city: true,
  specialization: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.KarigarSelect;

function toKarigarRow(row: {
  id: string;
  karigarCode: number;
  name: string;
  phone: string;
  secondaryPhone: string | null;
  address: string | null;
  city: string | null;
  specialization: KarigarSpecialization;
  status: KarigarStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): KarigarRow {
  return { ...row, karigarCode: formatKarigarCode(row.karigarCode) };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Search by name, phone, or karigar code — used by the "Give Gold to Karigar" picker. */
export async function searchKarigars(query: string, limit = 10): Promise<KarigarRow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const parsedCode = parseKarigarCode(trimmed);
  const where: Prisma.KarigarWhereInput = UUID_PATTERN.test(trimmed)
    ? { id: trimmed }
    : {
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { phone: { contains: trimmed } },
          { secondaryPhone: { contains: trimmed } },
          ...(parsedCode !== null ? [{ karigarCode: parsedCode }] : []),
        ],
      };

  const rows = await prisma.karigar.findMany({
    where,
    select: KARIGAR_SELECT,
    orderBy: { name: "asc" },
    take: limit,
  });
  return rows.map(toKarigarRow);
}

export async function getKarigarById(id: string): Promise<KarigarRow | null> {
  const row = await prisma.karigar.findUnique({ where: { id }, select: KARIGAR_SELECT });
  return row ? toKarigarRow(row) : null;
}

export type CreateKarigarInput = {
  name: string;
  phone: string;
  secondaryPhone?: string;
  address?: string;
  city?: string;
  specialization?: KarigarSpecialization;
  notes?: string;
};

export async function createKarigar(input: CreateKarigarInput, createdById: string): Promise<KarigarRow> {
  const existing = await prisma.karigar.findUnique({ where: { phone: input.phone } });
  if (existing) throw new DuplicateKarigarPhoneError();

  const karigar = await prisma.karigar.create({
    data: {
      name: input.name.trim(),
      phone: input.phone,
      secondaryPhone: input.secondaryPhone || null,
      address: input.address || null,
      city: input.city || null,
      specialization: input.specialization ?? "OTHER",
      notes: input.notes || null,
      createdById,
    },
    select: KARIGAR_SELECT,
  });

  await writeAuditLog({
    userId: createdById,
    action: "KARIGAR_CREATED",
    entity: "Karigar",
    entityId: karigar.id,
    metadata: { karigarCode: formatKarigarCode(karigar.karigarCode), name: karigar.name },
  });

  return toKarigarRow(karigar);
}

export type UpdateKarigarInput = {
  id: string;
  name: string;
  phone: string;
  secondaryPhone?: string;
  address?: string;
  city?: string;
  specialization: KarigarSpecialization;
  notes?: string;
};

export async function updateKarigar(input: UpdateKarigarInput, updatedById: string): Promise<void> {
  const existing = await prisma.karigar.findUnique({ where: { phone: input.phone } });
  if (existing && existing.id !== input.id) throw new DuplicateKarigarPhoneError();

  await prisma.karigar.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      phone: input.phone,
      secondaryPhone: input.secondaryPhone || null,
      address: input.address || null,
      city: input.city || null,
      specialization: input.specialization,
      notes: input.notes || null,
    },
  });

  await writeAuditLog({
    userId: updatedById,
    action: "KARIGAR_UPDATED",
    entity: "Karigar",
    entityId: input.id,
    metadata: { name: input.name },
  });
}

/** Never hard-deletes — a karigar with historical transactions keeps them attributable forever. */
export async function changeKarigarStatus(id: string, status: KarigarStatus, userId: string): Promise<void> {
  const existing = await prisma.karigar.findUniqueOrThrow({ where: { id }, select: { status: true } });
  await prisma.karigar.update({ where: { id }, data: { status } });
  await writeAuditLog({
    userId,
    action: "KARIGAR_STATUS_CHANGED",
    entity: "Karigar",
    entityId: id,
    metadata: { previousStatus: existing.status, newStatus: status },
  });
}

export type KarigarListFilters = {
  search?: string;
  specialization?: KarigarSpecialization;
  status?: KarigarStatus;
  sort?: "NEWEST" | "OLDEST" | "NAME";
  page?: number;
  pageSize?: number;
};

export async function listKarigars(
  filters: KarigarListFilters,
): Promise<{ rows: KarigarRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const parsedCode = filters.search ? parseKarigarCode(filters.search.trim()) : null;
  const where: Prisma.KarigarWhereInput = {
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
            { secondaryPhone: { contains: filters.search } },
            ...(parsedCode !== null ? [{ karigarCode: parsedCode }] : []),
          ],
        }
      : {}),
    ...(filters.specialization ? { specialization: filters.specialization } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const orderBy: Prisma.KarigarOrderByWithRelationInput =
    filters.sort === "OLDEST"
      ? { createdAt: "asc" }
      : filters.sort === "NAME"
        ? { name: "asc" }
        : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    prisma.karigar.findMany({
      where,
      select: KARIGAR_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.karigar.count({ where }),
  ]);

  return { rows: rows.map(toKarigarRow), total };
}

export async function getKarigarDashboardSummary(): Promise<{
  total: number;
  active: number;
  inactive: number;
  blocked: number;
}> {
  const [total, active, inactive, blocked] = await Promise.all([
    prisma.karigar.count(),
    prisma.karigar.count({ where: { status: "ACTIVE" } }),
    prisma.karigar.count({ where: { status: "INACTIVE" } }),
    prisma.karigar.count({ where: { status: "BLOCKED" } }),
  ]);
  return { total, active, inactive, blocked };
}
