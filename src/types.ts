import { z } from 'zod';

// Base SCB API types based on OpenAPI spec
export const ConfigResponseSchema = z.object({
  apiVersion: z.string(),
  appVersion: z.string().optional(),
  languages: z.array(z.object({
    id: z.string(),
    label: z.string()
  })),
  defaultLanguage: z.string(),
  maxDataCells: z.number(),
  maxCallsPerTimeWindow: z.number(),
  timeWindow: z.number(),
  license: z.string(),
  sourceReferences: z.array(z.object({
    language: z.string(),
    text: z.string()
  })).optional(),
  features: z.array(z.object({
    id: z.string(),
    params: z.array(z.object({
      key: z.string(),
      value: z.string()
    })).optional()
  })).optional()
});

export const FolderResponseSchema = z.object({
  language: z.string(),
  id: z.string().nullable(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  folderContents: z.array(z.object({
    type: z.enum(['FolderInformation', 'Table', 'Heading']),
    id: z.string(),
    label: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    updated: z.string().optional(),
    firstPeriod: z.string().optional(),
    lastPeriod: z.string().optional(),
    category: z.enum(['internal', 'public', 'private', 'section']).optional(),
    variableNames: z.array(z.string()).optional(),
    discontinued: z.boolean().optional(),
    links: z.array(z.object({
      rel: z.string(),
      hreflang: z.string(),
      href: z.string()
    }))
  })),
  links: z.array(z.object({
    rel: z.string(),
    hreflang: z.string(),
    href: z.string()
  }))
});

export const TablesResponseSchema = z.object({
  language: z.string(),
  tables: z.array(z.object({
    type: z.literal('Table'),
    id: z.string(),
    label: z.string(),
    description: z.string(),
    updated: z.string().optional(),
    firstPeriod: z.string().optional(),
    lastPeriod: z.string().optional(),
    category: z.enum(['internal', 'public', 'private', 'section']).optional(),
    variableNames: z.array(z.string()).optional(),
    source: z.string().optional(),
    subjectCode: z.string().optional(),
    timeUnit: z.string().optional(),
    discontinued: z.boolean().optional(),
    paths: z.array(z.array(z.object({
      id: z.string(),
      label: z.string()
    }))).optional(),
    links: z.array(z.object({
      rel: z.string(),
      hreflang: z.string(),
      href: z.string()
    }))
  })),
  page: z.object({
    pageNumber: z.number(),
    pageSize: z.number(),
    totalElements: z.number(),
    totalPages: z.number(),
    links: z.array(z.object({
      rel: z.string(),
      hreflang: z.string(),
      href: z.string()
    })).optional()
  }),
  links: z.array(z.object({
    rel: z.string(),
    hreflang: z.string(),
    href: z.string()
  }))
});

export const DatasetSchema = z.object({
  version: z.literal('2.0'),
  class: z.literal('dataset'),
  id: z.array(z.string()),
  label: z.string(),
  source: z.string().optional(),
  updated: z.string().optional(),
  size: z.array(z.number()),
  dimension: z.record(z.object({
    label: z.string(),
    category: z.object({
      index: z.record(z.number()),
      label: z.record(z.string())
    }),
    extension: z.object({
      elimination: z.boolean().optional(),
      eliminationValueCode: z.string().optional()
    }).optional()
  })),
  value: z.array(z.number().nullable()).nullable().optional(),
  extension: z.object({
    px: z.record(z.any()).optional(),
    contact: z.array(z.object({
      name: z.string().optional(),
      mail: z.string().optional(),
      phone: z.string().optional()
    })).optional(),
    notes: z.array(z.object({
      text: z.string(),
      mandatory: z.boolean()
    })).optional()
  }).optional()
});

export type ConfigResponse = z.infer<typeof ConfigResponseSchema>;
export type FolderResponse = z.infer<typeof FolderResponseSchema>;
export type TablesResponse = z.infer<typeof TablesResponseSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;

// Rate limiting types
export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  maxCalls: number;
  timeWindow: number;
}