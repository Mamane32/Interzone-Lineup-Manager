import Image from "next/image";

export default function TeamCrest({ name, logoUrl, size = 40 }: { name: string; logoUrl: string | null; size?: number }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="flex-none rounded-full bg-white/10 object-cover ring-1 ring-white/15"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full bg-white/10 font-display font-bold text-white/70 ring-1 ring-white/15"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
