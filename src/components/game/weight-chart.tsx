"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";

export interface WeightPoint {
  label: string;
  weight: number;
}

export function WeightChart({ data, goal, height = 180 }: { data: WeightPoint[]; goal?: number | null; height?: number }) {
  const weights = data.map((d) => d.weight);
  const min = Math.min(...weights, goal ?? Infinity);
  const max = Math.max(...weights, goal ?? -Infinity);
  const pad = Math.max(1, (max - min) * 0.15);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={40}
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
          formatter={(v: number) => [`${v} kg`, "Peso"]}
        />
        {goal != null && (
          <ReferenceLine
            y={goal}
            stroke="hsl(var(--success))"
            strokeDasharray="4 4"
            label={{ value: `Meta ${goal}kg`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--success))" }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={{ r: 3, fill: "hsl(var(--primary))" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
