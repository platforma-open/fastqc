import { assertParamsObject, defineBlockKind } from "@platforma-sdk/block-kind";
import type { PlRef } from "@platforma-sdk/model";
import { isPlRef } from "@platforma-sdk/model";
import { isString } from "es-toolkit";
import { name, version } from "../package.json" with { type: "json" };

/**
 * This block's init-params contract — what a creator or a project template supplies to seed a new
 * instance. FastQC has no settings: it reports on whatever dataset it is pointed at, so the whole
 * contract is that choice.
 *
 * `title` is the chosen dataset's own label, which the UI writes in the same gesture as `refData`
 * and nothing re-derives afterwards. It is carried rather than recomputed because a template that
 * restored the input alone would name the block plain "FastQC" while showing that dataset's
 * results.
 *
 * Both fields are optional: a block may be created without a template, and a template need not set
 * either.
 */
export type BlockParams = {
  /** The sequencing data column this block reports on. */
  refData?: PlRef;
  /** The label of the dataset `refData` points at, shown in the block's title. */
  title?: string;
};

/**
 * The contract at runtime, for params arriving from a template file rather than typed code. An
 * absent field is always allowed — every param is optional and the block's own default takes
 * over — so each guard runs only on what is present. Keys the contract does not name are dropped
 * by never being read.
 */
function parseInitializationParams(value: unknown): BlockParams {
  assertParamsObject(value);

  const params: Record<string, unknown> = {};
  for (const [field, { is, must }] of Object.entries(CONTRACT)) {
    const v = value[field];
    if (v === undefined) continue;
    if (!is(v)) throw new Error(`'${field}' must be ${must}.`);
    params[field] = v;
  }
  return params as BlockParams;
}

// Identity (`name`/`version`) comes from this package's own `package.json`, so the on-wire
// `{name}@{version}` reference can never drift from what npm publishes; the bundler inlines the
// JSON import.
export const kind = defineBlockKind<BlockParams>({
  name,
  version,
  parseInitializationParams,
});

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type Guard<T> = (v: unknown) => v is T;

/** A guard plus how to finish the sentence "'field' must be …". */
type Check<T> = { is: Guard<T>; must: string };

function check<T>(is: Guard<T>, must: string): Check<T> {
  return { is, must };
}

/**
 * The runtime half of the contract. The `satisfies` clause is what stops it drifting: every field
 * `BlockParams` declares must appear here, and each guard must narrow to that field's own type —
 * so adding a param without a check stops compiling.
 */
const CONTRACT = {
  refData: check(isPlRef, "a reference to a FASTQ dataset"),
  title: check(isString, "a string"),
} satisfies { [K in keyof Required<BlockParams>]: Check<NonNullable<BlockParams[K]>> };
