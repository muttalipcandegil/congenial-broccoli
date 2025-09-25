import { ReactNode } from "react";

export default function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl">
      <h2 className="font-bold text-xl flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}