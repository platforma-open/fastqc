import { AnyLogHandle } from "@platforma-sdk/model";
import { computed } from "vue";
import { useApp } from "../app";


export type ResultEntry = {
    sampleLabel: string;
    fastqcProgress?: AnyLogHandle;
    fastqcProgressLine?: string;
  };

 
// return a map of sampleId => ResultEntry
export const resultMap = computed(
    (): Record<string, ResultEntry> | undefined => {
      const app = useApp();
  
      const labels = app.model.outputs.labels;
      if (labels === undefined) return undefined;

      const starProgress = app.model.outputs.fastqcProgress;
      if (starProgress === undefined) return undefined;
  
      const r: Record<string, ResultEntry> = {};
      for (const prog of starProgress.data) {
        const sampleId = prog.key[0];
        r[sampleId] = {
          sampleLabel: labels[sampleId],
          fastqcProgress: prog.value,
        };
      }
  
      const fastqcProgressLine = app.model.outputs.fastqcProgressLine;
      if (fastqcProgressLine !== undefined) {
        for (const prog of fastqcProgressLine.data) {
          r[prog.key[0]].fastqcProgressLine = prog.value;
        }
      }
      return r;
    }
  );
  