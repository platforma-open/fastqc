import type { PlRef } from "@platforma-sdk/model";
import { describe, expect, it } from "vitest";
import { kind } from "./index";

const parse = (v: unknown) => kind.parseInitializationParams(v);

/** A sequencing-data column, as `PlDropdownRef` hands it back. */
const DATA_REF: PlRef = { __isRef: true, blockId: "b1", name: "fastqData" };

describe("the envelope", () => {
  it("accepts an empty object — a block may be created with nothing pinned", () => {
    expect(parse({})).toEqual({});
  });

  it.each([undefined, null, 42, "params", [], true])("refuses %o as a params object", (v) => {
    expect(() => parse(v)).toThrow();
  });

  it("drops keys the contract does not name", () => {
    expect(parse({ title: "Run 4", settingsOpen: true, species: "human" })).toEqual({
      title: "Run 4",
    });
  });
});

describe("refData", () => {
  it("accepts a reference", () => {
    expect(parse({ refData: DATA_REF })).toEqual({ refData: DATA_REF });
  });

  it.each([{ blockId: "b1", name: "fastqData" }, "b1/fastqData", 7, {}, null])(
    "refuses %o",
    (v) => {
      expect(() => parse({ refData: v })).toThrow("'refData' must be");
    },
  );
});

describe("title", () => {
  it("accepts a dataset label", () => {
    expect(parse({ title: "PBMC batch 3" })).toEqual({ title: "PBMC batch 3" });
  });

  it("accepts the empty string — a dataset may carry no label at all", () => {
    expect(parse({ title: "" })).toEqual({ title: "" });
  });

  it.each([7, null, {}, ["PBMC"]])("refuses %o", (v) => {
    expect(() => parse({ title: v })).toThrow("'title' must be");
  });
});

describe("the title and the input", () => {
  it("accepts a title with no reference, and a reference with no title", () => {
    // Both are reachable through the contract itself: a template need not set every field, and
    // the title is only the label the UI happened to read when the dataset was picked.
    expect(parse({ title: "PBMC batch 3" })).toEqual({ title: "PBMC batch 3" });
    expect(parse({ refData: DATA_REF })).toEqual({ refData: DATA_REF });
  });
});

describe("identity", () => {
  it("names this package and its published version", () => {
    expect(kind.name).toBe("@platforma-open/milaboratories.fastqc.kind");
    expect(kind.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
