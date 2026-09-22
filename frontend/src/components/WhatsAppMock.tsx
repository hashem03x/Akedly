export function WhatsAppMock() {
  return (
    <div className="w-full max-w-sm rounded-md border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-sm font-semibold text-success">
          L
        </div>
        <div>
          <div className="text-sm font-medium text-ink">Leopard</div>
          <div className="text-xs text-muted">WhatsApp Business</div>
        </div>
      </div>

      <div dir="rtl" className="space-y-3 text-right">
        <div className="rounded-md rounded-tr-sm bg-surface-hover px-3 py-2.5 text-sm leading-relaxed text-ink">
          أهلاً أحمد،
          <br />
          <br />
          تم استلام طلبك رقم #1042 من Leopard.
          <br />
          <br />
          <span className="ltr-nums">2 ×</span> Nike T-Shirt
          <br />
          الإجمالي: <span className="ltr-nums">1,450</span> جنيه
          <br />
          <br />
          هل تريد تأكيد الطلب؟
        </div>

        <div className="flex gap-2">
          <div className="flex-1 rounded-md border border-success/40 bg-success/10 py-2 text-center text-sm font-medium text-success">
            تأكيد الطلب
          </div>
          <div className="flex-1 rounded-md border border-danger/40 bg-danger/10 py-2 text-center text-sm font-medium text-danger">
            إلغاء الطلب
          </div>
        </div>
      </div>
    </div>
  );
}
