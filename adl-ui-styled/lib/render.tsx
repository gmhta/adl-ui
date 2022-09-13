import React, { useState } from 'react';

import { typeExprToStringUnscoped } from '@timbod7/adl-rt/runtime/utils';
import {
  Factory, FieldEditorProps,
  getInitialState, render, Rendered, stateFromValue, StructEditorProps, UnimplementedEditorProps,
  UnionEditorProps,
  update,
  validate, valueFromState,
  VisitorU
} from "@timbod7/adl-ui";
import styled from 'styled-components';
import { Select } from "./select";

export const VEDITOR_FACTORY: Factory = {
  renderFieldEditor,
  renderStructEditor,
  renderUnionEditor,
  renderVoidEditor,
  renderUnimplementedEditor,
};

export function renderVisit<T>(visitor: VisitorU, disabled?: boolean, initial?: T): JSX.Element {
  const [state, setState] = useState<unknown>(() => initial === undefined ? getInitialState(visitor) : stateFromValue(visitor, initial));
  const errs = validate(visitor, state);
  const onUpdate = (e: unknown) => setState((s: unknown) => update(visitor, s, e));
  const elements = render(visitor, VEDITOR_FACTORY, state, disabled || false, onUpdate);
  // const elements = veditor.render(state, disabled || false, e => setState((s: unknown) => veditor.update(s, e)));
  // console.log(errs);
  return (
    <Content>
      <Row><HeaderLabel>Value:</HeaderLabel>{elements.beside}</Row>
      {elements.below}
      <hr />
      {errs.length === 0
        ? <Valid>Value:<br /><br />{JSON.stringify(valueFromState(visitor, state), null, 2)}</Valid>
        : <Errors>Errors:<br /><br />{errs.join("\n")}</Errors>
      }
    </Content>
  );
}

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
    const rendered = render(fd.visitor, VEDITOR_FACTORY, fd.state, props.disabled, fd.onUpdate)
    // const rendered = fd.veditor.veditor.render(fd.veditor.state, props.disabled, fd.veditor.onUpdate);
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
  const r = render(props.veditor.visitor, VEDITOR_FACTORY, props.veditor.state, props.disabled, props.veditor.onUpdate)
  // const r = props.veditor.veditor.render(props.veditor.state, props.disabled, props.veditor.onUpdate);
  const below = <div>{r.beside}{r.below}</div>;
  return {
    beside,
    below
  };  
}

function renderUnimplementedEditor(props: UnimplementedEditorProps): Rendered {
  return {
    beside: <div>unimplemented veditor for {typeExprToStringUnscoped(props.typeExpr)}</div>,
    below: undefined,
  };
}

export const Content = styled.div`
  font-size: 14px;
  font-family: sans-serif;
`;

export const Row = styled.div`
display: flex;
flex-direction: row;
align-items: center;
`;

export const HeaderLabel = styled.div`
margin-right: 10px;
font-weight: bold;
`;

export const Valid = styled.pre`
 color: green;
`;

export const Errors = styled.pre`
color: #b71c1c;
`;

export const StyledInput = styled.input`
padding: 8px;
border: 1px solid #000;
font-size: 14px;
font-family: sans-serif;
border-radius: 4px;
`;

export const StyledError = styled.div`
padding-left: calc(2* 8px);
font-family: sans-serif;
font-size: 14px;
color: #b71c1c;
`;

export const StructContent = styled.table`
  border-collapse: collapse;
  border-style: hidden;
`;

export const StructFieldLabel = styled.td`
  padding: 5px;
`;

export const StructFieldBeside = styled.td`
  padding: 5px;
`;

export const StructFieldBelow = styled.td`
  padding-left: 50px;
`;
