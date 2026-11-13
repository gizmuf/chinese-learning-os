"use client";
import {useI18n} from "./i18n";
export default function Ratings({
  onRate,
  disabled,
}: {
  onRate: (r: 1 | 2 | 3 | 4) => void;
  disabled: boolean;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="ratings">
      {(
        [
          { r: 1, title: t("Again"), help: t("Could not recall") },
          { r: 2, title: t("Hard"), help: t("Correct, with effort") },
          { r: 3, title: t("Good"), help: t("Recalled correctly") },
          { r: 4, title: t("Easy"), help: t("Quick & confident") },
        ] as const
      ).map((b) => (
        <button
          key={b.r}
          disabled={disabled}
          className={"rating rating-" + b.r}
          onClick={() => onRate(b.r)}
        >
          <strong>{b.title}</strong>
          <small>{b.help}</small>
        </button>
      ))}
    </div>
  );
}
