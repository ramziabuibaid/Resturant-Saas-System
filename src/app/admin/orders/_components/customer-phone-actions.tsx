"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  buildPublicOrderTrackingUrl,
  buildTelHref,
  buildWhatsAppMeUrl,
  buildWhatsAppOrderStaffMessage,
  formatInternationalPhoneDisplay,
  normalizeInternationalDigits,
} from "@/lib/customer-phone";
import { cn } from "@/lib/utils";
import { MessageCircleIcon, PhoneIcon } from "lucide-react";

type Props = {
  phoneCountryPrefix: string | null;
  customerPhone: string;
  displayNumber: number;
  trackingToken: string;
  subdomain: string;
  publicBaseUrl: string;
  restaurantName: string;
  /** إن لم تُعرَف المقدمة الدولية */
  showPrefixHint?: boolean;
  className?: string;
};

export function CustomerPhoneActions({
  phoneCountryPrefix,
  customerPhone,
  displayNumber,
  trackingToken,
  subdomain,
  publicBaseUrl,
  restaurantName,
  showPrefixHint = true,
  className,
}: Props) {
  const fullDigits = normalizeInternationalDigits(phoneCountryPrefix, customerPhone);
  const display = formatInternationalPhoneDisplay(fullDigits);
  const trackingUrl = buildPublicOrderTrackingUrl(publicBaseUrl, subdomain, trackingToken);
  const message = buildWhatsAppOrderStaffMessage({
    restaurantName,
    displayNumber,
    trackingUrl,
  });
  const waHref = buildWhatsAppMeUrl(fullDigits, message);
  const telHref = buildTelHref(fullDigits);
  const missingPrefix = showPrefixHint && !(phoneCountryPrefix ?? "").replace(/\D/g, "").length;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2" dir="ltr">
        <span className="min-w-0 font-mono text-sm font-semibold text-foreground">{display}</span>
        <a
          href={telHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "inline-flex gap-1.5"
          )}
        >
          <PhoneIcon className="size-3.5" aria-hidden />
          اتصال
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "inline-flex gap-1.5 bg-[#25D366] text-white hover:bg-[#20bd5a]"
          )}
        >
          <MessageCircleIcon className="size-3.5" aria-hidden />
          واتساب
        </a>
      </div>
      {missingPrefix ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          نصيحة: أضف «مقدمة الدولة» من الإعدادات لضبط رقم واتساب والاتصال بشكل صحيح.
        </p>
      ) : null}
    </div>
  );
}
