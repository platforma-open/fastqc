import { DataModelBuilder } from "@platforma-sdk/model";
import type { BlockData, LegacyBlockArgs, LegacyUiState } from "./types";

export const blockDataModel = new DataModelBuilder()
  .from<BlockData>("v1")
  // Legacy V1 stored refData + title under `args`; uiState was always empty.
  .upgradeLegacy<LegacyBlockArgs, LegacyUiState>(({ args }) => ({
    refData: args?.refData,
    title: args?.title,
  }))
  .init(() => ({}));
