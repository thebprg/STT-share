import { ViewerApp } from "@/components/ViewerApp";

export default async function SessionPage({
  params
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode } = await params;

  return <ViewerApp sessionCode={sessionCode} />;
}
