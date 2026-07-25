"use client";

import { useState } from "react";
import Button from "./Button";

export default function CopyLinkButton({
  link,
  teamName,
}: {
  link: string;
  teamName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable — ignore, user can still use WhatsApp share
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${teamName} — lien pou voye lis ekip la: ${link}`
  )}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="md" onClick={copy}>
        {copied ? "Copied ✓" : "Copy link"}
      </Button>
      <a href={whatsappHref} target="_blank" rel="noreferrer">
        <Button type="button" variant="secondary" size="md">
          Share on WhatsApp
        </Button>
      </a>
    </div>
  );
}
