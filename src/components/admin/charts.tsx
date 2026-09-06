"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Administration charts.
 *
 * Every series is passed in from a real database aggregate — there is no
 * placeholder or sample data anywhere in this file.
 */

export interface SeriesPoint {
  label: string;
  value: number;
}

const AXIS = { fill: "#64748b", fontSize: 11 };
const GRID = "#17223a";

const CATEGORICAL = ["#12c99b", "#4d94f0", "#dcb96f", "#9df0d5", "#7c8aa5", "#0a8368"];

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-56 place-items-center rounded-xl border border-dashed border-ink-600 text-[12.5px] text-fg-subtle">
      {message}
    </div>
  );
}

function CurrencyTooltip({
  active,
  payload,
  label,
  prefix = "$",
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
  prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-880 px-3 py-2 shadow-lg">
      <p className="text-[11px] text-fg-subtle">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-fg">
        {prefix}
        {value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export function SubscriptionsChart({ data }: { data: SeriesPoint[] }) {
  if (data.every((point) => point.value === 0)) {
    return <EmptyChart message="No subscriptions recorded in this period" />;
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="subs-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12c99b" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#12c99b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={64} />
        <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: "#1f2c48" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#12c99b"
          strokeWidth={2}
          fill="url(#subs-fill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WithdrawalsChart({ data }: { data: SeriesPoint[] }) {
  if (data.every((point) => point.value === 0)) {
    return <EmptyChart message="No withdrawal requests in this period" />;
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={64} />
        <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "#0e1525" }} />
        <Bar dataKey="value" fill="#4d94f0" radius={[4, 4, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PackageDistributionChart({ data }: { data: SeriesPoint[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No investments to distribute yet" />;
  }

  const total = data.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="space-y-3">
      {data.map((point, index) => {
        const share = total > 0 ? (point.value / total) * 100 : 0;
        return (
          <div key={point.label}>
            <div className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="flex items-center gap-2 text-fg">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: CATEGORICAL[index % CATEGORICAL.length] }}
                />
                {point.label}
              </span>
              <span className="tabular-nums text-fg-muted">
                {point.value} · {share.toFixed(0)}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-750">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${share}%`,
                  background: CATEGORICAL[index % CATEGORICAL.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CapitalBar({ data }: { data: SeriesPoint[] }) {
  if (data.every((point) => point.value === 0)) {
    return <EmptyChart message="No active capital to chart" />;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={92}
        />
        <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "#0e1525" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
          {data.map((point, index) => (
            <Cell key={point.label} fill={CATEGORICAL[index % CATEGORICAL.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
