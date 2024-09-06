import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { ChessBoard } from '../../chess-logic/chess-board.js';
import { CheckState, Color, Coords, FENChar, GameHistory, LastMove, MoveList, MoveType, SafeSquares, pieceImagePaths } from '../../chess-logic/models.js';
import { SelectedSquare } from './models.js';
import { ChessBoardService } from './chess-board.service.js';
import { FENConverter } from '../../chess-logic/FENConverter.js';

@Component({
  selector: 'app-chess-board',
  // standalone: true,
  // imports: [CommonModule],
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.css'
})
export class ChessBoardComponent implements OnDestroy {
  public pieceImagePaths = pieceImagePaths;

  protected chessBoard = new ChessBoard();
  public chessBoardView: (FENChar | null)[][] = this.chessBoard.chessBoardView;

  private selectedSquare: SelectedSquare = { piece: null };
  private pieceSafeSquare: Coords[] = [];
  private lastMove: LastMove | undefined = this.chessBoard.lastMove;
  private checkState: CheckState = this.chessBoard.checkState;

  private soundInstances = this.chessBoardService.soundInstances;

  public get moveList(): MoveList {
    return this.chessBoard.moveList;
  }

  public get gameHistory(): GameHistory {
    return this.chessBoard.gameHistory;
  }

  public gameHistoryPointer: number = 0;

  public get safeSquares(): SafeSquares {
    return this.chessBoard.safeSquares;
  }

  public get playerColor(): Color {
    return this.chessBoard.playerColor;
  }

  public get gameOverMessage(): string | undefined {
    return this.chessBoard.gameOverMessage;
  }

  // promotion properties
  public isPromotionActive: boolean = false;
  private promotionCoords: Coords | null = null;
  private promotedPiece: FENChar | null = null;
  public promotionPieces(): FENChar[] {
    return this.playerColor === Color.White ?
      [FENChar.WhiteKnight, FENChar.WhiteBishop, FENChar.WhiteRook, FENChar.WhiteQueen] :
      [FENChar.BlackKnight, FENChar.BlackBishop, FENChar.BlackRook, FENChar.BlackQueen]
  }

  public flipMode: boolean = false;
  protected subscriptions$ = new Subscription();

  constructor(protected chessBoardService: ChessBoardService) { };

  ngOnDestroy(): void {
    this.subscriptions$.unsubscribe();
    this.chessBoardService.chessBoardState$.next(FENConverter.initialPosition);
  }

  public flipBoard(): void {
    this.flipMode = !this.flipMode;
  }

  // For css
  public isSquareDark(x: number, y: number): boolean {
    return ChessBoard.isSquareDark(x, y);
  }

  // For css
  public isSquareSelected(x: number, y: number): boolean {
    if (!this.selectedSquare.piece) return false;
    return this.selectedSquare.x === x && this.selectedSquare.y === y;
  }

  // For css
  public isSquareLastMove(x: number, y: number): boolean {
    if (!this.lastMove) return false;
    const { prevX, prevY, currX, currY } = this.lastMove;
    return x === prevX && y === prevY || x === currX && y == currY;
  }

  // For css
  public isSquareChecked(x: number, y: number): boolean {
    return this.checkState.isInCheck && this.checkState.x === x && this.checkState.y === y;
  }

  public isSquareSafeForSelectedPiece(x: number, y: number): boolean {
    return this.pieceSafeSquare.some(coords => coords.x === x && coords.y === y);
  }

  public isSquarePromotionSquare(x: number, y: number): boolean {
    if (!this.promotionCoords) return false;
    return this.promotionCoords.x === x && this.promotionCoords.y === y;
  }

  // Remove the selected square
  private unmarkingPreviouslySelectedAndSafeSquares(): void {
    this.selectedSquare = { piece: null };
    this.pieceSafeSquare = [];

    if (this.isPromotionActive) {
      this.isPromotionActive = false;
      this.promotedPiece = null;
      this.promotionCoords = null;
    }
  }

  // it will select the piece and hold it in component variable 'selectedSquare'
  public selectingPiece(x: number, y: number): void {
    // Game is over
    if (this.gameOverMessage !== undefined) return;

    const piece: FENChar | null = this.chessBoardView[x][y];
    if (!piece) return;
    if (this.isWrongPieceSelected(piece)) return;

    // 
    const isSameSquareClicked: boolean = !!this.selectedSquare.piece && this.selectedSquare.x === x && this.selectedSquare.y === y;
    this.unmarkingPreviouslySelectedAndSafeSquares();
    if (isSameSquareClicked) return;

    this.selectedSquare = { piece, x, y };
    // Store the safe moves for selected piece
    this.pieceSafeSquare = this.safeSquares.get(x + ',' + y) || [];
  }

  // It will call the move method on the chess board and after that will change the chess board view
  private placingPiece(newX: number, newY: number): void {
    if (!this.selectedSquare.piece) return;
    if (!this.isSquareSafeForSelectedPiece(newX, newY)) return;

    // pawn promotion part
    const isPawnSelected: boolean = this.selectedSquare.piece === FENChar.WhitePawn || this.selectedSquare.piece === FENChar.BlackPawn;
    const isPawnOnLastRank: boolean = isPawnSelected && (newX === 7 || newX === 0);
    const shouldOpenPromotionDialog: boolean = !this.isPromotionActive && isPawnOnLastRank;

    if (shouldOpenPromotionDialog) {
      this.pieceSafeSquare = [];
      this.isPromotionActive = true;
      this.promotionCoords = { x: newX, y: newY };
      // wait for player to choose promoted piece 
      return;
    }

    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX, prevY, newX, newY, this.promotedPiece);
  }

  // make the move and update the board
  protected updateBoard(prevX: number, prevY: number, newX: number, newY: number, promotedPiece: FENChar | null): void {
    this.chessBoard.move(prevX, prevY, newX, newY, promotedPiece);
    this.chessBoardView = this.chessBoard.chessBoardView;

    /* 
      Update current component state for lastMove and checkState properties from chessBoard 
      Play the sound for last move 
    */
    this.markLastMoveAndCheckState(this.chessBoard.lastMove, this.chessBoard.checkState);

    this.unmarkingPreviouslySelectedAndSafeSquares();
    this.chessBoardService.chessBoardState$.next(this.chessBoard.boardAsFEN);
    this.gameHistoryPointer++;
  }

  // promote handler (this is called after the user select(click) on the piece that he wants to get)
  public promotePiece(piece: FENChar): void {
    if (!this.promotionCoords || !this.selectedSquare.piece) return;
    this.promotedPiece = piece;
    const { x: newX, y: newY } = this.promotionCoords;
    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX, prevY, newX, newY, this.promotedPiece);
  }

  // It's close promotion dialog 
  public closePawnPromotionDialog(): void {
    this.unmarkingPreviouslySelectedAndSafeSquares();
  }

  public markLastMoveAndCheckState(lastMove: LastMove | undefined, checkState: CheckState): void {
    this.lastMove = lastMove;
    this.checkState = checkState;

    if (this.lastMove) {
      this.moveSound(this.lastMove.moveType)
    } else {
      this.moveSound(new Set<MoveType>([MoveType.BasicMove]));
    }
  }

  // It will be run called every time when a square is clicked
  public move(x: number, y: number): void {
    this.selectingPiece(x, y);
    this.placingPiece(x, y);
  }

  // Guard for clicking on enemy pieces
  private isWrongPieceSelected(piece: FENChar): boolean {
    const isWhitePieceSelected: boolean = piece === piece.toLocaleUpperCase();
    return isWhitePieceSelected && this.playerColor === Color.Black ||
      !isWhitePieceSelected && this.playerColor === Color.White;
  }

  public showPreviousPosition(moveIndex: number): void {
    const { board, checkState, lastMove } = this.gameHistory[moveIndex];
    this.chessBoardView = board;

    /*
      Update current component state for lastMove and checkState properties based on selected move from gameHistory 
      Play the sound for last move 
    */
    this.markLastMoveAndCheckState(lastMove, checkState);

    this.gameHistoryPointer = moveIndex;
  }

  // It play the sound base of the move type of last move 
  public moveSound(moveType: Set<MoveType>): void {
    let moveSound: HTMLAudioElement | undefined;
  
    if (moveType.has(MoveType.BasicMove)) moveSound = this.soundInstances[MoveType.BasicMove];
    
    if (moveType.has(MoveType.Promotion)) moveSound = this.soundInstances[MoveType.Promotion];
    else if (moveType.has(MoveType.Capture)) moveSound = this.soundInstances[MoveType.Capture];
    else if (moveType.has(MoveType.Castling)) moveSound = this.soundInstances[MoveType.Castling];

    if (moveType.has(MoveType.CheckMate)) moveSound = this.soundInstances[MoveType.CheckMate];
    if (moveType.has(MoveType.Check)) moveSound = this.soundInstances[MoveType.Check];

    moveSound?.play();
  }
}
