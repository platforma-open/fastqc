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
          domain["pl7.app/fileExtension"] === "fastq.gz") &&
        // The workflow runs FastQC on each key's reads, found by this axis
        v.axesSpec.some((axis) => axis.name === READ_INDEX_AXIS)
      );
    });
  })

  // Returns true if the block is currently in "running" state
  .output("isRunning", (ctx) => ctx.outputs?.getIsReadyOrError() === false)

  // True once Run was pressed; until then the UI shows the "configure and run" placeholder
  .output("hasRun", (ctx) => ctx.activeArgs !== undefined)

  // Get real labels associated to each imported file
  // Sample labels of the dataset the shown results were computed for. Read from `activeArgs`, not
  // `data`: after another dataset is picked the outputs still hold the previous run, and its
  // samples must keep their names until the block is run again.
  .output("labels", (ctx) => {
    const inputRef = ctx.activeArgs?.refData;
    if (inputRef === undefined) return undefined;

    const inputSpec = ctx.resultPool.getPColumnSpecByRef(inputRef);
    if (inputSpec === undefined) return undefined;

    // `ctx.findLabels` was the deprecated alias for the result pool's own lookup and is gone
    // from the current SDK; this asks the same question about the same axis.
    const labels = ctx.resultPool.findLabelsForColumnAxis(inputSpec, 0);
    if (!labels) return undefined;

    return labels;
  })

  // Labels of the axes that, after the sample, tell apart the reports of one sample: the lane of a
  // multi-lane dataset, the tags of a tagged one. Empty for a [sample, readIndex] dataset, where
  // each sample has one report per read. Read from `activeArgs`, like `labels`.
  .output("subKeyLabels", (ctx) => {
    const inputRef = ctx.activeArgs?.refData;
    if (inputRef === undefined) return undefined;

    const inputSpec = ctx.resultPool.getPColumnSpecByRef(inputRef);
    if (inputSpec === undefined) return undefined;

    return inputSpec.axesSpec
      .slice(1)
      .filter((axis) => axis.name !== READ_INDEX_AXIS)
      .map((axis) => axis.annotations?.["pl7.app/label"] ?? axis.name);
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

  // Standalone HTML reports created by FastQC, read by the UI and shown inline. Every sample has an
  // entry for every read once its step starts: `null` when the sample has no such read (single-end
  // data has no R2), `undefined` while the report is not ready, then its file handle.
  .output("FastQChtmlR1", (wf) => {
    if (!hasHtmlReports(wf.outputs)) return undefined;
    return parseResourceMap(wf.outputs?.resolve("FastQChtmlR1"), getHtmlHandle, true);
  })

  .output("FastQChtmlR2", (wf) => {
    if (!hasHtmlReports(wf.outputs)) return undefined;
    return parseResourceMap(wf.outputs?.resolve("FastQChtmlR2"), getHtmlHandle, true);
  })

  // Reference to zip file with html content created by FastQC
  // Only for results computed before the workflow passed the HTML reports on, so they stay
  // viewable until the block runs again.
  .output("FastQCzipR1", (wf) => {
    if (hasHtmlReports(wf.outputs)) return undefined;
    return parseResourceMap(wf.outputs?.resolve("FastQCzipR1"), extractZipURL, true);
  })

  // Reference to zip file with html content created by FastQC
  .output("FastQCzipR2", (wf) => {
    if (hasHtmlReports(wf.outputs)) return undefined;
    return parseResourceMap(wf.outputs?.resolve("FastQCzipR2"), extractZipURL, true);
  })

  .sections(() => [{ type: "link" as const, href: "/" as const, label: "Main" }])

  .templateParams(deriveTemplateParams)

  .title(() => "FastQC")

  // `data` can be undefined while the sidebar renders before block storage is parsed
  .subtitle((ctx) => ctx.data?.title ?? "")

  .done();

export type BlockOutputs = InferOutputsType<typeof platforma>;

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Axis of the read (R1, R2, I1, I2) in a FASTQ dataset */
const READ_INDEX_AXIS = "pl7.app/sequencing/readIndex";

/** Whether the run's outputs carry the HTML reports; results of earlier block versions do not. */
const hasHtmlReports = (outputs: TreeNodeAccessor | undefined): boolean =>
  outputs !== undefined &&
  [
    ...outputs.listInputFields(),
    ...outputs.listOutputFields(),
    ...outputs.listDynamicFields(),
  ].includes("FastQChtmlR1");

/**
 * File handle of an HTML report. The workflow puts an empty json/object in place of a read the
 * sample does not have; `null` marks it as absent, where `undefined` would mean "not ready yet"
 * and keep the map from ever completing.
 */
const getHtmlHandle = (acc: TreeNodeAccessor) => {
  if (acc.resourceType.name === "json/object") return null;
  return acc.getFileHandle();
};

/** Extract zip archive URL; `null` for the empty json/object of a read the sample does not have */
const extractZipURL = (acc: TreeNodeAccessor) => {
  if (acc.resourceType.name === "json/object") return null;
  return acc.extractArchiveAndGetURL("zip");
};
