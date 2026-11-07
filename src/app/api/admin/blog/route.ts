import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { authorizeRole } from "@/lib/roles";

const blogSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  excerpt: z.string().min(10),
  content: z.string().min(20),
  coverImage: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  relatedPackageIds: z.array(z.string()),
  published: z.boolean(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await db.blogPost.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = authorizeRole(session.user.role, "ADMIN", "EDITOR");
  if (denied) return denied;

  const body = await req.json();
  const parsed = blogSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const existing = await db.blogPost.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });

  const post = await db.blogPost.create({
    data: { ...parsed.data, authorId: session.user.id },
  });

  await logActivity(session.user.id, "created", "blog", post.id, post.title);

  return NextResponse.json(post, { status: 201 });
}
