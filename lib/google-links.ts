// Google products via deep links: the human always presses the final Send / Save.
export const gmailCompose = (to: string, subject: string, body: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const gcalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function calendarLink(title: string, when?: string, details = "", location = "") {
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, details, location });
  const t = when ? Date.parse(when) : NaN;
  if (!Number.isNaN(t)) p.set("dates", `${gcalStamp(new Date(t))}/${gcalStamp(new Date(t + 30 * 60e3))}`);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export const mapsLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
