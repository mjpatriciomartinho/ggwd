import { notFound } from "next/navigation";
import { ReportView } from "@/components/ReportView";
import { EXAMPLE_SOURCES } from "@/lib/site";
import { getAnalysis, getReviews, getSource } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/report/[id]">) {
  const analysis = await getAnalysis(Number((await params).id));
  const source = analysis && (await getSource(analysis.sourceId));
  return { title: source ? `${source.name} player review report` : "Report" };
}

export default async function ReportPage({ params }: PageProps<"/report/[id]">) {
  const analysis = await getAnalysis(Number((await params).id));
  const source = analysis && (await getSource(analysis.sourceId));
  if (!analysis || !source) notFound();
  const reviews = await getReviews(source.id, analysis.sample.map((s) => s.id));
  return <ReportView analysis={analysis} source={source} reviews={reviews} isExample={EXAMPLE_SOURCES.includes(source.id)} />;
}
