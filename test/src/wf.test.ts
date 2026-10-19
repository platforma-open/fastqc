import { SamplesAndDataBlockPointer } from "@platforma-open/milaboratories.samples-and-data";
import { uniquePlId } from "@platforma-sdk/model";
import { awaitStableState, blockTest } from "@platforma-sdk/test";
import { FastqcBlockPointer as myBlockSpec } from "this-block";

// A block created with no template goes through the kind's own init path, so this covers the
// wiring the kind package introduced as well as the model's empty-project behaviour.
blockTest("empty inputs", { timeout: 20000 }, async ({ rawPrj: project, expect }) => {
  const blockId = await project.addBlock("FastQC", myBlockSpec);

  const stableState = await awaitStableState(project.getBlockState(blockId), 15000);

  // No Samples & Data block in the project, so no FASTQ column is on offer.
  expect(stableState.outputs).toMatchObject({
    dataOptions: { ok: true, value: [] },
  });
});

/** The pieces of a blockTest's fixture the helper below needs. */
type TestCtx = Pick<
  Parameters<NonNullable<Parameters<typeof blockTest>[2]>>[0],
  "rawPrj" | "helpers"
>;

/**
 * Runs FastQC over the one dataset of a Samples & Data block holding `content`, and hands back
 * the keys of its R1 and R2 reports and the labels of the key axes after the sample.
 */
async function runOnDataset(ctx: TestCtx, content: (r1: string, r2: string) => unknown) {
  const { rawPrj: project, helpers } = ctx;
  const sdBlockId = await project.addBlock("Samples & Data", SamplesAndDataBlockPointer);
  const r1 = await helpers.getLocalFileHandle("./assets/small_data_R1.fastq.gz");
  const r2 = await helpers.getLocalFileHandle("./assets/small_data_R2.fastq.gz");
  await project.mutateBlockStorage(sdBlockId, {
    operation: "update-block-data",
    value: {
      suggestedImport: false,
      h5adFilesToPreprocess: [],
      seuratFilesToPreprocess: [],
      metadata: [],
      sampleIds: [SAMPLE_ID],
      sampleLabelColumnLabel: "Sample Name",
      sampleLabels: { [SAMPLE_ID]: "Sample 1" },
      datasets: [{ id: uniquePlId(), label: "Dataset 1", content: content(r1, r2) }],
    },
  });
  await project.runBlock(sdBlockId);
  await helpers.awaitBlockDoneAndGetStableBlockState(sdBlockId, 60000);

  const blockId = await project.addBlock("FastQC", myBlockSpec);
  const options = await awaitStableState(project.getBlockState(blockId), 15000);
  const option = (
    options.outputs as unknown as { dataOptions: { value: { ref: unknown; label: string }[] } }
  ).dataOptions.value[0];
  await project.mutateBlockStorage(blockId, {
    operation: "update-block-data",
    value: { refData: option.ref, title: option.label },
  });
  await project.runBlock(blockId);
  const state = (await helpers.awaitBlockDoneAndGetStableBlockState(blockId, 300000)) as {
    outputs: Record<string, { ok: boolean; value: unknown }>;
  };

  const keys = (output: string) =>
    (state.outputs[output].value as { data: { key: unknown[]; value: unknown }[] }).data
      .filter((it) => it.value)
      .map((it) => it.key)
      .sort();
  return {
    r1: keys("FastQChtmlR1"),
    r2: keys("FastQChtmlR2"),
    subKeyLabels: state.outputs.subKeyLabels.value,
  };
}

const SAMPLE_ID = uniquePlId();

blockTest("paired-end input", { timeout: 400000 }, async ({ rawPrj, helpers, expect }) => {
  const result = await runOnDataset({ rawPrj, helpers }, (R1, R2) => ({
    type: "Fastq",
    readIndices: ["R1", "R2"],
    gzipped: true,
    data: { [SAMPLE_ID]: { R1, R2 } },
  }));
  expect(result).toEqual({ r1: [[SAMPLE_ID]], r2: [[SAMPLE_ID]], subKeyLabels: [] });
});

// The lane sits between the sample and the read; each lane gets its own reports
blockTest("multi-lane input", { timeout: 400000 }, async ({ rawPrj, helpers, expect }) => {
  const result = await runOnDataset({ rawPrj, helpers }, (R1, R2) => ({
    type: "MultilaneFastq",
    readIndices: ["R1", "R2"],
    gzipped: true,
    data: { [SAMPLE_ID]: { L001: { R1, R2 }, L002: { R1, R2 } } },
  }));
  const keys = [
    [SAMPLE_ID, "L001"],
    [SAMPLE_ID, "L002"],
  ];
  expect(result).toEqual({ r1: keys, r2: keys, subKeyLabels: ["Lane"] });
});
