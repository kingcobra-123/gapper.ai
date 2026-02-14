import { NextResponse } from "next/server";
import type { ChatRequest } from "@/lib/api/contracts";
import { mockChatResponse } from "@/lib/api/mock";

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const payload = mockChatResponse(body);

  // TODO: Replace with real upstream proxy call when backend endpoint is available.
  return NextResponse.json(payload);
}
