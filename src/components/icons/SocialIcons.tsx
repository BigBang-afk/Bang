import type { SVGProps } from "react";

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06C2 17.06 5.66 21.2 10.44 21.95V14.9H7.9v-2.84h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.84h-2.34v7.05C18.34 21.2 22 17.06 22 12.06Z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.5 6.19a2.78 2.78 0 0 0-1.95-1.97C18.88 3.75 12 3.75 12 3.75s-6.88 0-8.55.47A2.78 2.78 0 0 0 1.5 6.19 29 29 0 0 0 1 11.5a29 29 0 0 0 .5 5.31 2.78 2.78 0 0 0 1.95 1.97c1.67.47 8.55.47 8.55.47s6.88 0 8.55-.47a2.78 2.78 0 0 0 1.95-1.97 29 29 0 0 0 .5-5.31 29 29 0 0 0-.5-5.31ZM9.75 14.85v-6.7l5.75 3.35Z" />
    </svg>
  );
}

export function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 3h-3.2v12.3a2.6 2.6 0 1 1-2.6-2.6c.24 0 .47.03.7.08V9.5a5.8 5.8 0 1 0 5.1 5.76V9.2a7.7 7.7 0 0 0 4.4 1.38V7.4a4.4 4.4 0 0 1-4.4-4.4Z" />
    </svg>
  );
}
