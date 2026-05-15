"use client";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export function Sparkline({ data, color = "#818cf8", height = 40 }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div style={{ height }} className="h-full w-full bg-transparent" />;
  }
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
