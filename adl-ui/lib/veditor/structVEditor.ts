import * as adlrt from "../../adl-gen/runtime/adl";
import * as adltree from "../adl-tree";
import { createJsonBinding } from '../../adl-gen/runtime/json';
import { IVEditor, UVEditor, UpdateFn, Rendered } from "./type";
import { Factory, StructState, StructEvent, createVEditor0, nullContext, fieldLabel, StructFieldProps, Acceptors } from "./adlfactory";

export function structVEditor(
  factory: Factory,
  declResolver: adlrt.DeclResolver,
  struct: adltree.Struct): IVEditor<unknown, StructState, StructEvent> {
  const fieldDetails = struct.fields.map(field => {
    const veditor = createVEditor0(declResolver, nullContext, field.adlTree, factory);
    const jsonBinding = createJsonBinding<unknown>(declResolver, { value: field.adlTree.typeExpr });

    return {
      name: field.astField.name,
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

  for (const fd of fieldDetails) {
    veditorsByName[fd.name] = fd.veditor;
    if (USE_DEFAULTS_FOR_STRUCT_FIELDS && fd.default.kind === "just") {
      initialState.fieldStates[fd.name] = fd.veditor.stateFromValue(
        fd.jsonBinding.fromJsonE(fd.default.value)
      );
    } else {
      initialState.fieldStates[fd.name] = fd.veditor.initialState;
    }
  }

  function stateFromValue(value: Record<string, unknown>) {
    const state: StructState = {
      fieldStates: {},
    };
    for (const fd of fieldDetails) {
      state.fieldStates[fd.name] = fd.veditor.stateFromValue(value[fd.name]);
    }
    return state;
  }

  function validate(state: StructState) {
    let errors: string[] = [];
    for (const fd of fieldDetails) {
      errors = errors.concat(fd.veditor.validate(state.fieldStates[fd.name]).map(err => fd.name + ": " + err));
    }
    return errors;
  }

  function valueFromState(state: StructState) {
    const value: Record<string, unknown> = {};
    for (const fd of fieldDetails) {
      value[fd.name] = fd.veditor.valueFromState(state.fieldStates[fd.name]);
    }
    return value;
  }

  function visit<I,O>(stackState: I, state: StructState, acceptor: Acceptors<I,O>): O {
    return acceptor.acceptStruct(stackState, {
      fields: fieldDetails.map(fd => ({
        name: fd.name,
        label: fd.label,
        veditor: fd.veditor,
        state: state.fieldStates[fd.name],
      }))
    });
  }

  function update(state: StructState, event: StructEvent): StructState {
    if (event.kind === "field") {
      const newFieldStates = {
        ...state.fieldStates
      };
      const newfs = veditorsByName[event.field].update(
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
  }

  function render(
    state: StructState,
    disabled: boolean,
    onUpdate: UpdateFn<StructEvent>
  ): Rendered {
    const fields: StructFieldProps[] = fieldDetails.map(fd => ({
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
