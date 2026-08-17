import { listFollowUpTasks } from "@/services/follow-up.service";
import { FollowUpTaskList } from "@/components/ai-marketing/follow-up-task-list";

export const metadata = { title: "Follow-Ups | Zarghoon Jewellers" };

export default async function FollowUpsPage() {
  const tasks = await listFollowUpTasks();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Follow-Ups</h1>
        <p className="text-sm text-muted-foreground">
          Tasks for staff — created manually, from AI recommendations, or by an automation rule. Nothing here is ever
          sent automatically.
        </p>
      </div>
      <FollowUpTaskList tasks={tasks} />
    </div>
  );
}
