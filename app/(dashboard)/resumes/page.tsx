import type { Metadata } from "next";
import { listResumes } from "@/lib/dal/resumes";
import { ResumeList } from "./resume-list";
import { UploadForm } from "./upload-form";
import styles from "./resumes.module.scss";

export const metadata: Metadata = { title: "Resumes" };

export default async function ResumesPage() {
  const rows = await listResumes();

  return (
    <div>
      <h1>Resumes</h1>
      <UploadForm />
      {rows.length === 0 ? (
        <div className={styles.empty}>
          <p>No resumes uploaded yet.</p>
          <p>Upload one to unlock AI matching against your applications.</p>
        </div>
      ) : (
        <ResumeList resumes={rows} />
      )}
    </div>
  );
}
