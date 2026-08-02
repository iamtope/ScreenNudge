type Pedometer = typeof import('expo-sensors').Pedometer;

let cached: Pedometer | null | undefined;

function getPedometer(): Pedometer | null {
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = require('expo-sensors').Pedometer as Pedometer;
  } catch {
    cached = null;
  }
  return cached;
}

export async function isPedometerAvailable(): Promise<boolean> {
  const ped = getPedometer();
  if (!ped) {
    return false;
  }
  try {
    return await ped.isAvailableAsync();
  } catch {
    return false;
  }
}

export type StepSubscription = { remove: () => void };

export function watchSteps(onSteps: (steps: number) => void): StepSubscription | null {
  const ped = getPedometer();
  if (!ped) {
    return null;
  }
  try {
    const sub = ped.watchStepCount((result) => onSteps(result.steps));
    return sub;
  } catch {
    return null;
  }
}
