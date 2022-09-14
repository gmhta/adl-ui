import React from 'react';

import styled from 'styled-components';

export type NameLabel = { name: string, label: string; };

interface SelectProps {
  current: string | null,
  // active: boolean,
  choices: NameLabel[],
  onChoice(branchName: string | null): void;
}

export function Select(props: SelectProps) {
  const current = props.current == null ? "???" : props.current;

  const NO_CHOICE = "???";
  const labels: NameLabel[] = [
    { name: NO_CHOICE, label: NO_CHOICE },
    ...props.choices
  ];

  function onChange(ev: React.ChangeEvent<HTMLSelectElement>) {
    if (ev.target.value === NO_CHOICE) {
      props.onChoice(null);
    } else {
      props.onChoice(ev.target.value);
    }
  }

  const Select = current == NO_CHOICE ? NoChoiceStyledSelect : StyledSelect;

  return (
    <Select value={current} onChange={onChange}>
      {labels.map(l => <Option value={l.name} key={l.name}>{l.label}</Option>)}
    </Select>
  );
}

const StyledSelect = styled.select`
  font-size: 14px;
  font-family: sans-serif;
  border: none;
  background-color: white;
`;

const NoChoiceStyledSelect = styled(StyledSelect)`
color: #b71c1c;
`;

const Option = styled.option`
  color: black;
`;
