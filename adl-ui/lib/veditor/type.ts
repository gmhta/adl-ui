import { FieldFns } from "../fields/type";
import { StructDescriptor } from "./structVEditor";
import { UnionDescriptor } from "./unionVEditor";
import * as adlast from "../../adl-gen/sys/adlast";

// export interface IVEditorState<T, S, E> {
//   // Construct the state for an editor with current value T
//   stateFromValue(value: T): S;
//   // Check whether the current state can produce a T. Return
//   // a list of errors.
//   validate(state: S): string[];
//   // If valid, construct a value of type T representing the current
//   // value
//   valueFromState(state: S): T;
//   // Returns a copy of the state, updated to reflect the given event
//   update(state: S, event: E): S;
// }

// type U = unknown;

// An abstract value editor
//
//    T: the type of value being edited
//    S: the type of state required for editing
//    E: the type of events

export interface Visitor<I, O> {
  visit(env: I, acceptor: AcceptorsIO<I, O>): O;
}
export interface VisitorU {
  visit(env: unknown, acceptor: AcceptorsU): unknown;
}

export interface IVEditor<T, S, E> {
  getInitialState(): S;

  // Construct the state for an editor with current value T
  stateFromValue(value: T): S;

  // Check whether the current state can produce a T. Return
  // a list of errors.
  validate(state: S): string[];

  // If valid, construct a value of type T representing the current
  // value
  valueFromState(state: S): T;

  // Returns a copy of the state, updated to reflect the given event
  update(state: S, event: E): S;

  // Render the editor's current state as a UI.
  render(state: S, disabled: boolean, onUpdate: UpdateFn<E>): Rendered;
}

export interface Rendered {
  // Content to be shown beside a label
  beside?: JSX.Element;

  // Content to be shown indented below the label. 
  below?: JSX.Element;
}

export type UpdateFn<E> = (e: E) => void;

export type VEditor<T> = IVEditor<T, unknown, unknown>;
export type UVEditor = VEditor<unknown>;

export interface Acceptors<FI, FO, SI, SO, UI, UO, VI, VO, AI, AO, XI, XO> {
  acceptField(env: FI, fieldfns: FieldFns<unknown>): FO;
  acceptStruct(env: SI, structDesc: StructDescriptor): SO;
  acceptUnion(env: UI, unionDesc: UnionDescriptor): UO;
  acceptVoid(env: VI): VO;
  acceptVector(env: AI, desc: StructDescriptor | UnionDescriptor): AO;
  acceptUnimplemented(env: XI, props: AcceptUnimplementedProps): XO;
}

export type AcceptorsOsIs<FI, FO, SI, SO, UI, UO, VI, VO, AI, AO, XI, XO> = Acceptors<FO, FI, SO, SI, UO, UI, VO, VI, AO, AI, XO, XI>;

export type AcceptorsIsO<FI, SI, UI, VI, AI, XI, O> = Acceptors<FI, O, SI, O, UI, O, VI, O, AI, O, XI, O>;

export type AcceptorsIO<I, O> = Acceptors<I, O, I, O, I, O, I, O, I, O, I, O>;

export type AcceptorsU = AcceptorsIO<unknown, unknown>;


export interface AcceptUnimplementedProps {
  typeExpr: adlast.TypeExpr;
}
