"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell } from "recharts";

export function WeeklyChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            fontSize: 12,
          }}
          formatter={(v: number) => [`${v} missões`, "Concluídas"]}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.count >= max ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
