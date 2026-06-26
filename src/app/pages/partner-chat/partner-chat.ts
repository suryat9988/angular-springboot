import { DatePipe } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/services/auth';
import { PartnerChatService } from '../../core/services/partner-chat';
import { PartnerLinkService } from '../../core/services/partner-link';
import { UserProfile } from '../../models/partner-chat.model';
import { AppIcon } from '../../shared/components/app-icon/app-icon';

@Component({
  selector: 'app-partner-chat',
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    AppIcon
  ],
  templateUrl: './partner-chat.html',
  styleUrl: './partner-chat.scss'
})
export class PartnerChat implements OnInit, AfterViewChecked {
  private readonly authService = inject(AuthService);
  private readonly partnerLinkService = inject(PartnerLinkService);
  private readonly partnerChatService = inject(PartnerChatService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly messageList = viewChild<ElementRef<HTMLDivElement>>('messageList');

  private shouldScrollToBottom = false;

  readonly profile = toSignal(this.partnerLinkService.profile$, { initialValue: null as UserProfile | null });
  readonly messages = toSignal(this.partnerChatService.messages$, { initialValue: [] });
  readonly currentUserId = () => this.authService.currentUser?.uid ?? '';

  readonly loadingProfile = signal(true);
  readonly connecting = signal(false);
  readonly sending = signal(false);
  readonly partnerCode = signal('');
  readonly draft = signal('');

  ngOnInit(): void {
    void this.initializeProfile();
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

  protected isLinked(): boolean {
    const profile = this.profile();
    return Boolean(profile?.coupleId && profile.partnerUid);
  }

  protected async connectPartner(): Promise<void> {
    if (this.connecting()) {
      return;
    }

    this.connecting.set(true);
    try {
      await this.partnerLinkService.connectWithInviteCode(this.partnerCode());
      this.partnerCode.set('');
      this.snackBar.open('Connected with your partner!', 'Dismiss', { duration: 3000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not connect with that code.';
      this.snackBar.open(message, 'Dismiss', { duration: 5000 });
    } finally {
      this.connecting.set(false);
    }
  }

  protected async copyInviteCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.snackBar.open('Invite code copied!', 'Dismiss', { duration: 2500 });
    } catch {
      this.snackBar.open(`Your code: ${code}`, 'Dismiss', { duration: 5000 });
    }
  }

  protected async disconnectPartner(): Promise<void> {
    try {
      await this.partnerLinkService.disconnectPartner();
      this.snackBar.open('Partner disconnected.', 'Dismiss', { duration: 3000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not disconnect partner.';
      this.snackBar.open(message, 'Dismiss', { duration: 5000 });
    }
  }

  protected updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected async sendMessage(): Promise<void> {
    const text = this.draft().trim();
    if (!text || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.draft.set('');
    this.shouldScrollToBottom = true;

    try {
      await this.partnerChatService.sendMessage(text);
      this.shouldScrollToBottom = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send message.';
      this.snackBar.open(message, 'Dismiss', { duration: 4000 });
      this.draft.set(text);
    } finally {
      this.sending.set(false);
    }
  }

  protected onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();
    void this.sendMessage();
  }

  private async initializeProfile(): Promise<void> {
    try {
      await this.partnerLinkService.ensureProfile();
    } catch (error) {
      console.error(error);
      this.snackBar.open('Could not load your partner profile.', 'Dismiss', { duration: 4000 });
    } finally {
      this.loadingProfile.set(false);
    }
  }
}
