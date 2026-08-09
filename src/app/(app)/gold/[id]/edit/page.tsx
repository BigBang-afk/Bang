import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { toDateInputValue } from "@/lib/utils";
import { GoldForm } from "../../gold-form";

export default async function EditGoldTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account, settings } = await requireAccount();
  const tx = await prisma.goldTransaction.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!tx) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit Gold Transaction</h1>
      </div>
      <GoldForm
        usdToPkrRate={toNumber(settings.usdToPkrRate)}
        initial={{
          id: tx.id,
          date: toDateInputValue(tx.date),
          txType: tx.txType,
          goldType: tx.goldType ?? "",
          purity: tx.purity,
          purityCustomLabel: tx.purityCustomLabel ?? "",
          weightGrams: toNumber(tx.weightGrams).toString(),
          pricePerGramPkr: toNumber(tx.pricePerGramPkr).toString(),
          dealer: tx.dealer ?? "",
          notes: tx.notes ?? "",
        }}
      />
    </div>
  );
}
