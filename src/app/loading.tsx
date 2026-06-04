import Image from "next/image";

export default function Loading() {
  return (
    <div className="protected-route-loader" role="status" aria-live="polite" aria-label="Loading Calm Wallet">
      <div className="protected-route-loader__mark" aria-hidden="true">
        <Image src="/icons/calm-wallet-icon-512.png" alt="" width={112} height={112} priority />
      </div>
      <div className="protected-route-loader__copy">
        <p>Calm Wallet</p>
        <div className="protected-route-loader__lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
