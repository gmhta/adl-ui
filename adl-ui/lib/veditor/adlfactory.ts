// Identify the context for customization

import * as adlrt from "../../adl-gen/runtime/adl";
import * as adlast from "../../adl-gen/sys/adlast";
import * as systypes from "../../adl-gen/sys/types";
import * as adltree from "../adl-tree";

import { IVEditor, UVEditor, UpdateFn, Rendered } from "./type";
import { FieldFns } from "../fields/type";
import { scopedNamesEqual } from "../../adl-gen/runtime/utils";
import { maybeField, nullableField } from "../fields/adl";
import { SelectState } from "../select";
import { createField } from "./createField";
import { voidVEditor } from "./voidVEditor";
import { unimplementedVEditor } from "./unimplementedVEditor";
import { mapVEditor, mappedVEditor, mapEntryVectorVEditor } from "./mapVEditor";
import { unionVEditor } from "./unionVEditor";
import { structVEditor } from "./structVEditor";
import { fieldVEditor } from "./fieldVEditor";

/**
 * Construct a VEditor from a a specified ADL type
 */
export function createVEditor<T>(
  typeExpr: adlrt.ATypeExpr<T>,
  declResolver: adlrt.DeclResolver,
  factory: Factory
): IVEditor<T, unknown, unknown> {
  const adlTree = adltree.createAdlTree(typeExpr.value, declResolver);
  return createVEditor0(declResolver, nullContext, adlTree, factory) as IVEditor<
    T,
    unknown,
    unknown
  >;
}

export interface CustomContext {
  declResolver: adlrt.DeclResolver;
  scopedDecl: adlast.ScopedDecl | null;
  field: adlast.Field | null;
  typeExpr: adlast.TypeExpr;
}


export interface Factory {
  getCustomVEditor(ctx: CustomContext): UVEditor | null;
  getCustomField(ctx: CustomContext): FieldFns<unknown> | null;

  renderFieldEditor(props: FieldEditorProps): Rendered;
  renderStructEditor(props: StructEditorProps): Rendered;
  renderUnionEditor(props: UnionEditorProps): Rendered;
  renderVoidEditor(): Rendered;
  renderNullableEditor?(props: FieldEditorProps): Rendered;

  renderUnimplementedEditor(props: UnimplementedEditorProps): Rendered;
}

export interface Acceptors<I, O> {
  acceptField(stackState: I, props: AcceptFieldProps): O;
  acceptStruct(stackState: I, props: AcceptStructProps): O;
  acceptUnion(stackState: I, props: AcceptUnionProps): O;
  acceptVoid(stackState: I, props: AcceptVoidProps): O;
  acceptMaybe(stackState: I, props: AcceptMaybeProps): O;
  acceptVector(stackState: I, props: AcceptVectorProps): O;
  acceptUnimplemented(stackState: I, props: AcceptUnimplementedProps): O;
}

export type UAcceptors = Acceptors<unknown, unknown>;

export interface AcceptFieldProps {
  // name: string;
  fieldfns: FieldFns<unknown>;
  state: string;
}
export interface AcceptStructProps {
  // name: string;
  // label: string;
  fields: AcceptStructFieldProps[];
}
interface AcceptStructFieldProps {
  name: string;
  label: string;
  veditor: UVEditor;
  state: unknown;
}
export type AcceptUnionProps = AcceptUnionPropsSet | AcceptUnionPropsUnset;
export interface AcceptUnionPropsUnset {
  kind: "unset";
}
export interface AcceptUnionPropsSet {
  kind: "set";
  branch: string;
  state: UnionState;
  veditor: UVEditor | null;
}
export interface AcceptVoidProps { }
export interface AcceptMaybeProps { }
export interface AcceptVectorProps { }
export interface AcceptUnimplementedProps {
  typeExpr: adlast.TypeExpr;
}

// interface AcceptVEditorProps<T, S, E> {
//   veditor: IVEditor<T, S, E>;
//   state: S;
//   // onUpdate: (e: E) => void;
// }


export interface FieldEditorProps {
  fieldfns: FieldFns<unknown>;
  disabled: boolean;
  state: string;
  onUpdate: UpdateFn<string>;
};

export interface StructEditorProps {
  fields: StructFieldProps[];
  disabled: boolean;
}

export interface StructFieldProps {
  name: string;
  label: string;
  veditor: VEditorProps<unknown, unknown, unknown>;
}

export interface UnionEditorProps {
  selectState: SelectState,
  veditor: VEditorProps<unknown, unknown, unknown> | null;
  disabled: boolean;
}

export interface VEditorProps<T, S, E> {
  veditor: IVEditor<T, S, E>;
  state: S;
  onUpdate: (e: E) => void;
}


export interface UnimplementedEditorProps {
  typeExpr: adlast.TypeExpr;
}

export interface InternalContext {
  scopedDecl: adlast.ScopedDecl | null;
  field: adlast.Field | null;
}

export const nullContext = { scopedDecl: null, field: null };

export function createVEditor0(
  declResolver: adlrt.DeclResolver,
  ctx: InternalContext,
  adlTree: adltree.AdlTree,
  factory: Factory,
): IVEditor<unknown, unknown, unknown> {
  const customContext = {
    declResolver,
    scopedDecl: ctx.scopedDecl,
    field: ctx.field,
    typeExpr: adlTree.typeExpr
  };

  // Use a custom editor if available
  const customVEditor = factory.getCustomVEditor(customContext);
  if (customVEditor !== null) {
    return customVEditor;
  }
  const customField = factory.getCustomField(customContext);
  if (customField) {
    return fieldVEditor(factory, adlTree.typeExpr, customField);
  }

  // Otherwise construct a standard one

  const details = adlTree.details();
  switch (details.kind) {
    case "primitive":
      if (details.ptype === "Void") {
        return voidVEditor(factory);
      } else {
        const fldfns = createField(adlTree, customContext, factory);
        if (fldfns === null) {
          return unimplementedVEditor(factory, adlTree.typeExpr);
        }
        return fieldVEditor(factory, adlTree.typeExpr, fldfns);
      }

    case "struct": {
      return structVEditor(factory, declResolver, details);
    }

    case "newtype":
      if (adlTree.typeExpr.typeRef.kind === 'reference' && scopedNamesEqual(systypes.snMap, adlTree.typeExpr.typeRef.value)) {
        return mapVEditor(declResolver, nullContext, factory, { value: adlTree.typeExpr.parameters[0] }, { value: adlTree.typeExpr.parameters[1] });
      }
      return createVEditor0(declResolver, nullContext, details.adlTree, factory);

    case "typedef":
      return createVEditor0(declResolver, nullContext, details.adlTree, factory);

    case "union": {
      // When T can be edited in a String field, we can use a string
      // field for Maybe<T> iff the empty string is not a valid value
      // of T.  So Maybe<Int> can be editied in a string field,
      // whereas Maybe<String> cannot.
      if (isMaybe(adlTree.typeExpr)) {
        const fldfns = createFieldForTParam0(adlTree, customContext, factory, declResolver);
        if (fldfns && fldfns.validate("") !== null) {
          return fieldVEditor(factory, adlTree.typeExpr, maybeField(fldfns));
        }
      }


      return unionVEditor(factory, declResolver, adlTree, details);
    }

    case "nullable":
      const fieldfns = createFieldForTParam0(adlTree, customContext, factory, declResolver);
      if (fieldfns !== null && fieldfns.validate("") !== null) {
        return fieldVEditor(factory, adlTree.typeExpr, nullableField(fieldfns));
      } else {
        // Use a maybe editor for now...
        const maybeTypeExpr = systypes.texprMaybe({ value: details.param.typeExpr });
        const maybeEditor = createVEditor(maybeTypeExpr, declResolver, factory);

        return mappedVEditor(maybeEditor, maybeFromNullable, nullableFromMaybe);
      }

    case "vector": {
      // const _underlyingVEditor = createVEditor0(declResolver,nullContext,  details.param, factory);
      return unimplementedVEditor(factory, adlTree.typeExpr);
    }

    case "stringmap":
      // An veditor over StringMap<T> is implemented in terms of
      // An veditor over sys.types.Map<String,T>
      type MapType = systypes.MapEntry<string, unknown>[];
      interface StringMapType { [key: string]: unknown; }
      const valueType = adlTree.typeExpr.parameters[0];
      const underlyingVEditor = mapEntryVectorVEditor(declResolver, ctx, factory, adlrt.texprString(), { value: valueType });
      const stringMapFromMap = (m: MapType): StringMapType => {
        const result: StringMapType = {};
        for (const me of m) {
          result[me.key] = me.value;
        }
        return result;
      };
      const mapFromStringMap = (m: StringMapType): MapType => {
        return Object.keys(m).map(k => ({ key: k, value: m[k] }));
      };
      return mappedVEditor(
        underlyingVEditor,
        mapFromStringMap,
        stringMapFromMap,
      );
  }
}

interface StructFieldStates {
  [key: string]: unknown;
}

export interface StructState {
  fieldStates: StructFieldStates;
}

interface StructFieldEvent {
  kind: "field";
  field: string;
  fieldEvent: unknown;
}

export type StructEvent = StructFieldEvent;

export type VField = {
  field: adltree.Field;
  veditor: UVEditor;
};


// Convert snake/camel case to human readable spaced name
export function fieldLabel(name: string): string {
  return (
    name
      // insert a space before all caps
      .replace(/([A-Z])/g, " $1")
      // uppercase the first character
      .replace(/^./, function (str) {
        return str.toUpperCase();
      })
      // replace _ with space
      .replace(/_/g, " ")
  );
}


export interface UnionState {
  currentField: string | null;
  selectActive: boolean,
  fieldStates: { [key: string]: unknown; };
}

interface UnionToggleActive {
  kind: "toggleActive",
} // Show the dropdown
interface UnionSetField {
  kind: "switch";
  field: string | null;
} // Switch the discriminator
interface UnionUpdate {
  kind: "update";
  event: unknown;
} // Update the value
export type UnionEvent = UnionToggleActive | UnionSetField | UnionUpdate;

export interface SomeUnion {
  kind: string;
  value: unknown;
}

function createFieldForTParam0(
  adlTree: adltree.AdlTree,
  ctx: CustomContext,
  factory: Factory,
  declResolver: adlrt.DeclResolver
): FieldFns<unknown> | null {
  const adlTree1 = adltree.createAdlTree(adlTree.typeExpr.parameters[0], declResolver);
  const ctx1 = {
    declResolver,
    scopedDecl: ctx.scopedDecl,
    field: ctx.field,
    typeExpr: adlTree.typeExpr.parameters[0]
  };
  return createField(adlTree1, ctx1, factory);
}

function isEnum(fields: adltree.Field[]): boolean {
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

function isMaybe(typeExpr: adlast.TypeExpr): boolean {
  if (typeExpr.typeRef.kind === "reference") {
    return (
      typeExpr.typeRef.value.moduleName === "sys.types" && typeExpr.typeRef.value.name === "Maybe"
    );
  }
  return false;
}

function maybeFromNullable<T>(value: T | null): systypes.Maybe<T> {
  if (value === null) {
    return { kind: 'nothing' };
  } else {
    return { kind: 'just', value };
  }
}

// This function only works for types T which don't have null as
// a value.
function nullableFromMaybe<T>(value: systypes.Maybe<T>): T | null {
  if (value.kind === 'just') {
    return value.value;
  } else {
    return null;
  }
}