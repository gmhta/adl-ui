import * as adlast from "../../adl-gen/sys/adlast";
import { IVEditor, UVEditor } from "./type";
import { FieldFns } from "../fields/type";
import { Acceptors, Factory } from "./adlfactory";

export function fieldVEditor<T>(factory: Factory, _typeExpr: adlast.TypeExpr, fieldfns: FieldFns<T>): UVEditor {
  function validate(t: string): string[] {
    const err = fieldfns.validate(t);
    return err === null ? [] : [err];
  }

  function visit<I,O>(stackState: I, state: string, acceptor: Acceptors<I,O>): O {
    return acceptor.acceptField(stackState, { fieldfns, state } );
  }

  const veditor: IVEditor<T, string, string> = {
    initialState: "",
    stateFromValue: fieldfns.toText,
    validate,
    valueFromState: fieldfns.fromText,
    update: (_s, e) => e,
    visit,
    render: (state, disabled, onUpdate) => factory.renderFieldEditor({ fieldfns, disabled, state, onUpdate }),
  };

  return veditor;
}
