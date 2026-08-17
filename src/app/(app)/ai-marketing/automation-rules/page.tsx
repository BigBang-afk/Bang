import { listAutomationRules } from "@/services/automation.service";
import { AutomationRuleManager } from "@/components/ai-marketing/automation-rule-manager";

export const metadata = { title: "Automation Rules | Zarghoon Jewellers" };

export default async function AutomationRulesPage() {
  const rules = await listAutomationRules();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Automation Rules</h1>
        <p className="text-sm text-muted-foreground">
          IF a trigger and its conditions match, THEN create a follow-up task or a draft campaign — never send a
          message automatically. Enabling a rule is an explicit, permission-gated action.
        </p>
      </div>
      <AutomationRuleManager rules={rules} />
    </div>
  );
}
