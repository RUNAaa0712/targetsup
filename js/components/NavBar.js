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
                <span>目標</span>
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
            <div class="nav-item" :class="{active: tab === 'tools'}" @click="$emit('update:tab', 'tools')">
                <svg viewBox="0 0 24 24" class="nav-icon">
                    <path d="M22.7 14.3L21.7 15.3L19.3 12.9L20.3 11.9C20.5 11.7 20.8 11.7 21 11.9L22.7 13.6C22.9 13.8 22.9 14.1 22.7 14.3M13 19.9V22H15.1L21.2 15.9L19.1 13.8L13 19.9M7 6C5.3 6 4 7.3 4 9C4 10.1 4.6 11.1 5.5 11.6L4.3 12.8C4.1 13 4.1 13.3 4.3 13.5L5.7 14.9C5.9 15.1 6.2 15.1 6.4 14.9L7.6 13.7C8.1 14.6 9.1 15.2 10.2 15.2C11.9 15.2 13.2 13.9 13.2 12.2C13.2 10.5 11.9 9.2 10.2 9.2C9.5 9.2 8.8 9.4 8.2 9.8L6.8 8.4C7.5 7.5 8.9 7 10.2 7C11.3 7 12.3 7.5 12.9 8.2L14.3 6.8C13.4 5.9 12.1 5.4 10.7 5.4C9.5 5.4 8.5 5.8 7.7 6.4L6.4 5.1C6.2 4.9 5.9 4.9 5.7 5.1L4.3 6.5C4.1 6.7 4.1 7 4.3 7.2L5.5 8.4C4.6 9 4 10 4 11.2C4 12.9 5.3 14.2 7 14.2C8.1 14.2 9.1 13.6 9.6 12.7L10.8 13.9C11 14.1 11.3 14.1 11.5 13.9L12.9 12.5C13.1 12.3 13.1 12 12.9 11.8L11.7 10.6C12.2 9.7 12.2 8.5 11.7 7.6L13.1 6.2C13.3 6 13.3 5.7 13.1 5.5L11.7 4.1C11.5 3.9 11.2 3.9 11 4.1L9.8 5.3C9 4.8 8 4.6 7 4.6V6Z" fill="currentColor"/>
                </svg>
                <span>ツール</span>
            </div>
        </nav>
    `
};
