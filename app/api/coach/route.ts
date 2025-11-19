import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  console.log("KEY EXISTS?", !!process.env.OPENAI_API_KEY);
  console.log("KEY LENGTH:", process.env.OPENAI_API_KEY?.length || "NULL");
  console.log("ALL ENVS:", Object.keys(process.env));

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const { question, statsSummary } = await req.json();

  if (!question || !statsSummary) {
    return NextResponse.json(
      { error: "Missing question or statsSummary" },
      { status: 400 }
    );
  }

  const prompt = `
You are FOKUS Coach, an AI that designs deep-work protocols.

User focus data:
${statsSummary}

Question:
"${question}"

Give:
- Five 7-day protocol bullets
- Two environment tweaks
- Two session rules
  `;

  try {
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    return NextResponse.json({ answer: response.output_text });
  } catch (err) {
    console.error("Coach API error:", err);
    return NextResponse.json(
      { error: "Failed to generate coach response." },
      { status: 500 }
    );
  }
}
