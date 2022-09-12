import * as adlast from "../../adl-gen/sys/adlast";
import { UVEditor, AcceptorsIO } from "./type";
import { Factory } from "./adlfactory";

export function unimplementedVEditor(factory: Factory, typeExpr: adlast.TypeExpr): UVEditor {

  function visit<I,O>(env: I, acceptor: AcceptorsIO<I,O>): O {
    return acceptor.acceptUnimplemented(env, { typeExpr });
  }

  return {
    getInitialState: () => null,
    stateFromValue: () => null,
    validate: () => [],
    valueFromState: () => null,
    update: () => { },
    visit,
    render: () => factory.renderUnimplementedEditor({ typeExpr }),
  };
}
