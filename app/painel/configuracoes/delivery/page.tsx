import { DeliverySettings } from "../../../../components/delivery-settings";

export const metadata = { title: "Delivery" };

export default function ConfigDeliveryPage() {
  return (
    <div>
      <h2 className="mb-8 font-serif text-2xl">Delivery</h2>
      <DeliverySettings />
    </div>
  );
}
