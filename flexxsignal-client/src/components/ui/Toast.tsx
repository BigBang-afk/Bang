import { useToastStore } from "../../store/uiStore";

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[90vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          onClick={() => dismiss(t.id)}
          className={`glass-card cursor-pointer px-4 py-3 text-sm animate-slide-up border-l-4 ${
            t.kind === "success" ? "border-l-signal-up" : t.kind === "error" ? "border-l-signal-down" : "border-l-cyan-400"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
