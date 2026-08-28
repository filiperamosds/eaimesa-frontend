import { Suspense } from "react";
import { StaffInviteForm } from "../../components/email-auth-forms";
import { Logo } from "../../components/site-chrome";

export const metadata = { title: "Convite" };

export default function ConvitePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <Logo className="mb-8" />
      <h1 className="font-serif text-3xl">Criar senha</h1>
      <p className="mt-2 mb-8 text-ink-soft">Defina a senha para entrar na equipe.</p>
      <Suspense fallback={<p className="text-ink-soft">Carregando convite…</p>}>
        <StaffInviteForm />
      </Suspense>
    </div>
  );
}
