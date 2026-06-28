import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface HelloResponse {
  message: string;
  timestamp: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly title = signal('angular-springboot');
  protected readonly name = signal('World');
  protected readonly response = signal<HelloResponse | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  sayHello(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<HelloResponse>(`/api/hello?name=${encodeURIComponent(this.name())}`)
      .subscribe({
        next: (res) => {
          this.response.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Request failed: ' + (err?.message ?? 'unknown error'));
          this.response.set(null);
          this.loading.set(false);
        },
      });
  }
}
