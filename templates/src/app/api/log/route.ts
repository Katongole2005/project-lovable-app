import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define log filepath: templates/templates/frontend_logs.txt
const LOG_FILE = path.join(process.cwd(), "frontend_logs.txt");

interface LogEntry {
  timestamp: string;
  level: "log" | "info" | "warn" | "error";
  message: string;
  args?: any[];
}

export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (!text || !text.trim()) {
      return NextResponse.json({ success: true, message: "Empty payload ignored" }, { status: 200 });
    }
    
    const body = JSON.parse(text);
    const logs: LogEntry[] = Array.isArray(body) ? body : [body];

    for (const log of logs) {
      const { timestamp, level, message, args = [] } = log;
      
      // Construct nice display strings for the server console
      const dateStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
      const levelUpper = (level || "log").toUpperCase();
      
      // Serialize any additional arguments
      const argsStr = args.length > 0 ? " " + args.map(arg => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg);
          } catch {
            return "[Circular Object]";
          }
        }
        return String(arg);
      }).join(" ") : "";

      const formattedConsoleMsg = `[Browser-${levelUpper}] [${dateStr}] ${message}${argsStr}`;
      
      // Output to standard output (terminal running Next.js)
      if (level === "error") {
        console.error(formattedConsoleMsg);
      } else if (level === "warn") {
        console.warn(formattedConsoleMsg);
      } else {
        console.log(formattedConsoleMsg);
      }

      // Format for the persistent frontend_logs.txt file
      // e.g. [12:53:15] [LOG] Message
      const fileTime = timestamp ? new Date(timestamp) : new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const timeStrForFile = `${pad(fileTime.getHours())}:${pad(fileTime.getMinutes())}:${pad(fileTime.getSeconds())}`;
      
      const fileLevel = level === "log" ? "LOG" : level === "warn" ? "WARN" : level === "error" ? "ERROR" : "INFO";
      const logLine = `[${timeStrForFile}] [${fileLevel}] ${message}${argsStr}\n`;

      try {
        fs.appendFileSync(LOG_FILE, logLine, "utf8");
      } catch (err) {
        console.error("[Logger API Error] Failed to write to frontend_logs.txt:", err);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid payload" }, { status: 400 });
  }
}

// Mark route as dynamic to prevent static export/caching optimization
export const dynamic = "force-dynamic";
export const maxDuration = 5;
