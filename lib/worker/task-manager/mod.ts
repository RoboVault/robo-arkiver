import { Arkive } from "../../types.ts";
import { Task } from "../task/mod.ts";

export class TaskManager extends EventTarget {
  private tasks: { arkive: Arkive; task: Task }[] = [];

  constructor() {
    super();
    this.addTask = this.addTask.bind(this);
    this.removeTask = this.removeTask.bind(this);
  }

  public async addTask(arkive: Arkive) {
    const manifestPath = `../../packages/${arkive.owner_id}/${arkive.name}/${arkive.version_number}/manifest.config.ts`;
    const { manifest } = await import(manifestPath);

    const task = new Task(manifest, arkive);
    this.tasks.push({ task, arkive });

    task.addEventListener("synced", () => {
      this.removeTask(arkive);
      this.dispatchEvent(new CustomEvent("synced", { detail: { arkive } }));
    });

    task.run();
  }

  public removeTask(arkive: Arkive) {
    const task = this.tasks.find((task) => task.arkive.id === arkive.id);
    if (task) {
      task.task.stop();
      this.tasks.splice(this.tasks.indexOf(task), 1);
    }
  }
}
