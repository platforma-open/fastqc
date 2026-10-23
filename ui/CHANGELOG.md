# @platforma-open/milaboratories.fastqc.ui

## 2.1.6

### Patch Changes

- afa3c27: Fix FastQC on Multi-lane FASTQ datasets, which failed with `malformed read index`:

  - each lane of a sample gets its own R1/R2 reports, and the table shows a Lane column (tagged datasets get one column per tag)
  - paired-end and single-end datasets run as before, and their earlier results are reused
  - the dataset list only offers FASTQ datasets that have read indices

- Updated dependencies [afa3c27]
  - @platforma-open/milaboratories.fastqc.model@2.2.3

## 2.1.5

### Patch Changes

- 0d979a5: Release every package through npm trusted publishing (OIDC) so each package's trusted publisher is used before it expires.
- Updated dependencies [0d979a5]
  - @platforma-open/milaboratories.fastqc.model@2.2.2

## 2.1.4

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

- Updated dependencies [a0016fd]
  - @platforma-open/milaboratories.fastqc.model@2.2.1

## 2.1.3

### Patch Changes

- Updated dependencies [f99078e]
  - @platforma-open/milaboratories.fastqc.model@2.2.0

## 2.1.2

### Patch Changes

- 225371e: technical release
- 4e99f54: technical release
- 818f44b: technical release
- 2f93384: technical release
- Updated dependencies [225371e]
- Updated dependencies [4e99f54]
- Updated dependencies [818f44b]
- Updated dependencies [2f93384]
  - @platforma-open/milaboratories.fastqc.model@2.1.1

## 2.1.1

### Patch Changes

- 2edd4bb: Update SDK

## 2.1.0

### Minor Changes

- 4de82cd: Update to new version and fix deduplication issue

### Patch Changes

- Updated dependencies [4de82cd]
  - @platforma-open/milaboratories.fastqc.model@2.1.0

## 2.0.1

### Patch Changes

- 6fb960e: Use @platforma-sdk/eslint-config
- Updated dependencies [6fb960e]
  - @platforma-open/milaboratories.fastqc.model@2.0.1

## 2.0.0

### Major Changes

- fc5d069: First working release

### Patch Changes

- Updated dependencies [fc5d069]
  - @platforma-open/milaboratories.fastqc.model@2.0.0
