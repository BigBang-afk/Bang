import { Gem } from "lucide-react";

interface ProductThumbProps {
  images: string[];
  size?: number;
  fill?: boolean;
  className?: string;
}

export default function ProductThumb({ images, size = 40, fill = false, className = "" }: ProductThumbProps) {
  const src = images[0];
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-ink-800 to-ink-950 ${
        fill ? "h-16 w-full" : ""
      } ${className}`}
      style={fill ? undefined : { width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <Gem size={fill ? 26 : size * 0.45} className="text-gold-700" strokeWidth={1.5} />
      )}
    </div>
  );
}
