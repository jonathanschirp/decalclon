interface Props {
  points: number;
  isActual: boolean;
  isPB?: boolean;
  className?: string;
}

export function PointsDisplay({ points, isActual, isPB, className = '' }: Props) {
  const baseClasses = isActual ? 'font-semibold' : 'italic text-gray-400';
  const pbClass = isPB ? 'text-green-700' : '';

  return (
    <span className={`${baseClasses} ${pbClass} ${className}`}>
      {points}
    </span>
  );
}
