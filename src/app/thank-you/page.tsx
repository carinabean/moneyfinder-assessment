export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="bg-mf-navy py-4 px-6">
        <h1 className="text-center text-xl font-bold text-white tracking-tight">
          MoneyFinder Skills Assessment
        </h1>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="max-w-lg mx-auto px-6 text-center">
          <div className="w-20 h-20 bg-mf-green/15 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg
              className="w-10 h-10 text-mf-green"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-mf-navy mb-4">
            Thank you so much for participating!
          </h1>
          <p className="text-foreground/70 text-lg mb-3">
            Your assessment is complete. The recruiting team will review your
            results and be in touch with you shortly.
          </p>
          <p className="text-foreground/70 text-lg mb-8">
            Have a wonderful day!
          </p>
          <p className="text-foreground/40 text-sm">
            You can close this window now.
          </p>
        </div>
      </div>
    </main>
  );
}
