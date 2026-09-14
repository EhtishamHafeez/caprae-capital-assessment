import { NextResponse } from "next/server";
import { getMeta } from "@/lib/leads-repo";

export async function GET() {
  return NextResponse.json(getMeta());
}
