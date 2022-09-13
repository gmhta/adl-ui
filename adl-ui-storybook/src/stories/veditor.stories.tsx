import { storiesOf } from '@storybook/react';
import * as adlrt from "@timbod7/adl-rt/runtime/adl";
import * as adlsys from "@timbod7/adl-rt/sys/types";
import {
  createVisitor
} from "@timbod7/adl-ui";

import { renderVisit } from '@timbod7/adl-ui-styled';
import * as adlex from '../adl-gen/examples';
import { RESOLVER } from "../adl-gen/resolver";

storiesOf("VEditors", module)
  .add("String", () => {
    const visitor = createVisitor(adlrt.texprString(), RESOLVER)
    return renderVisit(visitor);
  })
  .add("Word16", () => {
    const visitor = createVisitor(adlrt.texprWord16(), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Word16 (disabled)", () => {
    const visitor = createVisitor(adlrt.texprWord16(), RESOLVER);
    return renderVisit(visitor, true, 13);
  })
  .add("Bool", () => {
    const visitor = createVisitor(adlrt.texprBool(), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Json", () => {
    const visitor = createVisitor(adlrt.texprJson(), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Name", () => {
    const visitor = createVisitor(adlex.texprName(), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Person", () => {
    const visitor = createVisitor(adlex.texprPerson(), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Gender", () => {
    const visitor = createVisitor(adlex.texprGender(), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Hierarchy", () => {
    const visitor = createVisitor(adlex.texprHierarchy(), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Maybe<String>", () => {
    const visitor = createVisitor(adlsys.texprMaybe(adlrt.texprString()), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Maybe<Word32>", () => {
    const visitor = createVisitor(adlsys.texprMaybe(adlrt.texprWord32()), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Maybe<Person>", () => {
    const visitor = createVisitor(adlsys.texprMaybe(adlex.texprPerson()), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Nullable<String>", () => {
    const visitor = createVisitor(adlrt.texprNullable(adlrt.texprString()), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Nullable<Word32>", () => {
    const visitor = createVisitor(adlrt.texprNullable(adlrt.texprWord32()), RESOLVER);
    return renderVisit(visitor);
  })
  .add("Nullable<Person>", () => {
    const visitor = createVisitor(adlrt.texprNullable(adlex.texprPerson()), RESOLVER);
    return renderVisit(visitor);
  })
  ;