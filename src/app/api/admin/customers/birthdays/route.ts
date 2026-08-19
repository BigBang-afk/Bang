import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { birthdayBucket, daysUntilNextBirthday } from "@/lib/birthdays";

export async function GET() {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, mobile: true, dob: true, customerType: true },
  });

  const now = new Date();
  const withBucket = customers
    .map((c) => ({ ...c, bucket: birthdayBucket(c.dob, now), daysUntil: daysUntilNextBirthday(c.dob, now) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return jsonOk({
    today: withBucket.filter((c) => c.bucket === "today"),
    thisWeek: withBucket.filter((c) => c.bucket === "this_week"),
    thisMonth: withBucket.filter((c) => c.bucket === "this_month"),
    upcoming: withBucket.filter((c) => c.bucket === "upcoming"),
  });
}
