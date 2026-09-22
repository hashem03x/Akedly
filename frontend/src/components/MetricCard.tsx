import { Card } from "./ui/Card";

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight ltr-nums">{value}</p>
    </Card>
  );
}
