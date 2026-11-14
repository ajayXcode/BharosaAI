import { NextResponse } from "next/server";
import { addDocument, persistWorkspace, workspace } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  analyseText,
  buildUploadedDocument,
  classifyDocument,
  extractFields,
  readUpload,
  REQUIRED_FIELDS,
  type IntakeFields,
} from "@/lib/document-intake";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPES = new Set(["loan", "health_insurance", "credit_card"]);

function parseFields(raw: FormDataEntryValue | null): IntakeFields {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const fields: IntakeFields = {};
    for (const [key, value] of Object.entries(parsed)) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric >= 0) {
        fields[key as keyof IntakeFields] = numeric;
      }
    }
    return fields;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  return withUser(async () => {
    const limited = await rateLimit("upload", 6, 10 * 60_000);
    if (limited) return limited;

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Upload a file using multipart/form-data" }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF or text file to upload" }, { status: 400 });
    }

    try {
      const upload = await readUpload(file);
      const text = upload.pages.join("\n");
      const requestedType = String(form.get("type") ?? "");
      const type = TYPES.has(requestedType)
        ? (requestedType as "loan" | "health_insurance" | "credit_card")
        : classifyDocument(text);
      const explicit = parseFields(form.get("fields"));
      const analysed = analyseText({
        name: upload.name,
        pages: upload.pages,
        type,
        fields: explicit,
      });

      if (analysed.missing.length) {
        return NextResponse.json(
          {
            error:
              "Text extracted. Add the missing numbers so the calculators stay grounded in your document.",
            missing: analysed.missing,
            required: REQUIRED_FIELDS[type],
            extracted: { ...extractFields(text, type), ...explicit },
            type,
            name: upload.name,
            pages: upload.totalPages,
            ocr: upload.ocr,
          },
          { status: 422 },
        );
      }

      const doc = buildUploadedDocument(analysed);
      await addDocument(doc);
      await persistWorkspace();
      return NextResponse.json(workspace());
    } catch (error) {
      console.error("[documents/upload]", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not read that document" },
        { status: 400 },
      );
    }
  });
}
