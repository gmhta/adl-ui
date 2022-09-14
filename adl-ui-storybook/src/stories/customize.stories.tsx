import { storiesOf } from '@storybook/react';
import { typeExprsEqual } from '@timbod7/adl-rt/runtime/utils';
import {
  createVisitor, FieldDescriptor, makeAdlMapper,
  makeOverride,
  Rendered,
  RenderProps,
  StructDescriptor,
  StructEvent, StructState,
  validateAcceptor
} from "@timbod7/adl-ui";
import { acceptStruct, renderVisit, Row, StyledError, StyledInput, styledRenderAcceptor } from '@timbod7/adl-ui-styled';
import React from 'react';
import * as adlex from '../adl-gen/examples';
import { RESOLVER } from "../adl-gen/resolver";
import * as adlrt from "../adl-gen/runtime/adl";

storiesOf("Overrides & Mappers", module)
  .add("Full->Display", () => {
    const visitor = createVisitor(adlex.texprFull(), RESOLVER,
      {
        overrides: [
          makeOverride("render", {
            acceptStruct: (env: RenderProps<StructState, StructEvent>, structDesc: StructDescriptor): Rendered => {
              const fieldDetails2 = structDesc.fieldDetails.filter(fd => {
                if (typeExprsEqual(adlex.texprDisplay().value, structDesc.texpr.value) && fd.name === "model") {
                  return false;
                }
                return true;
              });
              return acceptStruct(env, { ...structDesc, fieldDetails: fieldDetails2 });
            }
          }),
          makeOverride("validate", {
            acceptField: (t: string, fieldDesc: FieldDescriptor): string[] => {
              if (fieldDesc.texpr.value.typeRef.kind === "primitive" && fieldDesc.texpr.value.typeRef.value === "Int64") {
                return [];
              }
              return validateAcceptor.acceptField(t, fieldDesc);
            },
          })
        ],
        mappers: [makeAdlMapper<adlex.Full, adlex.Display>(
          adlex.texprFull(),
          adlex.texprDisplay(),
          (b) => {
            const str = b.name.split(" ");
            return adlex.makeFull({
              id: b.model.id,
              firstname: str[0],
              surname: str.length === 1 ? "" : str.slice(1).join(" "),
            });
          },
          (a) => adlex.makeDisplay({
            name: `${a.firstname} ${a.surname}`,
            model: a,
          }),
        )],
      }
    );
    return renderVisit(visitor);
  })
  .add("Customer Field in Struct", () => {
    const visitor = createVisitor(adlex.texprHierarchy(), RESOLVER,
      {
        overrides: [
          makeOverride("render", {
            acceptField(env, fieldDesc) {
              if (typeExprsEqual(fieldDesc.texpr.value, adlrt.texprString().value)) {
                return acceptField2(env, fieldDesc);
              }
              return styledRenderAcceptor.acceptField(env, fieldDesc);
            },
          }),
        ],
        mappers: [],
      }
    );
    return renderVisit(visitor);
  })
  ;


function acceptField2(env: RenderProps<string, string>, fieldDesc: FieldDescriptor): Rendered {
  const { state, disabled, onUpdate } = env;
  const errlabel = fieldDesc.fieldfns.validate(state);
  const beside = (
    <Row>
      <StyledInput placeholder='custom placeholder' value={state} onChange={(s) => onUpdate(s.currentTarget.value)} disabled={disabled} />
      {errlabel && <StyledError>{errlabel}</StyledError>}
    </Row>
  );
  return { beside };
}

