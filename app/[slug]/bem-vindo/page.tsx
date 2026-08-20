import { GuestOrderingGate } from "../../../components/guest-ordering-gate";
import { WelcomeView } from "../../../components/welcome-view";
import { venueStaticParams } from "../../../lib/static-slugs";

export const metadata = { title: "Bem-vindo" };

export function generateStaticParams() {
  return venueStaticParams();
}

export default function BemVindoPage() {
  return (
    <GuestOrderingGate>
      <WelcomeView />
    </GuestOrderingGate>
  );
}
