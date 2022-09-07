import { IVEditor } from "./type";
import { Acceptors, Factory } from "./adlfactory";

export function voidVEditor(factory: Factory): IVEditor<null, null, null> {

  function visit<I,O>(stackState: I, _state: unknown, acceptor: Acceptors<I,O>): O {
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
