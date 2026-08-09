import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApplication } from "@/lib/dal/applications";
import { updateApplicationAction } from "../../actions";
import { ApplicationForm } from "../../application-form";

export const metadata: Metadata = { title: "Edit application" };

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApplication(id);
  if (!app) notFound();

  // Bind the id server-side so the client can't retarget the action.
  const action = updateApplicationAction.bind(null, app.id);

  return (
    <div>
      <h1>
        Edit — {app.position} · {app.company}
      </h1>
      <ApplicationForm action={action} initial={app} submitLabel="Save changes" />
    </div>
  );
}
