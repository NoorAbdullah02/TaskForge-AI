import * as scheduler from 'scheduler';

const now = scheduler.unstable_now ?? (() => Date.now());
const unstable_scheduleCallback = scheduler.unstable_scheduleCallback;
const unstable_IdlePriority = scheduler.unstable_IdlePriority;

const schedulerShim = {
    ...scheduler,
    default: scheduler,
    now,
    unstable_now: now,
    unstable_scheduleCallback,
    unstable_IdlePriority,
};

export { now, unstable_scheduleCallback, unstable_IdlePriority };
export default schedulerShim;
