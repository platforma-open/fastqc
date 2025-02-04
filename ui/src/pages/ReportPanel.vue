<script setup lang="ts">
import { PlBtnGroup } from '@platforma-sdk/ui-vue';
import { computed, ref } from 'vue';
import { useApp } from "../app";

const app = useApp();
const sampleId = defineModel<string | undefined>()

// Button labels displayed on top of sliding window to define tabs by PlBtnGroup
const options = [{
    label: 'R1',
    value: 'R1'
},
{
    label: 'R2',
    value: 'R2'
}]

// Reference to tab opened by default
const currentView = ref('R1')

const reportSrcR1 = computed(() => {
    const id = sampleId.value
    if (id === undefined) {
        console.warn("SampleId is undefined")
        return undefined
    }
    return app.model.outputs.FastQCzipR1?.data.find((it) => {
        return it.key.includes(id)
    })?.value

});

// TODO change name
const reportSrcR2 = computed(() => {
    const id = sampleId.value
    if (id === undefined) {
        console.warn("SampleId is undefined")
        return undefined
    }
    return app.model.outputs.FastQCzipR2?.data.find((it) => {
        return it.key.includes(id)
    })?.value

});

</script>

<template>
    <PlBtnGroup v-model="currentView" :options="options" />
    <template v-if="currentView === 'R1'">
        <iframe v-if="reportSrcR1" title="Frame" width="1100" height="800" 
                :src="reportSrcR1+'/input_R1_fastqc/fastqc_report.html'" />
        <div v-else>
            Read 1 not found
        </div>
    </template>

    <template v-if="currentView === 'R2'">
        <iframe v-if="reportSrcR2" title="Frame" width="1100" height="800" 
                :src="reportSrcR2+'/input_R2_fastqc/fastqc_report.html'" />
        <div v-else>
            Read 2 not found
        </div>
    </template>

</template>

