const DEFAULT_CATEGORIES = [
  {
    id: "life",
    label: "生活",
    color: "var(--cat-life)",
    children: [
      { id: "life.meal", label: "吃饭" },
      { id: "life.hygiene", label: "洗漱" },
      { id: "life.chores", label: "家务" },
      { id: "life.shopping", label: "购物" },
      { id: "life.errand", label: "办事" },
      { id: "life.other", label: "其他生活" },
    ],
  },
  {
    id: "work",
    label: "工作",
    color: "var(--cat-work)",
    children: [
      { id: "work.coding", label: "编码" },
      { id: "work.meeting", label: "会议" },
      { id: "work.writing", label: "写作" },
      { id: "work.communication", label: "沟通" },
      { id: "work.other", label: "其他工作" },
    ],
  },
  {
    id: "study",
    label: "学习",
    color: "var(--cat-study)",
    children: [
      { id: "study.reading", label: "阅读" },
      { id: "study.course", label: "课程" },
      { id: "study.practice", label: "练习" },
      { id: "study.review", label: "复盘" },
      { id: "study.other", label: "其他学习" },
    ],
  },
  {
    id: "exercise",
    label: "运动",
    color: "var(--cat-exercise)",
    children: [
      { id: "exercise.walk", label: "散步" },
      { id: "exercise.workout", label: "锻炼" },
      { id: "exercise.stretch", label: "拉伸" },
      { id: "exercise.other", label: "其他运动" },
    ],
  },
  {
    id: "entertainment",
    label: "娱乐",
    color: "var(--cat-entertainment)",
    children: [
      { id: "entertainment.video", label: "视频" },
      { id: "entertainment.game", label: "游戏" },
      { id: "entertainment.social_media", label: "社媒" },
      { id: "entertainment.music", label: "音乐" },
      { id: "entertainment.other", label: "其他娱乐" },
    ],
  },
  {
    id: "health",
    label: "健康",
    color: "var(--cat-health)",
    children: [
      { id: "health.rest", label: "恢复休息" },
      { id: "health.medication", label: "用药" },
      { id: "health.pain", label: "不适处理" },
      { id: "health.hospital", label: "医院看病" },
      { id: "health.other", label: "其他健康" },
    ],
  },
  {
    id: "social",
    label: "社交",
    color: "var(--cat-social)",
    children: [
      { id: "social.chat", label: "聊天" },
      { id: "social.call", label: "通话" },
      { id: "social.family", label: "家人互动" },
      { id: "social.other", label: "其他社交" },
    ],
  },
  {
    id: "care",
    label: "照料",
    color: "var(--cat-care)",
    children: [
      { id: "care.pet", label: "照顾宠物" },
      { id: "care.household", label: "照顾家庭" },
      { id: "care.self", label: "照顾自己" },
      { id: "care.other", label: "其他照料" },
    ],
  },
  {
    id: "travel",
    label: "出行",
    color: "var(--cat-travel)",
    children: [
      { id: "travel.commute", label: "通勤" },
      { id: "travel.transit", label: "在路上" },
      { id: "travel.other", label: "其他出行" },
    ],
  },
  {
    id: "rest",
    label: "休息",
    color: "var(--cat-rest)",
    children: [
      { id: "rest.sleep", label: "睡觉" },
      { id: "rest.nap", label: "小睡" },
      { id: "rest.idle", label: "放空" },
      { id: "rest.other", label: "其他休息" },
    ],
  },
];

const DEFAULT_EVENT_NODES = [
  buildEventNode("evt.breakfast", "早餐", "life.meal", ["吃早餐", "吃早饭"]),
  buildEventNode("evt.lunch", "午饭", "life.meal", ["吃午饭", "吃中饭"]),
  buildEventNode("evt.dinner", "晚饭", "life.meal", ["吃晚饭"]),
  buildEventNode("evt.shower", "洗澡", "life.hygiene", ["洗澡洗头"]),
  buildEventNode("evt.cleanup", "收拾整理", "life.chores", ["整理房间", "收拾屋子"]),
  buildEventNode("evt.commute", "通勤", "travel.commute", ["上班路上", "回家路上"]),
  buildEventNode("evt.focus_coding", "专注编码", "work.coding", ["写代码", "开发"]),
  buildEventNode("evt.meeting", "开会", "work.meeting", ["会议"]),
  buildEventNode("evt.reading", "阅读", "study.reading", ["看书"]),
  buildEventNode("evt.learning", "学习课程", "study.course", ["上课", "学东西"]),
  buildEventNode("evt.walk", "散步", "exercise.walk", ["出去走走"]),
  buildEventNode("evt.workout", "锻炼", "exercise.workout", ["健身"]),
  buildEventNode("evt.watch_show", "看剧", "entertainment.video", ["追剧", "看电视"]),
  buildEventNode("evt.short_video", "刷短视频", "entertainment.social_media", ["刷视频", "抖音"]),
  buildEventNode("evt.phone_scroll", "刷手机", "entertainment.social_media", ["玩手机"]),
  buildEventNode("evt.headache_rest", "头痛休息", "health.rest", ["头疼休息"]),
  buildEventNode("evt.medication", "吃药", "health.medication", ["服药"]),
  buildEventNode("evt.hospital_visit", "医院看病", "health.hospital", ["去医院", "看病", "门诊"]),
  buildEventNode("evt.chatting", "聊天", "social.chat", ["发消息聊天"]),
  buildEventNode("evt.sleep", "睡觉", "rest.sleep", ["睡了"]),
  buildEventNode("evt.nap", "小睡", "rest.nap", ["午睡"]),
];

function createDefaultTaxonomy() {
  return {
    categories: DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      children: Array.isArray(category.children) ? category.children.map((child) => ({ ...child })) : [],
    })),
    eventNodes: DEFAULT_EVENT_NODES.map((node) => ({ ...node, aliases: [...node.aliases] })),
  };
}

function buildEventNode(id, label, parentId, aliases = [], status = "official") {
  return {
    id,
    label,
    aliases,
    parentId,
    status,
  };
}

module.exports = {
  createDefaultTaxonomy,
};
