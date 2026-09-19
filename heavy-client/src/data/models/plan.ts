export interface PlanTask {
  id: string;
  task: string; // the real treatment task
  window: string; // for example "7:00 to 9:00 am"
  childWording: string; // quest title the child sees
  whyText: string; // "Why am I doing this?" in the child's wording
  reward: number; // fixed by the task, 0 to 100
}

export interface Plan {
  version: number;
  updatedAt: Date;
  note: string; // shown to the parent as coming from the care team
  tasks: PlanTask[];
}
