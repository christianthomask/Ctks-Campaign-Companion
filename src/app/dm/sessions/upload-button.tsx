"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  campaignId: string;
}

export function UploadButton({ campaignId }: Props) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("campaign_id", campaignId);

    try {
      const res = await fetch("/api/sessions/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        const detail = data.details ? ` (${data.details})` : "";
        setErrorMsg((data.error || "Upload failed") + detail);
        return;
      }

      setSuccessMsg(data.message);
      setStatus("idle");

      // Redirect to the session viewer
      setTimeout(() => {
        router.push(`/dm/sessions/${data.session_id}`);
        router.refresh();
      }, 800);
    } catch {
      setStatus("error");
      setErrorMsg("Network error — check your connection");
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".md"
        onChange={handleFileSelect}
        className="hidden"
        id="upload-session"
      />
      <label
        htmlFor="upload-session"
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          status === "uploading"
            ? "bg-gray-700 text-gray-400 cursor-wait"
            : "bg-amber-600 text-gray-950 hover:bg-amber-500"
        }`}
      >
        {status === "uploading" ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Upload Session Prep
          </>
        )}
      </label>

      {errorMsg && (
        <p className="mt-2 text-sm text-red-400">{errorMsg}</p>
      )}
      {successMsg && (
        <p className="mt-2 text-sm text-green-400">{successMsg}</p>
      )}
    </div>
  );
}
