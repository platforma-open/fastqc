import { BlockModel, InferOutputsType, isPColumnSpec, 
  parseResourceMap, PlRef } from '@platforma-sdk/model';

// Block arguments coming from the user interface
export type BlockArgs = {
  // Reference to the fastq data
  refData?: PlRef;

  // Block title
  title?: string;

};

// UI state
export type UiState = {
};

export const model = BlockModel.create()

  .withArgs<BlockArgs>({
  })

  .withUiState<UiState>({
  })

  // Activate "Run" button only after input dataset is selected
  .argsValid((ctx) =>  ctx.args.refData !== undefined)

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
         domain["pl7.app/fileExtension"] === "fastq.gz" ||
         domain["pl7.app/fileExtension"] === "fq" ||
         domain["pl7.app/fileExtension"] === "fq.gz")
      );
    });
  })


  // Returns true if the block is currently in "running" state
  .output("isRunning", (ctx) => ctx.outputs?.getIsReadyOrError() === false)


  // Get real labels associated to each imported file
  .output("labels", (ctx) => {
    const inputRef = ctx.args.refData;
    if (inputRef === undefined) return undefined;

    const inputSpec = ctx.resultPool.getPColumnSpecByRef(inputRef); 
    if (inputSpec === undefined) return undefined;

    const labels = ctx.findLabels(inputSpec.axesSpec[0]);
    if (!labels) return undefined;

    return labels;
    })

  // FastQC progress form logs
  .output("fastqcProgress", (wf) => {
    return parseResourceMap(
      wf.outputs?.resolve("fastQCstdout"),
      (acc) => acc.getLogHandle(),
      false
      );
    })

  // Last line (on the go) from FastQC log output
  .output("fastqcProgressLine", (wf) => {
    return parseResourceMap(
      wf.outputs?.resolve("fastQCstdout"),
      (acc) => acc.getLastLogs(1),
      false
    );
    })

  // Reference to zip file with html content created by FastQC
  .output('FastQCzipR1', (wf) => {
    return parseResourceMap(
      wf.outputs?.resolve("FastQCzipR1"),
      (acc) => acc.extractArchiveAndGetURL('zip'),
      false
    );

    }
  )

  // Reference to zip file with html content created by FastQC
  .output('FastQCzipR2', (wf) => {
    return parseResourceMap(
      wf.outputs?.resolve("FastQCzipR2"),
      (acc) => acc.extractArchiveAndGetURL('zip'),
      false
    );

    }
  )

  .sections([
    { type: 'link', href: '/', label: 'Main' }
  ])

  .title((ctx) =>
    ctx.args.title
      ? `FastQC - ${ctx.args.title}`
      : "FastQC"
  )

  .done();

export type BlockOutputs = InferOutputsType<typeof model>;
