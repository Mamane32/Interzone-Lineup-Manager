"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Trophy } from "lucide-react";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import UserStatusBadge from "@/components/iam/StatusBadge";
import CompetitionRow from "@/components/foundation/CompetitionRow";
import type { Competition, Organization } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  league: "League",
  cup: "Cup",
  knockout: "Knockout",
  round_robin: "Round Robin",
  league_playoffs: "League + Playoffs",
  group_knockout: "Group + Knockout",
  friendly_tournament: "Friendly Tournament",
  custom: "Custom",
};

export default function CompetitionsExplorer({
  competitions,
  organizations,
}: {
  competitions: Competition[];
  organizations: Organization[];
}) {
  const [query, setQuery] = useState("");
  const orgsById = useMemo(() => new Map(organizations.map((o) => [o.id, o.name])), [organizations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return competitions;
    return competitions.filter((c) => {
      const orgName = (c.organization_id && orgsById.get(c.organization_id)) || "";
      return (
        c.name.toLowerCase().includes(q) ||
        (c.short_name ?? "").toLowerCase().includes(q) ||
        orgName.toLowerCase().includes(q)
      );
    });
  }, [competitions, query, orgsById]);

  const columns: DataTableColumn<Competition>[] = [
    {
      key: "name",
      header: "Competition",
      cardRole: "title",
      className: "min-w-[220px]",
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.035] text-white/30">
            {c.logo_url ? (
              <Image src={c.logo_url} alt="" fill sizes="36px" className="object-cover" unoptimized />
            ) : (
              <Trophy size={16} />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{c.name}</p>
            {c.short_name && <p className="truncate text-xs text-white/35">{c.short_name}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "organization",
      header: "Organization",
      render: (c) => <span className="text-white/60">{(c.organization_id && orgsById.get(c.organization_id)) || "—"}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (c) => <span className="text-white/60">{c.competition_type ? TYPE_LABELS[c.competition_type] ?? c.competition_type : "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <UserStatusBadge status={c.status ?? "active"} />,
    },
    {
      key: "actions",
      header: "",
      cardRole: "actions",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end">
          <CompetitionRow competition={c} organizations={organizations} organizationName={(c.organization_id && orgsById.get(c.organization_id)) || "—"} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search competitions..."
          className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] pl-10 pr-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-brand-400/60 focus:bg-white/[0.05] focus:outline-none"
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        empty={{
          title: query ? "No matches" : "No competitions yet",
          description: query ? `Nothing matches "${query}".` : "Create your first competition to start organizing seasons, teams, and matches.",
          icon: Trophy,
        }}
      />
    </div>
  );
}
