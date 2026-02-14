export default {
    props: ['tab'],
    emits: ['update:tab'],
    template: `
        <nav class="nav-bar">
            <div class="nav-item" :class="{active: tab === 'home'}" @click="$emit('update:tab', 'home')">
                <svg viewBox="0 0 24 24" class="nav-icon">
                    <path d="M12 2L4 10V21H20V10L12 2Z" fill="none" stroke="currentColor" stroke-width="2" />
                </svg>
                <span>設定</span>
            </div>
            <div class="nav-item" :class="{active: tab === 'data'}" @click="$emit('update:tab', 'data')">
                <svg viewBox="0 0 24 24" class="nav-icon">
                    <path d="M4 6H20M4 12H20M4 18H20" fill="none" stroke="currentColor" stroke-width="2" />
                </svg>
                <span>DB</span>
            </div>
            <div class="nav-item" :class="{active: tab === 'history'}" @click="$emit('update:tab', 'history')">
                <svg viewBox="0 0 24 24" class="nav-icon">
                    <path d="M9 11L12 14L22 4M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16"
                        fill="none" stroke="currentColor" stroke-width="2" />
                </svg>
                <span>達成</span>
            </div>
            <div class="nav-item" :class="{active: tab === 'target'}" @click="$emit('update:tab', 'target')">
                <svg viewBox="0 0 24 24" class="nav-icon">
                    <path d="M12 2L15 8L22 9L17 14L18 21L12 17L6 21L7 14L2 9L9 8L12 2Z" fill="none"
                        stroke="currentColor" stroke-width="2" />
                </svg>
                <span>抽選</span>
            </div>
            <div class="nav-item" :class="{active: tab === 'chart'}" @click="$emit('update:tab', 'chart')">
                <svg viewBox="0 0 24 24" class="nav-icon">
                    <path d="M3 3V21H21M7 14L11 10L15 14L19 6" fill="none" stroke="currentColor" stroke-width="2" />
                </svg>
                <span>定数表</span>
            </div>
            <div class="nav-item" :class="{active: tab === 'rating'}" @click="$emit('update:tab', 'rating')">
                <svg viewBox="0 0 24 24" class="nav-icon">
                    <path d="M12 1L14.5 9H22L16 14L18.5 22L12 17.5L5.5 22L8 14L2 9H9.5L12 1Z" fill="none"
                        stroke="currentColor" stroke-width="2" />
                </svg>
                <span>レート</span>
            </div>
        </nav>
    `
};
