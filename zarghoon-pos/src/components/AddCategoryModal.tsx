import { useState } from "react";
import { X } from "lucide-react";

export default function AddCategoryModal({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a category name");
      return;
    }
    onAdd(name.trim());
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="animate-rise w-full max-w-sm rounded-2xl border border-gold-900/40 bg-ink-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gold-900/40 px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-gold-100">Add Category</h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Category Name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="e.g. Anklet, Nose Pin, Coin"
              className="input"
            />
          </label>
          {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
        </div>
        <div className="flex gap-3 border-t border-gold-900/40 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gold-900/50 py-2.5 text-sm text-[#c9bd9e] hover:border-gold-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 py-2.5 text-sm font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
          >
            Add Category
          </button>
        </div>
      </form>
    </div>
  );
}
