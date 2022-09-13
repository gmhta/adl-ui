import { storiesOf } from '@storybook/react';
import { typeExprsEqual } from '@timbod7/adl-rt/runtime/utils';
import {
  createVisitor,
  Factory,
  FieldDescriptor,
  FieldEditorProps,
  makeAdlMapper,
  makeOverride,
  makeRenderStructField,
  renderAcceptor,
  Rendered,
  RenderProps,
  StructDescriptor,
  StructEvent,
  StructFieldProps,
  StructState,
  validateAcceptor
} from "@timbod7/adl-ui";
import { renderVisit, Row, StyledError, StyledInput, VEDITOR_FACTORY } from '@timbod7/adl-ui-styled';
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
              const { state, disabled, onUpdate } = env;
              const fields: StructFieldProps[] = structDesc.fieldDetails.flatMap(fd => {
                if (typeExprsEqual(adlex.texprDisplay().value, structDesc.texpr.value) && fd.name === "model") {
                  return [];
                }
                return [makeRenderStructField(fd, VEDITOR_FACTORY, state, onUpdate)];
              });
              return VEDITOR_FACTORY.renderStructEditor({ fields, disabled });
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
                return renderAcceptor.acceptField({ ...env, factory: VEDITOR_FACTORY2 }, fieldDesc);
              }
              return renderAcceptor.acceptField(env, fieldDesc);
            },
          }),
        ],
        mappers: [],
      }
    );
    return renderVisit(visitor);
  })
  ;

const VEDITOR_FACTORY2: Factory = {
  ...VEDITOR_FACTORY,
  renderFieldEditor: renderFieldEditor2,
};

function renderFieldEditor2(props: FieldEditorProps): Rendered {
  const { fieldfns, disabled, state, onUpdate } = props;
  const errlabel = fieldfns.validate(state);
  const beside = (
    <Row>
      <StyledInput placeholder='iam a placeholder' value={state} onChange={(s) => onUpdate(s.currentTarget.value)} disabled={disabled} />
      {errlabel && <StyledError>{errlabel}</StyledError>}
    </Row>
  );
  return { beside };
}
