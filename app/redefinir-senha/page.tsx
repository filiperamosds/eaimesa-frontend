import { Suspense } from "react";
import { ResetPasswordForm } from "../../components/email-auth-forms";
import { Logo } from "../../components/site-chrome";

export const metadata = { title: "Redefinir senha" };

export default function RedefinirSenhaPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <Logo className="mb-8" />
      <h1 className="font-serif text-3xl">Nova senha</h1>
      <p className="mt-2 mb-8 text-ink-soft">Informe o código do e-mail e a senha nova (com confirmação).</p>
      <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
