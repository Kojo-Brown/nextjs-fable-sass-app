import { getResume } from "@/lib/dal/resumes";
import { streamFile } from "@/lib/storage";

/* A Route Handler (not a Server Action) because this is a GET that returns a
 * binary stream — actions are for mutations invoked from forms/transitions.
 * Authorization: getResume() scopes by session user, so a valid UUID belonging
 * to someone else is a 404, indistinguishable from "doesn't exist". */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resume = await getResume(id);
  if (!resume) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(streamFile(resume.storagePath), {
    headers: {
      "Content-Type": resume.mimeType,
      "Content-Disposition": `attachment; filename="${resume.filename.replace(/"/g, "")}"`,
    },
  });
}
