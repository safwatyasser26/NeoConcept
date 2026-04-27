interface MiniBarProps {
  value: number;
  max: number;
  color: string;
}

export default function MiniBar({ value, max, color }: MiniBarProps) {
  return (
    <div
      style={{
        background: "#1a1f2e",
        borderRadius: 3,
        height: 6,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, (value / max) * 100)}%`,
          height: "100%",
          background: color,
          borderRadius: 3,
          transition: "width 0.4s",
        }}
      />
    </div>
  );
}
