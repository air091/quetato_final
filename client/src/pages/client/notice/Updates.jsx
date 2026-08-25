import {
  CalendarCheck,
  Grid3X3,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Users,
} from "lucide-react";

const newUpdates = [
  {
    icon: RotateCcw,
    title: "Multi-set volleyball matches",
    description:
      "Choose how many sets are needed to win. Each completed set resets the current points and switches the teams to opposite court sides; the court ends only after a team reaches the target.",
  },
  {
    icon: Grid3X3,
    title: "Volleyball courts match the real rotation",
    description:
      "Volleyball slots now follow the 5–6–1 and 4–3–2 court formation, with a center line clearly separating the teams and compact player cards for narrow slots.",
  },
  {
    icon: PlusCircle,
    title: "Add more volleyball courts",
    description:
      "Playing and queued volleyball courts can now be added as needed, using the same clear court controls as other sports.",
  },
  {
    icon: RotateCcw,
    title: "Scores reset for the next volleyball match",
    description:
      "Ending a volleyball game saves its final score to match history and resets the live court score to 0–0 for the next match.",
  },
];

const pastUpdates = [
  {
    icon: CalendarCheck,
    title: "Session hosts are here",
    description:
      "Community owners and admins can now assign an approved player as a host for a specific session.",
  },
  {
    icon: ShieldCheck,
    title: "Session-only management",
    description:
      "Hosts can manage players, requests, courts, games, and payments in their assigned session without receiving community-wide admin access.",
  },
  {
    icon: Users,
    title: "Clearer host visibility",
    description:
      "Hosts are shown alongside the creator and admins in the session player list, and can access only the sessions they host.",
  },
];

const UpdateCards = ({ updates }) =>
  updates.map(({ icon: Icon, title, description }) => (
    <article
      key={title}
      className="flex gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm shadow-stone-100/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-100/60 bg-orange-50 text-orange-500">
        <Icon size={17} />
      </div>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-sm font-bold text-stone-900">{title}</h2>
        <p className="mt-1 text-xs font-medium leading-relaxed text-stone-400">
          {description}
        </p>
      </div>
    </article>
  ));

export default function Updates() {
  return (
    <main className="mx-auto mt-8 w-full max-w-[720px] px-4 pb-6 selection:bg-orange-500/10 selection:text-orange-950">
      <div className="mb-4 px-1">
        <h1 className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
          Updates
        </h1>
      </div>

      <div className="flex flex-col gap-y-3.5">
        <p className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-orange-500">
          New in this release
        </p>
        <UpdateCards updates={newUpdates} />

        <div className="flex items-center gap-3 pt-3">
          <div className="h-px flex-1 bg-stone-200" />
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
            Past updates
          </p>
          <div className="h-px flex-1 bg-stone-200" />
        </div>
        <UpdateCards updates={pastUpdates} />
      </div>
    </main>
  );
}
