type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  return (
    <div className={`utt-brand ${compact ? "compact" : ""} ${className}`.trim()}>
      <svg className="utt-brand-symbol" viewBox="0 0 120 82" aria-hidden="true">
        <path className="utt-table-top" d="M17 16h86l8 8H9l8-8Z" />
        <path className="utt-table-edge" d="M12 25h96v7H12z" />
        <path className="utt-table-leg" d="M18 31h8v34h-8zM94 31h8v34h-8z" />
        <path className="utt-eye-lid" d="M28 48c11-13 22-18 33-18 12 0 23 6 32 18-10 11-21 17-33 17-11 0-22-5-32-17Z" />
        <path className="utt-eye-iris" d="M50 48c0-10 4-17 10-17s10 7 10 17-4 17-10 17-10-7-10-17Z" />
        <path className="utt-eye-pupil" d="M58.1 32.5h3.8l-1 31h-1.8l-1-31Z" />
        <path className="utt-eye-cut" d="M24 68h72" />
      </svg>
      {!compact ? (
        <span className="utt-brand-wordmark">
          <strong>Under</strong><i>the</i><strong>Table</strong>
        </span>
      ) : null}
    </div>
  );
}
