import * as adlrt from "../../adl-gen/runtime/adl";
import { createJsonBinding, JsonBinding } from '../../adl-gen/runtime/json';
import * as adlast from "../../adl-gen/sys/adlast";
import * as systypes from "../../adl-gen/sys/types";
import { Maybe } from "../../adl-gen/sys/types";
import * as adltree from "../adl-tree";
import { scopedNamesEqual } from "../../adl-gen/runtime/utils";
import { adlPrimitiveFieldFns, maybeField, nullableField } from "../fields/adl";
import { FieldFns } from "../fields/type";
import { fieldLabel } from "./fieldLabel";
import { isMaybe, maybeFromNullable, nullableFromMaybe } from "./maybe-utils";
import { AcceptorsIO, AcceptorsU, AcceptUnimplementedProps, FieldDetails, InternalContext, Mapper, UnionDescriptor, VisitorU } from "./type";

export const nullContext = { scopedDecl: null, field: null };

export function createVisitor<T>(
  typeExpr: adlrt.ATypeExpr<T>,
  declResolver: adlrt.DeclResolver,
): VisitorU {
  const adlTree = adltree.createAdlTree(typeExpr.value, declResolver);
  return createVisitor0(declResolver, nullContext, adlTree, undefined);
}

export function createVisitor0(
  declResolver: adlrt.DeclResolver,
  ctx: InternalContext,
  adlTree: adltree.AdlTree,
  mapper?: Mapper<unknown, unknown>,
): VisitorU {
  const details = adlTree.details();
  switch (details.kind) {
    case "primitive": {
      if (details.ptype === "Void") {
        return voidVisitor();
      } else {
        const fldfns = createField(adlTree);//, customContext, factory);
        if (fldfns === null) {
          return unimplementedVisitor(adlTree.typeExpr);
        }
        return fieldVisitor(fldfns, mapper/* factory, adlTree.typeExpr */);
      }
    }
    case "struct": {
      return structVisitor(declResolver, details)//, mapper);
    }
    case "newtype": {
      // if (adlTree.typeExpr.typeRef.kind === 'reference' && scopedNamesEqual(systypes.snMap, adlTree.typeExpr.typeRef.value)) {
      //   return mapVEditor(declResolver, nullContext, factory, { value: adlTree.typeExpr.parameters[0] }, { value: adlTree.typeExpr.parameters[1] });
      // }
      return createVisitor0(declResolver, nullContext, details.adlTree, mapper);
    }
    case "typedef": {
      return createVisitor0(declResolver, nullContext, details.adlTree, mapper);
    }
    case "union": {
      // When T can be edited in a String field, we can use a string
      // field for Maybe<T> iff the empty string is not a valid value
      // of T.  So Maybe<Int> can be editied in a string field,
      // whereas Maybe<String> cannot.
      if (isMaybe(adlTree.typeExpr)) {
        const fldfns = createFieldForTParam0(adlTree, declResolver);
        if (fldfns && fldfns.validate("") !== null) {
          return fieldVisitor(maybeField(fldfns), mapper /** adlTree.typeExpr */);
        }
      }
      return unionVisitor(declResolver, adlTree, details, mapper);
    }

    case "nullable": {
      const fieldfns = createFieldForTParam0(adlTree, declResolver);
      if (fieldfns !== null && fieldfns.validate("") !== null) {
        return fieldVisitor(nullableField(fieldfns), mapper/**factory, adlTree.typeExpr, */);
      } else {
        // Use a maybe editor for now...
        const maybeTypeExpr = systypes.texprMaybe({ value: details.param.typeExpr });
        const mapper = {
          aFromB: nullableFromMaybe,
          bFromA: maybeFromNullable,
        } as Mapper<unknown, unknown>;
        const adlTree = adltree.createAdlTree(maybeTypeExpr.value, declResolver);
        return createVisitor0(declResolver, nullContext, adlTree, mapper);
        // const mappedVistor = {
        //   ...maybeEditor,
        // };
        // return mappedVistor;
        // return mappedVEditor(maybeEditor, maybeFromNullable, nullableFromMaybe);
      }
    }
    case "vector": {
      // const _underlyingVEditor = createVEditor0(declResolver,nullContext,  details.param, factory);
      return unimplementedVisitor(adlTree.typeExpr);
    }
    case "stringmap": {
      // An veditor over StringMap<T> is implemented in terms of
      // An veditor over sys.types.Map<String,T>
      type MapType = systypes.MapEntry<string, unknown>[];
      interface StringMapType { [key: string]: unknown; }
      const valueType = adlTree.typeExpr.parameters[0];
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
      const mapper = {
        aFromB: stringMapFromMap,
        bFromA: mapFromStringMap,
      } as Mapper<unknown, unknown>;
      return mapEntryVectorVisitor(declResolver, ctx, adlrt.texprString(), { value: valueType }, mapper);
      // const mappedVistor = {
      //   ...underlyingVisitor,
      //   mapping: {
      //     aFromB: stringMapFromMap,
      //     bFromA: mapFromStringMap,
      //   } as Mapper<unknown, unknown>
      // };
      // return mappedVistor;
    }
  }
}

function mapEntryVectorVisitor<K, V>(
  declResolver: adlrt.DeclResolver,
  ctx: InternalContext,
  ktype: adlrt.ATypeExpr<K>,
  vtype: adlrt.ATypeExpr<V>,
  mapper: Mapper<unknown, unknown>,
): VisitorU {
  type MapType = systypes.MapEntry<K, V>[];
  const mapTypeExpr: adlrt.ATypeExpr<MapType> = adlrt.texprVector(systypes.texprMapEntry(ktype, vtype));
  const mapAdlTree = adltree.createAdlTree(mapTypeExpr.value, declResolver);
  return createVisitor0(declResolver, ctx, mapAdlTree, mapper);
}


export function createField(
  adlTree: adltree.AdlTree,
  // ctx: CustomContext,
  // factory: Factory
): FieldFns<unknown> | null {
  let fieldfns = createField1(adlTree);//, ctx, factory);
  if (fieldfns === null) {
    // Try resolving through any typedefs or newtypes
    const adlTree2 = adltree.resolve(adlTree, true, true);
    fieldfns = createField1(adlTree2);//, ctx, factory);
  }
  return fieldfns;
}
function createField1(
  adlTree: adltree.AdlTree,
  // ctx: CustomContext,
  // factory: Factory
): FieldFns<unknown> | null {
  // if (factory) {
  //   const customField = factory.getCustomField(ctx);
  //   if (customField) {
  //     return customField;
  //   }
  // }
  const details = adlTree.details();
  if (details.kind === "primitive") {
    const fieldfns = adlPrimitiveFieldFns(details.ptype);
    if (fieldfns !== null) {
      return fieldfns;
    }
  }
  return null;
}

function createFieldForTParam0(
  adlTree: adltree.AdlTree,
  declResolver: adlrt.DeclResolver
): FieldFns<unknown> | null {
  const adlTree1 = adltree.createAdlTree(adlTree.typeExpr.parameters[0], declResolver);
  // const ctx1 = {
  //   declResolver,
  //   scopedDecl: ctx.scopedDecl,
  //   field: ctx.field,
  //   typeExpr: adlTree.typeExpr.parameters[0]
  // };
  return createField(adlTree1);
}

export function fieldVisitor<T>(fieldfns: FieldFns<T>, mapper?: Mapper<unknown, unknown>): VisitorU {
  function visit(env: unknown, acceptor: AcceptorsU): unknown {
    return acceptor.acceptField(env, { mapper, fieldfns });
  }
  return {
    visit
  };
}

export function structVisitor(
  declResolver: adlrt.DeclResolver,
  struct: adltree.Struct,
  // mapper: MapperOption,
): VisitorU {
  const fieldDetails: FieldDetails[] = struct.fields.map((field, index) => {
    const jsonBinding = createJsonBinding<unknown>(declResolver, { value: field.adlTree.typeExpr });
    const ctx = {
      scopedDecl: { moduleName: struct.moduleName, decl: struct.astDecl },
      field: field.astField
    };
    const visitor = createVisitor0(declResolver, ctx, field.adlTree, undefined);
    return {
      name: field.astField.name,
      index,
      default: field.astField.default,
      jsonBinding,
      label: fieldLabel(field.astField.name),
      visitor,
    };
  });

  function visit<I, O>(env: I, acceptor: AcceptorsIO<I, O>): O {
    return acceptor.acceptStruct(env, { fieldDetails });
  }

  return {
    visit
  };
}

export function unionVisitor(
  declResolver: adlrt.DeclResolver,
  _adlTree: adltree.AdlTree,
  union: adltree.Union,
  mapper?: Mapper<unknown, unknown>,
): VisitorU {

  const unionDesc: UnionDescriptor = {
    branchDetails: {},
    mapper
  };

  union.fields.forEach((field, index) => {
    const formLabel = fieldLabel(field.astField.name);
    const ctx = {
      scopedDecl: { moduleName: union.moduleName, decl: union.astDecl },
      field: field.astField
    };
    unionDesc.branchDetails[field.astField.name] = {
      name: field.astField.name,
      label: formLabel,
      index,
      visitor: () => createVisitor0(declResolver, ctx, field.adlTree, undefined)
    };
  });

  function visit<I, O>(env: I, acceptor: AcceptorsIO<I, O>): O {
    return acceptor.acceptUnion(env, unionDesc);
  }

  return {
    visit
  };
}

export function voidVisitor(): VisitorU {
  function visit<I, O>(env: I, acceptor: AcceptorsIO<I, O>): O {
    return acceptor.acceptVoid(env);
  }
  return {
    visit,
  };
}

export function vectorVisitor(): VisitorU {
  function visit<I, O>(env: I, acceptor: AcceptorsIO<I, O>): O {
    throw new Error("not implemented");
  }
  return {
    visit,
  };
}

export function unimplementedVisitor(typeExpr: adlast.TypeExpr): VisitorU {
  function visit<I, O>(env: I, acceptor: AcceptorsIO<I, O>): O {
    return acceptor.acceptUnimplemented(env, { typeExpr });
  }
  return {
    visit,
  };
}
