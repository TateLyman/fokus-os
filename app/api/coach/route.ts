import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const HF_API_KEY = process.env.HF_API_KEY;

  if (!HF_API_KEY) {
    return NextResponse.json(
      { error: "HF_API_KEY not found in server env." },
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
You are FOKUS Coach.

User data:
${statsSummary}

User question:
"${question}"

Return:
- A 7-day protocol (3–5 bullets)
- 2–3 environment recommendations
- 2 rules per session
Keep it tactical and based on data.
`;

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("HF ERROR:", errText);
      return NextResponse.json(
        { error: "HF model request failed." },
        { status: 500 }
      );
    }

    const data = await response.json();

    const text =
      data[0]?.generated_text ||
      "Coach could not generate a response.";

    return NextResponse.json({ answer: text });
  } catch (err) {
    console.error("Coach API error:", err);
    return NextResponse.json(
      { error: "Failed to generate coach response." },
      { status: 500 }
    );
  }
}
