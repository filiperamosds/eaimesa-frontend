import { Suspense } from "react";
import { ConfirmEmailForm } from "../../components/email-auth-forms";
import { Logo } from "../../components/site-chrome";

export const metadata = { title: "Confirmar e-mail" };

export default function ConfirmarEmailPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <Logo className="mb-8" />
      <h1 className="font-serif text-3xl">Confirme seu e-mail</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        Enviamos um código de 6 dígitos. O trial só começa depois desta confirmação.
      </p>
      <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
        <ConfirmEmailForm />
      </Suspense>
    </div>
  );
}
