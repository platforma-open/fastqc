<script setup lang="ts">
import type { PlRef } from "@platforma-sdk/model";
import { plRefsEqual } from "@platforma-sdk/model";
import {
  AgGridTheme,
  PlAgOverlayLoading,
  PlAgOverlayNoRows,
  PlAgTextAndButtonCell,
  PlBlockPage,
  PlBtnGhost,
  PlDropdownRef,
  PlMaskIcon24,
  PlSlideModal,
  createAgGridColDef,
} from "@platforma-sdk/ui-vue";
import { refDebounced } from "@vueuse/core";
import type { ColDef, GridApi, GridOptions, GridReadyEvent } from "ag-grid-enterprise";
import { AgGridVue } from "ag-grid-vue3";
import { computed, reactive, shallowRef, watch } from "vue";
import { useApp } from "../app";
import ReportPanel from "./ReportPanel.vue";
import {
  PROGRESS_DONE,
  PROGRESS_QUEUED,
  PROGRESS_REPORT,
  PROGRESS_STARTED,
  resultMap,
} from "./results";

const app = useApp();

const data = reactive<{
  settingsOpen: boolean;
  fastqcReportOpen: boolean;
  /** `resultKeyId` of the row whose reports are open */
  selectedRow: string | undefined;
}>({
  settingsOpen: app.model.data.refData === undefined,
  fastqcReportOpen: false,
  selectedRow: undefined,
});

// Close the settings once the run starts, so the progress table is in view
watch(
  () => app.model.outputs.isRunning,
  (isRunning) => {
    if (isRunning) data.settingsOpen = false;
  },
);

// Needed for analysis stage table
const gridApi = shallowRef<GridApi>();
const onGridReady = (params: GridReadyEvent) => {
  gridApi.value = params.api;
};
type FastQCOverviewRow = {
  id: string;
  sampleId: string;
  sampleLabel: string;
  /** Lane and tags of the row, in the order of `subKeyLabels` */
  subKey: string[];
  progress: string;
};
/** Rows for ag-table */
const resultsComputed = computed<FastQCOverviewRow[] | undefined>(() => {
  if (resultMap.value === undefined) return undefined;
  const rows: FastQCOverviewRow[] = [];
  for (const id in resultMap.value) {
    const entry = resultMap.value[id];
    rows.push({
      id,
      sampleId: entry.sampleId,
      sampleLabel: entry.sampleLabel,
      subKey: entry.subKey,
      progress: entry.progress,
    });
  }

  // Samples arrive in the order their results do, which changes between updates. Like the
  // standard data table, rows are ordered by their key (sample id, then lane and tags) unless a
  // column is sorted.
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return rows.sort(
    (a, b) =>
      compare(a.sampleId, b.sampleId) ||
      a.subKey.reduce((r, v, i) => r || compare(v, b.subKey[i] ?? ""), 0),
  );
});

const results = refDebounced(resultsComputed, 100);

// Rows stay undefined until the block has run, so the grid shows this overlay instead of "Empty"
const overlayParams = computed(() =>
  app.model.outputs.hasRun
    ? { variant: "running" as const }
    : {
        variant: "not-ready" as const,
        notReadyText: "Configure the settings and click 'Run' to see per-sample progress",
      },
);

// Labels of the lane and tag columns; none for a dataset with one report per sample and read
const subKeyLabels = computed(() => app.model.outputs.subKeyLabels ?? []);

// How to display content in table
const columnDefs = computed((): ColDef[] => [
  {
    colId: "label",
    field: "sampleLabel",
    headerName: "Sample",
    pinned: "left",
    lockPinned: true,
    sortable: true,
    cellRenderer: PlAgTextAndButtonCell,
    cellRendererParams: {
      invokeRowsOnDoubleClick: true,
    },
  },
  ...subKeyLabels.value.map(
    (label, i): ColDef<FastQCOverviewRow> => ({
      colId: `subKey${i}`,
      headerName: label,
      valueGetter: (params) => params.data?.subKey[i],
      sortable: true,
    }),
  ),
  createAgGridColDef<FastQCOverviewRow, string>({
    colId: "fastqc",
    field: "progress",
    headerName: "FastQC Progress",
    progress: (progress) => {
      switch (progress) {
        case PROGRESS_DONE:
          return { status: "done" };
        // No percent to show for these: an empty suffix hides the cell's default "0%"
        case PROGRESS_REPORT:
          return { status: "running", text: "Preparing report", suffix: "" };
        case PROGRESS_STARTED:
          return { status: "running", text: "Analysis", suffix: "" };
        case PROGRESS_QUEUED:
        case undefined:
          return { status: "not_started", text: "Queued" };
        default:
          return { status: "running", text: "Analysis", percent: Number(progress) };
      }
    },
  }),
]);

const gridOptions: GridOptions = {
  getRowId: (row) => row.data.id,
  onRowDoubleClicked: (e) => {
    data.selectedRow = e.data?.id;
    data.fastqcReportOpen = data.selectedRow !== undefined;
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

// The sample of the open row, then its lane and tags, e.g. "Sample 1, Lane 001"
const reportTitle = computed(() => {
  const entry = data.selectedRow ? resultMap.value?.[data.selectedRow] : undefined;
  if (entry === undefined) return "...";
  return [
    entry.sampleLabel,
    ...entry.subKey.map((value, i) => `${subKeyLabels.value[i] ?? ""} ${value}`.trim()),
  ].join(", ");
});

function setInput(inputRef?: PlRef) {
  app.model.data.refData = inputRef;
  if (inputRef)
    app.model.data.title = app.model.outputs.dataOptions?.find((o) =>
      plRefsEqual(o.ref, inputRef),
    )?.label;
  else app.model.data.title = undefined;
}
</script>

<template>
  <PlBlockPage>
    <!-- Include setting button to open Dataset sliding window -->
    <template #title>FastQC analysis</template>
    <template #append>
      <PlBtnGhost @click.stop="() => (data.settingsOpen = true)">
        Settings
        <template #append>
          <PlMaskIcon24 name="settings" />
        </template>
      </PlBtnGhost>
    </template>

    <!-- Table showing analysis stage of files from selected dataset -->
    <AgGridVue
      :theme="AgGridTheme"
      :style="{ height: '100%' }"
      :rowData="results"
      :columnDefs="columnDefs"
      :grid-options="gridOptions"
      :loadingOverlayComponentParams="overlayParams"
      :defaultColDef="defaultColDef"
      :loadingOverlayComponent="PlAgOverlayLoading"
      :noRowsOverlayComponent="PlAgOverlayNoRows"
      @grid-ready="onGridReady"
    />
  </PlBlockPage>

  <!-- Dataset sliding window to select input Dataset -->
  <PlSlideModal v-model="data.settingsOpen" shadow>
    <template #title>Settings</template>
    <PlDropdownRef
      v-model="app.model.data.refData"
      :options="app.model.outputs.dataOptions"
      label="Select dataset"
      clearable
      @update:model-value="setInput"
    />
  </PlSlideModal>

  <!-- Slide window with results -->
  <PlSlideModal v-model="data.fastqcReportOpen" width="min(1250px, 95%)">
    <template #title> Results for {{ reportTitle }} </template>
    <ReportPanel v-model="data.selectedRow" />
  </PlSlideModal>
</template>
