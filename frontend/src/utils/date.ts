/**
 * Formatea una fecha o timestamp ISO en la zona horaria de Venezuela (America/Caracas - UTC-4)
 */
export function formatCaracasTime(timeInput: string): string {
  try {
    const date = new Date(timeInput);
    if (isNaN(date.getTime())) return timeInput;
    return date.toLocaleTimeString("es-VE", {
      timeZone: "America/Caracas",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timeInput;
  }
}
