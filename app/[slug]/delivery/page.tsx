import { DeliveryMenuPage } from "../../../components/delivery-menu";
import { venueStaticParams } from "../../../lib/static-slugs";

export const metadata = { title: "Delivery" };

export function generateStaticParams() {
  return venueStaticParams();
}

export default function DeliveryPage() {
  return <DeliveryMenuPage />;
}
