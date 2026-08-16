import type { ReactNode } from "react";

interface WidgetFrameProps {
  eyebrow: string;
  title: string;
  meta?: string;
  children: ReactNode;
  className?: string;
}

export function WidgetFrame({ eyebrow, title, meta, children, className = "" }: WidgetFrameProps) {
  return (
    <section className={`hud-widget ${className}`.trim()}>
      <header className="widget-handle">
        <div>
          <span className="widget-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {meta ? <span className="widget-meta">{meta}</span> : null}
      </header>
      <div className="widget-body">{children}</div>
    </section>
  );
}
