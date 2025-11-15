# Overview

Performs quality control analysis on FASTQ sequencing files using FastQC to assess data quality and identify potential issues before downstream analysis. The block processes all FASTQ files within each sample and generates comprehensive HTML reports that include multiple QC metrics such as per-base sequence quality scores, per-sequence quality distributions, base composition analysis, GC content, sequence length distributions, adapter contamination, sequence duplication levels, and overrepresented sequences.

The block uses FastQC developed by the Babraham Institute. For more information, please see the [FastQC website](http://www.bioinformatics.babraham.ac.uk/projects/fastqc/) and the [FastQC repository](https://github.com/platforma-open/fastqc). When using this block in your research, cite FastQC using the reference listed below.

The following reference should be used when citing FastQC:

> Andrews, S. (2010). FastQC: A Quality Control Tool for High Throughput Sequence Data. Available online at: [http://www.bioinformatics.babraham.ac.uk/projects/fastqc/](http://www.bioinformatics.babraham.ac.uk/projects/fastqc/)
