<script setup lang="ts">
import { AgGridVue } from 'ag-grid-vue3';
import { useApp } from '../app';
import { computed, reactive, shallowRef } from "vue";
import { PlRef, plRefsEqual } from '@platforma-sdk/model';
import { AgGridTheme, PlAgOverlayLoading, PlAgOverlayNoRows, 
  PlAgTextAndButtonCell, PlBlockPage, PlBtnGhost, PlDropdownRef, 
  PlMaskIcon24, PlSlideModal } from '@platforma-sdk/ui-vue';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-enterprise';
import ProgressCell from './components/ProgressCell.vue';
import { resultMap } from './results';

const app = useApp();

const data = reactive<{
  settingsOpen: boolean,
}>({
  settingsOpen: app.model.args.refData === undefined,
})

// Needed for analysis stage table
const gridApi = shallowRef<GridApi<any>>();
const onGridReady = (params: GridReadyEvent) => {
  gridApi.value = params.api;
};
/** Rows for ag-table */
const results = computed<any[] | undefined>(() => {
    if (resultMap.value === undefined) return undefined;
    const rows = []
    for (const id in resultMap.value) {
      rows.push({
        "sampleId": id,
        "sampleLabel": resultMap.value[id].sampleLabel,
        "fastqc": resultMap.value[id].fastqcProgressLine, 
      });
  }

  return rows;
});

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
    field: 'fastqc',
    cellRenderer: ProgressCell,
    headerName: 'FastQC Progress',
    cellStyle: {
      '--ag-cell-horizontal-padding': '0px',
      '--ag-cell-vertical-padding': '0px'
    },
  }
];

const gridOptions: GridOptions = {
  getRowId: (row) => row.data.sampleId,
  // onRowDoubleClicked: (e) => {
  //   data.selectedSample = e.data?.sampleId
  //   data.sampleReportOpen = data.selectedSample !== undefined;
  // },
  components: {
    PlAgTextAndButtonCell,
    ProgressCell
    //     ProgressCell,
    //     ChainsStatsCell
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
</template>
