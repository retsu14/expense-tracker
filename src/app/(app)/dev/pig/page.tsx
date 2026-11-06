import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { PigPlayground } from "@/components/pig/pig-playground";

export const metadata: Metadata = { title: "Pig playground" };

export default function PigPlaygroundPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <PageHeader title="Pig playground" description="Dev only. Try every mood and interaction." />
      <PigPlayground />
    </>
  );
}
