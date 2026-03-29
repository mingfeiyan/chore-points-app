import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const { kidId, choreId, points = 1, note = "Awarded by Claw 🦞" } = await req.json();
  if (!kidId) return NextResponse.json({ error: "kidId required" }, { status: 400 });
  const kid = await prisma.user.findUnique({ where: { id: kidId }, select: { id: true, name: true, familyId: true } });
  if (!kid || !kid.familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parent = await prisma.user.findFirst({ where: { familyId: kid.familyId, role: "PARENT" }, select: { id: true } });
  if (!parent) return NextResponse.json({ error: "No parent" }, { status: 404 });
  const entry = await prisma.pointEntry.create({
    data: { familyId: kid.familyId, kidId: kid.id, choreId: choreId || null, points, note, date: new Date(), createdById: parent.id, updatedById: parent.id },
  });
  const result = await prisma.pointEntry.aggregate({ where: { kidId: kid.id }, _sum: { points: true } });
  return NextResponse.json({ ok: true, entry: { id: entry.id, points, note }, kidName: kid.name, newTotal: result._sum.points || 0 });
}
