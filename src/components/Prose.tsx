/** Long-form text pages (legal, docs): readable measure, quiet headings, styled lists and code. */
export function Prose({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-14 sm:px-8 sm:pt-20">
      <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-[1] font-bold tracking-[-0.03em]">{title}</h1>
      {intro && <div className="mt-4 text-lg leading-relaxed text-ink-2">{intro}</div>}
      <div className="mt-10 leading-relaxed text-ink-2 [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-sheet [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_h2]:font-display [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:scroll-mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-ink [&_li]:mt-1.5 [&_p]:mt-3 [&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-ink [&_pre]:p-4 [&_pre]:text-[13px] [&_pre]:text-paper [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:text-ink [&_table]:mt-4 [&_table]:w-full [&_table]:text-sm [&_td]:border-b [&_td]:border-line [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:border-b [&_th]:border-ink [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:text-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}
