"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendDatum = {
  name: string;
  value: number;
};

type TrendChartProps = {
  data: TrendDatum[];
};

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(14, 165, 233, 0.08)" }}
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              borderRadius: "16px",
              color: "#e2e8f0",
            }}
          />
          <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#38bdf8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
