import { ReactNode } from "react";

export default function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-gatespy-700/40 to-gatespy-500/30 border border-white/10 p-4">
      <div className="flex items-center gap-3">
        {icon}
        <div className="text-sm text-white/70">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}