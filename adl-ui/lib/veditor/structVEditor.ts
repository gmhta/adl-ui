import * as adlrt from "../../adl-gen/runtime/adl";
import { createJsonBinding, JsonBinding } from '../../adl-gen/runtime/json';
import { Maybe } from "../../adl-gen/sys/types";
import * as adltree from "../adl-tree";
import { IVEditor, UVEditor, UpdateFn, Rendered, AcceptorsIO } from "./type";
import { Factory, createVEditor0, nullContext, StructFieldProps } from "./adlfactory";
import { fieldLabel } from "./fieldLabel";
import { getInitialState, render, stateFromValue, update, validate, valueFromState } from "./state-value-transforms";


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

export type StructDescriptor = FieldDetails[];

export type FieldDetails = {
  name: string;
  index: number;
  default: Maybe<{} | null>;
  jsonBinding: JsonBinding<unknown>;
  label: string;
  veditor: IVEditor<unknown, unknown, unknown>;
};

export function structVEditor(
  factory: Factory,
  declResolver: adlrt.DeclResolver,
  struct: adltree.Struct): IVEditor<unknown, StructState, StructEvent> {
  const structDesc: FieldDetails[] = struct.fields.map((field, index) => {
    const jsonBinding = createJsonBinding<unknown>(declResolver, { value: field.adlTree.typeExpr });
    const ctx = {
      scopedDecl: { moduleName: struct.moduleName, decl: struct.astDecl },
      field: field.astField
    };
    const veditor = createVEditor0(declResolver, ctx, field.adlTree, factory);
    return {
      name: field.astField.name,
      index,
      default: field.astField.default,
      jsonBinding,
      label: fieldLabel(field.astField.name),
      veditor,
    };
  });

  const veditorsByName: Record<string, UVEditor> = {};
  const initialState: StructState = { fieldStates: {} };

  // It's unclear what the initialState for an empty struct
  // editor should be... either every field empty, or
  // with default values filled in for those fields that have
  // defaults specified. the flag below set's this behaviour, though
  // we may want to change initialState to be a function that takes
  // this as a parameter.
  const USE_DEFAULTS_FOR_STRUCT_FIELDS = true;

  for (const fd of structDesc) {
    veditorsByName[fd.name] = fd.veditor;
    if (USE_DEFAULTS_FOR_STRUCT_FIELDS && fd.default.kind === "just") {
      initialState.fieldStates[fd.name] = fd.veditor.stateFromValue(
        fd.jsonBinding.fromJsonE(fd.default.value)
      );
    } else {
      initialState.fieldStates[fd.name] = fd.veditor.getInitialState();
    }
  }

  function visit<I, O>(env: I, acceptor: AcceptorsIO<I, O>): O {
    return acceptor.acceptStruct(env, structDesc);
  }

  const thisVEditor = {
    initialState,
    visit,
  };

  return {
    ...thisVEditor,
    getInitialState: () => {
      return getInitialState(thisVEditor);
    },
    validate: (state: StructState) => {
      return validate(thisVEditor, state);
    },
    valueFromState: (state: StructState) => {
      return valueFromState(thisVEditor, state);
    },
    stateFromValue: (value: Record<string, unknown>) => {
      return stateFromValue(thisVEditor, value);
    },
    update: (state: StructState, event: StructEvent): StructState => {
      return update(thisVEditor, state, event);
    },
    render: (state: StructState, disabled: boolean, onUpdate: UpdateFn<StructEvent>): Rendered => {
      return render(thisVEditor, factory, state, disabled, onUpdate);
    }
  };
}
