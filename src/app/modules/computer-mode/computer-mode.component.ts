import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';

import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { StockfishService } from './stockfish.service';
import { ChessBoardService } from '../chess-board/chess-board.service';
import { Color } from '../../chess-logic/models';

@Component({
  selector: 'app-computer-mode',
  templateUrl: '../chess-board/chess-board.component.html', // it uses chess-board template
  styleUrl: '../chess-board/chess-board.component.css',     // it uses chess-board css
})
export class ComputerModeComponent extends ChessBoardComponent implements OnInit, OnDestroy {

  constructor(private stockfishService: StockfishService) {
    super(inject(ChessBoardService));
  }

  /*
    This component will be executed if the selected mode from the modal is play-against computer.
    It will hook up to computerConfiguration observable and will flip the board if necessary.
    Then will hook up to observable chessBoardState$ which value is represented as FEN.
    And if is computer move will do the request for next move to StockfishAPI. 
    After that manually will start the process of updating the board with the new move.
  */
  override ngOnInit(): void {
    super.ngOnInit();
    // It will manage the board rotation depending what the player have chosen at the config modal
    const computerConfSubscription: Subscription = this.stockfishService.computerConfiguration$.subscribe({
      next: (computerConfiguration) => {
        if (computerConfiguration.color === Color.White) this.flipBoard();
      }
    })

    const chessBoardStateSubscription: Subscription = this.chessBoardService.chessBoardState$.subscribe({
      next: async (FEN: string) => {

        // In case the game have ended 
        if (this.chessBoard.isGameOver) {
          chessBoardStateSubscription.unsubscribe();
          return;
        }

        // From FEN the second char will be the current player on move (the active color that should do the next move) 
        const player: Color = FEN.split(' ')[1] === 'w' ? Color.White : Color.Black;

        /* 
          Here is checking if the selected computer color at the beginning is matching with
          the current active color that is taken from FEN
        */
        if (player !== this.stockfishService.computerConfiguration$.value.color) return;

        // Convert the observable response from stockFishAPI to promise
        const { prevX, prevY, newX, newY, promotedPiece } = await firstValueFrom(this.stockfishService.getBestMove(FEN));

        // Manually update the board with Stockfish API answer
        this.updateBoard(prevX, prevY, newX, newY, promotedPiece)
      }
    });

    this.subscriptions$.add(chessBoardStateSubscription);
    this.subscriptions$.add(computerConfSubscription);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();  
    this.subscriptions$.unsubscribe();
  }
}
