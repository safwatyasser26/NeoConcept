interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}

export default function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #12151f 0%, #1a1f2e 100%)",
        border: `1px solid ${accent}33`,
        borderRadius: 12,
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          color: "#6b7280",
          fontSize: 11,
          fontFamily: "monospace",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </span>
      <span style={{ color: accent, fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}>
        {value}
      </span>
      {sub && <span style={{ color: "#4b5563", fontSize: 11, fontFamily: "monospace" }}>{sub}</span>}
    </div>
  );
}
