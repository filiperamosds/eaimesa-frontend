import { QR_POSTER_LAYOUT, QR_POSTER_SITE, type QrPosterCopy, type QrPrintTemplate } from "../lib/qr-print-templates";

export function QrPoster({
  template,
  copy,
  className = "",
}: {
  template: QrPrintTemplate;
  copy: QrPosterCopy;
  className?: string;
}) {
  const L = QR_POSTER_LAYOUT;

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        background: template.background,
        color: template.brand,
        aspectRatio: "8 / 11",
        containerType: "size",
      }}
    >
      <div
        className="absolute left-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          top: `${L.circleCy * 100}%`,
          width: `${L.circleDiameter * 100}%`,
          aspectRatio: "1",
          background: template.circle,
        }}
      />
      <div
        className="absolute left-1/2 z-[5] flex min-w-0 -translate-x-1/2 items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap uppercase"
        style={{
          top: `${L.pillTop * 100}%`,
          width: `${L.pillWidth * 100}%`,
          height: `${L.pillHeight * 100}%`,
          borderRadius: 999,
          background: template.pill,
          color: template.brand,
          fontSize: "4.1cqw",
          fontWeight: 650,
          letterSpacing: "0.16em",
          padding: "0 3%",
        }}
      >
        {copy.venueName}
      </div>
      {copy.tableLabel ? (
        <div
          className="absolute left-1/2 z-[5] flex min-w-0 -translate-x-1/2 items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap uppercase"
          style={{
            top: `${L.tablePillTop * 100}%`,
            width: `${L.tablePillWidth * 100}%`,
            height: `${L.tablePillHeight * 100}%`,
            borderRadius: 999,
            background: template.pill,
            color: template.brand,
            fontSize: "3.4cqw",
            fontWeight: 650,
            letterSpacing: "0.12em",
            padding: "0 3%",
          }}
        >
          {copy.tableLabel}
        </div>
      ) : null}
      <div
        className="absolute left-1/2 z-[4] box-border -translate-x-1/2 -translate-y-1/2 bg-white"
        style={{
          top: `${L.qrCy * 100}%`,
          width: `${L.qrSize * 100}%`,
          aspectRatio: "1",
          borderRadius: "11%",
          padding: `${L.qrPad * 100}%`,
          boxShadow: "0 8px 28px rgba(22, 19, 17, 0.12)",
        }}
      >
        <img src={copy.qrDataUrl} alt="" className="block h-full w-full" />
      </div>
      <p
        className="absolute left-1/2 z-[4] w-[82%] -translate-x-1/2 -translate-y-1/2 text-center uppercase text-white"
        style={{
          top: `${L.taglineCy * 100}%`,
          fontSize: "3.45cqw",
          fontWeight: 650,
          letterSpacing: "0.14em",
        }}
      >
        {template.tagline}
      </p>
      {template.photoSrc ? (
        <img
          src={template.photoSrc}
          alt=""
          className={`pointer-events-none absolute left-0 z-[2] w-full object-bottom ${
            template.photoFit === "cover" ? "object-cover" : "object-contain"
          }`}
          style={{
            bottom: `${L.footerH * 100}%`,
            height: `${(template.photoHeight ?? 0.28) * 100}%`,
          }}
        />
      ) : null}
      <div
        className="absolute inset-x-0 bottom-0 z-[5] flex items-center justify-center"
        style={{
          height: `${L.footerH * 100}%`,
          background: template.pill,
          color: template.brand,
          fontSize: "4.5cqw",
          fontWeight: 650,
          letterSpacing: "0.08em",
        }}
      >
        {QR_POSTER_SITE}
      </div>
    </div>
  );
}
