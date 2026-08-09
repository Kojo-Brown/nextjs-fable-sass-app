import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: {
    template: "%s · JobTrack",
    default: "JobTrack — job application tracker",
  },
  description:
    "Track job applications, upload resumes, and get AI-powered resume-to-job matching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
