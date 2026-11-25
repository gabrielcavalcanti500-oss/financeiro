"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL } from "@/lib/finance/money";

export type DonutItem = { name: string; value: number; color: string };

export function ExpensesDonut({ data }: { data: DonutItem[] }) {
  const totalCents = data.reduce((acc, d) => acc + Math.round(d.value * 100), 0);

  return (
    <div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatBRL(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 space-y-2">
        {data.map((item) => {
          const percent = totalCents > 0 ? (Math.round(item.value * 100) / totalCents) * 100 : 0;
          return (
            <li key={item.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <span className="text-gray-500">
                {formatBRL(item.value)} · {percent.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}