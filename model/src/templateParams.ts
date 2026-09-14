import type { BlockParams } from "@platforma-open/milaboratories.fastqc.kind";
import type { BlockData } from "./index";

/**
 * What a project template carries out of a configured block — the mirror image of
 * `initBlockData`, and the reason the two must be read together: a field added to the contract
 * but not to this function is silently dropped from every template exported afterwards.
 *
 * FastQC's whole configuration is the dataset it points at, so both fields travel.
 */
export function deriveTemplateParams(data: BlockData): BlockParams {
  return {
    refData: data.refData,
    title: data.title,
  };
}
