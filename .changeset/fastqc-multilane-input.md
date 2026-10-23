---
"@platforma-open/milaboratories.fastqc": patch
"@platforma-open/milaboratories.fastqc.model": patch
"@platforma-open/milaboratories.fastqc.ui": patch
"@platforma-open/milaboratories.fastqc.workflow": patch
---

Fix FastQC on Multi-lane FASTQ datasets, which failed with `malformed read index`:

- each lane of a sample gets its own R1/R2 reports, and the table shows a Lane column (tagged datasets get one column per tag)
- paired-end and single-end datasets run as before, and their earlier results are reused
- the dataset list only offers FASTQ datasets that have read indices
