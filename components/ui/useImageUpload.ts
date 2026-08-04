"use client";

import { useRef, useState, useTransition } from "react";
import type { ImageUploadResult } from "@/lib/image-upload";

/**
 * The one Choose File -> Preview -> Upload state machine every image
 * upload in GGSP shares — ImageUpload.tsx (the generic field/immediate
 * widget) and CoachPhotoUpload.tsx (the Coach Portal's own localized,
 * centered hero-avatar presentation) both use this instead of each
 * keeping their own copy of it. What differs between them is only how the
 * result renders, never how a file gets from "chosen" to "uploaded."
 */
export function useImageUpload(action: (formData: FormData) => Promise<ImageUploadResult>, currentUrl: string | null = null) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File, fieldName = "file") {
    setError(null);
    setJustUploaded(false);
    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.set(fieldName, file);

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        setUploadedUrl(result.url);
        setPreview(result.url);
        setJustUploaded(true);
      } else {
        setError(result.error);
        setPreview(uploadedUrl);
      }
    });
  }

  return { preview, uploadedUrl, error, justUploaded, pending, inputRef, handleFile };
}
