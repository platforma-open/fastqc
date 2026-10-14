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
  sampleLabel: string;
  progress: string;
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

// return a map of sampleId => ResultEntry
// (undefined until the block has been run and produced any sample)
export const resultMap = computed((): Record<string, ResultEntry> | undefined => {
  const app = useApp();
  const outputs = app.model.outputs;
  if (!outputs.hasRun) return undefined;

  const labels = outputs.labels ?? {};

  const progressLines: Record<string, string | undefined> = {};
  for (const { key, value } of outputs.fastqcProgressLine?.data ?? [])
    progressLines[String(key[0])] = value?.progressLine;

  const reports: Record<string, Partial<Record<Read, Report>>> = {};
  const addReport = (sampleId: string, read: Read, report: Report) =>
    ((reports[sampleId] ??= {})[read] = report);
  for (const [read, html, zip] of [
    ["R1", outputs.FastQChtmlR1, outputs.FastQCzipR1],
    ["R2", outputs.FastQChtmlR2, outputs.FastQCzipR2],
  ] as const) {
    for (const { key, value } of html?.data ?? [])
      if (value) addReport(String(key[0]), read, { html: value.handle });
    for (const { key, value } of zip?.data ?? [])
      if (value) addReport(String(key[0]), read, { folder: value });
  }

  const sampleIds = new Set<string>([
    ...(outputs.fastqcProgress?.data ?? []).map((it) => String(it.key[0])),
    ...Object.keys(progressLines),
    ...Object.keys(reports),
  ]);
  // No samples yet: keep the loader up until the sample map is final. `isRunning` cannot tell, it
  // reads false right after Run, before the workflow outputs exist.
  if (sampleIds.size === 0) return outputs.fastqcProgress?.isComplete ? {} : undefined;

  const r: Record<string, ResultEntry> = {};
  for (const sampleId of sampleIds) {
    const sampleReports = reports[sampleId] ?? {};
    // Without the dataset's read list, a sample is done once its R1 report and, if one exists, its
    // R2 report can be opened.
    const expected: readonly Read[] = outputs.reads ?? (sampleReports.R2 ? ["R1", "R2"] : ["R1"]);
    const percent = samplePercent(progressLines[sampleId], expected);

    let progress: string;
    if (expected.every((read) => sampleReports[read] !== undefined)) progress = PROGRESS_DONE;
    else if (!progressLines[sampleId]?.trim()) progress = PROGRESS_QUEUED;
    else if (percent === undefined) progress = PROGRESS_STARTED;
    else if (percent >= 100) progress = PROGRESS_REPORT;
    else progress = String(percent);

    r[sampleId] = {
      sampleLabel: labels[sampleId] ?? sampleId,
      progress,
      reports: sampleReports,
    };
  }
  return r;
});
