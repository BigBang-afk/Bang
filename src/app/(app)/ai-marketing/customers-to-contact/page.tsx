import { getCustomersToContact } from "@/services/follow-up.service";
import { CustomersToContactList } from "@/components/ai-marketing/customers-to-contact-list";

export const metadata = { title: "Customers to Contact | Zarghoon Jewellers" };

export default async function CustomersToContactPage() {
  const recommendations = await getCustomersToContact(200);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Customers to Contact</h1>
        <p className="text-sm text-muted-foreground">
          Ranked using real recency and purchase-history data — never sent automatically. Select customers and
          create follow-up tasks for staff to act on.
        </p>
      </div>
      <CustomersToContactList recommendations={recommendations} />
    </div>
  );
}
