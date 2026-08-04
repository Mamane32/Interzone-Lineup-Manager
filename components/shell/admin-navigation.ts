import {
  Activity,
  Building2,
  CalendarDays,
  ClipboardList,
  Compass,
  Gauge,
  KeyRound,
  Landmark,
  Layers3,
  MapPin,
  Radio,
  Settings,
  Shield,
  Trophy,
  UserPlus,
  Users2,
} from "lucide-react";
import type { ShellNavGroup } from "./AppShell";

export const ADMIN_NAVIGATION: ShellNavGroup[] = [
  {
    label: "Operations",
    icon: Compass,
    items: [
      { href: "/admin/dashboard", label: "Overview", icon: Gauge },
      { href: "/admin/matches", label: "Matches", icon: CalendarDays },
      { href: "/admin/teams", label: "Teams", icon: Users2 },
      { href: "/admin/lineups", label: "Lineups", icon: ClipboardList },
      { href: "/live", label: "Broadcast", icon: Radio },
    ],
  },
  {
    label: "Competition",
    icon: Trophy,
    items: [
      { href: "/admin/organizations", label: "Organizations", icon: Building2 },
      { href: "/admin/competitions", label: "Competitions", icon: Trophy },
      { href: "/admin/seasons", label: "Seasons", icon: Layers3 },
      { href: "/admin/divisions", label: "Divisions", icon: Layers3 },
      { href: "/admin/stages", label: "Stages", icon: Layers3 },
      { href: "/admin/groups", label: "Groups", icon: Layers3 },
      { href: "/admin/venues", label: "Venues", icon: MapPin },
    ],
  },
  {
    label: "Governance",
    icon: Landmark,
    items: [
      { href: "/admin/users", label: "Users", icon: Users2 },
      { href: "/admin/invitations", label: "Invitations", icon: UserPlus },
      { href: "/admin/roles", label: "Roles", icon: Shield },
      { href: "/admin/access", label: "Access", icon: KeyRound },
      { href: "/admin/audit-log", label: "Audit activity", icon: Activity },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];
