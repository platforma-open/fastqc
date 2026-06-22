import type { PlRef } from "@platforma-sdk/model";

/**
 * Unified V3 data — the UI's persisted state. `refData` is the selected fastq
 * dataset; `title` is a display-only label derived from the dataset on input.
 */
export type BlockData = {
  refData?: PlRef;
  title?: string;
};

/**
 * Workflow-facing args, projected from `data`. `title` is display-only and is
 * not projected — only `refData` reaches the workflow.
 */
export type BlockArgs = {
  refData?: PlRef;
};

/** Legacy V1 on-disk shapes, consumed once by `.upgradeLegacy`. */
export type LegacyBlockArgs = {
  refData?: PlRef;
  title?: string;
};
export type LegacyUiState = Record<string, never>;
