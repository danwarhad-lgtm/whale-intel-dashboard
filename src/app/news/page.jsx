"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardSkeleton } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/ErrorState";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { formatRelativeTime } from "@/lib/format";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export default function NewsPage() {
  const q = useQuery({ queryKey: ["news"], queryFn: () => fetchJson("/api/news"), refetchInterval: 5 * 60_000 });
  const [search, setSearch] = React.useState("");
  const [source, setSource] = React.useState("all");
  const items = (q.data?.data?.items ?? []).filter((it) => {
    if (search && !`${it.title} ${it.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (source !== "all" && it.source !== source) return false;
    return true;
  });
  const sources = Array.from(new Set((q.data?.data?.items ?? []).map((it) => it.source)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">▶ Whale Intel</span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight glow-text-primary">News</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Latest crypto headlines aggregated from major outlets.
          </p>
        </div>
        <DataSourceBadge status={q.data?.status} provider={q.data?.provider} lastUpdated={q.data?.lastUpdated} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-primary" />Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input placeholder="Search headlines..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {q.isLoading ? <CardSkeleton rows={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <a key={`${it.link}-${i}`} href={it.link} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">{it.source}</Badge>
                      {it.pubDate ? (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{formatRelativeTime(it.pubDate)}</span>
                      ) : null}
                    </div>
                    <div className="font-medium leading-snug">{it.title}</div>
                    {it.description ? <div className="line-clamp-2 text-sm text-muted-foreground">{it.description}</div> : null}
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </a>
          ))}
          {items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No headlines match your filters.</p> : null}
        </div>
      )}
    </div>
  );
}
