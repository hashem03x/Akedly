import { Container } from "@/components/ui/container";

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <div className="py-20 sm:py-28">
      <Container className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">{updated}</p>
        <p className="mt-6 text-lg text-muted">{intro}</p>

        <div className="mt-12 space-y-10 border-t border-border pt-10">
          {sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-lg font-semibold text-ink">{section.heading}</h2>
              <p className="mt-2 text-muted">{section.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
