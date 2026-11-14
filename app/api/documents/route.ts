import { NextResponse } from "next/server";
import {
  deleteDocument,
  persistWorkspace,
  renameDocument,
  setActiveDoc,
  workspaceOrEmpty,
} from "@/lib/bharosa";
import { deleteDocumentVectors } from "@/lib/pinecone";
import { getDb } from "@/lib/db";
import { withUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return withUser(async () =>
    NextResponse.json({ documents: workspaceOrEmpty().documents }),
  );
}

export async function POST(request: Request) {
  return withUser(async () => {
    const body = (await request.json().catch(() => ({}))) as { documentId?: string };
    if (!body.documentId) {
      return NextResponse.json({ error: "Choose a document" }, { status: 400 });
    }
    try {
      setActiveDoc(body.documentId);
      await persistWorkspace();
      return NextResponse.json(workspaceOrEmpty());
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not open document" },
        { status: 400 },
      );
    }
  });
}

export async function PATCH(request: Request) {
  return withUser(async () => {
    const body = (await request.json().catch(() => ({}))) as {
      documentId?: string;
      name?: string;
    };
    if (!body.documentId || !body.name) {
      return NextResponse.json(
        { error: "Choose a document and a new name" },
        { status: 400 },
      );
    }
    try {
      renameDocument(body.documentId, body.name);
      await persistWorkspace();
      return NextResponse.json(workspaceOrEmpty());
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not rename document" },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(request: Request) {
  return withUser(async (userId) => {
    const url = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as { documentId?: string };
    const documentId = body.documentId ?? url.searchParams.get("documentId") ?? undefined;
    if (!documentId) {
      return NextResponse.json({ error: "Choose a document to remove" }, { status: 400 });
    }
    try {
      deleteDocument(documentId);
      await deleteDocumentVectors(userId, documentId).catch((error) => {
        console.warn(
          "[pinecone] delete failed:",
          error instanceof Error ? error.message : error,
        );
      });
      await persistWorkspace();
      const db = getDb();
      if (db) {
        const { error } = await db.from("documents").delete().eq("id", documentId);
        if (error) console.warn("[supabase] document row delete failed:", error.message);
      }
      return NextResponse.json(workspaceOrEmpty());
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not remove document" },
        { status: 400 },
      );
    }
  });
}
