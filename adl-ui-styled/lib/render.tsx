import React, { useState } from 'react';

// import { typeExprToStringUnscoped } from '@timbod7/adl-rt/runtime/utils';
import {
  Acceptors,
  AcceptUnimplementedProps, FieldDescriptor, getInitialState,
  Rendered, RenderProps, stateFromValue,
  StructDescriptor, StructEvent, StructState, UnionDescriptor, UnionEvent,
  UnionState,
  update,
  validate, valueFromState, VisitorU
} from "@timbod7/adl-ui";
import styled from 'styled-components';
import { Select } from "./select";

export function renderVisit<T>(visitor: VisitorU, disabled?: boolean, initial?: T): JSX.Element {
  const [state, setState] = useState<unknown>(() => initial === undefined ? getInitialState(visitor) : stateFromValue(visitor, initial));
  const errs = validate(visitor, state);
  const onUpdate = (e: unknown) => setState((s: unknown) => update(visitor, s, e));
  const elements = visitor.visit("render", { state, disabled: disabled || false, onUpdate }, styledRenderAcceptor) as Rendered;
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

export const styledRenderAcceptor: Acceptors<
  RenderProps<string, string>, Rendered,
  RenderProps<StructState, StructEvent>, Rendered,
  RenderProps<UnionState, UnionEvent>, Rendered,
  RenderProps<null, null>, Rendered,
  RenderProps<unknown, unknown>, Rendered,
  RenderProps<unknown, unknown>, Rendered
> = {
  acceptField,
  acceptStruct,
  acceptUnion,
  acceptVoid,
  acceptVector,
  acceptUnimplemented
};

export function acceptField(env: RenderProps<string, string>, fieldDesc: FieldDescriptor): Rendered {
  const { state, disabled, onUpdate } = env;
  const errlabel = fieldDesc.fieldfns.validate(state);
  const beside = (
    <Row>
      <StyledInput value={state} onChange={(s) => onUpdate(s.currentTarget.value)} disabled={disabled} />
      {errlabel && <StyledError>{errlabel}</StyledError>}
    </Row>
  );
  return { beside };
}


export function acceptStruct(env: RenderProps<StructState, StructEvent>, structDesc: StructDescriptor): Rendered {
  const { state, disabled, onUpdate } = env;
  const rows = structDesc.fieldDetails.map(fd => {
    const label = disabled ? fd.label : <b>{fd.label}</b>;
    const fd_state = state.fieldStates[fd.name];
    const fd_onUpdate = (event: unknown) => {
      onUpdate({ kind: "field", field: fd.name, fieldEvent: event });
    };
    const rendered = fd.visitor.visit("render", { state: fd_state, disabled: disabled, onUpdate: fd_onUpdate }, styledRenderAcceptor) as Rendered;
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

export function acceptUnion(env: RenderProps<UnionState, UnionEvent>, unionDesc: UnionDescriptor): Rendered {
  const { currentField, fieldStates } = env.state;
  const { branchDetails } = unionDesc;

  const choices = Object.keys(branchDetails).map(k => ({ name: k, label: branchDetails[k].label }));
  const onChoice = (name: string | null) => {
    env.onUpdate({ kind: "switch", field: name === null ? null : name });
  };

  const beside = <Select current={currentField} choices={choices} onChoice={onChoice} />;
  if (!currentField) {
    return { beside };
  }
  const branchEnv = {
    state: fieldStates[currentField],
    disabled: env.disabled,
    onUpdate: (event: unknown) => env.onUpdate({ kind: "update", event }),
  };
  const visitor = branchDetails[currentField].visitor();
  const r = visitor.visit("render", branchEnv, styledRenderAcceptor) as Rendered;
  const below = <div>{r.beside}{r.below}</div>;
  return {
    beside,
    below
  };
}

export function acceptVoid(env: RenderProps<null, null>): Rendered {
  return {};
}

export function acceptVector(env: RenderProps<unknown, unknown>, desc: StructDescriptor | UnionDescriptor): Rendered {
  throw new Error("Function not implemented.");
}

export function acceptUnimplemented(env: RenderProps<unknown, unknown>, props: AcceptUnimplementedProps): Rendered {
  return {
    beside: <div>unimplemented veditor</div>,
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
