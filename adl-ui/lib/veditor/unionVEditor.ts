import * as adlrt from "../../adl-gen/runtime/adl";
import * as adltree from "../adl-tree";
import { IVEditor, UVEditor, UpdateFn, Rendered } from "./type";
import { SelectState } from "../select";
import { Factory, SomeUnion, UnionState, UnionEvent, fieldLabel, createVEditor0, VEditorProps, UAcceptors } from "./adlfactory";

export function unionVEditor(
  factory: Factory,
  declResolver: adlrt.DeclResolver,
  _adlTree: adltree.AdlTree,
  union: adltree.Union): IVEditor<SomeUnion, UnionState, UnionEvent> {

  const fieldDetails = union.fields.map(field => {
    const formLabel = fieldLabel(field.astField.name);
    const ctx = {
      scopedDecl: { moduleName: union.moduleName, decl: union.astDecl },
      field: field.astField
    };

    return {
      name: field.astField.name,
      label: formLabel,
      veditor: () => createVEditor0(declResolver, ctx, field.adlTree, factory)
    };
  });

  const veditorsByName: { [name: string]: () => UVEditor; } = {};
  for (const fd of fieldDetails) {
    veditorsByName[fd.name] = fd.veditor;
  }

  const initialState = { currentField: null, selectActive: false, fieldStates: {} };

  function stateFromValue(uvalue: SomeUnion): UnionState {
    const kind = uvalue.kind;
    if (!kind) {
      throw new Error("union must have kind field");
    }
    const value = uvalue.value === undefined ? null : uvalue.value;
    const veditor = veditorsByName[kind]();
    if (!veditor) {
      throw new Error("union with invalid kind field");
    }
    return {
      currentField: kind,
      selectActive: false,
      fieldStates: { [kind]: veditor.stateFromValue(value) }
    };
  }

  function validate(state: UnionState): string[] {
    const kind = state.currentField;
    if (kind === null) {
      return ["selection required"];
    }
    return veditorsByName[kind]().validate(state.fieldStates[kind]);
  }

  function valueFromState(state: UnionState): SomeUnion {
    const kind = state.currentField;
    if (kind === null) {
      throw new Error("BUG: union valueFromState called on invalid state");
    }
    const value = veditorsByName[kind]().valueFromState(state.fieldStates[kind]);
    return { kind, value };
  }

  function visit(stackState: unknown, state: UnionState, acceptor: UAcceptors): unknown {
    if (!state) {
      return acceptor.acceptUnion(
        stackState,
        { kind: "unset" },
      )
    }
    if (!state.currentField) {
      return acceptor.acceptUnion(
        stackState,
        { kind: "unset" },
      )
    }
    const kind = state.currentField;
    if (kind === null) {
      throw new Error("BUG: union visit called on invalid state");
    }
    return acceptor.acceptUnion(
      stackState,
      {
        kind: "set",
        branch: kind,
        veditor: veditorsByName[kind](),
        state: state,
      }
    );
  }


  function update(state: UnionState, event: UnionEvent): UnionState {
    if (event.kind === "toggleActive") {
      return {
        ...state,
        selectActive: !state.selectActive,
      };
    } else if (event.kind === "switch") {
      const field = event.field;
      const newFieldStates = { ...state.fieldStates };
      if (field && !newFieldStates[field]) {
        newFieldStates[field] = veditorsByName[field]().initialState;
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
      newFieldStates[field] = veditorsByName[field]().update(newFieldStates[field], event.event);
      return {
        ...state,
        fieldStates: newFieldStates
      };
    } else {
      return state;
    }
  }

  function render(state: UnionState, disabled: boolean, onUpdate: UpdateFn<UnionEvent>): Rendered {

    let current: number | null = null;
    if (state.currentField) {
      current = fieldDetails.findIndex(fd => fd.name == state.currentField);
    }

    const selectState: SelectState = {
      current,
      active: state.selectActive,
      choices: fieldDetails.map(fd => fd.label),
      onClick: () => onUpdate({ kind: "toggleActive" }),
      onChoice: (i: number | null) => {
        onUpdate({ kind: "toggleActive" });
        onUpdate({ kind: "switch", field: i === null ? null : fieldDetails[i].name });
      },
    };

    let veditor: VEditorProps<unknown, unknown, unknown> | null = null;
    if (state.currentField) {
      veditor = {
        veditor: veditorsByName[state.currentField](),
        state: state.fieldStates[state.currentField],
        onUpdate: event => onUpdate({ kind: "update", event })
      };
    }

    return factory.renderUnionEditor({ selectState, disabled, veditor });
  }

  return {
    initialState,
    stateFromValue,
    validate,
    valueFromState,
    update,
    visit,
    render
  };
}
