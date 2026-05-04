import { Task } from "./types";

export class CalendarService {
  private token: string;
  private baseUrl = "https://www.googleapis.com/calendar/v3";

  constructor(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Calendar API Error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  /**
   * Upserts a task into Google Calendar as an all-day event.
   * If the task has no date and no urgency, it removes the event if it existed.
   * Returns the event ID, or null if no event was created/kept.
   */
  async upsertTaskEvent(task: Task, clientName: string): Promise<string | null> {
    const titlePrefix = task.status === "done" ? "✅ " : 
                        task.urgency === "urgent" ? "🔴 " : 
                        task.urgency === "today" ? "🟡 " : "";
    
    const summary = `${titlePrefix}${task.name} - ${clientName}`;

    // Determine the date. If it has dueDate, use it. If not, but it's urgent/today, use today.
    let date = task.dueDate;
    if (!date && (task.urgency === "urgent" || task.urgency === "today")) {
      const offset = new Date().getTimezoneOffset() * 60000;
      date = new Date(Date.now() - offset).toISOString().slice(0, 10);
    }

    if (!date) {
      // If it doesn't have a date anymore, delete the event if it exists
      if (task.eventId) {
        await this.deleteEvent(task.eventId);
      }
      return null;
    }

    // Google Calendar all-day events require end date to be the day after
    const startDate = new Date(date + "T00:00:00");
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const eventBody = {
      summary,
      description: `Projeto: ${clientName}\nStatus: ${task.status === "done" ? "Concluído" : "Pendente"}\n\nGerado via CalmCanvas`,
      start: { date: startDate.toISOString().slice(0, 10) },
      end: { date: endDate.toISOString().slice(0, 10) },
      // Color coding: 11 = tomato (red), 5 = banana (yellow), 9 = blueberry (blue), 8 = graphite
      colorId: task.status === "done" ? "8" : task.urgency === "urgent" ? "11" : task.urgency === "today" ? "5" : "9"
    };

    if (task.eventId) {
      try {
        const res = await this.request(`/calendars/primary/events/${task.eventId}`, {
          method: "PUT",
          body: JSON.stringify(eventBody)
        });
        return res.id;
      } catch (e) {
        console.warn("Update failed, attempting to recreate event...", e);
        // Fallback to create if not found
      }
    }

    const res = await this.request(`/calendars/primary/events`, {
      method: "POST",
      body: JSON.stringify(eventBody)
    });
    return res.id;
  }

  async deleteEvent(eventId: string) {
    try {
      await this.request(`/calendars/primary/events/${eventId}`, {
        method: "DELETE"
      });
    } catch (e) {
      console.warn("Failed to delete event", e);
    }
  }
}
