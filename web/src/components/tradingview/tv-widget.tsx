"use client";

import { memo, useEffect, useRef } from "react";

interface TVWidgetProps {
  scriptSrc: string;
  config: Record<string, unknown>;
  className?: string;
  containerClassName?: string;
}

function TVWidgetBase({ scriptSrc, config, className, containerClassName }: TVWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const configString = JSON.stringify(config);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    el.innerHTML =
      '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.type = "text/javascript";
    script.async = true;
    script.text = configString;
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
  }, [scriptSrc, configString]);

  return (
    <div className={className}>
      <div
        className={containerClassName ?? "tradingview-widget-container h-full w-full"}
        ref={container}
      />
    </div>
  );
}

export const TVWidget = memo(TVWidgetBase);
