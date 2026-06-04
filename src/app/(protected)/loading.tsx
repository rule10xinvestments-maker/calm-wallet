import Image from "next/image";

export default function ProtectedLoading() {
  return (
    <div
      className="flex min-h-[45svh] items-center justify-center px-6 py-12"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="flex w-full max-w-[10rem] flex-col items-center gap-4">
        <Image
          className="h-10 w-10 rounded-xl shadow-sm"
          src="/icons/calm-wallet-maskable-512.png"
          alt=""
          width={40}
          height={40}
          priority
        />
        <div className="flex w-full flex-col gap-2 motion-safe:animate-pulse" aria-hidden="true">
          <span className="h-2 rounded-full bg-sky-200/80" />
          <span className="mx-auto h-2 w-4/5 rounded-full bg-slate-200/90" />
          <span className="mx-auto h-2 w-3/5 rounded-full bg-slate-100" />
        </div>
        <span className="sr-only">Loading page...</span>
      </div>
    </div>
  );
}
