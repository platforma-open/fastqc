<script setup lang="ts">
import { AgGridVue } from 'ag-grid-vue3';
import { useApp } from '../app';
import { computed, reactive, shallowRef } from 'vue';
import type { PlRef, ProgressLogWithInfo } from '@platforma-sdk/model';
import { plRefsEqual } from '@platforma-sdk/model';
import { AgGridTheme, PlAgCellProgress, PlAgOverlayLoading, PlAgOverlayNoRows,
  PlAgTextAndButtonCell, PlBlockPage, PlBtnGhost, PlDropdownRef,
  PlMaskIcon24, PlSlideModal, createAgGridColDef} from '@platforma-sdk/ui-vue';
import type { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-enterprise';
import { resultMap } from './results';
import ReportPanel from './ReportPanel.vue';

const app = useApp();

const data = reactive<{
  settingsOpen: boolean;
  fastqcReportOpen: boolean;
  selectedSample: string | undefined;
}>({
  settingsOpen: app.model.args.refData === undefined,
  fastqcReportOpen: false,
  selectedSample: undefined,
});

// Needed for analysis stage table
const gridApi = shallowRef<GridApi>();
const onGridReady = (params: GridReadyEvent) => {
  gridApi.value = params.api;
};
type FastQCOverviewRow = {
  sampleId: string;
  sampleLabel: string;
  progress?: ProgressLogWithInfo;
};
/** Rows for ag-table */
const results = computed<FastQCOverviewRow[] | undefined>(() => {
  if (resultMap.value === undefined) return undefined;
  const rows: FastQCOverviewRow[] = [];
  for (const id in resultMap.value) {
    rows.push({
      sampleId: id,
      sampleLabel: resultMap.value[id].sampleLabel,
      progress: resultMap.value[id].fastqcProgressLine,
    });
  }

  return rows;
});

const ProgressPattern = /Approx ([0-9]+)%/;
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
      invokeRowsOnDoubleClick: true,
    },
  },
  createAgGridColDef({
    colId: 'fastqc',
    headerName: 'FastQC Progress',
    progress: (cellData) => {
      const progress: ProgressLogWithInfo | undefined = cellData.data?.progress;
      console.log(progress);
      if (progress === undefined)
        return {
          status: 'not_started',
        };

      // @TODO Fix bug with live (not being set to false) and remove 'Analysis complete' section
      if (!progress.live) {
        return {
          status: 'done',
        };
      }
      if (progress.progressLine?.startsWith('Analysis complete')) {
        return {
          status: 'done',
        };
      }

      if (!progress.progressLine)
        return {
          status: 'running',
        };

      let percent = 0;
      const match = progress.progressLine.match(ProgressPattern);
      if (match)
        percent = Number(match[1]);

      console.log(percent);

      return {
        percent: percent,
        text: 'Analysis',
        status: 'running',
      };
    },
  }),
];

const gridOptions: GridOptions = {
  getRowId: (row) => row.data.sampleId,
  onRowDoubleClicked: (e) => {
    data.selectedSample = e.data?.sampleId;
    data.fastqcReportOpen = data.selectedSample !== undefined;
  },
  components: {
    PlAgTextAndButtonCell,
  },
};

const defaultColDef: ColDef = {
  suppressHeaderMenuButton: true,
  lockPinned: true,
  sortable: false,
};

function setInput(inputRef?: PlRef) {
  app.model.args.refData = inputRef;
  if (inputRef)
    app.model.args.title = app.model.outputs.dataOptions?.find((o) => plRefsEqual(o.ref, inputRef))?.label;
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
    <AgGridVue
      :theme="AgGridTheme" :style="{ height: '100%' }"
      :rowData="results"
      :columnDefs="columnDefs"
      :grid-options="gridOptions"
      :loadingOverlayComponentParams="{ notReady: true }" :defaultColDef="defaultColDef"
      :loadingOverlayComponent="PlAgOverlayLoading" :noRowsOverlayComponent="PlAgOverlayNoRows"
      @grid-ready="onGridReady"
    />
  </PlBlockPage>

  <!-- Dataset sliding window to select input Dataset -->
  <PlSlideModal v-model="data.settingsOpen">
    <template #title>Settings</template>
    <PlDropdownRef
      v-model="app.model.args.refData" :options="app.model.outputs.dataOptions"
      label="Select dataset"
      clearable @update:model-value="setInput"
    />
  </PlSlideModal>

  <!-- Slide window with results -->
  <PlSlideModal v-model="data.fastqcReportOpen" width="95%">
    <template #title>
      Results for {{ (data.selectedSample ? app.model.outputs.labels?.[data.selectedSample] :
        undefined) ?? "..." }}
    </template>
    <ReportPanel v-model="data.selectedSample" />
  </PlSlideModal>
</template>
