import { PublicMenuPageClient } from "../../components/public-menu-page-client";
import { venueStaticParams } from "../../lib/static-slugs";

export function generateStaticParams() {
  return venueStaticParams();
}

export default function PublicMenuPage() {
  return <PublicMenuPageClient />;
}
