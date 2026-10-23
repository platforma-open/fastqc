import type { LocalBlobHandle } from "@platforma-sdk/model";
import { computed } from "vue";
import { useApp } from "../app";

export type Read = "R1" | "R2";

/**
 * A sample's progress, folded into one string: AG-Grid redraws a cell only when its bound field's
 * value changes, so every state the cell shows must change this value itself.
 * - `PROGRESS_QUEUED` — FastQC has not started on the sample yet
 * - `PROGRESS_STARTED` — FastQC is running, its last line carries no percent
 * - a number (as string) — percent of the whole sample, R1 and R2 together
 * - `PROGRESS_REPORT` — FastQC finished, the report is still being prepared for viewing
 * - `PROGRESS_DONE` — every report of the sample can be opened
 */
export const PROGRESS_QUEUED = "queued";
export const PROGRESS_STARTED = "started";
export const PROGRESS_REPORT = "report";
export const PROGRESS_DONE = "done";

/**
 * Where a read's report can be shown from: the standalone HTML file, or for results of earlier
 * block versions that did not pass it on, the folder of the unpacked report archive.
 */
export type Report = { html: LocalBlobHandle } | { folder: string };

export type ResultEntry = {
  sampleId: string;
  sampleLabel: string;
  /** The key's values after the sample (lane, tags), matching `subKeyLabels`; empty when the
   * dataset has no such axes */
  subKey: string[];
  progress: string;
  /** The sample's reads; undefined until its step has started */
  reads?: Read[];
  reports: Partial<Record<Read, Report>>;
};

// FastQC names the file every line is about; the workflow names inputs `input_R1.<ext>`/`input_R2.<ext>`
const LINE_PATTERN =
  /(Started analysis of|Approx (\d+)% complete for|Analysis complete for) input_(R[12])\./;

/**
 * Percent of the whole sample from FastQC's last log line. FastQC processes R1, then R2 in the same
 * run, and each file counts from 0 to 100% on its own; R1 maps to the first half of a paired-end
 * sample and R2 to the second, so the bar does not restart when R2 begins.
 */
function samplePercent(line: string | undefined, reads: readonly Read[]): number | undefined {
  const match = line?.match(LINE_PATTERN);
  if (!match) return undefined;

  const filePercent = match[1].startsWith("Approx")
    ? Number(match[2])
    : match[1].startsWith("Analysis complete")
      ? 100
      : 0;

  const index = reads.indexOf(match[3] as Read);
  if (index < 0) return filePercent;
  return Math.floor((index * 100 + filePercent) / reads.length);
}

/**
 * Id of a result row. FastQC runs once per key of the input axes other than the read: the sample,
 * plus its lane and tags in datasets that have them. Each run is one row.
 */
export const resultKeyId = (key: readonly unknown[]): string => JSON.stringify(key.map(String));

// return a map of resultKeyId => ResultEntry
// (undefined until the block has been run and produced any sample)
export const resultMap = computed((): Record<string, ResultEntry> | undefined => {
  const app = useApp();
  const outputs = app.model.outputs;
  if (!outputs.hasRun) return undefined;

  const labels = outputs.labels ?? {};

  const progressLines: Record<string, string | undefined> = {};
  for (const { key, value } of outputs.fastqcProgressLine?.data ?? [])
    progressLines[resultKeyId(key)] = value?.progressLine;

  // Each sample's state per read, from the report maps: once its step starts, every sample has an
  // entry for every read, `null` when it has no such read, `undefined` while the report is not
  // ready, then the report (for results of earlier versions, from the archives)
  const readStates: Record<string, Partial<Record<Read, "absent" | "pending" | Report>>> = {};
  const setState = (id: string, read: Read, state: "absent" | "pending" | Report) =>
    ((readStates[id] ??= {})[read] = state);
  for (const [read, html, zip] of [
    ["R1", outputs.FastQChtmlR1, outputs.FastQCzipR1],
    ["R2", outputs.FastQChtmlR2, outputs.FastQCzipR2],
  ] as const) {
    for (const { key, value } of html?.data ?? [])
      setState(
        resultKeyId(key),
        read,
        value === null ? "absent" : value ? { html: value.handle } : "pending",
      );
    for (const { key, value } of zip?.data ?? [])
      setState(
        resultKeyId(key),
        read,
        value === null ? "absent" : value ? { folder: value } : "pending",
      );
  }

  const ids = new Set<string>([
    ...(outputs.fastqcProgress?.data ?? []).map((it) => resultKeyId(it.key)),
    ...Object.keys(progressLines),
    ...Object.keys(readStates),
  ]);
  // No samples yet: keep the loader up until the sample map is final. `isRunning` cannot tell, it
  // reads false right after Run, before the workflow outputs exist.
  if (ids.size === 0) return outputs.fastqcProgress?.isComplete ? {} : undefined;

  const r: Record<string, ResultEntry> = {};
  for (const id of ids) {
    const [sampleId, ...subKey] = JSON.parse(id) as string[];
    const states = readStates[id] ?? {};
    // The sample's reads are known once both reads have an entry; until then completion is unknown
    const reads: Read[] | undefined =
      states.R1 !== undefined && states.R2 !== undefined
        ? (["R1", "R2"] as const).filter((read) => states[read] !== "absent")
        : undefined;
    const sampleReports: Partial<Record<Read, Report>> = {};
    for (const read of ["R1", "R2"] as const) {
      const state = states[read];
      if (typeof state === "object") sampleReports[read] = state;
    }
    const percent = samplePercent(progressLines[id], reads ?? []);

    let progress: string;
    if (reads !== undefined && reads.length > 0 && reads.every((read) => sampleReports[read]))
      progress = PROGRESS_DONE;
    else if (!progressLines[id]?.trim()) progress = PROGRESS_QUEUED;
    else if (percent === undefined) progress = PROGRESS_STARTED;
    else if (percent >= 100) progress = PROGRESS_REPORT;
    else progress = String(percent);

    r[id] = {
      sampleId,
      sampleLabel: labels[sampleId] ?? sampleId,
      subKey,
      progress,
      reads,
      reports: sampleReports,
    };
  }
  return r;
});
