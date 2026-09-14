import { kind } from "@platforma-open/milaboratories.fastqc.kind";
import type { PlRef } from "@platforma-sdk/model";
import { describe, expect, it } from "vitest";
import type { BlockData } from "./index";
import { deriveTemplateParams, initBlockData } from "./index";

/**
 * Export a block's data as a template would, then create a block from it.
 *
 * The `JSON` hop is deliberate: a template is a file, so anything that survives only in memory
 * is not actually carried. What comes back is a fresh block's data, which is what a scientist
 * applying the template gets.
 */
const roundTrip = (data: BlockData): BlockData =>
  initBlockData(
    kind.parseInitializationParams(JSON.parse(JSON.stringify(deriveTemplateParams(data)))),
  );

const DATA_REF: PlRef = { __isRef: true, blockId: "b1", name: "fastqData" };

const configured: BlockData = { refData: DATA_REF, title: "PBMC batch 3" };

describe("the template round trip", () => {
  it("carries every field the contract names", () => {
    expect(roundTrip(configured)).toEqual(configured);
  });

  it("is idempotent — a second pass changes nothing", () => {
    expect(roundTrip(roundTrip(configured))).toEqual(roundTrip(configured));
  });

  it("carries the title, so a restored block is not named plain 'FastQC'", () => {
    // Nothing re-derives the title after the dropdown gesture that wrote it, so a template
    // dropping it would name the block "FastQC" while showing that dataset's results.
    expect(roundTrip(configured).title).toBe("PBMC batch 3");
  });

  it("carries an empty title rather than swallowing it as a default", () => {
    expect(roundTrip({ ...configured, title: "" }).title).toBe("");
  });

  it("gives an untouched block back unchanged", () => {
    expect(roundTrip(initBlockData())).toEqual(initBlockData());
  });
});
