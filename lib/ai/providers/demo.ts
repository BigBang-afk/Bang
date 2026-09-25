import type { AIProvider, GenerateRequest } from "./types";

/**
 * Free, offline provider used when no API key is configured.
 * It fills simple templates using ONLY the fields in the lead information,
 * so the whole workflow can be demoed and tested without spending money.
 */
export class DemoProvider implements AIProvider {
  readonly name = "demo";

  async generateJSON(req: GenerateRequest): Promise<unknown> {
    const f = parseFields(req.user);
    const name = f["Lead first name"] ?? "there";
    const interest = f["Property of interest"] ?? "a property";
    const agent = f["Agent name"];
    const sign = agent ? `\n\n${agent}` : "";

    const type = f["Property type"]?.toLowerCase();
    const known: string[] = [type ? `${/^[aeiou]/.test(type) ? "an" : "a"} ${type}` : "a property"];
    if (f["Preferred location"]) known.push(`in ${f["Preferred location"]}`);
    const budget = f["Budget"] ? ` with a budget of ${f["Budget"]}` : "";

    const missing: string[] = [];
    if (!f["Budget"]) missing.push("Budget");
    if (!f["Preferred location"]) missing.push("Preferred location");
    if (!f["Property type"]) missing.push("Property type");
    if (!f["Requirements"]) missing.push("Specific requirements (bedrooms, features)");
    missing.push("Timeline to buy or move");

    const question = !f["Budget"]
      ? "Could you share the budget range you have in mind?"
      : !f["Requirements"]
        ? "Are there any must-haves on your list, such as number of bedrooms or parking?"
        : "What timeline are you working with?";

    return {
      immediate_response: `Hi ${name}, thank you for your enquiry (${interest}). I've noted that you're looking for ${known.join(
        " ",
      )}${budget}. ${question}${sign}`,
      follow_up_1_day: `Hi ${name}, just following up on your enquiry (${interest}). ${question} It will help me focus on the right options for you.${sign}`,
      follow_up_3_days: `Hi ${name}, checking in one last time on your property search. If you're still looking, just reply here and I'll be happy to help. If your plans have changed, no problem at all.${sign}`,
      lead_summary: `${name} enquired about: ${interest}${budget ? `, ${budget.trim()}` : ""}.${
        f["Requirements"] ? ` Requirements: ${f["Requirements"]}.` : ""
      }${f["Lead source"] ? ` Source: ${f["Lead source"]}.` : ""} Current status: ${f["Current status"] ?? "New"}.`,
      suggested_next_action: `Send the immediate response, then confirm: ${missing.slice(0, 2).join(" and ").toLowerCase()}.`,
      missing_information: missing,
    };
  }
}

function parseFields(user: string): Record<string, string> {
  const out: Record<string, string> = {};
  const block = user.match(/<lead_information>([\s\S]*?)<\/lead_information>/)?.[1] ?? "";
  for (const line of block.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const label = line.slice(0, idx).trim().replace(/ \(confirmed facts\)$/, "");
    const value = line.slice(idx + 1).trim();
    if (value && value !== "(not provided)") out[label] = value;
  }
  return out;
}
