import type { BlockParams } from "@platforma-open/milaboratories.fastqc.kind";
import { kind } from "@platforma-open/milaboratories.fastqc.kind";
import type { InferOutputsType, PlRef, TreeNodeAccessor } from "@platforma-sdk/model";
import {
  BlockModelV3,
  DataModelBuilder,
  isPColumnSpec,
  parseResourceMap,
} from "@platforma-sdk/model";
import { deriveTemplateParams } from "./templateParams";

export type { BlockParams };
export { deriveTemplateParams };

/** Unified user-editable state persisted by the model. */
export type BlockData = {
  /** Reference to the fastq data. */
  refData?: PlRef;
  /** The chosen dataset's label, written alongside `refData` and shown in the block's title. */
  title?: string;
};

/**
 * What the workflow receives. `title` is passed through even though `main.tpl.tengo` never reads
 * it: it has always been part of the args, and dropping it would change the args hash and make
 * every existing project recompute on upgrade.
 */
export type BlockArgs = {
  refData: PlRef;
  title?: string;
};

/**
 * A block's starting state, seeded by whatever the creator or a project template supplied. Read
 * together with `deriveTemplateParams`, its mirror image: a field added to the contract but not to
 * both functions is silently dropped from every template.
 */
export const initBlockData = (params?: BlockParams): BlockData => ({
  refData: params?.refData,
  title: params?.title,
});

const dataModel = new DataModelBuilder({ kind })
  .from<BlockData>("v1")
  .init(({ params }) => initBlockData(params));

export const platforma = BlockModelV3.create({ dataModel, kind })

  // Run is held until an input dataset is picked — the workflow resolves `refData` with
  // `errIfMissing`, so there is nothing to report on without it.
  .args<BlockArgs>((data) => {
    if (!data.refData) throw new Error("Input dataset is required");
    return { refData: data.refData, title: data.title };
  })

  // Find possible options for the fastq input (used in Select dataset button)
  .output("dataOptions", (ctx) => {
    return ctx.resultPool.getOptions((v) => {
      if (!isPColumnSpec(v)) return false;
      const domain = v.domain;
      return (
        v.name === "pl7.app/sequencing/data" &&
        (v.valueType as string) === "File" &&
        domain !== undefined &&
        (domain["pl7.app/fileExtension"] === "fastq" ||
          domain["pl7.app/fileExtension"] === "fastq.gz")
      );
    });
  })

  // Returns true if the block is currently in "running" state
  .output("isRunning", (ctx) => ctx.outputs?.getIsReadyOrError() === false)

  // Get real labels associated to each imported file
  .output("labels", (ctx) => {
    const inputRef = ctx.data.refData;
    if (inputRef === undefined) return undefined;

    const inputSpec = ctx.resultPool.getPColumnSpecByRef(inputRef);
    if (inputSpec === undefined) return undefined;

    // `ctx.findLabels` was the deprecated alias for the result pool's own lookup and is gone
    // from the current SDK; this asks the same question about the same axis.
    const labels = ctx.resultPool.findLabelsForColumnAxis(inputSpec, 0);
    if (!labels) return undefined;

    return labels;
  })

  // FastQC progress form logs
  .output("fastqcProgress", (wf) => {
    return parseResourceMap(
      wf.outputs?.resolve("fastQCstdout"),
      (acc) => acc.getLogHandle(),
      false,
    );
  })

  // Last line (on the go) from FastQC log output
  .output("fastqcProgressLine", (wf) => {
    return parseResourceMap(
      wf.outputs?.resolve("fastQCstdout"),
      // Return last line that contains string in ()
      // Also returns if process is done or not
      (acc) => acc.getProgressLogWithInfo(""),
      false,
    );
  })

  // Reference to zip file with html content created by FastQC
  .output("FastQCzipR1", (wf) => {
    return parseResourceMap(wf.outputs?.resolve("FastQCzipR1"), extractZipURL, false);
  })

  // Reference to zip file with html content created by FastQC
  .output("FastQCzipR2", (wf) => {
    return parseResourceMap(wf.outputs?.resolve("FastQCzipR2"), extractZipURL, false);
  })

  .sections(() => [{ type: "link" as const, href: "/" as const, label: "Main" }])

  .templateParams(deriveTemplateParams)

  .title((ctx) => (ctx.data.title ? `FastQC - ${ctx.data.title}` : "FastQC"))

  .done();

export type BlockOutputs = InferOutputsType<typeof platforma>;

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Extract zip archive URL, skipping non-blob resources (e.g. empty json/object from single-end data with no R2) */
const extractZipURL = (acc: TreeNodeAccessor) => {
  if (acc.resourceType.name === "json/object") return undefined;
  return acc.extractArchiveAndGetURL("zip");
};
