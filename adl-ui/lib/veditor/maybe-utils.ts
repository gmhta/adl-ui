import * as adlast from "../../adl-gen/sys/adlast";
import * as systypes from "../../adl-gen/sys/types";
import * as adltree from "../adl-tree";

export function isMaybe(typeExpr: adlast.TypeExpr): boolean {
  if (typeExpr.typeRef.kind === "reference") {
    return (
      typeExpr.typeRef.value.moduleName === "sys.types" && typeExpr.typeRef.value.name === "Maybe"
    );
  }
  return false;
}
export function maybeFromNullable<T>(value: T | null): systypes.Maybe<T> {
  if (value === null) {
    return { kind: 'nothing' };
  } else {
    return { kind: 'just', value };
  }
}
// This function only works for types T which don't have null as
// a value.
export function nullableFromMaybe<T>(value: systypes.Maybe<T>): T | null {
  if (value.kind === 'just') {
    return value.value;
  } else {
    return null;
  }
}

export function isEnum(fields: adltree.Field[]): boolean {
  for (const f of fields) {
    const isVoid =
      f.astField.typeExpr.typeRef.kind === "primitive" &&
      f.astField.typeExpr.typeRef.value === "Void";
    if (!isVoid) {
      return false;
    }
  }
  return true;
}
