import type { Metadata } from "next";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { createTestimonialAction } from "../actions";

export const metadata: Metadata = { title: "Add Testimonial" };

export default function NewTestimonialPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-charcoal">Add Testimonial</h1>
      <TestimonialForm action={createTestimonialAction} />
    </div>
  );
}
