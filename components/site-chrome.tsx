import { SUPPORT_EMAIL } from "@eaimesa/shared";
import Link from "next/link";
import { LogoMark } from "./logo-mark";

export function BrandLockup({
  className = "",
  invert = false,
  withTagline = false,
}: {
  className?: string;
  invert?: boolean;
  withTagline?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 tracking-tight ${invert ? "text-white" : "text-ink"} ${className}`}>
      <LogoMark className="h-10 w-10 shrink-0" variant={invert ? "inverse" : "brand"} />
      <span className="flex min-w-0 flex-col">
        <span className="font-serif text-[1.35rem] leading-none">
          Eai<span className={invert ? "text-white" : "text-chili"}>Mesa</span>
        </span>
        {withTagline ? (
          <span
            className={`mt-1.5 flex items-center gap-1.5 text-[0.58rem] font-semibold uppercase leading-none tracking-[0.22em] ${
              invert ? "text-white/55" : "text-ink-soft"
            }`}
          >
            <span className={`h-px w-3 ${invert ? "bg-white/35" : "bg-ink/20"}`} aria-hidden />
            Auto atendimento
            <span className={`h-px w-3 ${invert ? "bg-white/35" : "bg-ink/20"}`} aria-hidden />
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function Logo({
  className = "",
  invert = false,
  href = "/",
  withTagline = false,
}: {
  className?: string;
  invert?: boolean;
  href?: string;
  withTagline?: boolean;
}) {
  return (
    <Link href={href} className={className}>
      <BrandLockup invert={invert} withTagline={withTagline} />
    </Link>
  );
}

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={`sticky top-0 z-30 border-b border-line/70 backdrop-blur-xl ${
        solid ? "bg-card/90" : "bg-paper/70"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/preco" className="btn-ghost hidden sm:inline-flex">
            Preço
          </Link>
          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary !px-4 !py-2 text-sm">
            Começar
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-night text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo invert withTagline />
          <p className="mt-3 max-w-sm text-sm text-white/60">
            Cardápio e comanda para bares e restaurantes. O cliente usa o celular; o link da porta
            não abre pedido.
          </p>
          <p className="mt-3 text-sm text-white/70">
            Suporte:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
        <div className="flex gap-5 text-sm text-white/70">
          <Link href="/preco" className="hover:text-white">
            Preço
          </Link>
          <Link href="/termos" className="hover:text-white">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-white">
            Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
