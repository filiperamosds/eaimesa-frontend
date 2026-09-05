"use client";

import { useState } from "react";
import type { CatalogCategory } from "../lib/types";
import { CatalogEditor } from "./catalog-editor";
import { HappyHourEditor } from "./happy-hour-editor";

export function CatalogSettings() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);

  return (
    <>
      <CatalogEditor onCategories={setCategories} />
      <HappyHourEditor categories={categories} />
    </>
  );
}
