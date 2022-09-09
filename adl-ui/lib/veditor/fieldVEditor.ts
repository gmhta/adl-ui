import * as adlast from "../../adl-gen/sys/adlast";
import { AcceptorsIO, IVEditor, UVEditor } from "./type";
import { FieldFns } from "../fields/type";
import { Factory } from "./adlfactory";

export function fieldVEditor<T>(factory: Factory, _typeExpr: adlast.TypeExpr, fieldfns: FieldFns<T>): UVEditor {
  function validate(t: string): string[] {
    const err = fieldfns.validate(t);
    return err === null ? [] : [err];
  }

  function visit<I,O>(env: I, acceptor: AcceptorsIO<I,O>): O {
    return acceptor.acceptField(env, fieldfns );
  }

  const veditor: IVEditor<T, string, string> = {
    initialState: "",
    getInitialState: () => "",
    stateFromValue: fieldfns.toText,
    validate,
    valueFromState: fieldfns.fromText,
    update: (_s, e) => e,
    visit,
    render: (state, disabled, onUpdate) => factory.renderFieldEditor({ fieldfns, disabled, state, onUpdate }),
  };

  return veditor;
}
