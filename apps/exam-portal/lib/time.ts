export function durationLabel(minutes: number) {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  return [days && `${days} day${days === 1 ? "" : "s"}`, hours && `${hours} hour${hours === 1 ? "" : "s"}`, rest && `${rest} minute${rest === 1 ? "" : "s"}`].filter(Boolean).join(" ") || "0 minutes";
}

export function deadlineLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value)) + " GMT";
}
