import { Component, inject, type OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SpecStoreService } from './services/spec-store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly store = inject(SpecStoreService);

  async ngOnInit(): Promise<void> {
    await this.store.loadAll();
  }
}
