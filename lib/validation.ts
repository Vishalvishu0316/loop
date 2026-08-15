import { z } from "zod";
import type { Sentiment, FeedbackStatus, UserRole } from "@/lib/types";
import { CHANNELS } from "@/lib/types";

/* ── Enums ── */

export const FeedbackChannelSchema = z.enum(CHANNELS as unknown as [string, ...string[]]);

export const SentimentSchema = z.enum(["POS", "NEU", "NEG"] as [Sentiment, ...Sentiment[]]);

export const FeedbackStatusSchema = z.enum([
  "NEW",
  "REVIEWED",
  "ACTIONED",
] as [FeedbackStatus, ...FeedbackStatus[]]);

export const UserRoleSchema = z.enum([
  "ADMIN",
  "ANALYST",
  "VIEWER",
] as [UserRole, ...UserRole[]]);

/* ── Feedback Schemas ── */

export const SingleFeedbackCreateSchema = z.object({
  content: z
    .string()
    .trim()
    .min(3, "Feedback content must be at least 3 characters")
    .max(10000, "Feedback content cannot exceed 10,000 characters"),
  channel: FeedbackChannelSchema,
  sourceRef: z
    .string()
    .trim()
    .max(100, "Source reference cannot exceed 100 characters")
    .optional()
    .nullable()
    .transform((v) => v || undefined),
  customerLabel: z
    .string()
    .trim()
    .max(200, "Customer label cannot exceed 200 characters")
    .optional()
    .nullable()
    .transform((v) => v || undefined),
});

export const FeedbackUpdateSchema = z.object({
  status: FeedbackStatusSchema.optional(),
  content: z.string().trim().min(3).max(10000).optional(),
  channel: FeedbackChannelSchema.optional(),
  customerLabel: z.string().trim().max(200).optional().nullable(),
  sourceRef: z.string().trim().max(100).optional().nullable(),
});

export const FeedbackFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  channel: FeedbackChannelSchema.optional(),
  sentiment: SentimentSchema.optional(),
  status: FeedbackStatusSchema.optional(),
  themeId: z.string().trim().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  pageSize: z.coerce.number().int().min(1).max(100, "Max page size is 100").default(25),
});

/* ── Auth Schemas ── */

export const SignupSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(100, "Workspace name cannot exceed 100 characters"),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(150, "Email cannot exceed 150 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password cannot exceed 100 characters"),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

/* ── AI & Insights Schemas ── */

export const AskLoopSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Question must be at least 3 characters")
    .max(500, "Question cannot exceed 500 characters"),
  themeId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v === "ALL" || !v ? undefined : v)),
});

export const GenerateReportSchema = z
  .object({
    periodLabel: z.string().trim().min(1, "Period label is required").max(100),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    themeId: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v === "ALL" || !v ? undefined : v)),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: "End date must be on or after start date",
    path: ["periodEnd"],
  });

/* ── Workspace & Member Schemas ── */

export const InviteMemberSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address"),
  role: UserRoleSchema,
  password: z.string().min(8, "Temporary password must be at least 8 characters"),
});

export const UpdateMemberRoleSchema = z.object({
  role: UserRoleSchema,
});

/* ── Theme Schemas ── */

export const HexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const CreateThemeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Theme name must be at least 2 characters")
    .max(60, "Theme name cannot exceed 60 characters"),
  description: z
    .string()
    .trim()
    .max(300, "Description cannot exceed 300 characters")
    .optional()
    .nullable(),
  color: z
    .string()
    .trim()
    .regex(HexColorRegex, "Color must be a valid hex code (e.g. #6366f1)")
    .default("#6366f1"),
});

export const UpdateThemeSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  color: z.string().trim().regex(HexColorRegex, "Invalid hex color").optional(),
});

/* ── AI Classification Response ── */

export const ClassificationResponseSchema = z.object({
  sentiment: SentimentSchema,
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  featureArea: z.string(),
  rationale: z.string(),
});

export type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>;
