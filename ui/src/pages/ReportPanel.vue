<script setup lang="ts">
import {
  PlBtnGroup,
  PlBtnSecondary,
  PlNotificationAlert,
  ReactiveFileContent,
} from "@platforma-sdk/ui-vue";
import { computed, ref, watch } from "vue";
import { useApp } from "../app";
import type { Read } from "./results";
import { PROGRESS_DONE, resultMap } from "./results";

const app = useApp();
const sampleId = defineModel<string | undefined>();

const reactiveFileContent = ReactiveFileContent.useGlobal();

// Button labels displayed on top of sliding window to define tabs by PlBtnGroup
// Tabs: the sample's reads, or both while they are not known
const reads = computed<readonly Read[]>(
  () => (sampleId.value && app.model.outputs.sampleReads?.[sampleId.value]) || ["R1", "R2"],
);
const options = computed(() => reads.value.map((read) => ({ label: read, value: read })));

// Reference to tab opened by default
// Falls back to the first read when the chosen one is not in the dataset
const chosenView = ref<Read>("R1");
const currentView = computed<Read>({
  get: () => (reads.value.includes(chosenView.value) ? chosenView.value : reads.value[0]),
  set: (read) => (chosenView.value = read),
});

const sampleReports = computed(() => {
  const id = sampleId.value;
  if (id === undefined) return undefined;
  return resultMap.value?.[id]?.reports;
});
const report = computed(() => sampleReports.value?.[currentView.value]);

type Frame =
  // Content of the standalone HTML report, globally cached
  | { read: Read; html: string }
  // Report inside the unpacked report archive, for results of earlier block versions
  | { read: Read; folder: string };

// One frame per read of the open sample, the hidden ones kept: replacing a frame's content makes
// the browser parse and draw the whole report again, which blinks on every switch between reads
const frames = computed<Frame[]>(() =>
  reads.value.flatMap((read): Frame[] => {
    const r = sampleReports.value?.[read];
    if (r === undefined) return [];
    if ("folder" in r)
      return [{ read, folder: `${r.folder}/input_${read}_fastqc/fastqc_report.html` }];
    const html = reactiveFileContent.getContentString(r.html).value;
    return html === undefined ? [] : [{ read, html }];
  }),
);
const currentFrame = computed(() => frames.value.find((f) => f.read === currentView.value));

// A finished sample without this report has no such read (single-end data, read list unknown)
const sampleDone = computed(() => {
  const id = sampleId.value;
  return id !== undefined && resultMap.value?.[id]?.progress === PROGRESS_DONE;
});

// The desktop opens no external website from a block, and following one inside the frame leaves
// it blank. The HTML report is shown through `srcdoc`, which shares the block's origin, so its
// clicks are handled here before the frame navigates: jumps within the report scroll to their
// section, and an external link is offered for copying instead of being followed.
const blockedLink = ref<string>();
const copied = ref(false);
watch([sampleId, currentView], () => (blockedLink.value = undefined));

function onReportLoad(event: Event) {
  const doc = (event.target as HTMLIFrameElement).contentDocument;
  if (!doc) return;

  doc.addEventListener("click", (click) => {
    // The frame is another realm, so `instanceof Element` does not hold for its nodes
    const link = (click.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link) return;
    click.preventDefault();

    // In a `srcdoc` document "#id" resolves against the block's own URL, so it is followed by hand
    const href = link.getAttribute("href") ?? "";
    if (href.startsWith("#")) {
      const id = decodeURIComponent(href.slice(1));
      (doc.getElementById(id) ?? doc.getElementsByName(id)[0])?.scrollIntoView({ block: "start" });
      return;
    }

    blockedLink.value = link.href;
    copied.value = false;
  });
}

async function copyLink() {
  if (!blockedLink.value) return;
  await navigator.clipboard.writeText(blockedLink.value);
  copied.value = true;
}

// A report shown from its folder is a frame of another origin, so its clicks cannot be handled.
// Jumps within it fire no `load`; any load after its own one is a navigation away, answered by
// loading the report into the frame again.
let folderFrameLoads: Partial<Record<Read, number>> = {};
watch(sampleId, () => (folderFrameLoads = {}));
function onFolderReportLoad(event: Event, read: Read, url: string) {
  folderFrameLoads[read] = (folderFrameLoads[read] ?? 0) + 1;
  if (folderFrameLoads[read] > 1) {
    folderFrameLoads[read] = 0;
    (event.target as HTMLIFrameElement).src = url;
  }
}
</script>

<template>
  <div :class="$style.panel">
    <!-- Buttons displayed on top of sliding window -->
    <!-- Buttons stay above the report: only the report itself scrolls -->
    <PlBtnGroup v-if="options.length > 1" v-model="currentView" :options="options" />

    <!-- FastQC pins its header, footer and Summary list to the frame's edges, so a short frame
         hides the end of the Summary list behind the footer. The frame fills this container but
         keeps a minimum height; below it, this container scrolls the whole report, leaving its
         HTML untouched. -->
    <div
      v-if="frames.length > 0"
      v-show="currentFrame"
      :class="[$style.reportScroll, 'pl-scrollable-y']"
    >
      <template v-for="frame in frames" :key="frame.read">
        <iframe
          v-if="'html' in frame"
          v-show="frame.read === currentView"
          :class="$style.report"
          :title="`FastQC ${frame.read} report`"
          :srcdoc="frame.html"
          @load="onReportLoad"
        />
        <iframe
          v-else
          v-show="frame.read === currentView"
          :class="$style.report"
          :title="`FastQC ${frame.read} report`"
          :src="frame.folder"
          @load="onFolderReportLoad($event, frame.read, frame.folder)"
        />
      </template>
    </div>
    <!-- In place of the current read's report while it is not there -->
    <template v-if="!currentFrame">
      <div v-if="report !== undefined" :class="$style.message">Loading the report…</div>
      <div v-else-if="sampleDone" :class="$style.message">
        This sample has no {{ currentView }} reads
      </div>
      <!-- The report exists once FastQC finished on the read -->
      <div v-else :class="$style.message">
        The {{ currentView }} report will appear here once it is ready
      </div>
    </template>
  </div>

  <!-- Above everything, slide panels included, in the lower right corner of the app -->
  <Teleport to="body">
    <!-- Clicks stop here: the report panel closes on any click that reaches the page outside it -->
    <PlNotificationAlert
      v-if="blockedLink"
      width="360px"
      closable
      :class="$style.notice"
      @click.stop
      @update:model-value="blockedLink = undefined"
    >
      External websites can't be opened from Platforma. Copy the link to open it in your browser:
      <div :class="$style.link">{{ blockedLink }}</div>
      <template #actions>
        <PlBtnSecondary size="small" :icon="copied ? 'checkmark' : 'copy'" @click="copyLink">
          {{ copied ? "Copied" : "Copy link" }}
        </PlBtnSecondary>
      </template>
    </PlNotificationAlert>
  </Teleport>
</template>

<style module>
.panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Scrolling and its scrollbar come from the UI kit's `pl-scrollable-y` */
.reportScroll {
  flex: 1;
  min-height: 0;
}

/* Fills the space between the buttons and the bottom of the panel, but no less than 600px */
.report {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 600px;
  border: none;
}

/* Standard notification look; only its place on screen is set here */
.notice {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: var(--z-dialog);
}

.link {
  margin-top: 8px;
  font-family: monospace;
  word-break: break-all;
  user-select: text;
}

.message {
  color: var(--txt-03);
}
</style>
