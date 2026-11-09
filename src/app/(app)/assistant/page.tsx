import type { Metadata } from "next";

import { AssistantChat } from "@/components/assistant/assistant-chat";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/modules/identity/presentation/dal";

export const metadata: Metadata = { title: "Ask Oink" };

export default async function AssistantPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title={`Ask ${user.pigName}`} description="Private, on your device." />
      <AssistantChat userId={user.id} pigName={user.pigName} />
    </>
  );
}
