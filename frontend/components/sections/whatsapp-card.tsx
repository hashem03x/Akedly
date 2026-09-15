import { MessageCircle, Check, CheckCheck } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/card";

export function WhatsappCard({ dict }: { dict: Dictionary }) {
  const c = dict.howItWorks.whatsappCard;

  return (
    <Card className="w-full max-w-sm overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-2 border-b border-border-subtle bg-elevated px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-accent text-on-accent">
          <MessageCircle className="size-3.5" />
        </span>
        <span className="text-sm font-medium text-ink">WhatsApp</span>
      </div>

      <div className="space-y-3 bg-whatsapp-bg p-4">
        <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-whatsapp-message px-3.5 py-2.5 text-sm text-ink">
          <p>{c.greeting}</p>
          <p className="mt-2">{c.received}</p>
          <div className="mt-2 flex items-center justify-between rounded-lg bg-whatsapp-outgoing px-2.5 py-1.5 text-xs">
            <span className="text-muted">{c.totalLabel}</span>
            <span className="font-semibold text-ink">
              1,250 {dict.common.egp}
            </span>
          </div>
          <p className="mt-2 text-[13px]">{c.confirmPrompt}</p>
          <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted">
            <CheckCheck className="size-3 text-info" />
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            tabIndex={-1}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-medium text-on-accent"
          >
            <Check className="size-3.5" />
            {c.confirmBtn}
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="flex-1 rounded-full border border-border-strong px-3 py-2 text-xs font-medium text-muted"
          >
            {c.cancelBtn}
          </button>
        </div>
      </div>
    </Card>
  );
}
