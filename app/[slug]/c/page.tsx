import { ClaimRedeemView } from "../../../components/claim-redeem-view";
import { GuestOrderingGate } from "../../../components/guest-ordering-gate";
import { venueStaticParams } from "../../../lib/static-slugs";

export const metadata = { title: "Abrindo comanda" };

export function generateStaticParams() {
  return venueStaticParams();
}

export default function ClaimRedeemPage() {
  return (
    <GuestOrderingGate>
      <ClaimRedeemView />
    </GuestOrderingGate>
  );
}
