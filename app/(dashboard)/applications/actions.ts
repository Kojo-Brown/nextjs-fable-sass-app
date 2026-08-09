"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createApplication,
  deleteApplication,
  updateApplication,
  updateApplicationStatus,
} from "@/lib/dal/applications";
import {
  applicationSchema,
  APPLICATION_STATUSES,
  type ApplicationFormState,
} from "@/lib/validation/application";
import { z } from "zod";

export async function createApplicationAction(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const row = await createApplication(parsed.data);
  revalidatePath("/applications");
  redirect(`/applications/${row.id}`);
}

export async function updateApplicationAction(
  id: string,
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { error: "Invalid application." };

  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const row = await updateApplication(parsedId.data, parsed.data);
  if (!row) return { error: "Application not found." };

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  redirect(`/applications/${id}`);
}

export async function updateStatusAction(
  id: string,
  status: string,
): Promise<{ error?: string }> {
  const parsed = z
    .object({ id: z.string().uuid(), status: z.enum(APPLICATION_STATUSES) })
    .safeParse({ id, status });
  if (!parsed.success) return { error: "Invalid status change." };

  const row = await updateApplicationStatus(parsed.data.id, parsed.data.status);
  if (!row) return { error: "Application not found." };

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  return {};
}

export async function deleteApplicationAction(id: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return;

  await deleteApplication(parsed.data);
  revalidatePath("/applications");
  redirect("/applications");
}
