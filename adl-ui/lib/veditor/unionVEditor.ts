import * as adlrt from "../../adl-gen/runtime/adl";
import * as adltree from "../adl-tree";
import { IVEditor, AcceptorsIO, UpdateFn, Rendered } from "./type";
import { SelectState } from "../select";
import { Factory, createVEditor0, VEditorProps } from "./adlfactory";
import { fieldLabel } from "./fieldLabel";
import { getInitialState, render, stateFromValue, update, validate, valueFromState } from "./state-value-transforms";

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

export type UnionDescriptor = Record<string, UnionBranch>;

export type UnionBranch = {
  name: string;
  label: string;
  index: number;
  veditor: () => IVEditor<unknown, unknown, unknown>;
};

export function unionVEditor(
  factory: Factory,
  declResolver: adlrt.DeclResolver,
  _adlTree: adltree.AdlTree,
  union: adltree.Union
): IVEditor<SomeUnion, UnionState, UnionEvent> {

  const unionDesc: UnionDescriptor = {};

  union.fields.forEach((field, index) => {
    const formLabel = fieldLabel(field.astField.name);
    const ctx = {
      scopedDecl: { moduleName: union.moduleName, decl: union.astDecl },
      field: field.astField
    };
    unionDesc[field.astField.name] = {
      name: field.astField.name,
      label: formLabel,
      index,
      veditor: () => createVEditor0(declResolver, ctx, field.adlTree, factory)
    };
  });

  const initialState = { currentField: null, selectActive: false, fieldStates: {} };

  function visit<I, O>(env: I, acceptor: AcceptorsIO<I, O>): O {
    return acceptor.acceptUnion(env, unionDesc);
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
    validate: (state: UnionState): string[] => {
      return validate(thisVEditor, state);
    },
    valueFromState: (state: UnionState): SomeUnion => {
      return valueFromState(thisVEditor, state);
    },
    stateFromValue: (uvalue: SomeUnion): UnionState => {
      return stateFromValue(thisVEditor, uvalue);
    },
    update: (state: UnionState, event: UnionEvent): UnionState => {
      return update(thisVEditor, state, event);
    },
    render: (state: UnionState, disabled: boolean, onUpdate: UpdateFn<UnionEvent>): Rendered => {
      return render(thisVEditor, factory, state, disabled, onUpdate);
    }
  };
}
