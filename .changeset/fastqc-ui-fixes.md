---
"@platforma-open/milaboratories.fastqc": patch
"@platforma-open/milaboratories.fastqc.model": patch
"@platforma-open/milaboratories.fastqc.ui": patch
"@platforma-open/milaboratories.fastqc.workflow": patch
---

Fix the FastQC table and report panel:

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
