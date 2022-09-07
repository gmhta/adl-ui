import * as adlast from "../../adl-gen/sys/adlast";
import { UVEditor } from "./type";
import { Acceptors, Factory } from "./adlfactory";

export function unimplementedVEditor(factory: Factory, typeExpr: adlast.TypeExpr): UVEditor {

  function visit<I,O>(stackState: I, _state: unknown, acceptor: Acceptors<I,O>): O {
    return acceptor.acceptUnimplemented(stackState, { typeExpr });
  }

  return {
    initialState: null,
    stateFromValue: () => null,
    validate: () => [],
    valueFromState: () => null,
    update: () => { },
    visit,
    render: () => factory.renderUnimplementedEditor({ typeExpr }),
  };
}
