/**
 * Future Automation — extension points, not automations. Every entry here
 * describes a rule this codebase's existing AutomationPipeline could
 * eventually hold (see lib/broadcast/AutomationPipeline.ts's
 * AUTOMATION_RULES, currently empty by design). None of these run
 * anything today; listing them is what "prepare the extension point, don't
 * fake the automation" means in practice — the day one is built, it's a
 * new AutomationRule pushed onto that array, not a new system.
 */
export type AutomationHookKey =
  | "auto_start_broadcast"
  | "auto_publish_starting_xi"
  | "auto_push_to_website"
  | "auto_update_graphics"
  | "auto_generate_match_package"
  | "auto_archive_broadcast_session";

export const PLANNED_AUTOMATION_HOOKS: { key: AutomationHookKey; label: string; trigger: string }[] = [
  { key: "auto_start_broadcast", label: "Auto Start Broadcast", trigger: "GO LIVE pressed while vMix is connected" },
  { key: "auto_publish_starting_xi", label: "Auto Publish Starting XI", trigger: "Tactical Layout Ready becomes true for both teams" },
  { key: "auto_push_to_website", label: "Auto Push to Website", trigger: "Any score/status change, once a real Website Sync provider exists" },
  { key: "auto_update_graphics", label: "Auto Update Graphics", trigger: "Any match event, once Broadcast Graphics has real persisted state" },
  { key: "auto_generate_match_package", label: "Auto Generate Match Package", trigger: "Match reaches Full Time" },
  { key: "auto_archive_broadcast_session", label: "Auto Archive Broadcast Session", trigger: "N hours after Full Time (Post Match → Archived)" },
];
