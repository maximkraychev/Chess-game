import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChessBoardComponent } from './modules/chess-board/chess-board.component.js';

@Component({
  selector: 'app-root',
  // standalone: true,
  // imports: [RouterOutlet, ChessBoardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Chess-game';
}
