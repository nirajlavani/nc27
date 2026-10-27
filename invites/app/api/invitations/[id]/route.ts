import { iterationsRoot } from "@/lib/catalog";
import { saveInvitation } from "@/lib/uploads";

// Replaces or removes art on an invitation outside the Default group.
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await saveInvitation(iterationsRoot(), await request.formData(), id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ id: result.id });
}
