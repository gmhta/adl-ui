import * as adlrt from "../../adl-gen/runtime/adl";
import * as systypes from "../../adl-gen/sys/types";
import * as adltree from "../adl-tree";
import { IVEditor } from "./type";
import { InternalContext, Factory, createVEditor0, UAcceptors } from "./adlfactory";

// Create an editor over a Vector<Pair<K,V>>. This won't be required after
// we update sys.types.Map to have that type
export function mapVEditor<K, V>(declResolver: adlrt.DeclResolver, ctx: InternalContext, factory: Factory, ktype: adlrt.ATypeExpr<K>, vtype: adlrt.ATypeExpr<V>): IVEditor<systypes.Pair<K, V>[], unknown, unknown> {
  const map1 = (m: systypes.Pair<K, V>[]): systypes.MapEntry<K, V>[] => {
    return m.map(p => ({ key: p.v1, value: p.v2 }));
  };
  const map2 = (m: systypes.MapEntry<K, V>[]): systypes.Pair<K, V>[] => {
    return m.map(me => ({ v1: me.key, v2: me.value }));
  };
  return mappedVEditor(
    mapEntryVectorVEditor(declResolver, ctx, factory, ktype, vtype),
    map1,
    map2
  );
}

// Create an editor over a Vector<MapEntry<K,V>>. This won't be required after
// we update sys.types.Map to have that type
export function mapEntryVectorVEditor<K, V>(declResolver: adlrt.DeclResolver, ctx: InternalContext, factory: Factory, ktype: adlrt.ATypeExpr<K>, vtype: adlrt.ATypeExpr<V>): IVEditor<systypes.MapEntry<K, V>[], unknown, unknown> {
  type MapType = systypes.MapEntry<K, V>[];
  const mapTypeExpr: adlrt.ATypeExpr<MapType> = adlrt.texprVector(systypes.texprMapEntry(ktype, vtype));
  const mapAdlTree = adltree.createAdlTree(mapTypeExpr.value, declResolver);
  return createVEditor0(declResolver, ctx, mapAdlTree, factory) as IVEditor<MapType, unknown, unknown>;
}

/// Map a value editor from type A to a corresponding value
/// editor over type B.
export function mappedVEditor<A,B,S,E>(
  veditor: IVEditor<A,S,E>,
  aFromB: (b:B) => A,
  bFromA: (a:A) => B
  ) : IVEditor<B,S,E> {

  function visit(stackState: unknown, state: S, acceptor: UAcceptors): unknown {
    return veditor.visit(stackState, state, acceptor);
  }

  return {
    initialState: veditor.initialState,
    stateFromValue: (b:B) => veditor.stateFromValue(aFromB(b)),
    validate: veditor.validate,
    valueFromState: (s:S) => bFromA(veditor.valueFromState(s)),
    update: veditor.update,
    visit,
    render: veditor.render,
  };
}
