import { NextRequest, NextResponse } from "next/server";
import { listDocuments, deleteDocument, storeDocument } from "@/lib/rag";

/**
 * GET /api/rag/documents — List all documents
 * POST /api/rag/documents — Add a text document (for manual text input)
 * DELETE /api/rag/documents — Delete a document by id
 */
export async function GET() {
  try {
    const docs = await listDocuments();
    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body as { title?: string; content?: string };

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const doc = await storeDocument(
      title || `Document ${new Date().toLocaleString()}`,
      content
    );

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      transcript: doc.transcript,
      createdAt: doc.createdAt,
    });
  } catch (error) {
    console.error("Add document error:", error);
    return NextResponse.json(
      { error: "Failed to add document" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    await deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
