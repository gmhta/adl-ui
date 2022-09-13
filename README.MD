# ADL UI, Styled-Components libs and Storybook

## Local Dev

### Testing NPM Package

``` bash
rm -r adl-ui/build adl-ui/dist adl-ui-styled/build adl-ui-styled/dist adl-rt/build adl-rt/dist 

cd adl-rt
yarn
yarn build
npm pack
npm link

cd adl-ui
yarn
yarn build
npm pack
npm link

cd ..

cd adl-ui-styled
yarn
yarn build
npm pack
npm link
npm link @timbod7/adl-ui @timbod7/adl-rt

cd ..

cd adl-ui-storybook
npm install
npm link @timbod7/adl-ui @timbod7/adl-rt @timbod7/adl-ui-styled
npm run storybook
```

### Issues
- `tsconfig.json` paths and references aren't working with storybook.
  - see commented out section of `main.js`.
- `npm install` blows away the links, so `npm link ....` (as above) needs to be re-run.