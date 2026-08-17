import { AiAssistantChat } from "@/components/ai-marketing/ai-assistant-chat";

export const metadata = { title: "AI Assistant | Zarghoon Jewellers" };

export default function AiAssistantPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Answers come only from controlled server-side tools gated by your own permissions — never a raw database
          dump. Asking about data you can&apos;t otherwise see returns ACCESS DENIED.
        </p>
      </div>
      <AiAssistantChat />
    </div>
  );
}
