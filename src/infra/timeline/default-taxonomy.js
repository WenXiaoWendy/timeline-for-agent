const DEFAULT_CATEGORIES = [
  {
    id: "life",
    label: "Life",
    color: "var(--cat-life)",
    children: [
      { id: "life.meal", label: "Meals" },
      { id: "life.hygiene", label: "Hygiene" },
      { id: "life.chores", label: "Chores" },
      { id: "life.shopping", label: "Shopping" },
      { id: "life.errand", label: "Errands" },
      { id: "life.other", label: "Other Life" },
    ],
  },
  {
    id: "work",
    label: "Work",
    color: "var(--cat-work)",
    children: [
      { id: "work.coding", label: "Coding" },
      { id: "work.meeting", label: "Meetings" },
      { id: "work.writing", label: "Writing" },
      { id: "work.communication", label: "Communication" },
      { id: "work.other", label: "Other Work" },
    ],
  },
  {
    id: "study",
    label: "Study",
    color: "var(--cat-study)",
    children: [
      { id: "study.reading", label: "Reading" },
      { id: "study.course", label: "Courses" },
      { id: "study.practice", label: "Practice" },
      { id: "study.review", label: "Review" },
      { id: "study.other", label: "Other Study" },
    ],
  },
  {
    id: "exercise",
    label: "Exercise",
    color: "var(--cat-exercise)",
    children: [
      { id: "exercise.walk", label: "Walks" },
      { id: "exercise.workout", label: "Workouts" },
      { id: "exercise.stretch", label: "Stretching" },
      { id: "exercise.other", label: "Other Exercise" },
    ],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    color: "var(--cat-entertainment)",
    children: [
      { id: "entertainment.video", label: "Video" },
      { id: "entertainment.game", label: "Games" },
      { id: "entertainment.social_media", label: "Social Media" },
      { id: "entertainment.music", label: "Music" },
      { id: "entertainment.other", label: "Other Entertainment" },
    ],
  },
  {
    id: "health",
    label: "Health",
    color: "var(--cat-health)",
    children: [
      { id: "health.rest", label: "Recovery" },
      { id: "health.medication", label: "Medication" },
      { id: "health.pain", label: "Symptom Care" },
      { id: "health.hospital", label: "Medical Visit" },
      { id: "health.other", label: "Other Health" },
    ],
  },
  {
    id: "social",
    label: "Social",
    color: "var(--cat-social)",
    children: [
      { id: "social.chat", label: "Chat" },
      { id: "social.call", label: "Calls" },
      { id: "social.family", label: "Family Time" },
      { id: "social.other", label: "Other Social" },
    ],
  },
  {
    id: "care",
    label: "Care",
    color: "var(--cat-care)",
    children: [
      { id: "care.pet", label: "Pet Care" },
      { id: "care.household", label: "Household Care" },
      { id: "care.self", label: "Self Care" },
      { id: "care.other", label: "Other Care" },
    ],
  },
  {
    id: "travel",
    label: "Travel",
    color: "var(--cat-travel)",
    children: [
      { id: "travel.commute", label: "Commute" },
      { id: "travel.transit", label: "Transit" },
      { id: "travel.other", label: "Other Travel" },
    ],
  },
  {
    id: "rest",
    label: "Rest",
    color: "var(--cat-rest)",
    children: [
      { id: "rest.sleep", label: "Sleep" },
      { id: "rest.nap", label: "Nap" },
      { id: "rest.idle", label: "Idle Time" },
      { id: "rest.other", label: "Other Rest" },
    ],
  },
];

const DEFAULT_EVENT_NODES = [
  buildEventNode("evt.breakfast", "Breakfast", "life.meal", ["breakfast", "morning meal"]),
  buildEventNode("evt.lunch", "Lunch", "life.meal", ["lunch", "midday meal"]),
  buildEventNode("evt.dinner", "Dinner", "life.meal", ["dinner", "evening meal"]),
  buildEventNode("evt.shower", "Shower", "life.hygiene", ["shower", "wash up"]),
  buildEventNode("evt.cleanup", "Cleanup", "life.chores", ["room reset", "tidying up"]),
  buildEventNode("evt.commute", "Commute", "travel.commute", ["commute", "ride to work", "ride home"]),
  buildEventNode("evt.focus_coding", "Focused Coding", "work.coding", ["coding", "shipping code", "implementation"]),
  buildEventNode("evt.meeting", "Meeting", "work.meeting", ["meeting", "sync"]),
  buildEventNode("evt.reading", "Reading", "study.reading", ["reading", "read a book"]),
  buildEventNode("evt.learning", "Course Study", "study.course", ["course", "studying", "lesson"]),
  buildEventNode("evt.walk", "Walk", "exercise.walk", ["walk", "go for a walk"]),
  buildEventNode("evt.workout", "Workout", "exercise.workout", ["workout", "training"]),
  buildEventNode("evt.watch_show", "Watch a Show", "entertainment.video", ["watching a show", "tv time"]),
  buildEventNode("evt.short_video", "Short Video Scroll", "entertainment.social_media", ["short videos", "reels", "scrolling videos"]),
  buildEventNode("evt.phone_scroll", "Phone Scroll", "entertainment.social_media", ["phone scrolling", "doomscrolling"]),
  buildEventNode("evt.headache_rest", "Headache Recovery", "health.rest", ["resting with a headache"]),
  buildEventNode("evt.medication", "Medication", "health.medication", ["taking medicine", "medication"]),
  buildEventNode("evt.hospital_visit", "Medical Visit", "health.hospital", ["clinic visit", "hospital visit", "doctor appointment"]),
  buildEventNode("evt.chatting", "Chat", "social.chat", ["chatting", "replying to messages"]),
  buildEventNode("evt.sleep", "Sleep", "rest.sleep", ["sleep", "went to sleep"]),
  buildEventNode("evt.nap", "Nap", "rest.nap", ["nap", "power nap"]),
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
