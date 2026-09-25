import { z } from "zod";
import { LEAD_STATUSES } from "./constants";

// Removes control characters (except newline/tab) that could break layouts or logs.
export function cleanText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

const text = (max: number) =>
  z
    .string()
    .max(max, `Must be ${max} characters or fewer`)
    .transform(cleanText);

const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => (v == null ? "" : cleanText(v)))
    .pipe(z.string().max(max, `Must be ${max} characters or fewer`))
    .transform((v) => (v === "" ? null : v));

export const leadInputSchema = z
  .object({
    name: text(120).pipe(z.string().min(1, "Name is required")),
    phone: optionalText(40).refine(
      (v) => v === null || /^[+\d][\d\s().-]{5,}$/.test(v),
      "Enter a valid phone number (digits, spaces, + - ( ) allowed)",
    ),
    email: optionalText(200).refine(
      (v) => v === null || z.email().safeParse(v).success,
      "Enter a valid email address",
    ),
    property_interest: text(300).pipe(z.string().min(1, "Property interest is required")),
    budget: optionalText(100),
    location: optionalText(150),
    property_type: optionalText(60),
    requirements: optionalText(2000),
    source: optionalText(60),
    notes: optionalText(4000),
  })
  .superRefine((data, ctx) => {
    if (!data.phone && !data.email) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Add a phone number or an email address",
      });
    }
  });

export type LeadInput = z.infer<typeof leadInputSchema>;

export const statusSchema = z.object({ status: z.enum(LEAD_STATUSES, { error: "Choose a valid status" }) });

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Use a valid date");

export const scheduleFollowUpSchema = z.object({
  due_date: dateSchema,
  note: optionalText(300),
});

export const followUpActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("reschedule"), due_date: dateSchema }),
]);

export const noteSchema = z.object({
  note: text(2000).pipe(z.string().min(1, "Note cannot be empty")),
});

export const idSchema = z.coerce.number().int().positive();

/** Turns a ZodError into { field: message } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
