export type CategoryId =
  | 'lainsaadanto'
  | 'lajintuntemus'
  | 'riistaekologia'
  | 'etiikka'
  | 'aseet'
  | 'turvallisuus'
  | 'pyyntimenetelmat'
  | 'saalis';

export interface Category {
  id: string;
  nameFi: string;
  nameSv: string;
  short: string;
  icon: string;
  description: string;
  examQuestions: number;
  speciesSection?: boolean;
  order: number;
}

export interface AnswerOption {
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  category: string;
  difficulty: number;
  question: string;
  answers: AnswerOption[];
  explanation: string;
  source: { title: string; edition?: string; page?: number | null };
  validFrom?: string;
  validUntil?: string | null;
  reviewStatus?: 'draft' | 'reviewed';
  tags?: string[];
}

export interface SpeciesImage {
  image_url: string;
  thumbnail_url: string;
  photographer: string;
  license: string;
  license_url: string | null;
  source: string;
  source_url: string | null;
  attribution: string;
  file_name?: string;
}

export interface Species {
  id: string;
  nameFi: string;
  nameSv: string;
  nameEn: string;
  scientific: string;
  type: 'lintu' | 'nisakas';
  group: string;
  difficulty: number;
  huntable: boolean;
  status: string;
  description: string;
  identificationTips: string;
  images: SpeciesImage[];
}

export interface ExamMode {
  id: 'full' | 'quick';
  label: string;
  description: string;
  theoryCount: number;
  speciesCount: number;
  totalQuestions: number;
  speciesTimeSeconds: number;
  totalTimeSeconds: number;
  passPercent: number;
}

export interface OfficialExamInfo {
  source: string;
  totalQuestions: number;
  speciesQuestions: number;
  theoryQuestions: number;
  speciesTimeSeconds: number;
  totalTimeSeconds: number;
  maxWrongAnswers: number;
  minCorrectAnswers: number;
  feeEuro: number;
  languages: string[];
  note?: string;
}

export interface ExamConfig {
  disclaimer: string;
  full: ExamMode;
  quick: ExamMode;
  distribution: Record<string, number>;
  speciesDistribution: Record<string, number>;
  /** Virallisen tutkinnon määrittely riista.fin mukaan. */
  officialExam?: OfficialExamInfo;
}

export interface DataBundle {
  generatedAt: string;
  version: number;
  categories: Category[];
  examConfig: ExamConfig;
  questions: Question[];
  species: Species[];
  stats: {
    categories: number;
    questions: number;
    species: number;
    speciesWithImages: number;
    speciesImageSource: string;
  };
}

/** Palvelimelle lähetettävä edistymisdata (guest-tila tai tili). */
export interface ProgressSnapshot {
  userId: string;
  updatedAt: string;
  questionStats: Record<string, QuestionStat>;
  speciesStats: Record<string, SpeciesStat>;
  exams: ExamHistoryEntry[];
  profile: { name?: string; xp: number; streak: number; lastPracticeDate?: string };
}

export interface QuestionStat {
  attempts: number;
  correct: number;
  wrong: number;
  lastAnswered?: string;
  averageResponseTimeMs?: number;
  dueAt?: string;
  intervalIndex?: number;
}

export interface SpeciesStat {
  attempts: number;
  correct: number;
  wrong: number;
  lastAnswered?: string;
}

export interface ExamHistoryEntry {
  id: string;
  mode: string;
  startedAt: string;
  finishedAt: string;
  totalQuestions: number;
  correct: number;
  percent: number;
  passed: boolean;
  durationSeconds: number;
  categoryBreakdown: Record<string, { correct: number; total: number }>;
}
