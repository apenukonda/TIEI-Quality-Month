export enum Page {
  HOME,
  LOGIN,
  SIGNUP,
  DASHBOARD,
  TOP_PERFORMERS,
  KNOWLEDGE_CENTRE,
  MD_MESSAGE,
  VIDEO_TASK,
  IMAGE_SUBMISSION,
  SLOGAN_WRITER,
  SUGGESTION_BOX,
}

export enum Department {
  AUTO_PRODUCTION = 'AUTO - PRODUCTION',
  ENVIRONMENT = 'ENVIRONMENT',
  FINANCE_AND_ACCOUNTS = 'FINANCE AND ACCOUNTS',
  FST_AND_DOJO_TRAINING = 'FST AND DOJO TRAINING',
  FULL_TIME_DIRECTORS = 'FULL TIME DIRECTORS',
  GD_ASSEMBLY = 'GD - ASSEMBLY',
  GD_MACHINING = 'GD - MACHINING',
  GD_LINE_SUPPLY = 'GD LINE SUPPLY',
  HEALTH_AND_SAFETY = 'HEALTH AND SAFETY',
  HR_AND_ADMIN = 'HR AND ADMIN',
  INFORMATION_SYSTEMS = 'INFORMATION SYSTEMS',
  LEARNING_DEVELOPMENT = 'LEARNING & DEVELOPMENT',
  MAINTENANCE = 'MAINTENANCE',
  MANUFACTURING_ENGG = 'MANUFACTURING ENGG',
  PC_AND_LOGISTICS = 'PC AND LOGISTICS',
  PRODUCTION_ENGG = 'PRODUCTION ENGG',
  PRODUCTION_SUPPORT_COMMON = 'PRODUCTION SUPPORT - COMMON',
  PURCHASE_AND_BUSINESS_PLANNING = 'PURCHASE AND BUSINESS PLANNING',
  QUALITY = 'QUALITY',
  SHOP_FLOOR_DEVELOPMENT = 'SHOP FLOOR DEVELOPMENT',
  SUPPLY_CHAIN_MANAGEMENT = 'SUPPLY CHAIN MANAGEMENT',
  TNGA_ASSEMBLY = 'TNGA - ASSEMBLY',
  TNGA_LINE_SUPPLY = 'TNGA - LINE SUPPLY',
  TNGA_MACHINING = 'TNGA - MACHINING',
  TOOL_MGMT_AND_ENGG = 'TOOL MGMT AND ENGG',
  UTILITY_DEPARTMENT = 'UTILITY DEPARTMENT',
}

export enum Designation {
  TRAINEE = 'TRAINEE',
  OPERATOR = 'OPERATOR',
  ASSISTANT_ENGINEER = 'ASSISTANT ENGINEER',
  CONTRACT_ENGINEER = 'CONTRACT ENGINEER',
  ENGINEER = 'ENGINEER',
  SENIOR_ENGINEER = 'SENIOR ENGINEER',
  ASSISTANT_MANAGER = 'ASSISTANT MANAGER',
  DEPUTY_MANAGER = 'DEPUTY MANAGER',
  MANAGER = 'MANAGER',
  TOP_MANAGEMENT = 'TOP MANAGEMENT',
  OTHERS = 'OTHERS',
}

export interface User {
  id: string; // This will be the Supabase auth UUID
  userId: string;
  name: string;
  department: Department;
  designation: Designation;
  score: number;
  // role stored in profiles table (e.g. 'user' or 'admin')
  role?: string;
}

export interface Task {
  id: string;
  title: string;
  // Optional Kannada translations for UI copy
  titleKn?: string;
  description: string;
  descriptionKn?: string;
  page: Page;
  totalSteps: number;
  completedSteps: number;
  maxScore: number;
}

export interface Question {
  text: string;
  // Optional Kannada translations colocated with the question to avoid
  // brittle exact-string lookups in the global translations map.
  textKn?: string;
  options: string[];
  // Optional Kannada translations for each option. When present and the
  // app language is Kannada, the Quiz will prefer these.
  optionsKn?: string[];
  correctAnswer: string;
}

// Module / video types used by constants.ADVANCED_MODULES
export interface VideoModule {
  id: string;
  title: string;
  titleKn?: string;
  videos: VideoItem[];
  quizzes: Question[][];
}

export interface VideoItem {
  id: string;
  title: string;
  titleKn?: string;
}
