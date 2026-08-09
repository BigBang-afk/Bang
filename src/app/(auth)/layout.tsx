export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-accent text-lg font-bold text-black">
            B
          </div>
          <h1 className="text-xl font-semibold">Bang</h1>
          <p className="text-sm text-muted">Personal Trading & Wealth Command Center</p>
        </div>
        {children}
      </div>
    </div>
  );
}
