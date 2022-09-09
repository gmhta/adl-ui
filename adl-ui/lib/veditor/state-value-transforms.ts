import { FieldFns } from "../fields/type";
import {
  Acceptors,
  AcceptorsIsO,
  AcceptorsOsIs,
  AcceptUnimplementedProps,
  Rendered,
  UpdateFn,
} from "./type";
import { StructDescriptor, StructEvent, StructState } from "./structVEditor";
import { Visitor } from "./type";
import { SomeUnion, UnionDescriptor, UnionEvent, UnionState } from "./unionVEditor";
import { Factory, StructFieldProps, VEditorProps } from "./adlfactory";
import { SelectState } from "../select";

export type TandErrors<T> = {
  errors: string[];
  value: T | undefined;
};

export function getInitialState<S>(veditor0: Visitor<void, unknown>): S {
  const acceptor: Acceptors<
    void, string,
    void, StructState,
    void, UnionState,
    void, unknown,
    void, unknown,
    void, unknown
  > = {
    acceptField: function (env: void, fieldfns: FieldFns<unknown>): string {
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
      for (const fd of structDesc) {
        if (USE_DEFAULTS_FOR_STRUCT_FIELDS && fd.default.kind === "just") {
          initialState.fieldStates[fd.name] = fd.veditor.stateFromValue(
            fd.jsonBinding.fromJsonE(fd.default.value)
          );
        } else {
          initialState.fieldStates[fd.name] = fd.veditor.initialState;
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
  return veditor0.visit(undefined, acceptor) as S;
}

export function validate<S>(veditor0: Visitor<unknown, unknown>, vstate: S): string[] {

  const acceptor: AcceptorsIsO<
    string,
    StructState,
    UnionState,
    undefined,
    unknown,
    undefined,
    string[]
  > = {
    acceptField: function (t: string, fieldfns: FieldFns<unknown>): string[] {
      const err = fieldfns.validate(t);
      return err === null ? [] : [err];
    },
    acceptStruct: function (state: StructState, structDesc: StructDescriptor): string[] {
      let errors: string[] = [];
      for (const fd of structDesc) {
        errors = errors.concat(fd.veditor.validate(state.fieldStates[fd.name]).map(err => fd.name + ": " + err));
      }
      return errors;
    },
    acceptUnion: function (state: UnionState, unionDesc: UnionDescriptor): string[] {
      const kind = state.currentField;
      if (kind === null) {
        return ["selection required"];
      }
      if (!unionDesc[kind]) {
        throw new Error("union with invalid kind field");
      }
      return unionDesc[kind].veditor().validate(state.fieldStates[kind]);
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

  return veditor0.visit(vstate, acceptor) as string[];

}


export function stateFromValue<T, S>(veditor0: Visitor<unknown, unknown>, value0: T): S {
  const acceptor: Acceptors<
    unknown, string,
    Record<string, unknown>, StructState,
    SomeUnion, UnionState,
    unknown, unknown,
    unknown, unknown,
    unknown, unknown
  > = {
    acceptField: (value: unknown, fieldfns: FieldFns<unknown>): string => {
      return fieldfns.toText(value);
    },
    acceptStruct: (value: Record<string, unknown>, structDesc: StructDescriptor): StructState => {
      const state: StructState = {
        fieldStates: {},
      };
      for (const fd of structDesc) {
        state.fieldStates[fd.name] = fd.veditor.stateFromValue(value[fd.name]);
      }
      return state;
    },
    acceptUnion: function (uvalue: SomeUnion, unionDesc: UnionDescriptor): UnionState {
      const kind = uvalue.kind;
      if (!kind) {
        throw new Error("union must have kind field");
      }
      const value = uvalue.value === undefined ? null : uvalue.value;
      if (!unionDesc[kind]) {
        throw new Error("union with invalid kind field");
      }
      return {
        currentField: kind,
        selectActive: false,
        fieldStates: { [kind]: unionDesc[kind].veditor().stateFromValue(value) }
      };
    },
    acceptVoid: function (env: unknown): unknown {
      return undefined;
    },
    acceptVector: function (stackState: unknown, props: StructDescriptor | UnionDescriptor): unknown {
      throw new Error("Function not implemented.");
    },
    acceptUnimplemented: function (stackState: unknown, props: AcceptUnimplementedProps): unknown {
      throw new Error("Function not implemented.");
    }
  };
  return veditor0.visit(value0, acceptor) as S;
}

export function valueFromState<T, S>(veditor: Visitor<unknown, unknown>, vstate: S): T {

  const acceptor: AcceptorsOsIs<
    unknown, string,
    Record<string, unknown>, StructState,
    SomeUnion, UnionState,
    unknown, unknown,
    unknown, unknown,
    unknown, unknown
  > = {
    acceptField: (state: string, fieldfns: FieldFns<unknown>): unknown => {
      return fieldfns.fromText(state);
    },
    acceptStruct: (state: StructState, structDesc: StructDescriptor): Record<string, unknown> => {
      const value: Record<string, unknown> = {};
      for (const fd of structDesc) {
        value[fd.name] = fd.veditor.valueFromState(state.fieldStates[fd.name]);
      }
      return value;
    },
    acceptUnion: (state: UnionState, unionDesc: UnionDescriptor): SomeUnion => {
      const kind = state.currentField;
      if (kind === null) {
        throw new Error("BUG: union valueFromState called on invalid state");
      }
      const value = unionDesc[kind].veditor().valueFromState(state.fieldStates[kind]);
      return { kind, value };
    },
    acceptVoid: (env: unknown): unknown => {
      return null;
    },
    acceptVector: (env: unknown, desc: StructDescriptor | UnionDescriptor): unknown => {
      throw new Error("Function not implemented.");
    },
    acceptUnimplemented: (env: unknown, props: AcceptUnimplementedProps): unknown => {
      throw new Error("Function not implemented.");
    }
  };

  return veditor.visit(vstate, acceptor) as T;
}

type SE<S, E> = { state: S, event: E; };

export function update<S, E>(veditor: Visitor<unknown, unknown>, state: S, event: E): S {
  const acceptor: Acceptors<
    SE<string, string>, string,
    SE<StructState, StructEvent>, StructState,
    SE<UnionState, UnionEvent>, UnionState,
    SE<null, null>, null,
    SE<unknown, unknown>, unknown,
    SE<unknown, unknown>, unknown
  > = {
    acceptField: function (env: SE<string, string>, fieldfns: FieldFns<unknown>): string {
      return env.event;
    },
    acceptStruct: function (env: SE<StructState, StructEvent>, structDesc: StructDescriptor): StructState {
      const { state, event } = env;
      if (event.kind === "field") {
        const newFieldStates = {
          ...state.fieldStates
        };
        const fd = structDesc.find(s => s.name === event.field);
        if (!fd) {
          throw new Error("could find a named field " + event.field);
        }
        const newfs = fd.veditor.update(
          state.fieldStates[event.field],
          event.fieldEvent
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
          newFieldStates[field] = unionDesc[field].veditor().initialState;
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
        newFieldStates[field] = unionDesc[field].veditor().update(newFieldStates[field], event.event);
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
  return veditor.visit({ state, event }, acceptor) as S;
}

type RP<S, E> = { state: S, disabled: boolean, onUpdate: UpdateFn<E>; };

export function render<S, E>(veditor: Visitor<unknown, unknown>, factory: Factory, state0: S, disabled0: boolean, onUpdate0: UpdateFn<E>): Rendered {
  const acceptor: Acceptors<
    RP<string, string>, Rendered,
    RP<StructState, StructEvent>, Rendered,
    RP<UnionState, UnionEvent>, Rendered,
    RP<null, null>, Rendered,
    RP<unknown, unknown>, Rendered,
    RP<unknown, unknown>, Rendered
  > = {
    acceptField: function (env: RP<string, string>, fieldfns: FieldFns<unknown>): Rendered {
      const { state, disabled, onUpdate } = env;
      return factory.renderFieldEditor({ fieldfns, disabled, state, onUpdate });
    },
    acceptStruct: function (env: RP<StructState, StructEvent>, structDesc: StructDescriptor): Rendered {
      const { state, disabled, onUpdate } = env;
      const fields: StructFieldProps[] = structDesc.map(fd => ({
        ...fd,
        veditor: {
          veditor: fd.veditor,
          state: state.fieldStates[fd.name],
          onUpdate: event => {
            onUpdate({ kind: "field", field: fd.name, fieldEvent: event });
          }
        }
      }));
      return factory.renderStructEditor({ fields, disabled });
    },
    acceptUnion: function (env: RP<UnionState, UnionEvent>, unionDesc: UnionDescriptor): Rendered {
      const { state, disabled, onUpdate } = env;
      let current: number | null = null;
      if (state.currentField) {
        current = unionDesc[state.currentField] ? unionDesc[state.currentField].index : null;
      }

      const name = (i: number) => {
        const k = Object.keys(unionDesc).find(k => unionDesc[k].index === i);
        if (!k) {
          throw Error("no branch with this index" + i);
        }
        return unionDesc[k].name;
      };

      const selectState: SelectState = {
        current,
        active: state.selectActive,
        choices: Object.keys(unionDesc).map(k => unionDesc[k].label),
        onClick: () => onUpdate({ kind: "toggleActive" }),
        onChoice: (i: number | null) => {
          onUpdate({ kind: "toggleActive" });
          onUpdate({ kind: "switch", field: i === null ? null : name(i) });
        },
      };

      let veditor: VEditorProps<unknown, unknown, unknown> | null = null;
      if (state.currentField) {
        veditor = {
          veditor: unionDesc[state.currentField].veditor(),
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
  return veditor.visit({ state: state0, disabled: disabled0, onUpdate: onUpdate0 }, acceptor) as Rendered;
}
