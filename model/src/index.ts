import type { InferOutputsType, TreeNodeAccessor } from "@platforma-sdk/model";
import { BlockModelV3, isPColumnSpec, parseResourceMap } from "@platforma-sdk/model";
import { blockDataModel } from "./dataModel";
import type { BlockArgs } from "./types";

export { blockDataModel } from "./dataModel";
export * from "./types";

/** Extract zip archive URL, skipping non-blob resources (e.g. empty json/object from single-end data with no R2) */
const extractZipURL = (acc: TreeNodeAccessor) => {
  if (acc.resourceType.name === "json/object") return undefined;
  return acc.extractArchiveAndGetURL("zip");
};

export const platforma = BlockModelV3.create(blockDataModel)
  // Only refData reaches the workflow; title is display-only. Selecting a
  // dataset stales the block (user presses Run) — matches the old argsValid gate.
  .args<BlockArgs>((data) => {
    if (data.refData === undefined) throw new Error("Input dataset is required");
    return { refData: data.refData };
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

    const labels = ctx.resultPool.findLabels(inputSpec.axesSpec[0]);
    if (!labels) return undefined;

    return labels;
  })

  // FastQC progress form logs
  .output("fastqcProgress", (ctx) => {
    return parseResourceMap(
      ctx.outputs?.resolve("fastQCstdout"),
      (acc) => acc.getLogHandle(),
      false,
    );
  })

  // Last line (on the go) from FastQC log output
  .output("fastqcProgressLine", (ctx) => {
    return parseResourceMap(
      ctx.outputs?.resolve("fastQCstdout"),
      // Return last line that contains string in (); also reports done/not-done
      (acc) => acc.getProgressLogWithInfo(""),
      false,
    );
  })

  // Reference to zip file with html content created by FastQC
  .output("FastQCzipR1", (ctx) => {
    return parseResourceMap(ctx.outputs?.resolve("FastQCzipR1"), extractZipURL, false);
  })

  // Reference to zip file with html content created by FastQC
  .output("FastQCzipR2", (ctx) => {
    return parseResourceMap(ctx.outputs?.resolve("FastQCzipR2"), extractZipURL, false);
  })

  .sections(() => [{ type: "link" as const, href: "/" as const, label: "Main" }])

  .title((ctx) => (ctx.data.title ? `FastQC - ${ctx.data.title}` : "FastQC"))

  .done();

export type Platforma = typeof platforma;
export type BlockOutputs = InferOutputsType<typeof platforma>;
