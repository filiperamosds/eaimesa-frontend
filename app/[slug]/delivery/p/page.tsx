import { DeliveryTrackPage } from "../../../../components/delivery-track";
import { venueStaticParams } from "../../../../lib/static-slugs";

export const metadata = { title: "Acompanhar pedido" };

export function generateStaticParams() {
  return venueStaticParams();
}

export default function DeliveryTrackRoute() {
  return <DeliveryTrackPage />;
}
