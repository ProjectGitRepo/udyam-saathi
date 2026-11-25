import { handle, type AgentInput } from "@/agent/agent";
import type { Lang, Workspace } from "@/lib/types";

/**
 * Agent endpoint. Body: { input: {type:"message",text} | {type:"action",action}, workspace, lang }.
 * `action` is the body of an A2UI 1.0 renderer→agent `action` message.
 * Response carries A2UI 1.0 agent→renderer messages plus the updated workspace.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { input: AgentInput; workspace: Workspace; lang?: Lang };
  if (!body?.input || !body.workspace) return Response.json({ error: "input and workspace are required" }, { status: 400 });
  const out = handle(body.input, body.workspace, body.lang ?? "en");
  return Response.json(out);
}
