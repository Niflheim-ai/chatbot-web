import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

if (!N8N_WEBHOOK_URL) {
  throw new Error("N8N_WEBHOOK_URL is not set");
}

type ChatRequestBody = {
  message?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Forward to n8n webhook
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let n8nResponse: Response;
    try {
      n8nResponse = await fetch(N8N_WEBHOOK_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!n8nResponse.ok) {
      return NextResponse.json(
        { error: "n8n returned an error" },
        { status: 502 }
      );
    }

    const data = (await n8nResponse.json()) as {
      reply?: string;
      [key: string]: unknown;
    };

    const reply = (data.reply ?? "").toString().trim();

    // Save conversation to Supabase (optional, ignore on failure)
    try {
      const client = supabaseServer;

      const { error: userInsertError } = await client
        .from("messages")
        .insert({ role: "user", content: message });

      if (userInsertError) {
        console.error("Failed to insert user message", userInsertError);
      }

      if (reply) {
        const { error: botInsertError } = await client
          .from("messages")
          .insert({ role: "bot", content: reply });

        if (botInsertError) {
          console.error("Failed to insert bot message", botInsertError);
        }
      }
    } catch (err) {
      console.error("Supabase insert failed", err);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return NextResponse.json(
        { error: "Request to n8n timed out" },
        { status: 504 }
      );
    }

    console.error("Unhandled /api/chat error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}