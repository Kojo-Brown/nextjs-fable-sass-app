"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APPLICATION_STATUSES } from "@/lib/validation/application";
import styles from "./applications.module.scss";

/* URL is the state: filters live in searchParams so the view is shareable,
 * back-button friendly, and the server component re-renders from the URL. */
export function Filters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  function apply(next: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // new filter -> back to page 1
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={styles.filters}>
      <input
        type="search"
        placeholder="Search company or position…"
        value={q}
        aria-label="Search applications"
        onChange={(e) => {
          setQ(e.target.value);
          if (debounce.current) clearTimeout(debounce.current);
          debounce.current = setTimeout(() => apply({ q: e.target.value }), 300);
        }}
      />
      <select
        aria-label="Filter by status"
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => apply({ status: e.target.value })}
      >
        <option value="">All statuses</option>
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
