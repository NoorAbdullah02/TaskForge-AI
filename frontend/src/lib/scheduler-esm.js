import * as realScheduler from '../../node_modules/scheduler/index.js';

const fallbackScheduler = {
    unstable_now: () => Date.now(),
    unstable_scheduleCallback: (callback) => {
        const id = setTimeout(callback, 0);
        return () => clearTimeout(id);
    },
    unstable_IdlePriority: 5,
};

const resolvedScheduler = globalThis.__TASKFORGE_SCHEDULER__ ?? realScheduler ?? fallbackScheduler;

const now = resolvedScheduler.unstable_now ?? fallbackScheduler.unstable_now;
const unstable_scheduleCallback = resolvedScheduler.unstable_scheduleCallback ?? fallbackScheduler.unstable_scheduleCallback;
const unstable_IdlePriority = resolvedScheduler.unstable_IdlePriority ?? fallbackScheduler.unstable_IdlePriority;

// Export all scheduler APIs so react-dom is fully happy
export const unstable_cancelCallback = resolvedScheduler.unstable_cancelCallback;
export const unstable_shouldYield = resolvedScheduler.unstable_shouldYield;
export const unstable_requestPaint = resolvedScheduler.unstable_requestPaint;
export const unstable_getCurrentPriorityLevel = resolvedScheduler.unstable_getCurrentPriorityLevel;
export const unstable_ImmediatePriority = resolvedScheduler.unstable_ImmediatePriority;
export const unstable_UserBlockingPriority = resolvedScheduler.unstable_UserBlockingPriority;
export const unstable_NormalPriority = resolvedScheduler.unstable_NormalPriority;
export const unstable_LowPriority = resolvedScheduler.unstable_LowPriority;
export const unstable_Profiling = resolvedScheduler.unstable_Profiling;
export const log = resolvedScheduler.log;
export const unstable_setDisableYieldValue = resolvedScheduler.unstable_setDisableYieldValue;

export { now, unstable_scheduleCallback, unstable_IdlePriority };
export const unstable_now = now;

export default {
    ...resolvedScheduler,
    unstable_now: now,
    unstable_scheduleCallback,
    unstable_IdlePriority,
    now,
};
