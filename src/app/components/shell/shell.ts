import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SpecListComponent } from '../spec-list/spec-list';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SpecListComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {}
