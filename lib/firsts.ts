/** 「第一次」里程碑目录。参考月龄只是常见范围，每个孩子都有自己的节奏。 */
export type FirstPreset = {
  key: string;
  label: string;
  emoji: string;
  stage: string;
  /** 常见月龄区间，用于卡片上的淡色提示。 */
  hint: string;
};

export const FIRST_STAGES = [
  "新生 0-3个月",
  "翻身期 3-6个月",
  "爬行期 6-12个月",
  "学步期 1-2岁",
  "语言期 2-3岁",
  "幼儿园 3-6岁",
  "节日与纪念",
] as const;

export const FIRST_PRESETS: FirstPreset[] = [
  { key: "born", label: "来到这个世界", emoji: "🌟", stage: "新生 0-3个月", hint: "出生那天" },
  { key: "first-bath", label: "第一次洗澡", emoji: "🛁", stage: "新生 0-3个月", hint: "参考 出生后几天" },
  { key: "eyes-open", label: "第一次睁开眼睛", emoji: "👀", stage: "新生 0-3个月", hint: "参考 出生后几天" },
  { key: "social-smile", label: "第一次对着人笑", emoji: "😊", stage: "新生 0-3个月", hint: "参考 1-2个月" },
  { key: "head-up", label: "第一次抬起头", emoji: "🐣", stage: "新生 0-3个月", hint: "参考 2-3个月" },
  { key: "coo", label: "第一次咿呀发声", emoji: "🎵", stage: "新生 0-3个月", hint: "参考 2-3个月" },
  { key: "grab", label: "第一次抓住玩具", emoji: "🧸", stage: "翻身期 3-6个月", hint: "参考 3-4个月" },
  { key: "roll", label: "第一次翻身", emoji: "🔄", stage: "翻身期 3-6个月", hint: "参考 4-6个月" },
  { key: "laugh", label: "第一次笑出声", emoji: "😆", stage: "翻身期 3-6个月", hint: "参考 3-4个月" },
  { key: "solid-food", label: "第一次吃辅食", emoji: "🥣", stage: "翻身期 3-6个月", hint: "参考 6个月左右" },
  { key: "tooth", label: "第一颗小牙", emoji: "🦷", stage: "翻身期 3-6个月", hint: "参考 6-10个月" },
  { key: "sit", label: "第一次独自坐稳", emoji: "🪑", stage: "爬行期 6-12个月", hint: "参考 6-8个月" },
  { key: "crawl", label: "第一次爬行", emoji: "🐛", stage: "爬行期 6-12个月", hint: "参考 7-10个月" },
  { key: "stranger", label: "第一次认生", emoji: "🙈", stage: "爬行期 6-12个月", hint: "参考 6-9个月" },
  { key: "wave", label: "第一次挥手再见", emoji: "👋", stage: "爬行期 6-12个月", hint: "参考 9-12个月" },
  { key: "pull-up", label: "第一次扶着站起来", emoji: "🧗", stage: "爬行期 6-12个月", hint: "参考 8-11个月" },
  { key: "mama-papa", label: "第一次叫爸爸妈妈", emoji: "🗣️", stage: "爬行期 6-12个月", hint: "参考 9-12个月" },
  { key: "self-feed", label: "第一次自己抓东西吃", emoji: "🍌", stage: "爬行期 6-12个月", hint: "参考 9-12个月" },
  { key: "clap", label: "第一次拍手", emoji: "👏", stage: "爬行期 6-12个月", hint: "参考 9-12个月" },
  { key: "first-step", label: "第一次独立走路", emoji: "👣", stage: "学步期 1-2岁", hint: "参考 11-15个月" },
  { key: "first-word", label: "第一个有意义的词", emoji: "💬", stage: "学步期 1-2岁", hint: "参考 12-18个月" },
  { key: "spoon", label: "第一次自己用勺子", emoji: "🥄", stage: "学步期 1-2岁", hint: "参考 15-24个月" },
  { key: "run", label: "第一次跑起来", emoji: "🏃", stage: "学步期 1-2岁", hint: "参考 18-24个月" },
  { key: "doodle", label: "第一次涂鸦", emoji: "🖍️", stage: "学步期 1-2岁", hint: "参考 15-24个月" },
  { key: "stairs", label: "第一次自己上楼梯", emoji: "🪜", stage: "学步期 1-2岁", hint: "参考 18-24个月" },
  { key: "potty", label: "第一次自己上厕所", emoji: "🚽", stage: "语言期 2-3岁", hint: "参考 2-3岁" },
  { key: "sentence", label: "第一次说完整句子", emoji: "📖", stage: "语言期 2-3岁", hint: "参考 2-3岁" },
  { key: "friend", label: "第一个好朋友", emoji: "🧒", stage: "语言期 2-3岁", hint: "参考 2-3岁" },
  { key: "tricycle", label: "第一次骑三轮车", emoji: "🚲", stage: "语言期 2-3岁", hint: "参考 2-3岁" },
  { key: "swim", label: "第一次下水游泳", emoji: "🏊", stage: "语言期 2-3岁", hint: "参考 2-4岁" },
  { key: "nursery", label: "第一天去幼儿园", emoji: "🎒", stage: "幼儿园 3-6岁", hint: "参考 3岁左右" },
  { key: "write-name", label: "第一次写自己名字", emoji: "✏️", stage: "幼儿园 3-6岁", hint: "参考 4-5岁" },
  { key: "loose-tooth", label: "第一次换牙", emoji: "🦷", stage: "幼儿园 3-6岁", hint: "参考 5-7岁" },
  { key: "jump-rope", label: "第一次跳绳", emoji: "🪢", stage: "幼儿园 3-6岁", hint: "参考 5-6岁" },
  { key: "stage", label: "第一次上台表演", emoji: "🎤", stage: "幼儿园 3-6岁", hint: "参考 3-6岁" },
  { key: "sleep-alone", label: "第一次自己睡一整晚", emoji: "🌙", stage: "幼儿园 3-6岁", hint: "参考 3-5岁" },
  { key: " haircut", label: "第一次理发", emoji: "✂️", stage: "节日与纪念", hint: "任何时间" },
  { key: "photo-shoot", label: "第一次拍写真", emoji: "📷", stage: "节日与纪念", hint: "任何时间" },
  { key: "zoo", label: "第一次去动物园", emoji: "🦒", stage: "节日与纪念", hint: "任何时间" },
  { key: "sea", label: "第一次看海", emoji: "🌊", stage: "节日与纪念", hint: "任何时间" },
  { key: "snow", label: "第一次看见雪", emoji: "❄️", stage: "节日与纪念", hint: "任何时间" },
  { key: "flight", label: "第一次坐飞机", emoji: "✈️", stage: "节日与纪念", hint: "任何时间" },
  { key: "train", label: "第一次坐高铁", emoji: "🚄", stage: "节日与纪念", hint: "任何时间" },
  { key: "birthday-1", label: "第一个生日", emoji: "🎂", stage: "节日与纪念", hint: "1周岁" },
  { key: "spring-festival", label: "第一次过年", emoji: "🧧", stage: "节日与纪念", hint: "任何时间" },
];

export const PRESET_MAP: Record<string, FirstPreset> = Object.fromEntries(
  FIRST_PRESETS.map((p) => [p.key, p]),
);

export const MOMENT_CATEGORIES = [
  { key: "daily", label: "日常", emoji: "🌤️", color: "sage" },
  { key: "first", label: "第一次", emoji: "🌟", color: "apricot" },
  { key: "health", label: "健康", emoji: "🩺", color: "blue" },
  { key: "travel", label: "出行", emoji: "🧳", color: "butter" },
  { key: "funny", label: "搞笑瞬间", emoji: "🤪", color: "coral" },
  { key: "family", label: "家人", emoji: "👨‍👩‍👧", color: "plum" },
] as const;

export type MomentCategory = (typeof MOMENT_CATEGORIES)[number]["key"];

export const CATEGORY_MAP: Record<string, (typeof MOMENT_CATEGORIES)[number]> = Object.fromEntries(
  MOMENT_CATEGORIES.map((c) => [c.key, c]),
);

export const ALBUM_SUGGESTIONS = ["日常", "旅行", "节日", "写真", "幼儿园", "和小伙伴"];
