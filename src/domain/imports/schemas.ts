import { z } from "zod";
import {
  DEFAULT_IMPORT_CANDIDATE_ACCEPTANCE_STATE,
  DEFAULT_IMPORT_CANDIDATE_REVIEW_STATE,
  DEFAULT_IMPORT_PARSE_QUALITY,
  DEFAULT_IMPORT_RECORD_STATUS,
  IMPORT_CANDIDATE_ACCEPTANCE_STATES,
  IMPORT_CANDIDATE_REVIEW_STATES,
  IMPORT_PARSE_QUALITIES,
  IMPORT_RECORD_STATUSES,
  IMPORT_RECORD_TYPES,
} from "@/domain/imports/types";

const idSchema = z.string().uuid("Enter a valid identifier.");
const importTypeSchema = z.enum(IMPORT_RECORD_TYPES);
const importStatusSchema = z.enum(IMPORT_RECORD_STATUSES);
const parseQualitySchema = z.enum(IMPORT_PARSE_QUALITIES);
const reviewStateSchema = z.enum(IMPORT_CANDIDATE_REVIEW_STATES);
const acceptanceStateSchema = z.enum(IMPORT_CANDIDATE_ACCEPTANCE_STATES);
const requiredTextSchema = z.string().trim().min(1, "This field is required.");
const transactionTypeSchema = z.enum(["expense", "income"]);
const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter uppercase code.");

export const createImportRecordSchema = z.object({
  importType: importTypeSchema,
  storagePath: requiredTextSchema,
  originalFilename: requiredTextSchema,
  mimeType: requiredTextSchema,
  status: importStatusSchema.default(DEFAULT_IMPORT_RECORD_STATUS),
});

export const getImportRecordSchema = z.object({
  importRecordId: idSchema,
});

export const listImportRecordsSchema = z.object({
  status: importStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const updateImportRecordStatusSchema = z
  .object({
    importRecordId: idSchema,
    status: importStatusSchema,
    parseQuality: parseQualitySchema.default(DEFAULT_IMPORT_PARSE_QUALITY),
    failureReason: z.string().trim().max(240).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "failed" && !value.failureReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A failure reason is required when an import fails.",
        path: ["failureReason"],
      });
    }
  });

export const completeImportRecordUploadSchema = z.object({
  importRecordId: idSchema,
  storagePath: requiredTextSchema,
  originalFilename: requiredTextSchema,
  mimeType: requiredTextSchema,
  status: z.literal("uploaded").default("uploaded"),
});

const createImportCandidateShape = z.object({
  importRecordId: idSchema,
  transactionType: transactionTypeSchema.nullable().optional(),
  amountMinor: z.number().int().positive("Amount must be greater than 0.").nullable().optional(),
  currency: currencySchema.nullable().optional(),
  occurredAt: z.string().datetime("Occurred at must be a valid ISO datetime.").nullable().optional(),
  description: z.string().trim().max(240).nullable().optional(),
  merchantGuess: z.string().trim().max(120).nullable().optional(),
  categoryId: idSchema.nullable().optional(),
  confidenceScore: z.number().min(0).max(1).nullable().optional(),
  reviewState: reviewStateSchema.default(DEFAULT_IMPORT_CANDIDATE_REVIEW_STATE),
  acceptanceState: acceptanceStateSchema.default(DEFAULT_IMPORT_CANDIDATE_ACCEPTANCE_STATE),
  uncertaintyReason: z.string().trim().max(240).nullable().optional(),
});

export const createImportCandidateSchema = createImportCandidateShape
  .superRefine((value, ctx) => {
    if (value.reviewState === "needs_attention" && !value.uncertaintyReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An uncertainty reason is required when review needs attention.",
        path: ["uncertaintyReason"],
      });
    }
  });

export const getImportCandidateSchema = z.object({
  importCandidateId: idSchema,
});

export const listImportCandidatesSchema = z.object({
  importRecordId: idSchema,
  reviewState: reviewStateSchema.optional(),
  acceptanceState: acceptanceStateSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const updateImportCandidateStatusSchema = z
  .object({
    importCandidateId: idSchema,
    reviewState: reviewStateSchema,
    acceptanceState: acceptanceStateSchema.default(DEFAULT_IMPORT_CANDIDATE_ACCEPTANCE_STATE),
    acceptedTransactionId: idSchema.nullable().optional(),
    uncertaintyReason: z.string().trim().max(240).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reviewState === "needs_attention" && !value.uncertaintyReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An uncertainty reason is required when review needs attention.",
        path: ["uncertaintyReason"],
      });
    }

    if (value.acceptanceState === "accepted" && !value.acceptedTransactionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An accepted transaction identifier is required when a candidate is accepted.",
        path: ["acceptedTransactionId"],
      });
    }
  });

export const parserResultCandidateSchema = createImportCandidateShape
  .omit({
    importRecordId: true,
    reviewState: true,
    acceptanceState: true,
  })
  .required({
    transactionType: true,
    amountMinor: true,
    currency: true,
    occurredAt: true,
  })
  .extend({
    transactionType: transactionTypeSchema,
    amountMinor: z.number().int().positive("Amount must be greater than 0."),
    currency: currencySchema,
    occurredAt: z.string().datetime("Occurred at must be a valid ISO datetime."),
  });

export const ingestImportParserResultSchema = z.object({
  importRecordId: idSchema,
  candidates: z.array(z.unknown()).max(500),
});

export const reviewImportCandidateSchema = z.object({
  importCandidateId: idSchema,
  decision: z.enum(["accept", "reject"]),
});
