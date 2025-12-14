import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendSalesInquiryEmail } from "@/lib/email";
import { z } from "zod";

export const runtime = "nodejs";

const inquirySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  company: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = inquirySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, errors: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, email, company, phone, message } = validation.data;

    // Send email to sales team
    const result = await sendSalesInquiryEmail(
      name,
      email,
      company,
      phone,
      message
    );

    if (!result.success) {
      console.error("[sales.inquiry] Failed to send:", result.error);
      return NextResponse.json(
        { ok: false, message: "Failed to send inquiry. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Your inquiry has been sent. Our sales team will contact you soon.",
    });
  } catch (error) {
    console.error("[sales.inquiry] Error:", error);
    return NextResponse.json(
      { ok: false, message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

