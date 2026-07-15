import { TemplatePreviewWorkspace } from "@/components/quotes/template-preview-workspace";

export default async function PreviewQuoteTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TemplatePreviewWorkspace templateId={id} />;
}
