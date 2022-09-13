/* @generated from adl module examples */

import * as ADL from './runtime/adl';

export interface Name {
  first: string;
  last: string;
}

export function makeName(
  input: {
    first: string,
    last: string,
  }
): Name {
  return {
    first: input.first,
    last: input.last,
  };
}

const Name_AST : ADL.ScopedDecl =
  {"moduleName":"examples","decl":{"annotations":[],"type_":{"kind":"struct_","value":{"typeParams":[],"fields":[{"annotations":[],"serializedName":"first","default":{"kind":"nothing"},"name":"first","typeExpr":{"typeRef":{"kind":"primitive","value":"String"},"parameters":[]}},{"annotations":[],"serializedName":"last","default":{"kind":"nothing"},"name":"last","typeExpr":{"typeRef":{"kind":"primitive","value":"String"},"parameters":[]}}]}},"name":"Name","version":{"kind":"nothing"}}};

export const snName: ADL.ScopedName = {moduleName:"examples", name:"Name"};

export function texprName(): ADL.ATypeExpr<Name> {
  return {value : {typeRef : {kind: "reference", value : snName}, parameters : []}};
}

export interface Gender_Female {
  kind: 'female';
}
export interface Gender_Male {
  kind: 'male';
}
export interface Gender_Other {
  kind: 'other';
  value: string;
}

export type Gender = Gender_Female | Gender_Male | Gender_Other;

export interface GenderOpts {
  female: null;
  male: null;
  other: string;
}

export function makeGender<K extends keyof GenderOpts>(kind: K, value: GenderOpts[K]) { return {kind, value}; }

const Gender_AST : ADL.ScopedDecl =
  {"moduleName":"examples","decl":{"annotations":[],"type_":{"kind":"union_","value":{"typeParams":[],"fields":[{"annotations":[],"serializedName":"female","default":{"kind":"nothing"},"name":"female","typeExpr":{"typeRef":{"kind":"primitive","value":"Void"},"parameters":[]}},{"annotations":[],"serializedName":"male","default":{"kind":"nothing"},"name":"male","typeExpr":{"typeRef":{"kind":"primitive","value":"Void"},"parameters":[]}},{"annotations":[],"serializedName":"other","default":{"kind":"nothing"},"name":"other","typeExpr":{"typeRef":{"kind":"primitive","value":"String"},"parameters":[]}}]}},"name":"Gender","version":{"kind":"nothing"}}};

export const snGender: ADL.ScopedName = {moduleName:"examples", name:"Gender"};

export function texprGender(): ADL.ATypeExpr<Gender> {
  return {value : {typeRef : {kind: "reference", value : snGender}, parameters : []}};
}

export interface Person {
  name: Name;
  age: number;
  gender: Gender;
  role: string;
}

export function makePerson(
  input: {
    name: Name,
    age: number,
    gender: Gender,
    role: string,
  }
): Person {
  return {
    name: input.name,
    age: input.age,
    gender: input.gender,
    role: input.role,
  };
}

const Person_AST : ADL.ScopedDecl =
  {"moduleName":"examples","decl":{"annotations":[],"type_":{"kind":"struct_","value":{"typeParams":[],"fields":[{"annotations":[],"serializedName":"name","default":{"kind":"nothing"},"name":"name","typeExpr":{"typeRef":{"kind":"reference","value":{"moduleName":"examples","name":"Name"}},"parameters":[]}},{"annotations":[],"serializedName":"age","default":{"kind":"nothing"},"name":"age","typeExpr":{"typeRef":{"kind":"primitive","value":"Word8"},"parameters":[]}},{"annotations":[],"serializedName":"gender","default":{"kind":"nothing"},"name":"gender","typeExpr":{"typeRef":{"kind":"reference","value":{"moduleName":"examples","name":"Gender"}},"parameters":[]}},{"annotations":[],"serializedName":"role","default":{"kind":"nothing"},"name":"role","typeExpr":{"typeRef":{"kind":"primitive","value":"String"},"parameters":[]}}]}},"name":"Person","version":{"kind":"nothing"}}};

export const snPerson: ADL.ScopedName = {moduleName:"examples", name:"Person"};

export function texprPerson(): ADL.ATypeExpr<Person> {
  return {value : {typeRef : {kind: "reference", value : snPerson}, parameters : []}};
}

export interface Hierarchy {
  leader: Person;
  testNullMap: (string|null);
  underlings: Hierarchy[];
  fixedProps: FixedProps;
  properties: {[key: string]: string};
}

export function makeHierarchy(
  input: {
    leader: Person,
    testNullMap: (string|null),
    underlings: Hierarchy[],
    fixedProps: FixedProps,
    properties: {[key: string]: string},
  }
): Hierarchy {
  return {
    leader: input.leader,
    testNullMap: input.testNullMap,
    underlings: input.underlings,
    fixedProps: input.fixedProps,
    properties: input.properties,
  };
}

const Hierarchy_AST : ADL.ScopedDecl =
  {"moduleName":"examples","decl":{"annotations":[],"type_":{"kind":"struct_","value":{"typeParams":[],"fields":[{"annotations":[],"serializedName":"leader","default":{"kind":"nothing"},"name":"leader","typeExpr":{"typeRef":{"kind":"reference","value":{"moduleName":"examples","name":"Person"}},"parameters":[]}},{"annotations":[],"serializedName":"testNullMap","default":{"kind":"nothing"},"name":"testNullMap","typeExpr":{"typeRef":{"kind":"primitive","value":"Nullable"},"parameters":[{"typeRef":{"kind":"primitive","value":"String"},"parameters":[]}]}},{"annotations":[],"serializedName":"underlings","default":{"kind":"nothing"},"name":"underlings","typeExpr":{"typeRef":{"kind":"primitive","value":"Vector"},"parameters":[{"typeRef":{"kind":"reference","value":{"moduleName":"examples","name":"Hierarchy"}},"parameters":[]}]}},{"annotations":[],"serializedName":"fixedProps","default":{"kind":"nothing"},"name":"fixedProps","typeExpr":{"typeRef":{"kind":"reference","value":{"moduleName":"examples","name":"FixedProps"}},"parameters":[]}},{"annotations":[],"serializedName":"properties","default":{"kind":"nothing"},"name":"properties","typeExpr":{"typeRef":{"kind":"primitive","value":"StringMap"},"parameters":[{"typeRef":{"kind":"primitive","value":"String"},"parameters":[]}]}}]}},"name":"Hierarchy","version":{"kind":"nothing"}}};

export const snHierarchy: ADL.ScopedName = {moduleName:"examples", name:"Hierarchy"};

export function texprHierarchy(): ADL.ATypeExpr<Hierarchy> {
  return {value : {typeRef : {kind: "reference", value : snHierarchy}, parameters : []}};
}

export interface FixedProps_Boss {
  kind: 'boss';
  value: Hierarchy;
}
export interface FixedProps_Age {
  kind: 'age';
  value: number;
}

export type FixedProps = FixedProps_Boss | FixedProps_Age;

export interface FixedPropsOpts {
  boss: Hierarchy;
  age: number;
}

export function makeFixedProps<K extends keyof FixedPropsOpts>(kind: K, value: FixedPropsOpts[K]) { return {kind, value}; }

const FixedProps_AST : ADL.ScopedDecl =
  {"moduleName":"examples","decl":{"annotations":[],"type_":{"kind":"union_","value":{"typeParams":[],"fields":[{"annotations":[],"serializedName":"boss","default":{"kind":"nothing"},"name":"boss","typeExpr":{"typeRef":{"kind":"reference","value":{"moduleName":"examples","name":"Hierarchy"}},"parameters":[]}},{"annotations":[],"serializedName":"age","default":{"kind":"nothing"},"name":"age","typeExpr":{"typeRef":{"kind":"primitive","value":"Int32"},"parameters":[]}}]}},"name":"FixedProps","version":{"kind":"nothing"}}};

export const snFixedProps: ADL.ScopedName = {moduleName:"examples", name:"FixedProps"};

export function texprFixedProps(): ADL.ATypeExpr<FixedProps> {
  return {value : {typeRef : {kind: "reference", value : snFixedProps}, parameters : []}};
}

export interface Full {
  id: number;
  firstname: string;
  surname: string;
}

export function makeFull(
  input: {
    id: number,
    firstname: string,
    surname: string,
  }
): Full {
  return {
    id: input.id,
    firstname: input.firstname,
    surname: input.surname,
  };
}

const Full_AST : ADL.ScopedDecl =
  {"moduleName":"examples","decl":{"annotations":[],"type_":{"kind":"struct_","value":{"typeParams":[],"fields":[{"annotations":[],"serializedName":"id","default":{"kind":"nothing"},"name":"id","typeExpr":{"typeRef":{"kind":"primitive","value":"Int64"},"parameters":[]}},{"annotations":[],"serializedName":"firstname","default":{"kind":"nothing"},"name":"firstname","typeExpr":{"typeRef":{"kind":"primitive","value":"String"},"parameters":[]}},{"annotations":[],"serializedName":"surname","default":{"kind":"nothing"},"name":"surname","typeExpr":{"typeRef":{"kind":"primitive","value":"String"},"parameters":[]}}]}},"name":"Full","version":{"kind":"nothing"}}};

export const snFull: ADL.ScopedName = {moduleName:"examples", name:"Full"};

export function texprFull(): ADL.ATypeExpr<Full> {
  return {value : {typeRef : {kind: "reference", value : snFull}, parameters : []}};
}

export type FullShadow = Full;

const FullShadow_AST : ADL.ScopedDecl =
  {"moduleName":"examples","decl":{"annotations":[],"type_":{"kind":"type_","value":{"typeParams":[],"typeExpr":{"typeRef":{"kind":"reference","value":{"moduleName":"examples","name":"Full"}},"parameters":[]}}},"name":"FullShadow","version":{"kind":"nothing"}}};

export const snFullShadow: ADL.ScopedName = {moduleName:"examples", name:"FullShadow"};

export function texprFullShadow(): ADL.ATypeExpr<FullShadow> {
  return {value : {typeRef : {kind: "reference", value : snFullShadow}, parameters : []}};
}

export interface Display {
  name: string;
  model: FullShadow;
}

export function makeDisplay(
  input: {
    name: string,
    model: FullShadow,
  }
): Display {
  return {
    name: input.name,
    model: input.model,
  };
}

const Display_AST : ADL.ScopedDecl =
  {"moduleName":"examples","decl":{"annotations":[],"type_":{"kind":"struct_","value":{"typeParams":[],"fields":[{"annotations":[],"serializedName":"name","default":{"kind":"nothing"},"name":"name","typeExpr":{"typeRef":{"kind":"primitive","value":"String"},"parameters":[]}},{"annotations":[],"serializedName":"model","default":{"kind":"nothing"},"name":"model","typeExpr":{"typeRef":{"kind":"reference","value":{"moduleName":"examples","name":"FullShadow"}},"parameters":[]}}]}},"name":"Display","version":{"kind":"nothing"}}};

export const snDisplay: ADL.ScopedName = {moduleName:"examples", name:"Display"};

export function texprDisplay(): ADL.ATypeExpr<Display> {
  return {value : {typeRef : {kind: "reference", value : snDisplay}, parameters : []}};
}

export const _AST_MAP: { [key: string]: ADL.ScopedDecl } = {
  "examples.Name" : Name_AST,
  "examples.Gender" : Gender_AST,
  "examples.Person" : Person_AST,
  "examples.Hierarchy" : Hierarchy_AST,
  "examples.FixedProps" : FixedProps_AST,
  "examples.Full" : Full_AST,
  "examples.FullShadow" : FullShadow_AST,
  "examples.Display" : Display_AST
};
