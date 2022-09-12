import * as adlrt from "../../adl-gen/runtime/adl";
import { createJsonBinding, JsonBinding } from '../../adl-gen/runtime/json';
import * as adlast from "../../adl-gen/sys/adlast";
import * as systypes from "../../adl-gen/sys/types";
import { Maybe } from "../../adl-gen/sys/types";
import * as adltree from "../adl-tree";
import { scopedNamesEqual, typeExprsEqual } from "../../adl-gen/runtime/utils";
import { adlPrimitiveFieldFns, maybeField, nullableField } from "../fields/adl";
import { FieldFns } from "../fields/type";
import { fieldLabel } from "./fieldLabel";
import { isMaybe, maybeFromNullable, nullableFromMaybe } from "./maybe-utils";
import {
  AcceptorsIO,
  AcceptorsU,
  AcceptUnimplementedProps,
  AdlTypeMapper,
  FieldDetails,
  InternalContext,
  Mapper,
  Override,
  StructDescriptor,
  UnionDescriptor,
  VisitorU
} from "./type";

export const nullContext = { scopedDecl: null, field: null };

export function createVisitor<T>(
  typeExpr: adlrt.ATypeExpr<T>,
  declResolver: adlrt.DeclResolver,
  overrides: Override[],
  adlMappers: AdlTypeMapper<unknown, unknown>[],
): VisitorU {
  const mapper = adlMappers.find(m => typeExprsEqual(m.texprA.value, typeExpr.value));
  if (mapper) {
    const adlTree = adltree.createAdlTree(mapper.texprB.value, declResolver);
    return createVisitor0(declResolver, nullContext, adlTree, overrides, mapper);
  }
  const adlTree = adltree.createAdlTree(typeExpr.value, declResolver);
  return createVisitor0(declResolver, nullContext, adlTree, overrides, undefined);
}

export function createVisitor0(
  declResolver: adlrt.DeclResolver,
  ctx: InternalContext,
  adlTree: adltree.AdlTree,
  overrides: Override[],
  mapper?: Mapper<unknown, unknown>,
): VisitorU {
  const details = adlTree.details();
  switch (details.kind) {
    case "primitive": {
      if (details.ptype === "Void") {
        return voidVisitor(overrides);
      } else {
        const fldfns = createField(adlTree);//, customContext, factory);
        if (fldfns === null) {
          return unimplementedVisitor(adlTree.typeExpr, overrides);
        }
        return fieldVisitor(fldfns, { value: adlTree.typeExpr }, overrides, mapper);
      }
    }
    case "struct": {
      return structVisitor(declResolver, details, overrides, mapper);
    }
    case "newtype": {
      // if (adlTree.typeExpr.typeRef.kind === 'reference' && scopedNamesEqual(systypes.snMap, adlTree.typeExpr.typeRef.value)) {
      //   return mapVEditor(declResolver, nullContext, factory, { value: adlTree.typeExpr.parameters[0] }, { value: adlTree.typeExpr.parameters[1] });
      // }
      return createVisitor0(declResolver, nullContext, details.adlTree, overrides, mapper);
    }
    case "typedef": {
      return createVisitor0(declResolver, nullContext, details.adlTree, overrides, mapper);
    }
    case "union": {
      // When T can be edited in a String field, we can use a string
      // field for Maybe<T> iff the empty string is not a valid value
      // of T.  So Maybe<Int> can be editied in a string field,
      // whereas Maybe<String> cannot.
      if (isMaybe(adlTree.typeExpr)) {
        const fldfns = createFieldForTParam0(adlTree, declResolver);
        if (fldfns && fldfns.validate("") !== null) {
          return fieldVisitor(maybeField(fldfns), { value: adlTree.typeExpr }, overrides, mapper);
        }
      }
      return unionVisitor(declResolver, adlTree, details, overrides, mapper);
    }

    case "nullable": {
      const fieldfns = createFieldForTParam0(adlTree, declResolver);
      if (fieldfns !== null && fieldfns.validate("") !== null) {
        return fieldVisitor(nullableField(fieldfns), { value: adlTree.typeExpr }, overrides, mapper);
      } else {
        // Use a maybe editor for now...
        const maybeTypeExpr = systypes.texprMaybe({ value: details.param.typeExpr });
        const mapper = {
          aFromB: nullableFromMaybe,
          bFromA: maybeFromNullable,
        } as Mapper<unknown, unknown>;
        const adlTree = adltree.createAdlTree(maybeTypeExpr.value, declResolver);
        return createVisitor0(declResolver, nullContext, adlTree, overrides, mapper);
        // const mappedVistor = {
        //   ...maybeEditor,
        // };
        // return mappedVistor;
        // return mappedVEditor(maybeEditor, maybeFromNullable, nullableFromMaybe);
      }
    }
    case "vector": {
      // const _underlyingVEditor = createVEditor0(declResolver,nullContext,  details.param, factory);
      return unimplementedVisitor(adlTree.typeExpr, overrides);
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
      return mapEntryVectorVisitor(
        declResolver,
        ctx,
        adlrt.texprString(),
        { value: valueType },
        overrides,
        mapper,
      );
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
  overrides: Override[],
  mapper: Mapper<unknown, unknown>,
): VisitorU {
  type MapType = systypes.MapEntry<K, V>[];
  const mapTypeExpr: adlrt.ATypeExpr<MapType> = adlrt.texprVector(systypes.texprMapEntry(ktype, vtype));
  const mapAdlTree = adltree.createAdlTree(mapTypeExpr.value, declResolver);
  return createVisitor0(declResolver, ctx, mapAdlTree, overrides, mapper);
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

export function fieldVisitor<T>(
  fieldfns: FieldFns<T>,
  texpr: adlrt.ATypeExpr<unknown>,
  overrides: Override[],
  mapper?: Mapper<unknown, unknown>
): VisitorU {
  function visit(name: string, env: unknown, acceptor: AcceptorsU): unknown {
    const oRide = overrides.find(o => o.name === name && o.acceptField);
    if (oRide && oRide.acceptField) {
      return oRide.acceptField(env, { mapper, texpr, fieldfns });
    }
    return acceptor.acceptField(env, { mapper, texpr, fieldfns });
  }
  return {
    visit
  };
}

export function structVisitor(
  declResolver: adlrt.DeclResolver,
  struct: adltree.Struct,
  overrides: Override[],
  mapper?: Mapper<unknown, unknown>,
): VisitorU {
  const fieldDetails: FieldDetails[] = struct.fields.map((field, index) => {
    const jsonBinding = createJsonBinding<unknown>(declResolver, { value: field.adlTree.typeExpr });
    const ctx = {
      scopedDecl: { moduleName: struct.moduleName, decl: struct.astDecl },
      field: field.astField
    };
    const visitor = createVisitor0(declResolver, ctx, field.adlTree, overrides, undefined);
    return {
      name: field.astField.name,
      index,
      default: field.astField.default,
      jsonBinding,
      label: fieldLabel(field.astField.name),
      visitor,
    };
  });

  function visit<I, O>(name: string, env: I, acceptor: AcceptorsIO<I, O>): O {
    const texpr: adlrt.ATypeExpr<unknown> = {
      value: adlast.makeTypeExpr({
        typeRef: adlast.makeTypeRef("reference", adlast.makeScopedName({
          moduleName: struct.moduleName,
          name: struct.astDecl.name,
        })),
        parameters: [],
      })
    };
    const desc: StructDescriptor = {
      mapper,
      texpr,
      fieldDetails,
    };
    const oRide = overrides.find(o => o.name === name && o.acceptStruct);
    if (oRide && oRide.acceptStruct) {
      return oRide.acceptStruct(env, desc);
    }
    return acceptor.acceptStruct(env, desc);
  }

  return {
    visit
  };
}

export function unionVisitor(
  declResolver: adlrt.DeclResolver,
  _adlTree: adltree.AdlTree,
  union: adltree.Union,
  overrides: Override[],
  mapper?: Mapper<unknown, unknown>,
): VisitorU {

  const texpr: adlrt.ATypeExpr<unknown> = {
    value: adlast.makeTypeExpr({
      typeRef: adlast.makeTypeRef("reference", adlast.makeScopedName({
        moduleName: union.moduleName,
        name: union.astDecl.name,
      })),
      parameters: [],
    })
  };
const unionDesc: UnionDescriptor = {
    branchDetails: {},
    texpr,
    // scopedDecl: { moduleName: union.moduleName, decl: union.astDecl },
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
      visitor: () => createVisitor0(declResolver, ctx, field.adlTree, overrides, undefined)
    };
  });

  function visit<I, O>(name: string, env: I, acceptor: AcceptorsIO<I, O>): O {
    const oRide = overrides.find(o => o.name === name && o.acceptUnion);
    if (oRide && oRide.acceptUnion) {
      return oRide.acceptUnion(env, unionDesc);
    }
    return acceptor.acceptUnion(env, unionDesc);
  }

  return {
    visit
  };
}

export function voidVisitor(
  overrides: Override[],
): VisitorU {
  function visit<I, O>(name: string, env: I, acceptor: AcceptorsIO<I, O>): O {
    const oRide = overrides.find(o => o.name === name && o.acceptVoid);
    if (oRide && oRide.acceptVoid) {
      return oRide.acceptVoid(env, {});
    }
    return acceptor.acceptVoid(env, {});
  }
  return {
    visit,
  };
}

export function vectorVisitor(
  overrides: Override[],
): VisitorU {
  function visit<I, O>(name: string, env: I, acceptor: AcceptorsIO<I, O>): O {
    const oRide = overrides.find(o => o.name === name && o.acceptVector);
    if (oRide && oRide.acceptVector) {
      return oRide.acceptVector(env, {});
    }
    throw new Error("not implemented");
  }
  return {
    visit,
  };
}

export function unimplementedVisitor(
  typeExpr: adlast.TypeExpr,
  overrides: Override[],
): VisitorU {
  function visit<I, O>(name: string, env: I, acceptor: AcceptorsIO<I, O>): O {
    const oRide = overrides.find(o => o.name === name && o.acceptUnimplemented);
    if (oRide && oRide.acceptUnimplemented) {
      return oRide.acceptUnimplemented(env, { typeExpr });
    }
    return acceptor.acceptUnimplemented(env, { typeExpr });
  }
  return {
    visit,
  };
}
