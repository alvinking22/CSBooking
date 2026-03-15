"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatMoney } from "@/utils/formatMoney";

interface Props {
  data: { date: string; revenue: number }[];
  primaryColor: string;
}

export default function RevenueChart({ data, primaryColor }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickFormatter={(d) =>
            format(new Date(d + "T12:00:00"), "d MMM", { locale: es })
          }
        />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          formatter={(value) => [`$${formatMoney(value as number)}`, "Ingresos"]}
          labelFormatter={(d) =>
            format(new Date(d + "T12:00:00"), "d 'de' MMMM", { locale: es })
          }
        />
        <Bar dataKey="revenue" fill={primaryColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
