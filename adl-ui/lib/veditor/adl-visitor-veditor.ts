import * as adlrt from "../../adl-gen/runtime/adl";
import {
  createVisitor
} from "./adl-visitors";
import {
  Acceptors,
  AcceptorsIsO,
  AcceptorsOsIs, AcceptorsU, AcceptUnimplementedProps, AdlTypeMapper,
  DescriptorUnion, FieldDescriptor, IVEditor, Override,
  StructDescriptor, UnionDescriptor, Visitor,
  VisitorU
} from "./type";

export type TandErrors<T> = {
  errors: string[];
  value: T | undefined;
};

export function createVEditor<T>(
  typeExpr: adlrt.ATypeExpr<T>,
  declResolver: adlrt.DeclResolver,
  customizers?: {
    overrides: Override[],
    mappers: AdlTypeMapper<any, any>[],
  },
) {
  const visitor = createVisitor(
    typeExpr,
    declResolver,
    customizers ? customizers : { overrides: [], mappers: [] },
  );
  return makeVEditor(visitor);
}

export function makeVEditor<T>(visitor: VisitorU): IVEditor<T, unknown, unknown> & VisitorU {
  return {
    getInitialState: () => getInitialState(visitor),
    stateFromValue: (value: T): unknown => stateFromValue(visitor, value),
    validate: (state: unknown): string[] => validate(visitor, state),
    valueFromState: (state: unknown): T => valueFromState(visitor, state),
    update: (state: unknown, event: unknown): unknown => update(visitor, state, event),
    visit: (name: string, env: unknown, acceptor: AcceptorsU): unknown => visitor.visit(name, env, acceptor),
    // render: (state: unknown, disabled: boolean, onUpdate: UpdateFn<unknown>): Rendered => render(visitor, factory, state, disabled, onUpdate),
  };
}

export interface StructState {
  fieldStates: StructFieldStates;
}
interface StructFieldStates {
  [key: string]: unknown;
}

interface StructFieldEvent {
  kind: "field";
  field: string;
  fieldEvent: unknown;
}

export type StructEvent = StructFieldEvent;

export interface UnionState {
  currentField: string | null;
  fieldStates: { [key: string]: unknown; };
}

interface UnionSetField {
  kind: "switch";
  field: string | null;
} // Switch the discriminator
interface UnionUpdate {
  kind: "update";
  event: unknown;
} // Update the value
export type UnionEvent = UnionSetField | UnionUpdate;

export interface SomeUnion {
  kind: string;
  value: unknown;
}

export const stateFromValueAcceptor: Acceptors<
  unknown, string,
  Record<string, unknown>, StructState,
  SomeUnion, UnionState,
  unknown, unknown,
  unknown, unknown,
  unknown, unknown
> = {
  before: (env: unknown, desc: DescriptorUnion): unknown => {
    if (desc.cutCtx.mapper) {
      return desc.cutCtx.mapper.bFromA(env);
    }
    return env;
  },
  acceptField: (value: unknown, fieldDesc: FieldDescriptor): string => {
    return fieldDesc.fieldfns.toText(value);
  },
  acceptStruct: (value: Record<string, unknown>, structDesc: StructDescriptor): StructState => {
    const state: StructState = {
      fieldStates: {},
    };
    for (const fd of structDesc.fieldDetails) {
      state.fieldStates[fd.name] = fd.visitor.visit("stateFromValue", value[fd.name], stateFromValueAcceptor);
    }
    return state;
  },
  acceptUnion: function (uvalue: SomeUnion, unionDesc: UnionDescriptor): UnionState {
    const kind = uvalue.kind;
    if (!kind) {
      throw new Error("union must have kind field");
    }
    const value = uvalue.value === undefined ? null : uvalue.value;
    if (!unionDesc.branchDetails[kind]) {
      throw new Error("union with invalid kind field");
    }
    return {
      currentField: kind,
      fieldStates: { [kind]: unionDesc.branchDetails[kind].visitor().visit("stateFromValue", value, stateFromValueAcceptor) }
    };
  },
  acceptVoid: function (env: unknown): unknown {
    return undefined;
  },
  acceptVector: function (stackState: unknown, props: StructDescriptor | UnionDescriptor): unknown {
    throw new Error("Function not implemented.");
  },
  acceptUnimplemented: function (stackState: unknown, props: AcceptUnimplementedProps): unknown {
    return null;
    // throw new Error("Function not implemented.");
  }
};

export const getInitialStateAcceptor: Acceptors<
  void, string,
  void, StructState,
  void, UnionState,
  void, unknown,
  void, unknown,
  void, unknown
> = {
  acceptField: function (env: void, fieldDesc: FieldDescriptor): string {
    return "";
  },
  acceptStruct: function (env: void, structDesc: StructDescriptor): StructState {
    const initialState: StructState = { fieldStates: {} };
    // It's unclear what the initialState for an empty struct
    // editor should be... either every field empty, or
    // with default values filled in for those fields that have
    // defaults specified. the flag below set's this behaviour, though
    // we may want to change initialState to be a function that takes
    // this as a parameter.
    const USE_DEFAULTS_FOR_STRUCT_FIELDS = true;
    for (const fd of structDesc.fieldDetails) {
      if (USE_DEFAULTS_FOR_STRUCT_FIELDS && fd.default.kind === "just") {
        initialState.fieldStates[fd.name] = fd.visitor.visit(
          "getInitialState",
          fd.jsonBinding.fromJsonE(fd.default.value),
          stateFromValueAcceptor,
        );
      } else {
        initialState.fieldStates[fd.name] = fd.visitor.visit("getInitialState", undefined, getInitialStateAcceptor);
      }
    }
    return initialState;
  },
  acceptUnion: function (env: void, unionDesc: UnionDescriptor): UnionState {
    const initialState: UnionState = {
      currentField: null,
      fieldStates: {}
    };
    return initialState;
  },
  acceptVoid: function (env: void): unknown {
    return null;
  },
  acceptVector: function (env: void, desc: StructDescriptor | UnionDescriptor): unknown {
    throw new Error("Function not implemented.");
  },
  acceptUnimplemented: function (env: void, props: AcceptUnimplementedProps): unknown {
    return null;
  }
};

export const validateAcceptor: AcceptorsIsO<
  string,
  StructState,
  UnionState,
  undefined,
  unknown,
  undefined,
  string[]
> = {
  acceptField: function (t: string, fieldDesc: FieldDescriptor): string[] {
    const err = fieldDesc.fieldfns.validate(t);
    return err === null ? [] : [err];
  },
  acceptStruct: function (state: StructState, structDesc: StructDescriptor): string[] {
    let errors: string[] = [];
    for (const fd of structDesc.fieldDetails) {
      const result = fd.visitor.visit("validate", state.fieldStates[fd.name], validateAcceptor) as string[];

      errors = errors.concat(result.map(err => fd.name + ": " + err));
    }
    return errors;
  },
  acceptUnion: function (state: UnionState, unionDesc: UnionDescriptor): string[] {
    const kind = state.currentField;
    if (kind === null) {
      return ["selection required"];
    }
    if (!unionDesc.branchDetails[kind]) {
      throw new Error("union with invalid kind field");
    }
    const result = unionDesc.branchDetails[kind].visitor().visit("validate", state.fieldStates[kind], validateAcceptor) as string[];
    return result;
  },
  acceptVoid: function (env: undefined): string[] {
    return [];
  },
  acceptVector: function (env: unknown, desc: StructDescriptor | UnionDescriptor): string[] {
    throw new Error("Function not implemented.");
  },
  acceptUnimplemented: function (env: undefined, props: AcceptUnimplementedProps): string[] {
    return [];
  }
};

export const valueFromStateAcceptor: AcceptorsOsIs<
  unknown, string,
  Record<string, unknown>, StructState,
  SomeUnion | unknown, UnionState,
  unknown, unknown,
  unknown, unknown,
  unknown, unknown
> = {
  after: (env: unknown, desc: DescriptorUnion): unknown => {
    if (desc.cutCtx.mapper) {
      return desc.cutCtx.mapper.aFromB(env);
    }
    return env;
  },
  acceptField: (state: string, fieldDesc: FieldDescriptor): unknown => {
    return fieldDesc.fieldfns.fromText(state);
  },
  acceptStruct: (state: StructState, structDesc: StructDescriptor): Record<string, unknown> => {
    const value: Record<string, unknown> = {};
    for (const fd of structDesc.fieldDetails) {
      value[fd.name] = fd.visitor.visit("valueFromState", state.fieldStates[fd.name], valueFromStateAcceptor);
    }
    return value;
  },
  acceptUnion: (state: UnionState, unionDesc: UnionDescriptor): SomeUnion => {
    const kind = state.currentField;
    if (kind === null) {
      throw new Error("BUG: union valueFromState called on invalid state");
    }
    const value = unionDesc.branchDetails[kind].visitor().visit("valueFromState", state.fieldStates[kind], valueFromStateAcceptor);
    return { kind, value };
  },
  acceptVoid: (env: unknown): unknown => {
    return null;
  },
  acceptVector: (env: unknown, desc: StructDescriptor | UnionDescriptor): unknown => {
    throw new Error("Function not implemented.");
  },
  acceptUnimplemented: (env: unknown, props: AcceptUnimplementedProps): unknown => {
    return "";
  }
};

type SE<S, E> = { state: S, event: E; };

export const updateAcceptor: Acceptors<
  SE<string, string>, string,
  SE<StructState, StructEvent>, StructState,
  SE<UnionState, UnionEvent>, UnionState,
  SE<null, null>, null,
  SE<unknown, unknown>, unknown,
  SE<unknown, unknown>, unknown
> = {
  acceptField: function (env: SE<string, string>, fieldDesc: FieldDescriptor): string {
    return env.event;
  },
  acceptStruct: function (env: SE<StructState, StructEvent>, structDesc: StructDescriptor): StructState {
    const { state, event } = env;
    if (event.kind === "field") {
      const newFieldStates = {
        ...state.fieldStates
      };
      const fd = structDesc.fieldDetails.find(s => s.name === event.field);
      if (!fd) {
        throw new Error("could find a named field " + event.field);
      }
      const newfs = fd.visitor.visit("update", { state: state.fieldStates[event.field], event: event.fieldEvent }, updateAcceptor);
      newFieldStates[event.field] = newfs;
      const newState = {
        fieldStates: newFieldStates,
      };
      return newState;
    } else {
      return state;
    }
  },
  acceptUnion: function (env: SE<UnionState, UnionEvent>, unionDesc: UnionDescriptor): UnionState {
    const { state, event } = env;
    if (event.kind === "switch") {
      const field = event.field;
      const newFieldStates = { ...state.fieldStates };
      if (field && !newFieldStates[field]) {
        newFieldStates[field] = unionDesc.branchDetails[field].visitor().visit("update", undefined, getInitialStateAcceptor);
      }
      return {
        currentField: event.field,
        fieldStates: newFieldStates
      };
    } else if (event.kind === "update") {
      const field = state.currentField;
      if (field === null) {
        throw new Error("BUG: union update received when current field not set");
      }
      const newFieldStates = { ...state.fieldStates };
      newFieldStates[field] = unionDesc.branchDetails[field].visitor().visit(
        "update",
        {
          state: newFieldStates[field],
          event: event.event,
        },
        updateAcceptor
      );
      return {
        ...state,
        fieldStates: newFieldStates
      };
    } else {
      return state;
    }
  },
  acceptVoid: function (env: SE<null, null>): null {
    return null;
  },
  acceptVector: function (env: SE<unknown, unknown>, desc: StructDescriptor | UnionDescriptor): unknown {
    throw new Error("Function not implemented.");
  },
  acceptUnimplemented: function (env: SE<unknown, unknown>, props: AcceptUnimplementedProps): unknown {
    return {};
  }
};

// export const renderAcceptor: Acceptors<
//   RenderProps<string, string>, Rendered,
//   RenderProps<StructState, StructEvent>, Rendered,
//   RenderProps<UnionState, UnionEvent>, Rendered,
//   RenderProps<null, null>, Rendered,
//   RenderProps<unknown, unknown>, Rendered,
//   RenderProps<unknown, unknown>, Rendered
// > = {
//   acceptField: function (env: RenderProps<string, string>, fieldDesc: FieldDescriptor): Rendered {
//     const { factory, state, disabled, onUpdate } = env;
//     return factory.renderFieldEditor({ fieldfns: fieldDesc.fieldfns, disabled, state, onUpdate });
//   },
//   acceptStruct: function (env: RenderProps<StructState, StructEvent>, structDesc: StructDescriptor): Rendered {
//     const { factory, state, disabled, onUpdate } = env;
//     const fields: StructFieldProps[] = structDesc.fieldDetails.map(fd => {
//       return makeRenderStructField(fd, factory, state, onUpdate);
//     });
//     return factory.renderStructEditor({ fields, disabled });
//   },
//   acceptUnion: function (env: RenderProps<UnionState, UnionEvent>, unionDesc: UnionDescriptor): Rendered {
//     const { factory, state, disabled, onUpdate } = env;
//     const { currentField, selectActive, fieldStates } = state;
//     const { branchDetails } = unionDesc;
//     const { selectState, branchProps } = makeUnionEditorProps(currentField, selectActive, fieldStates, branchDetails, onUpdate);
//     return factory.renderUnionEditor({ selectState, disabled, branchProps });
//   },
//   acceptVoid: function (env: RenderProps<null, null>): Rendered {
//     const { factory } = env;
//     return factory.renderVoidEditor();
//   },
//   acceptVector: function (env: RenderProps<unknown, unknown>, desc: StructDescriptor | UnionDescriptor): Rendered {
//     const { factory } = env;
//     throw new Error("Function not implemented.");
//   },
//   acceptUnimplemented: function (env: RenderProps<unknown, unknown>, props: AcceptUnimplementedProps): Rendered {
//     const { factory } = env;
//     return factory.renderUnimplementedEditor({ typeExpr: props.typeExpr });
//   }
// };


// export function makeUnionEditorProps(
//   currentField: string | null,
//   // selectActive: boolean,
//   fieldStates: Record<string, unknown>,
//   branchDetails: Record<string, UnionBranch>,
//   onUpdate: UpdateFn<UnionEvent>,
// ): UnionEditorState {
//   let branchProps: UnionBranchProps<unknown, unknown, unknown> | null = null;
//   if (currentField) {
//     const visitor = branchDetails[currentField].visitor();
//     branchProps = {
//       visitor,
//       state: fieldStates[currentField],
//       onUpdate: event => onUpdate({ kind: "update", event })
//     };
//   }
//   return { branchProps };
// }

export function getInitialState<S>(veditor0: Visitor<void, unknown>): S {
  return veditor0.visit("getInitialState", undefined, getInitialStateAcceptor) as S;
}

export function validate<S>(veditor0: VisitorU, vstate: S): string[] {
  return veditor0.visit("validate", vstate, validateAcceptor) as string[];
}

export function update<S, E>(veditor: VisitorU, state: S, event: E): S {
  return veditor.visit("update", { state, event }, updateAcceptor) as S;
}

export function stateFromValue<T, S>(veditor0: VisitorU, value0: T): S {
  return veditor0.visit("stateFromValue", value0, stateFromValueAcceptor) as S;
}

export function valueFromState<T, S>(veditor: VisitorU, vstate: S): T {
  return veditor.visit("valueFromState", vstate, valueFromStateAcceptor) as T;
}
