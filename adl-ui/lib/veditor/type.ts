import { FieldFns } from "../fields/type";
import * as adlast from "../../adl-gen/sys/adlast";
import { SelectState } from "../select";
import * as adlrt from "../../adl-gen/runtime/adl";
import { StructDescriptor, UnionDescriptor } from "./adl-visitors";

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

export interface CustomContext {
  declResolver: adlrt.DeclResolver;
  scopedDecl: adlast.ScopedDecl | null;
  field: adlast.Field | null;
  typeExpr: adlast.TypeExpr;
}


export interface Factory {
  getCustomVEditor(ctx: CustomContext): UVEditor | null;
  getCustomField(ctx: CustomContext): FieldFns<unknown> | null;

  renderFieldEditor(props: FieldEditorProps): Rendered;
  renderStructEditor(props: StructEditorProps): Rendered;
  renderUnionEditor(props: UnionEditorProps): Rendered;
  renderVoidEditor(): Rendered;
  renderNullableEditor?(props: FieldEditorProps): Rendered;

  renderUnimplementedEditor(props: UnimplementedEditorProps): Rendered;
}


// interface AcceptVEditorProps<T, S, E> {
//   veditor: IVEditor<T, S, E>;
//   state: S;
//   // onUpdate: (e: E) => void;
// }


export interface FieldEditorProps {
  fieldfns: FieldFns<unknown>;
  disabled: boolean;
  state: string;
  onUpdate: UpdateFn<string>;
};

export interface StructEditorProps {
  fields: StructFieldProps[];
  disabled: boolean;
}

export interface StructFieldProps {
  name: string;
  label: string;
  veditor: VEditorProps<unknown, unknown, unknown>;
}

export interface UnionEditorProps {
  selectState: SelectState,
  veditor: VEditorProps<unknown, unknown, unknown> | null;
  disabled: boolean;
}

export interface VEditorProps<T, S, E> {
  veditor: IVEditor<T, S, E>;
  state: S;
  onUpdate: (e: E) => void;
}


export interface UnimplementedEditorProps {
  typeExpr: adlast.TypeExpr;
}

export interface InternalContext {
  scopedDecl: adlast.ScopedDecl | null;
  field: adlast.Field | null;
}

export const nullContext = { scopedDecl: null, field: null };