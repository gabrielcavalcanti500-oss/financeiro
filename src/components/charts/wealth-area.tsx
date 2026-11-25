"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/finance/money";

export type WealthPoint = { label: string; saldo: number };

export function WealthArea({ data }: { data: WealthPoint[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af33" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={48}
            tickFormatter={(v) =>
              Math.abs(Number(v)) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)
            }
          />
          <Tooltip formatter={(value) => formatBRL(Number(value))} />
          <Area
            type="monotone"
            dataKey="saldo"
            name="Saldo total"
            stroke="#16a34a"
            strokeWidth={2}
            fill="url(#wealthFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}