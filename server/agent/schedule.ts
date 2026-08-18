export function isValidSixFieldCron(value: string): boolean {
  const fields = value.trim().split(/\s+/).filter(Boolean);
  return fields.length === 6 && fields.every((field) => /^[\d*/?,\-]+$/.test(field));
}

export function buildScheduledTaskInput(input: {
  scheduleId: number;
  userId: number;
  goal: string;
  model: string;
  executionMode: "confirm" | "auto";
  repository: string;
}) {
  return { ...input };
}
