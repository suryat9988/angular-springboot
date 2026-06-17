import { Injectable, inject, signal } from '@angular/core';

import { ChatMessage } from '../../models/chat-message.model';
import { DatePlanFormPatch } from '../../models/date-plan-form-patch.model';
import { environment } from '../../../environments/environment';
import { PartnerRelationshipService } from './partner-relationship';

const PLANNING_SYSTEM_PROMPT = `You are BowerBird, a date-planning assistant inside BowerBox.
Help the user plan a date conversationally. Ask short follow-up questions when details are missing.
Keep replies friendly and concise (2-3 sentences).

After every reply, append exactly one line in this format (no markdown fences):
PLAN_JSON:{"title":"...","description":"...","dateTime":"YYYY-MM-DDTHH:mm","location":"...","relationshipType":"dating|engaged|married","partnerName":"...","budget":0,"notes":"..."}

Rules for PLAN_JSON:
- Always include every field you can infer from the full conversation so far.
- relationshipType: dating, engaged, or married based on how the user describes their partner.
- If married, omit budget and focus on occasion details; married users redeem rewards instead of bill discounts.
- title: short plan name (e.g. "Sunset Dinner in Malibu").
- description: 1-2 sentence summary of the date plan.
- dateTime: local datetime YYYY-MM-DDTHH:mm (24h). Pick a reasonable default time if only a day is given.
- location: city name or US ZIP code (5 digits).
- partnerName: partner or spouse first name if mentioned.
- budget: number only for dating/engaged, or null for married/unknown.
- notes: optional extra details.
- Merge and refine across the whole chat; never drop fields you already know.`;

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11
};

const ACTIVITY_TITLES: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /\b(anniversary)\b/i, title: 'Anniversary Date' },
  { pattern: /\b(first date)\b/i, title: 'First Date' },
  { pattern: /\b(sunset)\b/i, title: 'Sunset Date' },
  { pattern: /\b(dinner|restaurant)\b/i, title: 'Dinner Date' },
  { pattern: /\b(brunch|breakfast)\b/i, title: 'Brunch Date' },
  { pattern: /\b(coffee|cafe)\b/i, title: 'Coffee Date' },
  { pattern: /\b(picnic)\b/i, title: 'Picnic Date' },
  { pattern: /\b(movie|cinema)\b/i, title: 'Movie Night' },
  { pattern: /\b(hike|hiking|trail)\b/i, title: 'Hiking Date' },
  { pattern: /\b(beach)\b/i, title: 'Beach Date' },
  { pattern: /\b(concert|live music)\b/i, title: 'Concert Date' },
  { pattern: /\b(walk|stroll)\b/i, title: 'Evening Walk' },
  { pattern: /\b(museum|gallery)\b/i, title: 'Museum Date' },
  { pattern: /\b(wine|winery)\b/i, title: 'Wine Tasting' }
];

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly partnerRelationshipService = inject(PartnerRelationshipService);
  private readonly messagesSignal = signal<ChatMessage[]>([]);
  private readonly busySignal = signal(false);
  private readonly formPatchSignal = signal<DatePlanFormPatch | null>(null);

  readonly messages = this.messagesSignal.asReadonly();
  readonly isBusy = this.busySignal.asReadonly();
  readonly lastFormPatch = this.formPatchSignal.asReadonly();

  startPlanningSession(): void {
    this.messagesSignal.set([
      this.createMessage(
        'assistant',
        'Tell me about the date you want to plan — your relationship (dating, engaged, or married), vibe, place, time, partner name, and budget if dating. I will fill the form as we chat, then you can save.'
      )
    ]);
    this.formPatchSignal.set(null);
  }

  applyWelcomeJourneyPatch(patch: DatePlanFormPatch): void {
    this.messagesSignal.set([
      this.createMessage(
        'assistant',
        `Great picks from your welcome journey! I pre-filled "${patch.title ?? 'your date'}" — tweak anything on the form or keep chatting with me.`
      )
    ]);
    this.formPatchSignal.set(patch);
  }

  async sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || this.busySignal()) {
      return;
    }

    this.messagesSignal.update((messages) => [...messages, this.createMessage('user', trimmed)]);
    this.busySignal.set(true);

    try {
      const rawReply = await this.generateReply(trimmed);
      this.appendAssistantReply(rawReply);
    } catch (error) {
      console.error('AI chat failed, using local planner:', error);
      this.appendAssistantReply(this.localPlanningReply());
    } finally {
      this.busySignal.set(false);
    }
  }

  private appendAssistantReply(rawReply: string): void {
    const { displayText, patch } = this.parseReply(rawReply);

    if (Object.keys(patch).length > 0) {
      this.formPatchSignal.update((current) => this.mergePatches(current, patch));
    }

    this.messagesSignal.update((messages) => [
      ...messages,
      this.createMessage('assistant', displayText)
    ]);
  }

  private mergePatches(
    current: DatePlanFormPatch | null,
    patch: DatePlanFormPatch
  ): DatePlanFormPatch {
    return {
      ...(current ?? {}),
      ...patch,
      notes: this.mergeNotes(current?.notes, patch.notes)
    };
  }

  private mergeNotes(current?: string, incoming?: string): string | undefined {
    if (!incoming?.trim()) {
      return current;
    }

    const next = incoming.trim();
    if (!current?.trim()) {
      return next;
    }

    if (current.includes(next)) {
      return current;
    }

    return `${current}\n${next}`;
  }

  private async generateReply(userMessage: string): Promise<string> {
    const apiKey = environment.geminiApiKey;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
      return this.localPlanningReply();
    }

    const history = this.messagesSignal().map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.text }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: PLANNING_SYSTEM_PROMPT }] },
          contents: history
        })
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      throw new Error('Empty Gemini response');
    }

    return text;
  }

  private parseReply(rawReply: string): { displayText: string; patch: DatePlanFormPatch } {
    const jsonMatch = rawReply.match(/PLAN_JSON:\s*(\{[\s\S]*\})\s*$/);
    const localPatch = this.extractLocalPatch();

    if (!jsonMatch) {
      return {
        displayText: rawReply.trim(),
        patch: localPatch
      };
    }

    const displayText = rawReply.replace(/PLAN_JSON:\s*\{[\s\S]*\}\s*$/, '').trim();
    try {
      const parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
      const aiPatch = this.normalizePatch(parsed);
      const patch = this.mergePatches(localPatch, aiPatch);

      return {
        displayText: displayText || 'I updated the form with what we discussed.',
        patch
      };
    } catch {
      return {
        displayText: displayText || rawReply.trim(),
        patch: localPatch
      };
    }
  }

  private localPlanningReply(): string {
    const patch = this.extractLocalPatch();
    const patchJson = JSON.stringify(patch);
    const conversation = this.getConversationText().toLowerCase();

    if (conversation.includes('first date')) {
      return `A relaxed first date works well — coffee or a walk somewhere you can talk. I filled in your form with the details so far.\nPLAN_JSON:${patchJson}`;
    }

    if (conversation.includes('anniversary')) {
      return `Lovely — make it personal with a favorite place or a small surprise. I updated every field I could from our chat.\nPLAN_JSON:${patchJson}`;
    }

    const filled = [
      patch.title ? 'title' : '',
      patch.dateTime ? 'date & time' : '',
      patch.location ? 'location' : '',
      patch.partnerName ? 'partner' : '',
      patch.budget != null ? 'budget' : ''
    ].filter(Boolean);

    const filledSummary =
      filled.length > 0
        ? `I updated ${filled.join(', ')} on your form.`
        : 'I added what I could to your form.';

    return `${filledSummary} Tell me anything else to refine the plan.\nPLAN_JSON:${patchJson}`;
  }

  private getConversationText(): string {
    return this.messagesSignal()
      .filter((message) => message.role === 'user')
      .map((message) => message.text)
      .join('\n');
  }

  private extractLocalPatch(): DatePlanFormPatch {
    const text = this.getConversationText();
    const input = text.toLowerCase();
    const patch: DatePlanFormPatch = {};

    const detectedRelationship = this.partnerRelationshipService.applyDetectedRelationship(text);
    patch.relationshipType = detectedRelationship ?? this.partnerRelationshipService.relationship();

    patch.partnerName = this.extractPartnerName(text);
    patch.location = this.extractLocation(text);
    if (patch.relationshipType !== 'married') {
      patch.budget = this.extractBudget(text);
    }
    patch.dateTime = this.extractDateTime(text, input);
    patch.title = this.extractTitle(text, input, patch);

    const summary = this.buildDescription(text, patch);
    patch.description = summary.length > 500 ? `${summary.slice(0, 497)}...` : summary;
    patch.notes = 'Draft created with BowerBird AI chat.';

    return patch;
  }

  private extractPartnerName(text: string): string | undefined {
    const patterns = [
      /\bmy\s+(?:wife|husband|spouse)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
      /\bwith\s+(?:my\s+)?(?:wife|husband|spouse|partner|girlfriend|boyfriend|date|crush)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
      /\bwith\s+(?:my\s+)?(?:partner|girlfriend|boyfriend|date|crush)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
      /\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
      /\bpartner(?:'s)?\s+name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
      /\bdate\s+with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
      /\bwith\s+([A-Z][a-z]+)\b/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      const name = match?.[1]?.trim();
      if (name && !this.isCommonWord(name)) {
        return name.slice(0, 80);
      }
    }

    return undefined;
  }

  private extractLocation(text: string): string | undefined {
    const zipMatch = text.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (zipMatch?.[1]) {
      return zipMatch[1];
    }

    const patterns = [
      /\b(?:at|in|near|on|to)\s+the\s+([^,.!?\n]{3,80})/i,
      /\b(?:at|in|near|on|to)\s+([^,.!?\n]{3,80})/i,
      /\blocation\s*:\s*([^,.!?\n]{3,80})/i,
      /\bvenue\s*:\s*([^,.!?\n]{3,80})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match?.[1]) {
        continue;
      }

      const cleaned = this.cleanLocation(match[1]);
      if (cleaned.length >= 3) {
        return cleaned.slice(0, 120);
      }
    }

    const knownPlaces = text.match(
      /\b(Malibu|Santa Monica|Los Angeles|San Francisco|New York|Chicago|Miami|Austin|Seattle|Portland|Napa|Venice Beach|Beverly Hills|Pacific Palisades)\b/i
    );
    if (knownPlaces?.[1]) {
      return knownPlaces[1];
    }

    return undefined;
  }

  private cleanLocation(raw: string): string {
    let value = raw.trim();

    value = value.replace(
      /\s+(?:this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|weekend)\b.*$/i,
      ''
    );
    value = value.replace(/\s+with\s+[A-Z][a-z]+.*$/i, '');
    value = value.replace(/\s+(?:budget|under|around|for)\b.*$/i, '');
    value = value.replace(/\s+/g, ' ').trim();

    return value;
  }

  private extractBudget(text: string): number | undefined {
    const patterns = [
      /\bbudget\s*(?:of|is|around|about)?\s*\$?\s*(\d{1,6}(?:\.\d{1,2})?)\b/i,
      /\b(?:spend|spending|under|around|about|max|maximum)\s*\$?\s*(\d{1,6}(?:\.\d{1,2})?)\b/i,
      /\$\s*(\d{1,6}(?:\.\d{1,2})?)\b/,
      /\b(\d{1,6}(?:\.\d{1,2})?)\s*(?:dollars|usd|bucks)\b/i
    ];

    let best: number | undefined;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match?.[1]) {
        continue;
      }

      const amount = Math.round(Number(match[1]));
      if (!Number.isNaN(amount) && amount > 0) {
        best = amount;
      }
    }

    return best;
  }

  private extractDateTime(text: string, input: string): string | undefined {
    const now = new Date();
    let target: Date | undefined;
    let hour = 19;
    let minute = 0;

    const timeMatch = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (timeMatch) {
      hour = Number(timeMatch[1]);
      minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === 'pm' && hour < 12) {
        hour += 12;
      }
      if (meridiem === 'am' && hour === 12) {
        hour = 0;
      }
      if (!meridiem && hour <= 7) {
        hour += 12;
      }
    } else if (/\b(morning|brunch|breakfast)\b/i.test(input)) {
      hour = 10;
      minute = 30;
    } else if (/\b(lunch|afternoon)\b/i.test(input)) {
      hour = 13;
      minute = 0;
    } else if (/\b(evening|night|dinner|sunset)\b/i.test(input)) {
      hour = 19;
      minute = 0;
    }

    if (/\btonight\b/i.test(input)) {
      target = new Date(now);
    } else if (/\btomorrow\b/i.test(input)) {
      target = new Date(now);
      target.setDate(target.getDate() + 1);
    } else {
      for (const [name, day] of Object.entries(WEEKDAYS)) {
        const weekdayPattern = new RegExp(`\\b(?:this\\s+|next\\s+)?${name}\\b`, 'i');
        if (weekdayPattern.test(input)) {
          target = this.nextWeekday(day, /\bnext\s+/i.test(input));
          break;
        }
      }
    }

    if (!target) {
      const monthDay = text.match(
        /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
      );
      if (monthDay) {
        const month = MONTHS[monthDay[1].toLowerCase()];
        const day = Number(monthDay[2]);
        target = new Date(now.getFullYear(), month, day);
        if (target < now) {
          target.setFullYear(target.getFullYear() + 1);
        }
      }
    }

    if (!target) {
      const slashDate = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
      if (slashDate) {
        const month = Number(slashDate[1]) - 1;
        const day = Number(slashDate[2]);
        const year = slashDate[3] ? Number(slashDate[3]) : now.getFullYear();
        const fullYear = year < 100 ? 2000 + year : year;
        target = new Date(fullYear, month, day);
      }
    }

    if (!target) {
      return undefined;
    }

    target.setHours(hour, minute, 0, 0);
    return this.toDateTimeLocal(target);
  }

  private extractTitle(text: string, input: string, patch: DatePlanFormPatch): string | undefined {
    for (const activity of ACTIVITY_TITLES) {
      if (activity.pattern.test(input)) {
        if (patch.location) {
          return `${activity.title} — ${patch.location}`.slice(0, 80);
        }
        return activity.title;
      }
    }

    if (patch.location) {
      return `Date in ${patch.location}`.slice(0, 80);
    }

    const firstSentence = text.split(/[.!?\n]/)[0]?.trim();
    if (firstSentence && firstSentence.length <= 80) {
      return firstSentence;
    }

    return firstSentence ? `${firstSentence.slice(0, 77)}...` : undefined;
  }

  private buildDescription(text: string, patch: DatePlanFormPatch): string {
    const parts: string[] = [];

    if (patch.title) {
      parts.push(patch.title);
    }

    if (patch.partnerName) {
      parts.push(`A special date with ${patch.partnerName}.`);
    }

    if (patch.location) {
      parts.push(`Planned for ${patch.location}.`);
    }

    if (patch.dateTime) {
      parts.push(`Scheduled for ${this.formatDateTimeLabel(patch.dateTime)}.`);
    }

    if (patch.budget != null) {
      parts.push(`Estimated budget: $${patch.budget}.`);
    }

    const userSnippet = text.trim();
    if (userSnippet && !parts.some((part) => part.includes(userSnippet.slice(0, 40)))) {
      parts.push(userSnippet);
    }

    return parts.join(' ').trim() || text.trim();
  }

  private formatDateTimeLabel(dateTime: string): string {
    const date = new Date(dateTime);
    if (Number.isNaN(date.getTime())) {
      return dateTime;
    }

    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private normalizePatch(raw: Record<string, unknown>): DatePlanFormPatch {
    const patch: DatePlanFormPatch = {};

    const relationship = raw['relationshipType'];
    if (relationship === 'dating' || relationship === 'engaged' || relationship === 'married') {
      patch.relationshipType = relationship;
      this.partnerRelationshipService.setRelationship(relationship);
    }

    if (typeof raw['title'] === 'string' && raw['title'].trim()) {
      patch.title = raw['title'].trim().slice(0, 80);
    }
    if (typeof raw['description'] === 'string' && raw['description'].trim()) {
      patch.description = raw['description'].trim().slice(0, 500);
    }

    const dateTime = this.coerceDateTime(raw['dateTime']);
    if (dateTime) {
      patch.dateTime = dateTime;
    }

    if (typeof raw['location'] === 'string' && raw['location'].trim()) {
      patch.location = raw['location'].trim().slice(0, 120);
    }
    if (typeof raw['partnerName'] === 'string' && raw['partnerName'].trim()) {
      patch.partnerName = raw['partnerName'].trim().slice(0, 80);
    }

    const budget = this.coerceBudget(raw['budget']);
    if (budget != null && patch.relationshipType !== 'married') {
      patch.budget = budget;
    }

    if (typeof raw['notes'] === 'string' && raw['notes'].trim()) {
      patch.notes = raw['notes'].trim().slice(0, 500);
    }

    return patch;
  }

  private coerceBudget(value: unknown): number | null | undefined {
    if (value == null || value === '') {
      return undefined;
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
      return Math.max(0, Math.round(value));
    }

    if (typeof value === 'string') {
      const match = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
      if (match) {
        return Math.max(0, Math.round(Number(match[1])));
      }
    }

    return undefined;
  }

  private coerceDateTime(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    const trimmed = value.trim();
    const localMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
    if (localMatch) {
      return `${localMatch[1]}T${localMatch[2]}:${localMatch[3]}`;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return this.toDateTimeLocal(parsed);
    }

    return undefined;
  }

  private isCommonWord(value: string): boolean {
    const blocked = new Set([
      'my',
      'the',
      'a',
      'an',
      'her',
      'him',
      'them',
      'you',
      'me',
      'us',
      'dinner',
      'lunch',
      'coffee',
      'sunset',
      'malibu',
      'saturday',
      'friday',
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday'
    ]);

    return blocked.has(value.toLowerCase());
  }

  private nextWeekday(day: number, forceNextWeek: boolean): Date {
    const date = new Date();
    let diff = (day - date.getDay() + 7) % 7;
    if (diff === 0) {
      diff = 7;
    } else if (forceNextWeek) {
      diff += 7;
    }

    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toDateTimeLocal(date: Date): string {
    const pad = (value: number): string => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private createMessage(role: ChatMessage['role'], text: string): ChatMessage {
    return {
      id: this.createId(),
      role,
      text,
      createdAt: new Date()
    };
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
