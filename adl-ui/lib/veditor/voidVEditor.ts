import { IVEditor } from "./type";
import { UAcceptors, Factory } from "./adlfactory";

export function voidVEditor(factory: Factory): IVEditor<null, null, null> {

  function visit(stackState: unknown, _state: unknown, acceptor: UAcceptors): unknown {
    return acceptor.acceptVoid(stackState, {});
  }

  return {
    initialState: null,
    stateFromValue: () => null,
    validate: () => [],
    valueFromState: () => null,
    update: s => s,
    visit,
    render: () => factory.renderVoidEditor(),
  };

}
