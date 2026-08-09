import type { Metadata } from "next";
import { createApplicationAction } from "../actions";
import { ApplicationForm } from "../application-form";

export const metadata: Metadata = { title: "New application" };

export default function NewApplicationPage() {
  return (
    <div>
      <h1>New application</h1>
      <ApplicationForm action={createApplicationAction} submitLabel="Create" />
    </div>
  );
}
