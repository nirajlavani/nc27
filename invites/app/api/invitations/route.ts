import { iterationsRoot } from "@/lib/catalog";
import { saveInvitation } from "@/lib/uploads";

// Creates a new invitation folder from the upload dialog.
export async function POST(request: Request) {
  const result = await saveInvitation(iterationsRoot(), await request.formData());
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ id: result.id }, { status: 201 });
}
