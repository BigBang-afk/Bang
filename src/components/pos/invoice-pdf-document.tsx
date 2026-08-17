import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency, formatDate, formatWeight } from "@/lib/format";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { PURITY_LABELS } from "@/types/gold";
import { PAYMENT_METHOD_LABELS } from "@/types/sales";
import type { SaleDetail } from "@/services/sale.service";
import type { InvoiceBusinessInfo } from "@/services/sales-settings.service";

/**
 * Server-rendered, real PDF (selectable text, not a screenshot) via
 * @react-pdf/renderer — see the route handler at
 * src/app/api/invoices/[id]/pdf/route.ts. Mirrors InvoicePrintSheet's
 * layout but uses react-pdf's own primitives, not HTML/Tailwind.
 */

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#111111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#111111", paddingBottom: 12, marginBottom: 16 },
  businessName: { fontSize: 18, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1 },
  muted: { color: "#666666", fontSize: 8, marginTop: 2 },
  invoiceNumber: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  section: { marginBottom: 16 },
  label: { fontSize: 7, textTransform: "uppercase", letterSpacing: 0.5, color: "#666666", marginBottom: 2 },
  table: { display: "flex", width: "100%" },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#111111", paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#dddddd", paddingVertical: 4 },
  th: { fontSize: 7, textTransform: "uppercase", color: "#666666" },
  td: { fontSize: 8 },
  colBarcode: { width: "10%" },
  colProduct: { width: "16%" },
  colPurity: { width: "7%" },
  colWeight: { width: "8%", textAlign: "right" },
  colMoney: { width: "9.5%", textAlign: "right" },
  colPrice: { width: "9%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  totals: { alignSelf: "flex-end", width: 220, marginTop: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: "#111111", fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 40, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#dddddd", textAlign: "center", color: "#666666", fontSize: 8 },
});

export function InvoicePdfDocument({
  sale,
  business,
}: {
  sale: SaleDetail;
  business: InvoiceBusinessInfo;
}) {
  const taxEnabled = Number(sale.tax) > 0;

  return (
    <Document title={sale.invoice ? formatInvoiceNumber(sale.invoice.sequence) : "Invoice"}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.businessName}>{business.name}</Text>
            {business.address ? <Text style={styles.muted}>{business.address}</Text> : null}
            {business.phone ? <Text style={styles.muted}>{business.phone}</Text> : null}
          </View>
          <View>
            <Text style={styles.invoiceNumber}>
              {sale.invoice ? formatInvoiceNumber(sale.invoice.sequence) : "INVOICE"}
            </Text>
            <Text style={styles.muted}>{formatDate(sale.saleDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Billed to</Text>
          <Text>{sale.customer ? sale.customer.name : "Walk-in Customer"}</Text>
          {sale.customer ? <Text style={styles.muted}>{sale.customer.phone}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colBarcode]}>Barcode</Text>
            <Text style={[styles.th, styles.colProduct]}>Product</Text>
            <Text style={[styles.th, styles.colPurity]}>Purity</Text>
            <Text style={[styles.th, styles.colWeight]}>Net Wt.</Text>
            <Text style={[styles.th, styles.colWeight]}>Gross Wt.</Text>
            <Text style={[styles.th, styles.colMoney]}>Gold Rate</Text>
            <Text style={[styles.th, styles.colMoney]}>Gold Value</Text>
            <Text style={[styles.th, styles.colMoney]}>Making</Text>
            <Text style={[styles.th, styles.colMoney]}>Stone</Text>
            <Text style={[styles.th, styles.colPrice]}>Price</Text>
          </View>
          {sale.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.colBarcode]}>{item.barcodeCode}</Text>
              <Text style={[styles.td, styles.colProduct]}>{item.productName}</Text>
              <Text style={[styles.td, styles.colPurity]}>{PURITY_LABELS[item.purity]}</Text>
              <Text style={[styles.td, styles.colWeight]}>{formatWeight(item.netWeight.toString())}</Text>
              <Text style={[styles.td, styles.colWeight]}>{formatWeight(item.grossWeight.toString())}</Text>
              <Text style={[styles.td, styles.colMoney]}>{formatCurrency(item.goldRatePerGram.toString())}</Text>
              <Text style={[styles.td, styles.colMoney]}>{formatCurrency(item.goldValue.toString())}</Text>
              <Text style={[styles.td, styles.colMoney]}>{formatCurrency(item.makingCharge.toString())}</Text>
              <Text style={[styles.td, styles.colMoney]}>{formatCurrency(item.stoneCharge.toString())}</Text>
              <Text style={[styles.td, styles.colPrice]}>{formatCurrency(item.finalPrice.toString())}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(sale.subtotal.toString())}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Discount</Text>
            <Text>-{formatCurrency(sale.discount.toString())}</Text>
          </View>
          {taxEnabled ? (
            <View style={styles.totalRow}>
              <Text>Tax</Text>
              <Text>{formatCurrency(sale.tax.toString())}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotalRow}>
            <Text>Grand Total</Text>
            <Text>{formatCurrency(sale.grandTotal.toString())}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Paid</Text>
            <Text>{formatCurrency(sale.paidAmount.toString())}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Balance</Text>
            <Text>{formatCurrency(sale.balanceAmount.toString())}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Payment</Text>
          {sale.payments.map((payment) => (
            <Text key={payment.id}>
              {PAYMENT_METHOD_LABELS[payment.method]}: {formatCurrency(payment.amount.toString())}
              {payment.reference ? ` (Ref: ${payment.reference})` : ""}
            </Text>
          ))}
        </View>

        <Text style={styles.footer}>{business.footerText}</Text>
      </Page>
    </Document>
  );
}
