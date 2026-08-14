import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is Lumenex a signal provider?",
    answer:
      "No. Lumenex produces structured analysis and trade setups to support your own decisions. It is not a guaranteed-signal service, and no output should be treated as financial advice.",
  },
  {
    question: "How accurate is the AI analysis?",
    answer:
      "AI-generated analysis and confidence scores are decision-support, not a guarantee. Markets are inherently uncertain, and no model — ours included — can promise a specific outcome.",
  },
  {
    question: "Which markets are supported?",
    answer:
      "Phase 1 ships with crypto, forex, gold (XAUUSD) and major indices as tracked asset classes, with the platform architecture designed to add more over time.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Plans are billed monthly with no long-term commitment. Payment processing lands in a later phase — pricing shown today reflects the plan you'll be able to choose at launch.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Authentication and data access are built on Supabase with row-level security, so your data is scoped to your account by default — not just hidden in the UI.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <Accordion className="mt-10">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
