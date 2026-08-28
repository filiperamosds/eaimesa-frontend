import { ForgotPasswordForm } from "../../components/email-auth-forms";
import { Logo } from "../../components/site-chrome";

export const metadata = { title: "Esqueci a senha" };

export default function EsqueciSenhaPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <Logo className="mb-8" />
      <h1 className="font-serif text-3xl">Esqueci a senha</h1>
      <p className="mt-2 mb-8 text-ink-soft">Enviamos um código de 6 dígitos para o e-mail da conta.</p>
      <ForgotPasswordForm />
    </div>
  );
}
