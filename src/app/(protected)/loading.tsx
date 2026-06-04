export default function ProtectedLoading() {
  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-6"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded-full bg-sky-100" />
          <div className="space-y-2">
            <div className="h-6 w-36 rounded-full bg-slate-100" />
            <div className="h-6 w-44 rounded-full bg-slate-100" />
          </div>
          <div className="h-3 w-32 rounded-full bg-slate-100" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-11 w-11 rounded-full bg-white shadow-sm ring-1 ring-slate-200" />
          <div className="h-11 w-24 rounded-full bg-white shadow-sm ring-1 ring-slate-200" />
        </div>
      </div>
      <main className="flex-1">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm motion-safe:animate-pulse">
          <div className="mb-5 h-5 w-28 rounded-full bg-slate-100" />
          <div className="space-y-3">
            <div className="h-24 rounded-3xl bg-slate-50 ring-1 ring-slate-100" />
            <div className="h-12 rounded-full bg-sky-100" />
            <div className="grid grid-cols-4 gap-3 rounded-3xl bg-slate-50 p-3">
              <div className="h-14 rounded-2xl bg-white" />
              <div className="h-14 rounded-2xl bg-white" />
              <div className="h-14 rounded-2xl bg-white" />
              <div className="h-14 rounded-2xl bg-white" />
            </div>
          </div>
        </div>
      </main>
      <span className="sr-only">Loading page...</span>
    </div>
  );
}
