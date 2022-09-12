import * as adlrt from "../../adl-gen/runtime/adl";
import { SelectState } from "../select";
import {
  createVisitor
} from "./adl-visitors";
import {
  Acceptors,
  AcceptorsIsO,
  AcceptorsOsIs,
  AdlTypeMapper,
  FieldDescriptor,
  Override,
  StructDescriptor,
  UnionDescriptor,
  Visitor,
  VisitorU
} from "./type";
import {
  AcceptUnimplementedProps,
  Factory,
  IVEditor,
  Rendered,
  StructFieldProps,
  UpdateFn,
  VEditorProps
} from "./type";

export type TandErrors<T> = {
  errors: string[];
  value: T | undefined;
};

export function createVEditor<T>(
  typeExpr: adlrt.ATypeExpr<T>,
  declResolver: adlrt.DeclResolver,
  factory: Factory,
  overrides?: Override[],
  adlMappers?: AdlTypeMapper<any, any>[],
) {
  const visitor = createVisitor(
    typeExpr,
    declResolver,
    overrides ? overrides : [],
    adlMappers ? adlMappers : [],
  );
  return makeVEditor(visitor, factory);
}

export function makeVEditor<T>(visitor: VisitorU, factory: Factory): IVEditor<T, unknown, unknown> {
  return {
    getInitialState: () => getInitialState(visitor),
    stateFromValue: (value: T): unknown => stateFromValue(visitor, value),
    validate: (state: unknown): string[] => validate(visitor, state),
    valueFromState: (state: unknown): T => valueFromState(visitor, state),
    update: (state: unknown, event: unknown): unknown => update(visitor, state, event),
    render: (state: unknown, disabled: boolean, onUpdate: UpdateFn<unknown>): Rendered => render(visitor, factory, state, disabled, onUpdate),
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
  selectActive: boolean,
  fieldStates: { [key: string]: unknown; };
}

interface UnionToggleActive {
  kind: "toggleActive",
} // Show the dropdown
interface UnionSetField {
  kind: "switch";
  field: string | null;
} // Switch the discriminator
interface UnionUpdate {
  kind: "update";
  event: unknown;
} // Update the value
export type UnionEvent = UnionToggleActive | UnionSetField | UnionUpdate;

export interface SomeUnion {
  kind: string;
  value: unknown;
}

const stateFromValueAcceptor: Acceptors<
  unknown, string,
  Record<string, unknown> | unknown, StructState,
  SomeUnion | unknown, UnionState,
  unknown, unknown,
  unknown, unknown,
  unknown, unknown
> = {
  acceptField: (value: unknown, fieldDesc: FieldDescriptor): string => {
    if (fieldDesc.mapper) {
      return fieldDesc.fieldfns.toText(fieldDesc.mapper.bFromA(value));
    }
    return fieldDesc.fieldfns.toText(value);
  },
  acceptStruct: (value0: Record<string, unknown> | unknown, structDesc: StructDescriptor): StructState => {
    let value: Record<string, unknown> = {};
    if (structDesc.mapper) {
      value = structDesc.mapper.bFromA(value0) as Record<string, unknown>;
    } else {
      value = value0 as Record<string, unknown>;
    }
    const state: StructState = {
      fieldStates: {},
    };
    for (const fd of structDesc.fieldDetails) {
      state.fieldStates[fd.name] = fd.visitor.visit("stateFromValue", value[fd.name], stateFromValueAcceptor);
    }
    return state;
  },
  acceptUnion: function (value0: SomeUnion | unknown, unionDesc: UnionDescriptor): UnionState {
    let uvalue = {} as SomeUnion;
    if (unionDesc.mapper) {
      uvalue = unionDesc.mapper.bFromA(value0) as SomeUnion;
    } else {
      uvalue = value0 as SomeUnion;
    }
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
      selectActive: false,
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

const getInitialStateAcceptor: Acceptors<
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
    const initialState = { currentField: null, selectActive: false, fieldStates: {} };
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

export function getInitialState<S>(veditor0: Visitor<void, unknown>): S {
  return veditor0.visit("getInitialState", undefined, getInitialStateAcceptor) as S;
}

export function validate<S>(veditor0: VisitorU, vstate: S): string[] {

  const acceptor: AcceptorsIsO<
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
        const result = fd.visitor.visit("validate", state.fieldStates[fd.name], acceptor) as string[];

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
      const result = unionDesc.branchDetails[kind].visitor().visit("validate", state.fieldStates[kind], acceptor) as string[];
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

  return veditor0.visit("validate", vstate, acceptor) as string[];

}


export function stateFromValue<T, S>(veditor0: VisitorU, value0: T): S {
  return veditor0.visit("stateFromValue", value0, stateFromValueAcceptor) as S;
}

export function valueFromState<T, S>(veditor: VisitorU, vstate: S): T {

  const acceptor: AcceptorsOsIs<
    unknown, string,
    Record<string, unknown> | unknown, StructState,
    SomeUnion | unknown, UnionState,
    unknown, unknown,
    unknown, unknown,
    unknown, unknown
  > = {
    acceptField: (state: string, fieldDesc: FieldDescriptor): unknown => {
      if (fieldDesc.mapper) {
        return fieldDesc.mapper.aFromB(fieldDesc.fieldfns.fromText(state));
      }
      return fieldDesc.fieldfns.fromText(state);
    },
    acceptStruct: (state: StructState, structDesc: StructDescriptor): Record<string, unknown> | unknown => {
      const value: Record<string, unknown> = {};
      for (const fd of structDesc.fieldDetails) {
        value[fd.name] = fd.visitor.visit("valueFromState", state.fieldStates[fd.name], acceptor);
      }
      if (structDesc.mapper) {
        return structDesc.mapper.aFromB(value);
      }
      return value;
    },
    acceptUnion: (state: UnionState, unionDesc: UnionDescriptor): SomeUnion | unknown => {
      const kind = state.currentField;
      if (kind === null) {
        throw new Error("BUG: union valueFromState called on invalid state");
      }
      const value = unionDesc.branchDetails[kind].visitor().visit("valueFromState", state.fieldStates[kind], acceptor);
      if (unionDesc.mapper) {
        return unionDesc.mapper.aFromB({ kind, value });
      }
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

  return veditor.visit("valueFromState", vstate, acceptor) as T;
}

type SE<S, E> = { state: S, event: E; };

export function update<S, E>(veditor: VisitorU, state: S, event: E): S {
  const acceptor: Acceptors<
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
        const newfs = fd.visitor.visit(
          "update",
          {
            state: state.fieldStates[event.field],
            event: event.fieldEvent,
          },
          acceptor
        );
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
      if (event.kind === "toggleActive") {
        return {
          ...state,
          selectActive: !state.selectActive,
        };
      } else if (event.kind === "switch") {
        const field = event.field;
        const newFieldStates = { ...state.fieldStates };
        if (field && !newFieldStates[field]) {
          newFieldStates[field] = unionDesc.branchDetails[field].visitor().visit("update", undefined, getInitialStateAcceptor);
        }
        return {
          currentField: event.field,
          selectActive: state.selectActive,
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
          acceptor
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
  return veditor.visit("update", { state, event }, acceptor) as S;
}

type RP<S, E> = { state: S, disabled: boolean, onUpdate: UpdateFn<E>; };

export function render<S, E>(veditor: VisitorU, factory: Factory, state0: S, disabled0: boolean, onUpdate0: UpdateFn<E>): Rendered {
  const acceptor: Acceptors<
    RP<string, string>, Rendered,
    RP<StructState, StructEvent>, Rendered,
    RP<UnionState, UnionEvent>, Rendered,
    RP<null, null>, Rendered,
    RP<unknown, unknown>, Rendered,
    RP<unknown, unknown>, Rendered
  > = {
    acceptField: function (env: RP<string, string>, fieldDesc: FieldDescriptor): Rendered {
      const { state, disabled, onUpdate } = env;
      return factory.renderFieldEditor({ fieldfns: fieldDesc.fieldfns, disabled, state, onUpdate });
    },
    acceptStruct: function (env: RP<StructState, StructEvent>, structDesc: StructDescriptor): Rendered {
      const { state, disabled, onUpdate } = env;
      const fields: StructFieldProps[] = structDesc.fieldDetails.map(fd => {
        const veditor = makeVEditor(fd.visitor, factory);
        return {
          name: fd.name,
          label: fd.label,
          veditor: {
            veditor,
            state: state.fieldStates[fd.name],
            onUpdate: event => {
              onUpdate({ kind: "field", field: fd.name, fieldEvent: event });
            }
          }
        };
      }
      );
      return factory.renderStructEditor({ fields, disabled });
    },
    acceptUnion: function (env: RP<UnionState, UnionEvent>, unionDesc: UnionDescriptor): Rendered {
      const { state, disabled, onUpdate } = env;
      let current: number | null = null;
      if (state.currentField) {
        current = unionDesc.branchDetails[state.currentField] ? unionDesc.branchDetails[state.currentField].index : null;
      }

      const name = (i: number) => {
        const k = Object.keys(unionDesc.branchDetails).find(k => unionDesc.branchDetails[k].index === i);
        if (!k) {
          throw Error("no branch with this index" + i);
        }
        return unionDesc.branchDetails[k].name;
      };

      const selectState: SelectState = {
        current,
        active: state.selectActive,
        choices: Object.keys(unionDesc.branchDetails).map(k => unionDesc.branchDetails[k].label),
        onClick: () => onUpdate({ kind: "toggleActive" }),
        onChoice: (i: number | null) => {
          onUpdate({ kind: "toggleActive" });
          onUpdate({ kind: "switch", field: i === null ? null : name(i) });
        },
      };

      let veditor: VEditorProps<unknown, unknown, unknown> | null = null;
      if (state.currentField) {
        veditor = {
          veditor: makeVEditor(unionDesc.branchDetails[state.currentField].visitor(), factory),
          state: state.fieldStates[state.currentField],
          onUpdate: event => onUpdate({ kind: "update", event })
        };
      }

      return factory.renderUnionEditor({ selectState, disabled, veditor });
    },
    acceptVoid: function (env: RP<null, null>): Rendered {
      return factory.renderVoidEditor();
    },
    acceptVector: function (env: RP<unknown, unknown>, desc: StructDescriptor | UnionDescriptor): Rendered {
      throw new Error("Function not implemented.");
    },
    acceptUnimplemented: function (env: RP<unknown, unknown>, props: AcceptUnimplementedProps): Rendered {
      return factory.renderUnimplementedEditor({ typeExpr: props.typeExpr });
    }
  };
  return veditor.visit("render", { state: state0, disabled: disabled0, onUpdate: onUpdate0 }, acceptor) as Rendered;
}
