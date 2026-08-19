import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth-customer";
import { formatDate, formatDateTime, formatPkr } from "@/lib/format";
import { AccountProfileForm } from "@/components/site/AccountProfileForm";
import { LogoutButton } from "@/components/site/LogoutButton";

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login?next=/account");

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: { orders: { orderBy: { createdAt: "desc" }, include: { items: true } } },
  });
  if (!customer) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">My Account</p>
          <h1 className="mt-2 font-display text-3xl text-maroon">Welcome, {customer.fullName}</h1>
        </div>
        <LogoutButton />
      </div>
      <div className="gold-divider my-8" />

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl text-maroon">Profile</h2>
          <AccountProfileForm
            initial={{
              fullName: customer.fullName,
              email: customer.email ?? "",
              mobile: customer.mobile,
              dob: formatDate(customer.dob),
            }}
          />
          <p className="mt-4 text-xs text-brown-light">Member since {formatDate(customer.createdAt)}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-maroon">Order &amp; Inquiry History</h2>
          <div className="mt-4 space-y-3">
            {customer.orders.length === 0 && (
              <p className="text-sm text-brown-light">You haven&apos;t made any inquiries yet.</p>
            )}
            {customer.orders.map((order) => {
              const total = order.items.reduce((s, i) => s + Number(i.finalPriceAtOrder), 0);
              return (
                <div key={order.id} className="rounded-sm border border-gold/20 bg-ivory p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-brown">{order.orderNumber}</span>
                    <span className="rounded-full bg-cream-dark px-2.5 py-0.5 text-xs text-brown-light">{order.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-brown-light">{formatDateTime(order.createdAt)}</p>
                  <p className="mt-2 text-sm text-brown-light">{order.items.length} item(s) · {formatPkr(total)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Link href="/account/wishlist" className="text-sm font-medium text-maroon hover:underline">
          View My Wishlist →
        </Link>
      </div>
    </div>
  );
}
