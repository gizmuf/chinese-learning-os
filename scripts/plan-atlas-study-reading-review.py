"""Build the reviewed Atlas playback manifest from the original audit list."""

import argparse
import gzip
import hashlib
import json
import re
import unicodedata
from pathlib import Path

from pypinyin import Style, pinyin as readings_for
from pypinyin.contrib.tone_convert import to_normal, to_tone, to_tone3

# Correct the label when a corpus token has the wrong reading for its meaning.
CORRECTIONS = {
    ("奶奶", "nǎinǎi"): "nǎinai", ("爸爸", "bàbà"): "bàba",
    ("医生", "yìshēng"): "yīshēng", ("喜欢", "xǐhuān"): "xǐhuan",
    ("衣服", "yìfú"): "yīfu", ("妈妈", "māmā"): "māma",
    ("医院", "yíyuàn"): "yīyuàn", ("休息", "xiūxī"): "xiūxi",
    ("姐姐", "jiějiě"): "jiějie", ("妹妹", "mèimèi"): "mèimei",
    ("哥哥", "gēgē"): "gēge", ("部", "bú"): "bù", ("爷爷", "yéyé"): "yéye",
    ("认识", "rènshí"): "rènshi", ("儿", "er"): "ér",
    ("漂亮", "piàoliàng"): "piàoliang", ("相关", "xiàngguān"): "xiāngguān",
    ("丈夫", "zhàngfū"): "zhàngfu", ("路上", "lùshàng"): "lùshang",
    ("弟弟", "dìdì"): "dìdi", ("走", "zou"): "zǒu",
    ("卜", "bo"): "bǔ", ("罗", "luō"): "luó",
    ("丷", "ha"): "bāzìtóu",
}

# Dependent sounds and uncommon readings are taught in a complete example.
CONTEXT = {
    ("色", "shǎi"): ("色子", "shǎi zi"),
    ("哪", "né"): ("哪吒", "né zhā"),
    ("咖", "gā"): ("咖喱", "gā lí"),
    ("别", "biè"): ("别扭", "biè niu"),
    ("南", "nā"): ("南无", "nā mó"),
    ("边", "bian"): ("那边", "nà bian"),
    ("便", "pián"): ("便宜", "pián yi"),
    ("作", "zuō"): ("作坊", "zuō fang"),
    ("个", "gě"): ("自个儿", "zì gěr"),
    ("扫", "sào"): ("扫帚", "sào zhou"),
    ("答", "dā"): ("答应", "dā ying"),
    ("头", "tou"): ("石头", "shí tou"),
    ("参", "cēn"): ("参差", "cēn cī"),
    ("儿", "r"): ("一点儿", "yì diǎnr"),
    ("阿", "ē"): ("阿谀", "ē yú"),
    ("不", "bú"): ("不对", "bú duì"),
    ("不", "bu"): ("好不好", "hǎo bu hǎo"),
    ("来", "lai"): ("出来", "chū lai"),
    ("一", "yi"): ("看一看", "kàn yi kàn"),
    ("里", "li"): ("哪里", "nǎ li"),
    ("匙", "shi"): ("钥匙", "yào shi"),
    ("迫", "pǎi"): ("迫击炮", "pǎi jī pào"),
    ("夹", "gā"): ("夹肢窝", "gā zhi wō"),
    ("歪", "wǎi"): ("歪脚", "wǎi jiǎo"),
    ("叨", "tāo"): ("叨扰", "tāo rǎo"),
    ("哈", "hǎ"): ("哈巴狗", "hǎ ba gǒu"),
    ("胳", "gā"): ("胳肢窝", "gā zhi wō"),
    ("隆", "lōng"): ("轰隆", "hōng lōng"),
    ("虾", "há"): ("虾蟆", "há ma"),
    ("乜", "miē"): ("乜斜", "miē xie"),
    ("矫", "jiáo"): ("矫情", "jiáo qing"),
    ("价", "jie"): ("整天价", "zhěng tiān jie"),
    ("姆", "m̄"): ("姆妈", "m̄ mā"),
    ("若", "rě"): ("般若", "bō rě"),
}

# A dictionary segmentation is used where available. These phrases need
# explicit divisions, including the non-syllabic 儿 suffix.
SEGMENTS = {
    "在哪儿呢": "zài nǎr ne", "谁的": "shéi de", "你找谁": "nǐ zhǎo shéi",
    "谁都可以": "shéi dōu kě yǐ", "踢毽子": "tī jiàn zi",
    "尝尝": "cháng chang", "洗个澡": "xǐ ge zǎo", "网吧": "wǎng bā",
    "出去": "chū qu", "这里": "zhè li",
}


def reading(text):
    return "".join(c for c in unicodedata.normalize("NFC", text.lower())
                   if unicodedata.category(c)[0] in ("L", "M"))


def key(text, pin):
    return re.sub(r"\s+", "", text).removesuffix("。").removesuffix(".") + "\t" + reading(pin)


def marked(value):
    return to_tone(value.lower().replace("u:", "ü").replace("5", ""))


def segments(text, pin, dictionary):
    if text in SEGMENTS and reading(SEGMENTS[text]) == reading(pin):
        return SEGMENTS[text]
    for candidate in dictionary.get(text, []):
        if reading(candidate) == reading(pin) and len(candidate.split()) == len(text):
            return re.sub(r" r(?=$| )", "r", candidate)
    if len(text) == 1 or text == "丷":
        return pin
    compact = reading(pin)
    options = readings_for(text, style=Style.NORMAL, heteronym=True)
    if "儿" in text:
        options = [(*o, "r") if h == "儿" else o for h, o in zip(text, options)]

    def align(rest, index):
        if index == len(options):
            return [] if not rest else None
        for end in range(1, len(rest)+1):
            piece = rest[:end]
            if to_normal(piece) not in options[index]:
                continue
            finish = align(rest[end:], index+1)
            if finish is not None:
                return [piece, *finish]
        return None

    result = align(compact, 0)
    if result is None:
        raise ValueError(f"Cannot align {text}: {pin}")
    return re.sub(r" r(?=$| )", "r", " ".join(result))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("missing", type=Path)
    parser.add_argument("plan", type=Path)
    args = parser.parse_args()
    rows = json.loads(args.missing.read_text())
    assert len(rows) == 210
    wanted = {r["text"] for r in rows} | {text for text, _ in CONTEXT.values()}
    dictionary = {}
    with gzip.open("resources/cc-cedict/cedict.txt.gz", mode="rt", encoding="utf-8") as stream:
        for line in stream:
            match = re.match(r"^\S+ (\S+) \[([^\]]+)\] /", line)
            if match and match[1] in wanted:
                dictionary.setdefault(match[1], []).append(" ".join(map(marked, match[2].split())))
    catalogue = json.loads(Path("data/atlas-study-audio.json").read_text())
    syllables = {}
    for tag, source in catalogue.items():
        text, pin = tag.split("\t")
        if len(text)==1 and any(c in unicodedata.normalize("NFD", pin) for c in "\u0304\u0301\u030c\u0300"):
            syllables.setdefault(pin, source)

    reviewed, jobs = {}, {}
    for row in rows:
        text, prior = row["text"], row["pinyin"]
        pin = CORRECTIONS.get((text, prior), prior)
        actual, spoken = CONTEXT.get((text, prior), (text, pin))
        path = catalogue.get(key(actual, spoken))
        if not path and actual == text and len(text) == 1 and text != "丷":
            path = syllables.get(reading(spoken))
        if not path:
            pronounced = segments(actual, spoken, dictionary) if actual == text else spoken
            if text == "丷":
                pronounced = "bā zì tóu"
            digest = hashlib.sha256(key(actual, pronounced).encode()).hexdigest()[:24]
            path = f"/audio/atlas-study/review-{digest}.mp3"
            jobs[path] = {"text": actual if text != "丷" else "八字头", "pinyin": pronounced, "source": path}
        item = {"source": path}
        if pin != prior:
            item["pinyin"] = pin
        if text == "丷":
            item["english"] = "inverted 八 component"
        if actual != text:
            item.update(context=actual, contextPinyin=spoken)
        reviewed[key(text, prior)] = item
    assert len(reviewed) == len(rows)
    Path("data/atlas-study-reading-review.json").write_text(json.dumps(reviewed, ensure_ascii=False, indent=2, sort_keys=True)+"\n")
    args.plan.write_text(json.dumps(list(jobs.values()), ensure_ascii=False, indent=2)+"\n")
    print(f"{len(reviewed)} reviewed readings; {len(jobs)} new clips")


if __name__ == "__main__":
    main()
