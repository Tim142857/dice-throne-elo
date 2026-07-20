type SpinnerProps = {
  className?: string;
  label?: string;
};

export function Spinner({ className = "size-8", label = "Chargement" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600 ${className}`}
    />
  );
}
