"use client";
import { useState } from "react";
import { Repeat2, Volume2, CalendarDays } from "lucide-react";
import { useI18n } from "./i18n";
import { L, sentences, sentenceItem } from "./course-data";
import { speak, stopAudio } from "./audio";
const copy = {
  title: L(
    "A habit, or one missed breakfast?",
    "Une habitude ou un petit-déjeuner manqué ?",
    "Привычка или один пропущенный завтрак?",
  ),
  intro: L(
    "Switch the scene. Look for a repeated routine or one particular day.",
    "Changez de scène. Repérez une habitude répétée ou un jour précis.",
    "Переключайте сцену: повторяющаяся привычка или один конкретный день.",
  ),
  habit: L("Usual routine · 不", "Habitude · 不", "Обычная привычка · 不"),
  yesterday: L("Yesterday · 没", "Hier · 没", "Вчера · 没"),
  today: L("What about today?", "Et aujourd’hui ?", "А что сегодня?"),
  daily: L(
    "The same routine, day after day",
    "La même habitude, jour après jour",
    "Одна и та же привычка изо дня в день",
  ),
  single: L(
    "One particular day: yesterday",
    "Un jour précis : hier",
    "Один конкретный день: вчера",
  ),
  unknown: L(
    "Today: the sentence does not tell us",
    "Aujourd’hui : la phrase ne le dit pas",
    "Сегодня: в предложении об этом не сказано",
  ),
  habitExplanation: L(
    "Breakfast is not part of this person’s usual routine. 不 describes the habit here; 每天 makes the repetition explicit.",
    "Cette personne n’a pas l’habitude de prendre un petit-déjeuner. Ici, 不 décrit cette habitude ; 每天 indique clairement la répétition.",
    "Этот человек обычно не завтракает. Здесь 不 описывает привычку, а 每天 прямо указывает на повторение.",
  ),
  yesterdayExplanation: L(
    "Yesterday’s breakfast did not happen. 没 says the action did not occur. We are describing that day, not the person’s usual routine.",
    "Le petit-déjeuner d’hier n’a pas eu lieu. 没 indique que l’action ne s’est pas produite. On décrit ce jour-là, pas les habitudes de la personne.",
    "Вчера человек не позавтракал. 没 показывает, что действие не произошло. Речь об этом дне, а не об обычной привычке.",
  ),
  unknownExplanation: L(
    "We only know about yesterday. The person may or may not eat breakfast today — this sentence does not say.",
    "On sait seulement ce qui s’est passé hier. Cette personne peut prendre ou non un petit-déjeuner aujourd’hui : la phrase ne le précise pas.",
    "Мы знаем только о вчерашнем дне. Сегодня человек может позавтракать или нет — это предложение не уточняет.",
  ),
  habitAlt: L(
    "A person skips breakfast as a repeated routine; five calendar cards show the same crossed-out bowl.",
    "Une personne ne prend habituellement pas de petit-déjeuner ; cinq jours montrent le même bol barré.",
    "Человек обычно пропускает завтрак: на пяти карточках календаря одна и та же перечёркнутая миска.",
  ),
  yesterdayAlt: L(
    "A calendar highlights yesterday. The crossed-out breakfast bowl shows that the person did not eat breakfast that day.",
    "Le calendrier met hier en évidence. Le bol barré indique que la personne n’a pas pris de petit-déjeuner ce jour-là.",
    "В календаре выделено «вчера». Перечёркнутая миска показывает, что человек не позавтракал в тот день.",
  ),
  unknownAlt: L(
    "Today’s breakfast has a question mark: the sentence about yesterday gives no information about today.",
    "Le petit-déjeuner d’aujourd’hui porte un point d’interrogation : la phrase sur hier ne dit rien sur aujourd’hui.",
    "У сегодняшнего завтрака вопросительный знак: предложение о вчерашнем дне ничего не сообщает о сегодняшнем.",
  ),
  day: L("Day", "Jour", "День"),
  caption: L(
    "In this breakfast example: 不 + habit; 没 + an action that did not happen. This is not a general “present versus past” rule.",
    "Dans cet exemple : 不 pour une habitude ; 没 pour une action qui n’a pas eu lieu. Ce n’est pas une règle générale « présent ou passé ».",
    "В этом примере: 不 — привычка, 没 — действие, которое не произошло. Это не общее правило «настоящее или прошедшее время».",
  ),
};
function Bowl({ unknown = false }: { unknown?: boolean }) {
  return (
    <svg viewBox="0 0 64 52" aria-hidden="true">
      <path className="breakfast-bowl" d="M8 24H56C53 45 11 45 8 24Z" />
      <path d="M20 13Q15 7 20 2M32 13Q27 7 32 2M44 13Q39 7 44 2" />
      {unknown ? (
        <text x="32" y="39" textAnchor="middle" className="breakfast-question">
          ?
        </text>
      ) : (
        <path className="breakfast-cross" d="M13 45L51 16" />
      )}
    </svg>
  );
}
export default function CourseBreakfastStory({
  notify,
}: {
  notify: (m: string) => void;
}) {
  const { locale, t } = useI18n();
  const [story, setStory] = useState<"habit" | "yesterday">("habit");
  const [day, setDay] = useState<"yesterday" | "today">("yesterday");
  const habit = story === "habit";
  const unknown = !habit && day === "today";
  const sentence = sentences.find((s) => s.id === (habit ? "s11" : "s12"))!;
  return (
    <section
      className="course-story breakfast-story"
      aria-label={copy.title[locale]}
    >
      <div className="section-top">
        <h4>{copy.title[locale]}</h4>
        <Repeat2 size={20} />
      </div>
      <p>{copy.intro[locale]}</p>
      <div
        className="course-story-choices"
        role="group"
        aria-label={t("Choose a story")}
      >
        {(["habit", "yesterday"] as const).map((value) => (
          <button
            key={value}
            className={story === value ? "selected" : ""}
            aria-pressed={story === value}
            onClick={() => {
              stopAudio();
              setStory(value);
              setDay("yesterday");
            }}
          >
            {copy[value][locale]}
          </button>
        ))}
      </div>
      <div
        className={
          "breakfast-calendar " + (habit ? "is-routine" : "is-one-day")
        }
        aria-hidden="true"
      >
        {habit ? (
          Array.from({ length: 5 }, (_, i) => (
            <div key={i}>
              <small>
                {copy.day[locale]} {i + 1}
              </small>
              <Bowl />
            </div>
          ))
        ) : (
          <div className={unknown ? "is-unknown" : ""}>
            <CalendarDays size={23} />
            <strong>{(unknown ? copy.today : copy.yesterday)[locale]}</strong>
            <Bowl unknown={unknown} />
          </div>
        )}
      </div>
      <div
        className={"breakfast-picture " + (unknown ? "is-unknown" : "")}
        role="img"
        aria-label={
          (habit
            ? copy.habitAlt
            : unknown
              ? copy.unknownAlt
              : copy.yesterdayAlt)[locale]
        }
      >
        <svg viewBox="0 0 560 230" aria-hidden="true">
          <ellipse
            cx="280"
            cy="207"
            rx="230"
            ry="10"
            className="breakfast-shadow"
          />
          <g className="breakfast-person">
            <circle cx="139" cy="58" r="20" />
            <path d="M118 92Q140 79 160 93L171 138H151L164 199H143L132 157L124 199H101L113 137L96 151L84 138Z" />
          </g>
          <path
            className="breakfast-table"
            d="M254 149H482M276 149V201M459 149V201"
          />
          <path
            className="breakfast-place"
            d="M327 107H416C409 150 334 150 327 107Z"
          />
          <path
            className="breakfast-steam"
            d="M349 94Q340 83 349 72M373 94Q364 83 373 72M397 94Q388 83 397 72"
          />
          {unknown ? (
            <text
              x="373"
              y="139"
              textAnchor="middle"
              className="breakfast-big-question"
            >
              ?
            </text>
          ) : (
            <g className="breakfast-no-meal">
              <circle cx="372" cy="119" r="47" />
              <path d="M339 153L406 85" />
            </g>
          )}
          <g className="breakfast-clock">
            <circle cx="465" cy="49" r="24" />
            <path d="M465 33V49L476 56" />
          </g>
          {habit && (
            <path
              className="breakfast-repeat"
              d="M65 83C34 95 33 135 60 148M60 148L47 147M60 148L56 135"
            />
          )}
        </svg>
      </div>
      <p className="breakfast-scene-label" aria-live="polite">
        {(habit ? copy.daily : unknown ? copy.unknown : copy.single)[locale]}
      </p>
      {!habit && (
        <div
          className="course-story-phases"
          role="group"
          aria-label={t("Move through the story")}
        >
          {(["yesterday", "today"] as const).map((value) => (
            <button
              key={value}
              className={day === value ? "selected" : ""}
              aria-pressed={day === value}
              onClick={() => setDay(value)}
            >
              {copy[value][locale]}
            </button>
          ))}
        </div>
      )}
      <p className="course-story-explanation" aria-live="polite">
        {
          (habit
            ? copy.habitExplanation
            : unknown
              ? copy.unknownExplanation
              : copy.yesterdayExplanation)[locale]
        }
      </p>
      <div className="course-story-sentences breakfast-sentence">
        <article>
          <strong lang="zh-Hans">{sentence.hanzi}</strong>
          <span className="pinyin">{sentence.pinyin}</span>
          <p>{sentence.meaning[locale]}</p>
          <button
            className="audio-button"
            aria-label={t("Listen to") + " " + sentence.pinyin}
            onClick={() =>
              speak(sentence.hanzi, notify, sentenceItem(sentence, locale))
            }
          >
            <Volume2 size={16} />
            {t("Listen to example")}
          </button>
        </article>
      </div>
      <p className="course-story-caution">{copy.caption[locale]}</p>
    </section>
  );
}
