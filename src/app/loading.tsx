import Image from "next/image";

export default function Loading() {
  return (
    <div className="app-entry-loader" role="status" aria-live="polite" aria-label="Calm Ledger is opening">
      <div className="app-entry-loader__mark" aria-hidden="true">
        <Image src="/icons/calm-ledger-maskable-512.png" alt="" width={112} height={112} priority />
      </div>
      <div className="app-entry-loader__copy">
        <p>Calm Ledger</p>
        <div className="app-entry-loader__lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
