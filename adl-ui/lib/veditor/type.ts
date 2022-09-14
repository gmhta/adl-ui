import { FieldFns } from "../fields/type";
import * as adlast from "../../adl-gen/sys/adlast";
import { SelectState } from "../select";
import * as adlrt from "../../adl-gen/runtime/adl";
import { Maybe } from "../../adl-gen/sys/types";
import { JsonBinding } from '../../adl-gen/runtime/json';

// An abstract value editor
//    T: the type of value being edited
//    S: the type of state required for editing
//    E: the type of events
export interface IVEditor<T, S, E> {
  getInitialState(): S;
  // Construct the state for an editor with current value T
  stateFromValue(value: T): S;
  // Check whether the current state can produce a T. Return a list of errors.
  validate(state: S): string[];
  // If valid, construct a value of type T representing the current value
  valueFromState(state: S): T;
  // Returns a copy of the state, updated to reflect the given event
  update(state: S, event: E): S;
  // // Render the editor's current state as a UI.
  // render(state: S, disabled: boolean, onUpdate: UpdateFn<E>): Rendered;
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
  renderFieldEditor(props: FieldEditorProps): Rendered;
  renderStructEditor(props: StructEditorProps): Rendered;
  renderUnionEditor(props: UnionEditorProps): Rendered;
  renderVoidEditor(): Rendered;
  renderUnimplementedEditor(props: UnimplementedEditorProps): Rendered;
}

export type RenderProps<S, E> = {
  // factory: Factory;
  state: S;
  disabled: boolean;
  onUpdate: UpdateFn<E>;
};

export interface UnimplementedEditorProps {
  typeExpr: adlast.TypeExpr;
}

export interface InternalContext {
  scopedDecl: adlast.ScopedDecl | null;
  field: adlast.Field | null;
}

// --- field
export type FieldDescriptor = {
  fieldfns: FieldFns<unknown>;
  texpr: adlrt.ATypeExpr<unknown>;
};

export interface FieldEditorProps {
  fieldfns: FieldFns<unknown>;
  disabled: boolean;
  state: string;
  onUpdate: UpdateFn<string>;
};

// --- struct
export type StructDescriptor = {
  fieldDetails: FieldDetails[];
  texpr: adlrt.ATypeExpr<unknown>;
};
export type FieldDetails = {
  name: string;
  index: number;
  default: Maybe<{} | null>;
  jsonBinding: JsonBinding<unknown>;
  label: string;
  visitor: VisitorU;
};

export interface StructEditorProps {
  fields: StructFieldProps[];
  disabled: boolean;
}

export interface StructFieldProps {
  name: string;
  label: string;
  visitor: VisitorU;
  veditor: IVEditor<unknown, unknown, unknown>;
  state: unknown;
  onUpdate: (e: unknown) => void;  
}

// --- union
export type UnionDescriptor = {
  branchDetails: Record<string, UnionBranch>;
  texpr: adlrt.ATypeExpr<unknown>;
  // scopedDecl: adlast.ScopedDecl;
};

export type UnionBranch = {
  name: string;
  label: string;
  index: number;
  visitor: () => VisitorU;
};

export interface UnionEditorProps {
  selectState: SelectState,
  branchProps: UnionBranchProps<unknown, unknown, unknown> | null;
  disabled: boolean;
}

export type UnionEditorState = Pick<UnionEditorProps, "selectState" | "branchProps">

export interface UnionBranchProps<T, S, E> {
  visitor: VisitorU;
  // veditor: IVEditor<T, S, E>;
  state: S;
  onUpdate: (e: E) => void;
}

// ----
export type CutCtx = {
  // the acceptor name, passed to the visitor
  name: string;
  texpr: adlrt.ATypeExpr<unknown>;
  mapper?: Mapper<unknown, unknown>;
};

export type DescriptorUnion =
  { kind: "field"; value: FieldDescriptor; cutCtx: CutCtx; }
  | { kind: "struct"; value: StructDescriptor; cutCtx: CutCtx; }
  | { kind: "union"; value: UnionDescriptor; cutCtx: CutCtx; }
  | { kind: "void"; value: VoidDescriptor; cutCtx: CutCtx; }
  | { kind: "vector"; value: VectorDescriptor; cutCtx: CutCtx; }
  | { kind: "unimpl"; value: AcceptUnimplementedProps; cutCtx: CutCtx; }
  ;

export type VectorDescriptor = {
};

export type VoidDescriptor = {
};

export type AcceptorCut = (env: unknown, desc: DescriptorUnion) => unknown;

export interface Acceptors<FI, FO, SI, SO, UI, UO, VI, VO, AI, AO, XI, XO> {
  before?: AcceptorCut;
  after?: AcceptorCut;
  acceptField(env: FI, fieldDesc: FieldDescriptor): FO;
  acceptStruct(env: SI, structDesc: StructDescriptor): SO;
  acceptUnion(env: UI, unionDesc: UnionDescriptor): UO;
  acceptVoid(env: VI, desc: VoidDescriptor): VO;
  acceptVector(env: AI, desc: VectorDescriptor): AO;
  acceptUnimplemented(env: XI, props: AcceptUnimplementedProps): XO;
}

export type AcceptorsOsIs<FI, FO, SI, SO, UI, UO, VI, VO, AI, AO, XI, XO> =
  Acceptors<FO, FI, SO, SI, UO, UI, VO, VI, AO, AI, XO, XI>;

export type AcceptorsIsO<FI, SI, UI, VI, AI, XI, O> = Acceptors<FI, O, SI, O, UI, O, VI, O, AI, O, XI, O>;

export type AcceptorsIO<I, O> = Acceptors<I, O, I, O, I, O, I, O, I, O, I, O>;

export type AcceptorsU = AcceptorsIO<unknown, unknown>;

export interface Visitor<I, O> {
  // name: string id of the visit used for customizing
  // env:  stack environment state passed to acceptor
  // acceptor: typed callbacks
  // return: stack environment passed back to the caller
  visit(name: string, env: I, acceptor: AcceptorsIO<I, O>): O;
  // mapping?: Mapper<A, B>;
}
export type VisitorU = Visitor<unknown, unknown>;

// export interface VisitorMapped<A, B> {
//   visit(env: unknown, acceptor: AcceptorsU): unknown;
//   mapping: Mapper<A, B>;
// }

export type Override = {
  name: string,
  before?: AcceptorCut;
  after?: AcceptorCut;
  acceptField?: (env: any, fieldDesc: FieldDescriptor) => any;
  acceptStruct?: (env: any, structDesc: StructDescriptor) => any;
  acceptUnion?: (env: any, unionDesc: UnionDescriptor) => any;
  acceptVoid?: (env: any, voidDesc: VoidDescriptor) => any;
  acceptVector?: (env: any, desc: VectorDescriptor) => any;
  acceptUnimplemented?: (env: any, props: AcceptUnimplementedProps) => any;
};

export type Customizers = {
  overrides: Override[],
  mappers: AdlTypeMapper<any, any>[],
  before?: AcceptorCut;
  after?: AcceptorCut;
};

export type OverrideNames = "getInitialState"
  | "validate"
  | "stateFromValue"
  | "valueFromState"
  | "update"
  | "render"
  ;

export function makeOverride(
  name: OverrideNames,
  fns: {
    acceptField?: (env: any, fieldDesc: FieldDescriptor) => any,
    acceptStruct?: (env: any, structDesc: StructDescriptor) => any,
    acceptUnion?: (env: any, unionDesc: UnionDescriptor) => any,
    acceptVoid?: (env: any, voidDesc: VoidDescriptor) => any,
    acceptVector?: (env: any, desc: VectorDescriptor) => any,
    acceptUnimplemented?: (env: any, props: AcceptUnimplementedProps) => any,
  }
): Override {
  return {
    name,
    acceptField: fns.acceptField,
    acceptStruct: fns.acceptStruct,
    acceptUnion: fns.acceptUnion,
    acceptVoid: fns.acceptVoid,
    acceptVector: fns.acceptVector,
    acceptUnimplemented: fns.acceptUnimplemented,
  };
}

// export function AcceptFieldOverride<FI, FO> = {
//   name: string;
//   acceptField: (env: FI, fieldDesc: FieldDescriptor) => FO;
// };
// export type AcceptStructOverride<SI, SO> = {
//   name: string;
//   acceptStruct: (env: SI, structDesc: StructDescriptor) => SO;
// };
// export type AcceptUnionOverride<UI, UO> = {
//   name: string;
//   acceptUnion: (env: UI, unionDesc: UnionDescriptor) => UO;
// };
// export type AcceptVoidOverride<VI, VO> = {
//   name: string;
//   acceptVoid: (env: VI) => VO;
// };
// export type AcceptVectorOverride<AI, AO> = {
//   name: string;
//   acceptVector: (env: AI, desc: StructDescriptor | UnionDescriptor) => AO;
// };
// export type AcceptUnimplOverride<XI, XO> = {
//   name: string;
//   acceptUnimplemented: (env: XI, props: AcceptUnimplementedProps) => XO;
// };




export interface Mapper<A, B> {
  aFromB: (b: B) => A;
  bFromA: (a: A) => B;
}

export type AdlTypeMapper<A, B> = {
  texprA: adlrt.ATypeExpr<A>;
  texprB: adlrt.ATypeExpr<B>;
  aFromB: (b: B) => A;
  bFromA: (a: A) => B;
};

export function makeAdlMapper<A, B>(
  texprA: adlrt.ATypeExpr<A>,
  texprB: adlrt.ATypeExpr<B>,
  aFromB: (b: B) => A,
  bFromA: (a: A) => B,
) {
  return { texprA, texprB, aFromB, bFromA };
}

// export type Customize = (ctx: CustomContext) => AcceptorsU | null;

// export type CustomContext = CustomContextField | CustomContextStruct;
// type CustomContextField = {
//   kind: "field";
// };
// type CustomContextStruct = {
//   kind: "struct";
// };