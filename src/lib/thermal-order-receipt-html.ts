import { formatMenuPrice } from "@/lib/currencies";
import type { GuestOrderWithDetails } from "@/lib/types/database";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-ui";

const FULFILLMENT_LABELS: Record<string, string> = {
  dine_in: "داخل المطعم",
  pickup: "استلام",
  delivery: "توصيل",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function divider(char = "─", len = 32): string {
  return escapeHtml(char.repeat(len));
}

/**
 * مستند HTML بسيط مناسب لطابعات ٨٠مم (حرارية): أبيض/أسود، خط أحادي، RTL.
 */
export function buildThermalOrderReceiptHtml(
  order: GuestOrderWithDetails,
  opts: { restaurantName: string; currencyCode: string }
): string {
  const { restaurantName, currencyCode } = opts;
  const subtotal = order.items.reduce((s, i) => s + i.line_total_cents, 0);
  const loyaltyDisc = order.loyalty_discount_cents ?? 0;
  const ownerDisc = order.owner_discount_cents ?? 0;
  const payable = Math.max(0, subtotal - loyaltyDisc - ownerDisc);
  const created = new Date(order.created_at);
  const dateStr = created.toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  });

  const itemsHtml = order.items
    .map((i) => {
      const name = i.menu_item_name ?? "صنف";
      const opt = i.price_option_label ? ` (${i.price_option_label})` : "";
      const excluded =
        i.excluded_ingredients?.length ?
          `<div class="sub">${escapeHtml("بدون: " + i.excluded_ingredients.join("، "))}</div>`
        : "";
      return `
        <div class="row item">
          <div class="item-main">
            <span class="qty">${i.quantity}×</span>
            <span class="iname">${escapeHtml(name)}${escapeHtml(opt)}</span>
          </div>
          <span class="iprice" dir="ltr">${escapeHtml(formatMenuPrice(i.line_total_cents, currencyCode))}</span>
        </div>
        ${excluded}
      `;
    })
    .join("");

  const ownerRow =
    ownerDisc > 0 ?
      `<div class="row"><span>خصم خاص</span><span dir="ltr">−${escapeHtml(formatMenuPrice(ownerDisc, currencyCode))}</span></div>`
    : "";
  const loyaltyRow =
    loyaltyDisc > 0 ?
      `<div class="row"><span>خصم نقاط الولاء${order.loyalty_points_used ? ` (${order.loyalty_points_used})` : ""}</span><span dir="ltr">−${escapeHtml(formatMenuPrice(loyaltyDisc, currencyCode))}</span></div>`
    : "";
  const pointsRow =
    (order.loyalty_points_earned_on_order ?? 0) > 0 ?
      `<div class="row points"><span>نقاط مكتسبة</span><span dir="ltr">+${order.loyalty_points_earned_on_order}</span></div>`
    : "";

  const staffBlock =
    order.staff_notes?.trim() ?
      `<div class="block"><div class="label">ملاحظات الطاقم</div><div class="notes">${escapeHtml(order.staff_notes.trim())}</div></div>`
    : "";

  const tableLine = order.table_label ?
    `<div class="row meta"><span>الطاولة</span><span dir="ltr">${escapeHtml(order.table_label)}</span></div>`
  : "";
  const waiterLine =
    order.fulfillment === "dine_in" && order.waiter_name ?
      `<div class="row meta"><span>الويتر</span><span>${escapeHtml(order.waiter_name)}</span></div>`
    : "";
  const addrLine = order.delivery_address ?
    `<div class="addr">${escapeHtml(order.delivery_address)}</div>`
  : "";

  const title = escapeHtml(restaurantName.trim() || "المطعم");
  const statusLabel = ORDER_STATUS_LABELS[order.status];
  const fulfillLabel = FULFILLMENT_LABELS[order.fulfillment] ?? order.fulfillment;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>طلب #${order.display_number}</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: 80mm auto; margin: 3mm; }
    body {
      margin: 0;
      padding: 2mm 3mm 4mm;
      width: 74mm;
      max-width: 74mm;
      font-family: "Courier New", Courier, "Noto Sans Arabic", monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .brand {
      text-align: center;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.02em;
      margin-bottom: 2px;
      border-bottom: 2px dashed #000;
      padding-bottom: 6px;
    }
    .tagline {
      text-align: center;
      font-size: 9px;
      opacity: 0.85;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .order-num {
      text-align: center;
      font-size: 18px;
      font-weight: 800;
      margin: 6px 0 4px;
      letter-spacing: 0.04em;
    }
    .meta-grid {
      font-size: 10px;
      margin-bottom: 8px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 6px;
      margin: 3px 0;
    }
    .row.meta { font-size: 10px; }
    .sep {
      text-align: center;
      font-size: 9px;
      margin: 6px 0;
      letter-spacing: 2px;
      overflow: hidden;
    }
    .item { margin-top: 6px; align-items: flex-start; }
    .item-main { flex: 1; min-width: 0; }
    .qty { font-weight: 700; margin-inline-end: 4px; }
    .iname { word-break: break-word; }
    .iprice { flex-shrink: 0; font-weight: 600; }
    .sub {
      font-size: 9px;
      margin: 2px 0 4px 18px;
      opacity: 0.9;
    }
    .addr {
      font-size: 10px;
      margin: 4px 0 6px;
      padding: 4px;
      border: 1px solid #000;
    }
    .block {
      margin: 8px 0;
      padding: 5px;
      border: 1px dashed #000;
    }
    .block .label { font-size: 9px; font-weight: 700; margin-bottom: 3px; }
    .notes { font-size: 10px; white-space: pre-wrap; word-break: break-word; }
    .totals { margin-top: 8px; border-top: 2px solid #000; padding-top: 6px; }
    .totals .row.total {
      font-size: 14px;
      font-weight: 800;
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px solid #000;
    }
    .row.points { font-size: 10px; }
    .footer {
      text-align: center;
      font-size: 9px;
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px dashed #000;
    }
  </style>
</head>
<body>
  <div class="brand">${title}</div>
  <p class="tagline">إيصال طلب — طابعة حرارية</p>
  <div class="order-num" dir="ltr">#${order.display_number}</div>
  <div class="meta-grid">
    <div class="row meta"><span>التاريخ والوقت</span><span dir="ltr">${escapeHtml(dateStr)}</span></div>
    <div class="row meta"><span>الحالة</span><span>${escapeHtml(statusLabel)}</span></div>
    <div class="row meta"><span>نوع الطلب</span><span>${escapeHtml(fulfillLabel)}</span></div>
    ${tableLine}
    ${waiterLine}
    <div class="row meta"><span>الجوال</span><span dir="ltr">${escapeHtml(order.customer_phone)}</span></div>
  </div>
  ${addrLine}
  <div class="sep">${divider()}</div>
  <div class="items">${itemsHtml}</div>
  <div class="sep">${divider()}</div>
  ${staffBlock}
  <div class="totals">
    <div class="row"><span>مجموع الأصناف</span><span dir="ltr">${escapeHtml(formatMenuPrice(subtotal, currencyCode))}</span></div>
    ${ownerRow}
    ${loyaltyRow}
    ${pointsRow}
    <div class="row total"><span>المستحق</span><span dir="ltr">${escapeHtml(formatMenuPrice(payable, currencyCode))}</span></div>
  </div>
  <p class="footer">شكراً لزيارتكم</p>
</body>
</html>`;
}
