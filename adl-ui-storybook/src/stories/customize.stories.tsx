import { storiesOf } from '@storybook/react';
import { typeExprsEqual, typeExprToStringUnscoped } from '@timbod7/adl-rt/runtime/utils';
import {
  createVEditor,
  Factory,
  FieldDescriptor,
  FieldEditorProps,
  makeAdlMapper,
  makeOverride,
  makeVEditor,
  Rendered,
  StructDescriptor,
  StructEditorProps,
  StructFieldProps,
  StructState,
  UnimplementedEditorProps,
  UnionEditorProps,
  validateAcceptor,
  VEditor
} from "@timbod7/adl-ui";
import React, { useState } from 'react';
import styled from 'styled-components';

import * as adlex from '../adl-gen/examples';
import { RESOLVER } from "../adl-gen/resolver";
import { Select } from "./select.stories";

storiesOf("Overrides & Mappers", module)
  .add("Full->Display", () => {
    const veditor = createVEditor(adlex.texprFull(), RESOLVER, VEDITOR_FACTORY,
      {
        overrides: [
          makeOverride("render", {
            acceptStruct: (env: any, structDesc: StructDescriptor): any => {
              const { state, disabled, onUpdate } = env;
              const fields: StructFieldProps[] = structDesc.fieldDetails.flatMap(fd => {
                if (typeExprsEqual(adlex.texprDisplay().value, structDesc.texpr.value) && fd.name === "model") {
                  return [];
                }
                const veditor = makeVEditor(fd.visitor, VEDITOR_FACTORY);
                return [{
                  name: fd.name,
                  label: fd.label,
                  veditor: {
                    veditor,
                    state: state.fieldStates[fd.name],
                    onUpdate: event => {
                      onUpdate({ kind: "field", field: fd.name, fieldEvent: event });
                    }
                  }
                }];
              });
              return VEDITOR_FACTORY.renderStructEditor({ fields, disabled });
            }
          }),
          makeOverride("validate", {
            // acceptStruct: function (state: StructState, structDesc: StructDescriptor): string[] {
            //   let errors: string[] = [];
            //   for (const fd of structDesc.fieldDetails) {
            //     if (fd.name === "id") {
            //       continue;
            //     }
            //     const result = fd.visitor.visit("validate", state.fieldStates[fd.name], validateAcceptor) as string[];
            //     errors = errors.concat(result.map(err => fd.name + ": " + err));
            //   }
            //   return errors;
            // },
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
    return renderVEditorStory(veditor);
  })
  ;

function renderVEditorStory<T>(veditor: VEditor<T>, disabled?: boolean, initial?: T): JSX.Element {
  const [state, setState] = useState<unknown>(() => initial === undefined ? veditor.getInitialState() : veditor.stateFromValue(initial));
  const errs = veditor.validate(state);
  const elements = veditor.render(state, disabled || false, e => setState((s: unknown) => veditor.update(s, e)));
  console.log(errs);
  return (
    <Content>
      <Row><HeaderLabel>Value:</HeaderLabel>{elements.beside}</Row>
      {elements.below}
      <hr />
      {errs.length === 0
        ? <Valid>Value:<br /><br />{JSON.stringify(veditor.valueFromState(state), null, 2)}</Valid>
        : <Errors>Errors:<br /><br />{errs.join("\n")}</Errors>
      }
    </Content>
  );
}

const Content = styled.div`
  font-size: 14px;
  font-family: sans-serif;
`;

const Row = styled.div`
display: flex;
flex-direction: row;
align-items: center;
`;

const HeaderLabel = styled.div`
margin-right: 10px;
font-weight: bold;
`;

const Valid = styled.pre`
 color: green;
`;

const Errors = styled.pre`
color: #b71c1c;
`;

const StyledInput = styled.input`
padding: 8px;
border: 1px solid #000;
font-size: 14px;
font-family: sans-serif;
border-radius: 4px;
`;

const StyledError = styled.div`
padding-left: calc(2* 8px);
font-family: sans-serif;
font-size: 14px;
color: #b71c1c;
`;

const VEDITOR_FACTORY: Factory = {
  getCustomVEditor: () => null,
  getCustomField: () => null,
  renderFieldEditor,
  renderStructEditor,
  renderUnionEditor,
  renderVoidEditor,
  renderUnimplementedEditor,
};

function renderVoidEditor(): Rendered {
  return {};
}

function renderFieldEditor(props: FieldEditorProps): Rendered {
  const { fieldfns, disabled, state, onUpdate } = props;
  const errlabel = fieldfns.validate(state);
  const beside = (
    <Row>
      <StyledInput value={state} onChange={(s) => onUpdate(s.currentTarget.value)} disabled={disabled} />
      {errlabel && <StyledError>{errlabel}</StyledError>}
    </Row>
  );
  return { beside };
}


function renderStructEditor(props: StructEditorProps): Rendered {
  const rows = props.fields.map(fd => {
    const label = props.disabled ? fd.label : <b>{fd.label}</b>;
    const rendered = fd.veditor.veditor.render(fd.veditor.state, props.disabled, fd.veditor.onUpdate);
    return (
      <>
        <tr key={fd.name}>
          <StructFieldLabel>
            <label>{label}</label>
          </StructFieldLabel>
          {rendered.beside && <StructFieldBeside>{rendered.beside}</StructFieldBeside>}
        </tr>
        {rendered.below && <StructFieldBelow colSpan={2}>{rendered.below}</StructFieldBelow>}
      </>
    );
  });
  const below = (
    <StructContent>
      <tbody>{rows}</tbody>
    </StructContent>
  );
  return { below };
}

function renderUnionEditor(props: UnionEditorProps): Rendered {

  const beside = <Select state={props.selectState} />;
  if (!props.veditor) {
    return { beside };
  }
  const r = props.veditor.veditor.render(props.veditor.state, props.disabled, props.veditor.onUpdate);
  const below = <div>{r.beside}{r.below}</div>;
  return {
    beside,
    below
  };
}

const StructContent = styled.table`
  border-collapse: collapse;
  border-style: hidden;
`;

const StructFieldLabel = styled.td`
  padding: 5px;
`;

const StructFieldBeside = styled.td`
  padding: 5px;
`;

const StructFieldBelow = styled.td`
  padding-left: 50px;
`;


function renderUnimplementedEditor(props: UnimplementedEditorProps): Rendered {
  return {
    beside: <div>unimplemented veditor for {typeExprToStringUnscoped(props.typeExpr)}</div>,
    below: undefined,
  };
}
