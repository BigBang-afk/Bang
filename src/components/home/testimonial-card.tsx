import Image from "next/image";
import { Star } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Testimonial } from "@/types/database";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="flex h-full flex-col rounded-sm border border-charcoal/10 bg-white p-6">
      <div className="mb-3 flex gap-0.5" aria-label={`${testimonial.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={15} className={i < testimonial.rating ? "fill-gold text-gold" : "text-charcoal/15"} />
        ))}
      </div>
      <p className="flex-1 text-sm italic leading-relaxed text-charcoal/80">&ldquo;{testimonial.review}&rdquo;</p>
      <div className="mt-5 flex items-center gap-3">
        {testimonial.customer_image_url ? (
          <Image src={testimonial.customer_image_url} alt={testimonial.customer_name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ivory-dark font-serif text-charcoal">
            {testimonial.customer_name.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-charcoal">{testimonial.customer_name}</p>
          <p className="text-xs text-charcoal/40">{formatDate(testimonial.testimonial_date)}</p>
        </div>
      </div>
    </div>
  );
}
