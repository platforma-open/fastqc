<script setup lang="ts">
import { AgGridVue } from 'ag-grid-vue3';
import { useApp } from '../app';
import { computed, reactive, shallowRef } from "vue";
import { PlRef, plRefsEqual } from '@platforma-sdk/model';
import { AgGridTheme, PlAgCellProgress, PlAgOverlayLoading, PlAgOverlayNoRows, 
  PlAgTextAndButtonCell, PlBlockPage, PlBtnGhost, PlDropdownRef, 
  PlMaskIcon24, PlSlideModal } from '@platforma-sdk/ui-vue';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-enterprise';
import { resultMap } from './results';
import ReportPanel from './ReportPanel.vue';

const app = useApp();

const data = reactive<{
  settingsOpen: boolean,
  fastqcReportOpen: boolean,
  selectedSample: string | undefined
}>({
  settingsOpen: app.model.args.refData === undefined,
  fastqcReportOpen: false,
  selectedSample: undefined
})

// Needed for analysis stage table
const gridApi = shallowRef<GridApi<any>>();
const onGridReady = (params: GridReadyEvent) => {
  gridApi.value = params.api;
};
type FastQCOverviewRow = {
  sampleId: string,
  sampleLabel: string,
  progress?: string,
}
/** Rows for ag-table */
const results = computed<FastQCOverviewRow[] | undefined>(() => {
  if (resultMap.value === undefined) return undefined;
  const rows: FastQCOverviewRow[] = []
  for (const id in resultMap.value) {
    rows.push({
      sampleId: id,
      sampleLabel: resultMap.value[id].sampleLabel,
      progress: resultMap.value[id].fastqcProgressLine,
    });
  }

  return rows;
});

const ProgressPattern = /Approx ([0-9]+)\%/
// How to display content in table
const columnDefs: ColDef[] = [
  {
    colId: 'label',
    field: 'sampleLabel',
    headerName: 'Sample',
    pinned: 'left',
    lockPinned: true,
    sortable: true,
    cellRenderer: PlAgTextAndButtonCell,
    cellRendererParams: {
      invokeRowsOnDoubleClick: true
    }
  },
  {
    colId: 'fastqc',
    cellRendererSelector: (cellData) => {
      if (cellData.data?.progress === undefined)
        return {
          component: PlAgCellProgress,
          params: {
            progress: 0,
            step: 'Queued',
            stage: 'not_started',
          },
        };

      const progressStr = cellData.data.progress;
      console.log(progressStr);
      let progress: number;

      if (progressStr.startsWith('Analysis complete'))
        progress = 100;
      else {
        const match = progressStr.match(ProgressPattern)
        if (match)
          progress = Number(match[1]);
        else
          progress = 0;
      }

      console.log(progress);

      return {
        component: PlAgCellProgress,
        params: {
          progress,
          progressString: `${progress}%`,
          step: 'Analysis',
          stage: 'running',
        },
      };
      },
      headerName: 'FastQC Progress',
      cellStyle: {
        '--ag-cell-horizontal-padding': '0px',
        '--ag-cell-vertical-padding': '0px'
      },
  },
];

const gridOptions: GridOptions = {
  getRowId: (row) => row.data.sampleId,
  onRowDoubleClicked: (e) => {
    data.selectedSample = e.data?.sampleId
    data.fastqcReportOpen = data.selectedSample !== undefined;
  },
  components: {
    PlAgTextAndButtonCell,
  }
};

const defaultColDef: ColDef = {
  suppressHeaderMenuButton: true,
  lockPinned: true,
  sortable: false
};

function setInput(inputRef?: PlRef) {
  app.model.args.refData = inputRef;
  if (inputRef)
    app.model.args.title = app.model.outputs.dataOptions?.find(o => plRefsEqual(o.ref, inputRef))?.label
  else
    app.model.args.title = undefined;
}

</script>

<template>
    <PlBlockPage>
    <!-- Include setting button to open Dataset sliding window -->
    <template #title>FastQC analysis</template>
    <template #append>
      <PlBtnGhost @click.stop="() => data.settingsOpen = true">
        Settings
        <template #append>
          <PlMaskIcon24 name="settings" />
        </template>
      </PlBtnGhost>
    </template>

    <!-- Table showing analysis stage of files from selected dataset -->
    <AgGridVue :theme="AgGridTheme" :style="{ height: '100%' }" 
      @grid-ready="onGridReady" 
      :rowData="results" 
      :columnDefs="columnDefs" 
      :grid-options="gridOptions" :loadingOverlayComponentParams="{ notReady: true }"
      :defaultColDef="defaultColDef" :loadingOverlayComponent=PlAgOverlayLoading
      :noRowsOverlayComponent=PlAgOverlayNoRows />
  </PlBlockPage>

  <!-- Dataset sliding window to select input Dataset -->
  <PlSlideModal v-model="data.settingsOpen">
    <template #title>Settings</template>
    <PlDropdownRef :options="app.model.outputs.dataOptions" v-model="app.model.args.refData" 
      @update:model-value="setInput"
      label="Select dataset" clearable />
  </PlSlideModal>

  <!-- Slide window with results -->
  <PlSlideModal v-model="data.fastqcReportOpen" width="95%">
    <template #title>Results for {{ (data.selectedSample ? app.model.outputs.labels?.[data.selectedSample] :
      undefined) ?? "..." }}</template>
    <ReportPanel v-model="data.selectedSample" />
  </PlSlideModal>
</template>
