import { BrandLockup } from "./site-chrome";

/** Mock do celular da prancha de identidade — QR + Ver Cardápio. */
export function BrandPhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[280px]" aria-hidden>
      <div
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-chili/25 blur-3xl"
        aria-hidden
      />
      <div className="rounded-[2.15rem] bg-ink p-[0.7rem] shadow-[0_28px_60px_-28px_rgba(30,27,24,0.75)]">
        <div className="flex flex-col items-center rounded-[1.65rem] bg-paper px-5 pb-6 pt-7 text-center">
          <div className="flex justify-center">
            <BrandLockup withTagline />
          </div>
          <div className="mx-auto mt-6 aspect-square w-[78%] rounded-2xl bg-card p-2.5 shadow-inner ring-1 ring-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/qr-landing.png"
              alt=""
              width={240}
              height={240}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="btn-primary mt-6 w-full !py-2.5 text-sm">Ver Cardápio</span>
        </div>
      </div>
    </div>
  );
}

/** Ícones de comida em traço, usados como textura no chili. */
export function BrandFoodPattern({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 120"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity="0.22">
        <path d="M22 38c8-10 22-10 30 0v14H22z" />
        <path d="M20 54h34" />
        <path d="M78 28c0 10 6 18 14 18s14-8 14-18" />
        <path d="M82 50h36l-4 22H86z" />
        <circle cx="158" cy="42" r="14" />
        <path d="M158 28v-8" />
        <path d="M28 92h18l-3 16H31z" />
        <path d="M24 90h26" />
        <path d="M110 86c12 0 18 10 18 18H92c0-8 6-18 18-18z" />
        <path d="M160 88c8 4 8 16 0 22" />
        <path d="M168 88c8 4 8 16 0 22" />
        <path d="M176 88c8 4 8 16 0 22" />
        <path d="M158 110h20" />
      </g>
    </svg>
  );
}
