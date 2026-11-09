import type { PigProgress } from "./milestones";

export type MascotRepository = {
  get(userId: string): Promise<PigProgress | null>;
  save(userId: string, progress: PigProgress): Promise<void>;
};
