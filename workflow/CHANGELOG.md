# @platforma-open/milaboratories.fastqc.workflow

## 2.3.4

### Patch Changes

- 0d979a5: Release every package through npm trusted publishing (OIDC) so each package's trusted publisher is used before it expires.

## 2.3.3

### Patch Changes

- a0016fd: Fix the FastQC table and report panel:

  - before the first run the table asks to configure the settings and click Run, instead of a loader or "Empty"
  - a sample shows Done once its reports can be opened, so finished samples no longer stay at 0%
  - paired-end progress runs from 0 to 100% once per sample, R1 then R2, instead of restarting for R2
  - the report panel says the report is being prepared instead of "Read 1 not found" while it unpacks
  - sample names stay after switching the dataset, until the block runs again
  - the report buttons stay in place and only the report scrolls on narrow windows
  - external links in a report no longer blank it: a notice offers the link for copying, since external websites cannot be opened from the app; jumps within the report keep working
  - the dataset name moves from the block title to its subtitle
  - reports are shown from FastQC's standalone HTML file; new results no longer carry the report archive, while results of earlier versions still show their reports from it
  - the settings panel dims the page behind it and closes when the run starts
  - FastQC results are kept for 24 hours as intended; the cache time was given in milliseconds where nanoseconds are expected, so it lasted 86 ms
  - datasets with index reads (I1, I2) no longer fail with "malformed read index"; index reads are still not checked
  - update the SDK to the latest versions (model and ui-vue 1.85.0, workflow-tengo 6.16.0, block-tools 2.16.13, tengo-builder 4.1.11)

## 2.3.2

### Patch Changes

- 225371e: technical release
- 4e99f54: technical release
- 818f44b: technical release
- 2f93384: technical release

## 2.3.1

### Patch Changes

- 2edd4bb: Update SDK

## 2.3.0

### Minor Changes

- b0a1432: add windows support

## 2.2.0

### Minor Changes

- c6919da: Do not throw error when fastq files are single-end

## 2.1.1

### Patch Changes

- 24f0bc8: chore: update deps

## 2.1.0

### Minor Changes

- 4de82cd: Update to new version and fix deduplication issue

## 2.0.0

### Major Changes

- fc5d069: First working release
