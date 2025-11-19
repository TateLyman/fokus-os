import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  const { question, statsSummary } = await req.json();

  if (!question || !statsSummary) {
    return NextResponse.json(
      { error: "Missing question or statsSummary" },
      { status: 400 }
    );
  }

  const prompt = `
You are FOKUS Coach, an AI that designs deep-work protocols.

The user is running an app that logs their focus sessions and experiments.
Here is a summary of their recent focus data and lab experiments:

${statsSummary}

The user is asking:

"${question}"

Using concise, practical language, give them:
- A 3–5 bullet "protocol for the next 7 days"
- 2–3 specific environment recommendations (lighting, sound, time of day)
- 2 short "rules" to follow during each session

Avoid generic motivation quotes. Make it tactical and data-driven.
`;

  try {
    const response = await client.responses.create({
      model: "gpt-5.1-mini",
      input: prompt,
    });

    const text = response.output[0].content[0].text;

    return NextResponse.json({ answer: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate coach response." },
      { status: 500 }
    );
  }
}
