export default {
    props: ['isSyncing', 'syncStatus', 'syncProgress', 'syncLogs'],
    template: `
        <div v-if="isSyncing" class="sync-overlay">
            <div class="sync-panel">
                <div style="font-weight:bold; color:var(--cyan); margin-bottom:10px;">SYSTEM SYNCING...</div>
                <div style="font-size:12px;">{{ syncStatus }}</div>
                <div class="progress-container">
                    <div class="progress-fill" :style="{width: syncProgress + '%'}"></div>
                </div>
                <div class="sync-log">
                    <div v-for="(log, i) in syncLogs" :key="i">> {{ log }}</div>
                </div>
            </div>
        </div>
    `
};
