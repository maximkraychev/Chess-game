import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FENConverter } from '../../chess-logic/FENConverter';
import { MoveType } from '../../chess-logic/models';


@Injectable({
  providedIn: 'root'
})
export class ChessBoardService {
  /*
    In this variable is stored the state of the board as Forsyth-Edwards Notation(FEN)
    After every move this will be updated with the new state of the board (converted as FEN)

    Example of FEN (this is the initial one): 
    rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
  */
  public chessBoardState$ = new BehaviorSubject<string>(FENConverter.initialPosition);

  public soundInstances = {
    [MoveType.BasicMove]: new Audio('assets/sound/move.mp3'),
    [MoveType.Capture]: new Audio('assets/sound/capture.mp3'),
    [MoveType.Castling]: new Audio('assets/sound/castling.mp3'),
    [MoveType.Check]: new Audio('assets/sound/check.mp3'),
    [MoveType.CheckMate]: new Audio('assets/sound/checkmate.mp3'),
    [MoveType.Promotion]: new Audio('assets/sound/promote.mp3'),
  };
}