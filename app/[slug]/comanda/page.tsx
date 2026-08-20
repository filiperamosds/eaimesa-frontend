import { ComandaProfileView } from "../../../components/comanda-profile-view";
import { GuestOrderingGate } from "../../../components/guest-ordering-gate";
import { venueStaticParams } from "../../../lib/static-slugs";

export const metadata = { title: "Sua comanda" };

export function generateStaticParams() {
  return venueStaticParams();
}

export default function ComandaPage() {
  return (
    <GuestOrderingGate>
      <ComandaProfileView />
    </GuestOrderingGate>
  );
}
