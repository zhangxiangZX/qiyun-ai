import { TemplateEditWorkspace } from "@/components/quotes/template-edit-workspace";

export default async function EditQuoteTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TemplateEditWorkspace templateId={id} />;
}
