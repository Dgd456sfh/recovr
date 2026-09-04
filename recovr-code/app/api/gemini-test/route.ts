import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function GET() {
  try {
    const key = process.env.GEMINI_API_KEY;

    console.log(
      "GEMINI KEY LOADED:",
      Boolean(key)
    );

    if (!key) {
      return NextResponse.json({
        success: false,
        stage: "ENVIRONMENT",
        error: "GEMINI_API_KEY is missing",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: key,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents:
        "Reply with exactly: RECOVR GEMINI CONNECTED",
    });

    return NextResponse.json({
      success: true,
      stage: "GEMINI",
      response: response.text?.trim(),
    });
  } catch (error: any) {
    console.error(
      "GEMINI DIRECT TEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        stage: "GEMINI",
        error:
          error?.message ??
          String(error),
        code:
          error?.status ??
          error?.code ??
          null,
      },
      { status: 500 }
    );
  }
}
