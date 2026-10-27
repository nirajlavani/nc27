import fs from "node:fs";
import path from "node:path";
import { isImageBasename, iterationsRoot } from "./catalog";

export function resolveMediaPath(root: string, id: string, file: string) {
  if (!id || id.includes("/") || id.includes("\\") || id.includes("..")) return null;
  if (!isImageBasename(file)) return null;

  const directory = path.resolve(root, id);
  const target = path.resolve(directory, file);
  const rootResolved = path.resolve(root);
  if (!target.startsWith(rootResolved + path.sep)) return null;
  if (!target.startsWith(directory + path.sep)) return null;

  let realTarget: string;
  let realDirectory: string;
  try {
    realDirectory = fs.realpathSync(directory);
    realTarget = fs.realpathSync(target);
  } catch {
    return null;
  }
  if (!realTarget.startsWith(realDirectory + path.sep)) return null;
  if (!fs.statSync(realTarget).isFile()) return null;
  return realTarget;
}

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function createMediaGet(root = iterationsRoot()) {
  return async function GET(
    _request: Request,
    context: { params: Promise<{ id: string; file: string }> },
  ) {
    const { id, file } = await context.params;
    const target = resolveMediaPath(root, id, file);
    if (!target) return new Response("Not found", { status: 404 });
    const bytes = await fs.promises.readFile(/* turbopackIgnore: true */ target);
    const type = TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream";
    return new Response(bytes, { headers: { "content-type": type } });
  };
}

export const GET = createMediaGet();
