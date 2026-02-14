export default {
    props: ['isAnimating', 'slots', 'animationStatusText'],
    template: `
        <div v-if="isAnimating" class="slot-overlay">
            <h2 class="neon-title" style="margin-bottom:30px; border:none; text-align:center;">LOTTERY SEQUENCE</h2>

            <div class="slot-container">
                <div v-for="(slot, i) in slots" :key="i"
                    :class="['slot-machine', {locked: !slot.isSpinning, spinning: slot.isSpinning}]">
                    <div class="slot-reel">
                        <img :src="slot.currentImage" class="slot-img">
                    </div>
                </div>
            </div>

            <div class="slot-status">{{ animationStatusText }}</div>
        </div>
    `
};
