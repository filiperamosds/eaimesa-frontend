export function LandingExplainer() {
  return (
    <section className="border-y border-line bg-night text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Como funciona</p>
        <h2 className="mt-3 font-serif text-4xl">Do QR à fila, no celular.</h2>
        <p className="mt-3 max-w-xl text-white/65">
          O cliente lê o cardápio no aparelho dele. Pedir só depois do QR do garçom. A cozinha vê a
          fila na tela.
        </p>
        <div className="mt-8 overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/5 p-1">
          <video
            className="aspect-video w-full rounded-[1.15rem] bg-night"
            controls
            playsInline
            preload="metadata"
            poster="/videos/como-funciona.jpg"
            aria-label="Vídeo: como o EaiMesa funciona"
          >
            <source src="/videos/como-funciona.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
