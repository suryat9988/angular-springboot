import { AfterViewChecked, Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AiChatService } from '../../../core/services/ai-chat';
import { AppIcon } from '../app-icon/app-icon';

@Component({
  selector: 'app-ai-chat-panel',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, AppIcon],
  templateUrl: './ai-chat-panel.html',
  styleUrl: './ai-chat-panel.scss'
})
export class AiChatPanel implements OnInit, AfterViewChecked {
  private readonly aiChatService = inject(AiChatService);
  private readonly messageList = viewChild<ElementRef<HTMLDivElement>>('messageList');
  private shouldScrollToBottom = false;

  readonly messages = this.aiChatService.messages;
  readonly isBusy = this.aiChatService.isBusy;
  readonly draft = signal('');

  ngOnInit(): void {
    if (this.messages().length === 0) {
      this.aiChatService.startPlanningSession();
    }
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScrollToBottom) {
      return;
    }

    const element = this.messageList()?.nativeElement;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }

    this.shouldScrollToBottom = false;
  }

  protected updateDraft(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.draft.set(value);
  }

  protected async sendMessage(): Promise<void> {
    const text = this.draft().trim();
    if (!text || this.isBusy()) {
      return;
    }

    this.draft.set('');
    this.shouldScrollToBottom = true;
    await this.aiChatService.sendMessage(text);
    this.shouldScrollToBottom = true;
  }

  protected onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();
    void this.sendMessage();
  }
}
