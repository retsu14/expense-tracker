import { readAvatar } from "@/modules/identity/application/account.use-cases";
import { getCurrentUser } from "@/modules/identity/presentation/dal";
import { identityDeps } from "@/shared/container";

export async function GET(_request: Request, { params }: RouteContext<"/api/avatar/[file]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { file } = await params;
  const object = await readAvatar(identityDeps(), user.id, file);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType,
      ...(object.size ? { "Content-Length": String(object.size) } : {}),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
