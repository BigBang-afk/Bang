export default function PrivacyPage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-16 text-gray-300">
      <h1 className="text-2xl font-bold text-gray-100">Privacy Policy</h1>
      <p>
        We store the minimum account information required to operate this service: your name, email, hashed
        password, subscription plan, timezone and strategy preferences.
      </p>
      <p>
        We never request, transmit, or store your Quotex (or any third-party trading platform) password, session
        ID, or cookies. This platform does not automate trading on any external platform.
      </p>
      <p>
        Signal history, including win/loss/draw outcomes, is retained permanently and cannot be edited or deleted
        by users to preserve transparent, auditable performance statistics.
      </p>
    </main>
  );
}
