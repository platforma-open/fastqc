<script setup lang="ts">
import { ICellRendererParams } from 'ag-grid-enterprise';
import { computed, unref } from 'vue';
import { PlAgCellProgress, PlProgressCellProps } from '@platforma-sdk/ui-vue';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const progressString = computed(() => {
  return props.params.value ?? 'Unknown';
});

type Parsed = {
  raw?: string;
  stage?: string;
  time?: string;
  percentage?: string;
  percentageLabel?: string;
};

const parsed = computed<Parsed>(() => {
  const raw = unref(progressString);

  const res: Parsed = {
    raw
  };

  if (!raw) {
    return res;
  }

  console.log(raw);
   // Make sure that the output contains FastQC progress
   if (raw.indexOf('Approx') < 0) {
    return res;
  }

  // Keep first two words of each line (That contain analysis progress info)
  const parts = raw.split(' ').slice(0, 2).join(' ');
  res.stage = parts || 'Not started';

  // THIS SEEMS TO BE GOING SO FAST THAT PLATFORMA IS NOT GETTING IT
  // switch (res.stage) {
  //   case 'Approx 5%':
  //     res.percentage = '5';
  //     break;
  //   case 'Approx 10%':
  //     res.percentage = '10';
  //     break;
  //   case 'Approx 15%':
  //     res.percentage = '15';
  //     break;
  //   case 'Approx 20%':
  //     res.percentage = '20';
  //     break;
  //   case 'Approx 25%':
  //     res.percentage = '25';
  //     break;
  //   case 'Approx 30%':
  //     res.percentage = '30';
  //     break;
  //   case 'Approx 35%':
  //     res.percentage = '35';
  //     break;
  //   case 'Approx 40%':
  //     res.percentage = '40';
  //     break;
  //   case 'Approx 45%':
  //     res.percentage = '45';
  //     break;
  //   case 'Approx 50%':
  //     res.percentage = '50';
  //     break;
  //   case 'Analysis complete':
  //     res.percentage = '100';
  //     break;
    // case 'Approx 50%':
    //   res.percentage = '25';
    //   break;
    // case 'Analysis complete':
    //   res.percentage = '50';
    //   break;
  // }

  const stageToPercentage: Record<string, string> = {
    'Started analysis': '0',
    'Approx 5%': '5',
    'Approx 10%': '10',
    'Approx 15%': '15',
    'Approx 20%': '20',
    'Approx 25%': '25',
    'Approx 30%': '30',
    'Approx 35%': '35',
    'Approx 40%': '40',
    'Approx 45%': '45',
    'Approx 50%': '50',
    'Approx 55%': '50',
    'Approx 60%': '60',
    'Approx 65%': '65',
    'Approx 70%': '70',
    'Approx 75%': '75',
    'Approx 80%': '80',
    'Approx 85%': '85',
    'Approx 90%': '90',
    'Approx 95%': '95',
    'Analysis complete': '100',
  };

  res.percentage = stageToPercentage[res.stage as string] || res.percentage;

  if (res.percentage) {
    res.percentageLabel = res.percentage + '%';
  }

  return res;
});

const ProgressProps = computed<PlProgressCellProps>(() => {
  return {
    // If not_started, text is displayed in translucent grey, otherwise black
    stage: parsed.value.stage === 'Not started' ? 'not_started' : 'running',
    // Text to be shown at the left of the cell while running the analysis
    step: parsed.value.stage || '',
    // An integer from 0 to 100 is needed here to show the progress green bar 
    progress: parsed.value.percentage ? +parsed.value.percentage : 0,
    // Text to be shown at the right of the cell
    // FastQC output shown in step already has % info, so no needed
    // progressString: parsed.value.percentageLabel || ''
    progressString: ''
  };
});
</script>

<template>
  <PlAgCellProgress v-bind="{ params: { ...props.params, ...ProgressProps } }" />
</template>
