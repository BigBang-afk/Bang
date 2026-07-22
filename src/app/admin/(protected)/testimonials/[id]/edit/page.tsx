import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { updateTestimonialAction } from "../../actions";
import type { Testimonial } from "@/types/database";

export const metadata: Metadata = { title: "Edit Testimonial" };

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: testimonial } = await db.from("testimonials").select("*").eq("id", id).maybeSingle<Testimonial>();
  if (!testimonial) notFound();

  const boundAction = updateTestimonialAction.bind(null, testimonial.id, testimonial.customer_image_url);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-charcoal">Edit Testimonial</h1>
      <TestimonialForm action={boundAction} initial={testimonial} />
    </div>
  );
}
