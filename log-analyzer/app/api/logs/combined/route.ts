import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Getting the path of logs and parsing its content
    const logPath = path.resolve(process.cwd(), "..", "backend", "logs", "combined.log");
    const content = await fs.readFile(logPath, "utf8");

    // Returning the content of the log file as plain text
    return new NextResponse(content, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
