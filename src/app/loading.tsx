import Image from "next/image";

export default function Loading() {
  return (
    <div className="app-entry-loader" role="status" aria-live="polite" aria-label="Calm Wallet is opening">
      <div className="app-entry-loader__mark" aria-hidden="true">
        <Image src="/icons/calm-wallet-maskable-512.png" alt="" width={128} height={128} priority />
      </div>
      <div className="app-entry-loader__reveal">
        <div className="app-entry-loader__brand">
          <p className="app-entry-loader__wordmark" aria-label="Calm Wallet">
            <span>Calm</span> Wallet
          </p>
          <p className="app-entry-loader__maker">by xThinker</p>
        </div>
        <p className="app-entry-loader__tagline">Track money. Understand more. Live calm.</p>
        <div className="app-entry-loader__progress" aria-hidden="true">
          <span />
        </div>
        <p className="app-entry-loader__status">Opening Calm Wallet...</p>
      </div>
    </div>
  );
}
