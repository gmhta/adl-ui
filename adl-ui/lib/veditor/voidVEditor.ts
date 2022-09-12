import { AcceptorsIO, IVEditor } from "./type";
import { Factory } from "./adlfactory";

export function voidVEditor(factory: Factory): IVEditor<null, null, null> {

  function visit<I, O>(env: I, acceptor: AcceptorsIO<I, O>): O {
    return acceptor.acceptVoid(env);
  }

  return {
    getInitialState: () => null,
    stateFromValue: () => null,
    validate: () => [],
    valueFromState: () => null,
    update: s => s,
    visit,
    render: () => factory.renderVoidEditor(),
  };

}
