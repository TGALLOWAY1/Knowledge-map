// JSON Schemas for structured AI outputs (used with output_config.format).
// All objects set additionalProperties: false as required by the API.

const str = { type: "string" } as const;
const strArr = { type: "array", items: { type: "string" } } as const;

export const GAP_SUGGESTIONS_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: str,
          reason: str,
          recommendation: str,
          category: str,
          lifecycleStage: str,
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          sourceSignal: str,
        },
        required: [
          "title",
          "reason",
          "recommendation",
          "category",
          "lifecycleStage",
          "priority",
          "sourceSignal",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
};

export interface GapSuggestion {
  title: string;
  reason: string;
  recommendation: string;
  category: string;
  lifecycleStage: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  sourceSignal: string;
}

export const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    title: str,
    learningObjective: str,
    audienceLevel: str,
    category: str,
    lifecycleStage: str,
    tags: strArr,
    mainSections: {
      type: "array",
      items: {
        type: "object",
        properties: { heading: str, contents: str },
        required: ["heading", "contents"],
        additionalProperties: false,
      },
    },
    keyTerms: {
      type: "array",
      items: {
        type: "object",
        properties: { term: str, definition: str },
        required: ["term", "definition"],
        additionalProperties: false,
      },
    },
    examples: strArr,
    interviewQuestions: strArr,
    visualLayout: str,
    misconceptions: strArr,
    suggestedQuickHits: {
      type: "array",
      items: {
        type: "object",
        properties: { question: str, answer: str },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
    suggestedConcepts: strArr,
  },
  required: [
    "title",
    "learningObjective",
    "audienceLevel",
    "category",
    "lifecycleStage",
    "tags",
    "mainSections",
    "keyTerms",
    "examples",
    "interviewQuestions",
    "visualLayout",
    "misconceptions",
    "suggestedQuickHits",
    "suggestedConcepts",
  ],
  additionalProperties: false,
};

export interface BriefContent {
  title: string;
  learningObjective: string;
  audienceLevel: string;
  category: string;
  lifecycleStage: string;
  tags: string[];
  mainSections: { heading: string; contents: string }[];
  keyTerms: { term: string; definition: string }[];
  examples: string[];
  interviewQuestions: string[];
  visualLayout: string;
  misconceptions: string[];
  suggestedQuickHits: { question: string; answer: string }[];
  suggestedConcepts: string[];
}

export const IMAGE_PROMPT_SCHEMA = {
  type: "object",
  properties: { promptText: str },
  required: ["promptText"],
  additionalProperties: false,
};

export const MODULE_SCHEMA = {
  type: "object",
  properties: {
    title: str,
    subtitle: str,
    summary: str,
    category: str,
    lifecycleStage: str,
    tags: strArr,
    altText: str,
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: { name: str, summary: str, keyPoints: strArr },
        required: ["name", "summary", "keyPoints"],
        additionalProperties: false,
      },
    },
    quickHits: {
      type: "array",
      items: {
        type: "object",
        properties: { question: str, answer: str },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          prompt: str,
          rubric: {
            type: "object",
            properties: {
              criteria: {
                type: "array",
                items: {
                  type: "object",
                  properties: { name: str, description: str },
                  required: ["name", "description"],
                  additionalProperties: false,
                },
              },
              strongAnswerOutline: str,
            },
            required: ["criteria", "strongAnswerOutline"],
            additionalProperties: false,
          },
        },
        required: ["prompt", "rubric"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "title",
    "subtitle",
    "summary",
    "category",
    "lifecycleStage",
    "tags",
    "altText",
    "concepts",
    "quickHits",
    "questions",
  ],
  additionalProperties: false,
};

export interface GeneratedRubric {
  criteria: { name: string; description: string }[];
  strongAnswerOutline: string;
}

export interface GeneratedModule {
  title: string;
  subtitle: string;
  summary: string;
  category: string;
  lifecycleStage: string;
  tags: string[];
  altText: string;
  concepts: { name: string; summary: string; keyPoints: string[] }[];
  quickHits: { question: string; answer: string }[];
  questions: { prompt: string; rubric: GeneratedRubric }[];
}

export const QUESTION_SCHEMA = {
  type: "object",
  properties: {
    prompt: str,
    rubric: {
      type: "object",
      properties: {
        criteria: {
          type: "array",
          items: {
            type: "object",
            properties: { name: str, description: str },
            required: ["name", "description"],
            additionalProperties: false,
          },
        },
        strongAnswerOutline: str,
      },
      required: ["criteria", "strongAnswerOutline"],
      additionalProperties: false,
    },
  },
  required: ["prompt", "rubric"],
  additionalProperties: false,
};

export const GRADE_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["strong", "partial", "off_track"] },
    score: { type: "integer" },
    feedback: str,
    missedPoints: strArr,
    suggestedAnswer: str,
  },
  required: ["verdict", "score", "feedback", "missedPoints", "suggestedAnswer"],
  additionalProperties: false,
};

export interface GradeResult {
  verdict: "strong" | "partial" | "off_track";
  score: number;
  feedback: string;
  missedPoints: string[];
  suggestedAnswer: string;
}
