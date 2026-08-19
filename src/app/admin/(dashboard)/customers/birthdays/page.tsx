"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cake } from "lucide-react";
import { Card, Badge } from "@/components/admin/Card";
import { formatDate } from "@/lib/format";

interface BirthdayCustomer {
  id: string;
  fullName: string;
  mobile: string;
  dob: string;
  customerType: "REGULAR" | "VIP";
  daysUntil: number;
}

interface BirthdaysData {
  today: BirthdayCustomer[];
  thisWeek: BirthdayCustomer[];
  thisMonth: BirthdayCustomer[];
  upcoming: BirthdayCustomer[];
}

function Section({ title, list }: { title: string; list: BirthdayCustomer[] }) {
  return (
    <Card title={title}>
      {list.length === 0 ? (
        <p className="text-sm text-brown-light">No birthdays in this range.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gold/10">
          {list.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium text-brown">
                  {c.fullName} {c.customerType === "VIP" && <Badge tone="gold">VIP</Badge>}
                </p>
                <p className="text-xs text-brown-light">{c.mobile} · Born {formatDate(c.dob)}</p>
              </div>
              <Link
                href={`/admin/customers/marketing?customerIds=${c.id}&template=birthday`}
                className="rounded-sm bg-maroon px-3 py-1.5 text-xs font-medium text-cream"
              >
                Send Message
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function BirthdaysPage() {
  const [data, setData] = useState<BirthdaysData | null>(null);

  useEffect(() => {
    fetch("/api/admin/customers/birthdays").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-brown-light">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2 font-display text-2xl text-maroon"><Cake className="h-6 w-6" /> Birthday Reminders</h1>
      {data.today.length > 0 && (
        <div className="rounded-sm border border-gold bg-gold-light/40 px-4 py-3 text-sm text-maroon-dark">
          🎂 {data.today.length} customer(s) have a birthday today!
        </div>
      )}
      <Section title="Today" list={data.today} />
      <Section title="This Week" list={data.thisWeek} />
      <Section title="This Month" list={data.thisMonth} />
      <Section title="Upcoming (within 90 days)" list={data.upcoming} />
    </div>
  );
}
