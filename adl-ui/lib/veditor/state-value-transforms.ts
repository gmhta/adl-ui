import { 
  Acceptors,
  AcceptFieldProps,
  AcceptMaybeProps,
  AcceptStructProps,
  AcceptUnimplementedProps,
  AcceptUnionProps,
  AcceptVectorProps,
  AcceptVoidProps,
} from "./adlfactory";
import { Visitor } from "./type";

export type TandErrors<T> = {
  errors: string[];
  value: T | undefined;
};

export function valueFromState<T, S>(veditor: Visitor<void, TandErrors<unknown>, S>, vstate: S): TandErrors<T> {

  const acceptor: Acceptors<void, TandErrors<unknown>> = {
    acceptField: function (_stackState: void, props: AcceptFieldProps): TandErrors<unknown> {
      const error = props.fieldfns.validate(props.state);
      if (error === null) {
        return { errors: [], value: props.fieldfns.fromText(props.state) };
      }
      return { errors: [error], value: undefined };
    },
    acceptStruct: function (_stackState: void, props: AcceptStructProps): TandErrors<unknown> {
      const errors: string[] = [];
      const obj: Record<string,unknown> = {};
      props.fields.forEach(fd => {
        const fdr = fd.veditor.visit(undefined, fd.state, acceptor);
        errors.push(...fdr.errors);
        obj[fd.name] = fdr.value;
      });
      return { errors: errors, value: obj };
    },
    acceptUnion: function (_stackState: void, props: AcceptUnionProps): TandErrors<unknown> {
      if (props.kind === "set") {
        if (props.veditor !== null && props.state.currentField !== null) {
          const ur = props.veditor.visit(
            undefined,
            props.state.fieldStates[props.state.currentField],
            acceptor
          );
          // void type
          if (ur.errors.length === 0 && ur.value === undefined) {
            return { errors: [], value: props.branch };
          }
          if (ur.errors.length !== 0) {
            return { errors: ur.errors, value: undefined };
          }
          const obj: Record<string,unknown> = {};
          obj[props.branch] = ur.value;
          return { errors: [], value: obj };
        } else {
          return { errors: ["not implemented acceptUnion props.veditor is null"], value: undefined };
        }
      } else {
        return { errors: ["union not set"], value: undefined };
      }
    },
    acceptVoid: function (_stackState: void, props: AcceptVoidProps): TandErrors<unknown> {
      return { errors: [], value: undefined };
    },
    acceptMaybe: function (_stackState: void, props: AcceptMaybeProps): TandErrors<unknown> {
      return { errors: ["not implemented acceptMaybe"], value: undefined };
    },
    acceptVector: function (_stackState: void, props: AcceptVectorProps): TandErrors<unknown> {
      return { errors: ["not implemented acceptVector"], value: undefined };
    },
    acceptUnimplemented: function (_stackState: void, props: AcceptUnimplementedProps): TandErrors<unknown> {
      return { errors: ["not implemented acceptUnimplemented"], value: undefined };
    }
  };

  return veditor.visit(undefined, vstate, acceptor) as TandErrors<T>;
}

