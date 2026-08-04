"use client";

import Image from "next/image";
import { Camera, Check } from "lucide-react";
import { useImageUpload } from "@/components/ui/useImageUpload";
import { uploadCoachPhoto } from "@/app/team/[token]/(coach)/profile/actions";

/**
 * The Coach Portal's own presentation of GGSP's one shared upload workflow
 * (components/ui/useImageUpload.ts) — a centered hero avatar with an
 * initials fallback and Haitian Creole copy, immediate-mode (no
 * surrounding form; picking a file uploads and persists in the same
 * motion via uploadCoachPhoto). Same choose/preview/upload state machine
 * as components/ui/ImageUpload.tsx, just a different, purpose-built shell
 * — the Coach Portal's centered hero-avatar layout doesn't fit the
 * generic field widget's inline icon+button treatment.
 */
export default function CoachPhotoUpload({ token, coachName, photoUrl }: { token: string; coachName: string; photoUrl: string | null }) {
  const { preview, error, justUploaded, pending, inputRef, handleFile } = useImageUpload(
    (formData) => uploadCoachPhoto(token, formData),
    photoUrl
  );

  const initials = coachName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/10 font-display text-2xl text-white ring-4 ring-white/10 transition hover:ring-white/20"
        aria-label="Chanje foto"
      >
        {preview ? (
          <Image src={preview} alt="" fill sizes="80px" className="object-cover" unoptimized />
        ) : (
          initials
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          <Camera size={20} />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, "photo");
        }}
      />
      <p className="text-[11px] text-white/40">{pending ? "Ap telechaje..." : "Tape foto a pou chanje l"}</p>
      {(error || justUploaded) && (
        <p className={`flex items-center gap-1 text-[11px] font-medium ${error ? "text-status-correction" : "text-status-submitted"}`}>
          <Check size={11} /> {error || "Foto sove."}
        </p>
      )}
    </div>
  );
}
