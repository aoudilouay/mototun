function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

function AccentBadge({ accent = 'cyan' }) {
  const tones = {
    cyan: 'bg-cyan-100 text-cyan-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-200 text-slate-700'
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${tones[accent] || tones.cyan}`}>
      Chargement
    </span>
  );
}

export function PublicRouteSkeleton() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <SkeletonBlock className="h-10 w-40" />
          <div className="hidden gap-3 md:flex">
            <SkeletonBlock className="h-10 w-24" />
            <SkeletonBlock className="h-10 w-32" />
          </div>
        </div>

        <div className="mt-16 grid flex-1 grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-5">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="h-14 w-full max-w-xl" />
            <SkeletonBlock className="h-5 w-full max-w-2xl" />
            <SkeletonBlock className="h-5 w-4/5 max-w-xl" />
            <div className="flex flex-wrap gap-3 pt-2">
              <SkeletonBlock className="h-12 w-48" />
              <SkeletonBlock className="h-12 w-36" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <SkeletonBlock className="h-56 w-full rounded-[1.5rem]" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShellSkeleton({ accent = 'cyan' }) {
  return (
    <div className="min-h-screen bg-[#f3f5fb]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 p-3 lg:block">
          <div className="flex h-[calc(100vh-1.5rem)] flex-col rounded-[30px] border border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <SkeletonBlock className="h-14 w-40" />
            <SkeletonBlock className="mt-4 h-14 w-full" />
            <SkeletonBlock className="mt-4 h-24 w-full" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-12 w-full" />
              ))}
            </div>
            <div className="mt-auto space-y-3">
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-12 w-full" />
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-xl lg:hidden" />
                <div className="w-full max-w-[680px] rounded-[22px] border border-slate-200 bg-white px-3 py-3 shadow-sm xl:max-w-[760px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                      <SkeletonBlock className="h-6 w-24 rounded-full" />
                      <SkeletonBlock className="h-6 w-20 rounded-full" />
                    </div>
                    <SkeletonBlock className="h-10 w-40 rounded-[18px]" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <SkeletonBlock className="h-10 w-10 rounded-[18px]" />
                      <div className="min-w-0">
                        <SkeletonBlock className="h-5 w-48" />
                        <SkeletonBlock className="mt-2 h-4 w-40" />
                      </div>
                    </div>
                    <SkeletonBlock className="hidden h-10 w-32 rounded-[18px] sm:block" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-9 w-9 rounded-xl" />
                <SkeletonBlock className="h-9 w-9 rounded-xl" />
                <SkeletonBlock className="h-10 w-12 rounded-xl" />
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-6">
            <div className="mx-auto w-full max-w-[1500px] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <AccentBadge accent={accent} />
                <SkeletonBlock className="h-10 w-32" />
              </div>
              <AppPageSkeleton accent={accent} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function AppPageSkeleton({ accent = 'cyan' }) {
  const tonePanels = {
    cyan: 'from-cyan-50/70 to-blue-50/40',
    emerald: 'from-emerald-50/70 to-teal-50/40',
    slate: 'from-slate-100 to-slate-50'
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-[32px] border border-slate-200 bg-gradient-to-br ${tonePanels[accent] || tonePanels.cyan} p-5 shadow-sm`}>
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="mt-3 h-10 w-72 max-w-full" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-2xl" />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-28 w-full" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <SkeletonBlock className="h-80 w-full xl:col-span-3" />
        <SkeletonBlock className="h-80 w-full xl:col-span-2" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <SkeletonBlock className="h-72 w-full xl:col-span-3" />
        <SkeletonBlock className="h-72 w-full xl:col-span-2" />
      </div>
    </div>
  );
}

export function ChartPanelsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="mt-4 h-[280px] w-full rounded-[1.5rem]" />
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="mt-4 h-[280px] w-full rounded-[1.5rem]" />
      </div>
    </div>
  );
}

export function HeaderGreetingSkeleton() {
  return (
    <div className="w-full rounded-[22px] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-6 w-24 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
        </div>
        <SkeletonBlock className="h-10 w-40 rounded-[18px]" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-[18px]" />
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="mt-2 h-4 w-40" />
          </div>
        </div>
        <SkeletonBlock className="hidden h-10 w-32 rounded-[18px] sm:block" />
      </div>
    </div>
  );
}

export function HeaderActionSkeleton() {
  return <SkeletonBlock className="h-10 w-10 rounded-2xl" />;
}
