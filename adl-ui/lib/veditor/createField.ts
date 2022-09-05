import * as adltree from "../adl-tree";
import { FieldFns } from "../fields/type";
import { adlPrimitiveFieldFns } from "../fields/adl";
import { CustomContext, Factory } from "./adlfactory";

export function createField(
  adlTree: adltree.AdlTree,
  ctx: CustomContext,
  factory: Factory): FieldFns<unknown> | null {
  let fieldfns = createField1(adlTree, ctx, factory);
  if (fieldfns === null) {
    // Try resolving through any typedefs or newtypes
    const adlTree2 = adltree.resolve(adlTree, true, true);
    fieldfns = createField1(adlTree2, ctx, factory);
  }
  return fieldfns;
}
function createField1(
  adlTree: adltree.AdlTree,
  ctx: CustomContext,
  factory: Factory
): FieldFns<unknown> | null {
  if (factory) {
    const customField = factory.getCustomField(ctx);
    if (customField) {
      return customField;
    }
  }
  const details = adlTree.details();
  if (details.kind === "primitive") {
    const fieldfns = adlPrimitiveFieldFns(details.ptype);
    if (fieldfns !== null) {
      return fieldfns;
    }
  }
  return null;
}
