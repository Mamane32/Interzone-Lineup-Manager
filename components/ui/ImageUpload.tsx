"use client";

import Image from "next/image";
import { Camera, ImageOff, Check } from "lucide-react";
import { useImageUpload } from "./useImageUpload";
import type { ImageUploadResult } from "@/lib/image-upload";

/**
 * The one reusable Choose File -> Preview -> Upload -> Save workflow for
 * every image in GGSP — no more per-page URL text fields, no more one-off
 * native file inputs. Picking a file previews it instantly (a local blob
 * URL) and uploads it in the same motion; `action` is whichever entity's
 * own permission-boundary Server Action (uploadOrganizationLogo,
 * uploadTeamLogo, uploadCoachPhoto, ...) — this component never uploads
 * directly and knows nothing about buckets or roles.
 *
 * Two ways a caller uses the result, both supported by the same component:
 *  - Field mode (`name` provided): renders a hidden input so a surrounding
 *    <form> (Organization/Competition/Venue/Team/Settings — all "choose
 *    logo, then click the form's own Save button") submits the uploaded
 *    URL alongside every other field, exactly like the URL text field it
 *    replaces did.
 *  - Immediate mode (`name` omitted): the action itself already persists
 *    (Coach photo has no surrounding form — upload IS save), so this just
 *    shows the result; there's nothing left to submit.
 */
export default function ImageUpload({
  action,
  currentUrl = null,
  name,
  label,
  shape = "square",
  size = 80,
  helperText,
}: {
  action: (formData: FormData) => Promise<ImageUploadResult>;
  currentUrl?: string | null;
  name?: string;
  label?: string;
  shape?: "square" | "circle";
  size?: number;
  helperText?: string;
}) {
  const { preview, uploadedUrl, error, justUploaded, pending, inputRef, handleFile } = useImageUpload(action, currentUrl);

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-white/45">{label}</span>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          style={{ width: size, height: size }}
          className={`group relative flex flex-none items-center justify-center overflow-hidden border-2 border-dashed border-white/15 bg-white/5 text-white/30 transition hover:border-brand-400/50 hover:bg-white/[0.08] disabled:opacity-60 ${
            shape === "circle" ? "rounded-full" : "rounded-xl"
          }`}
          aria-label={label ? `Choose ${label.toLowerCase()}` : "Choose image"}
        >
          {preview ? (
            <Image src={preview} alt="" fill sizes={`${size}px`} className="object-cover" unoptimized />
          ) : (
            <ImageOff size={Math.round(size * 0.32)} />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
            <Camera size={Math.round(size * 0.28)} className="text-white" />
          </span>
        </button>

        <div className="flex flex-col gap-1 text-xs">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="w-fit font-semibold text-brand-400 hover:text-brand-300 disabled:opacity-50"
          >
            {pending ? "Uploading..." : preview ? "Change image" : "Choose file"}
          </button>
          {helperText && !error && <p className="text-white/30">{helperText}</p>}
          {error && <p className="text-status-correction">{error}</p>}
          {justUploaded && !error && (
            <p className="flex items-center gap-1 text-status-submitted">
              <Check size={11} /> Uploaded
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {name && <input type="hidden" name={name} value={uploadedUrl ?? ""} />}
    </div>
  );
}
