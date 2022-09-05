import * as adlast from "../../adl-gen/sys/adlast";
import { UVEditor } from "./type";
import { UAcceptors, Factory } from "./adlfactory";

export function unimplementedVEditor(factory: Factory, typeExpr: adlast.TypeExpr): UVEditor {

  function visit(stackState: unknown, _state: unknown, acceptor: UAcceptors): unknown {
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
