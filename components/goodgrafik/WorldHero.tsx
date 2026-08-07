import { ACCENT_CLASSES, type World } from "./worlds";

/** Banner header shared by every Culture/News/Studio hub + section page — the world's icon, name and tagline, in that world's accent. `dense` trims the vertical rhythm for section subpages (WorldHero renders once per hub, but every section page reuses it too, so it needs a compact mode instead of a second component). */
export default function WorldHero({ world, dense = false }: { world: World; dense?: boolean }) {
  const accent = ACCENT_CLASSES[world.accent];
  const Icon = world.icon;

  return (
    <div className={`flex flex-col items-center text-center ${dense ? "gap-2" : "gap-3"}`}>
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${accent.border} ${accent.bgSoft} ${accent.text}`}>
        <Icon size={26} />
      </span>
      <h1 className={`font-display font-black tracking-tight text-white ${dense ? "text-2xl" : "text-4xl sm:text-5xl"}`}>{world.name}</h1>
      <p className={`max-w-md text-white/50 ${dense ? "text-sm" : "text-base"}`}>{world.tagline}</p>
    </div>
  );
}
