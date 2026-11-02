export default function Loading() {
  return (
    <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6">
    <div className="animate-ls-fade" aria-busy="true" aria-label="加载中">
      <div className="mb-5 flex items-center gap-3">
        <span className="sticker h-12 w-12 animate-pulse bg-accent" />
        <div className="space-y-2">
          <span className="block h-4 w-40 rounded-full bg-cream-deep" />
          <span className="block h-2.5 w-56 rounded-full bg-cream-deep/70" />
        </div>
      </div>
      <div className="scrap-card mb-5 h-56 animate-pulse bg-cream-deep/40" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="scrap-card h-[70px] animate-pulse bg-cream-deep/40" />
        ))}
      </div>
      <p className="font-hand mt-6 text-center text-sm text-ink-soft/70">正在翻开这一页…</p>
    </div>
    </main>
  );
}
