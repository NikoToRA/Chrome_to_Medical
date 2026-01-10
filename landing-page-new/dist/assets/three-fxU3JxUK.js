import{r as q,a as E,g as O}from"./vendor-CkLIDRjM.js";var a={exports:{}},t={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var c;function h(){if(c)return t;c=1;var o=q(),l=Symbol.for("react.element"),x=Symbol.for("react.fragment"),d=Object.prototype.hasOwnProperty,v=o.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,y={key:!0,ref:!0,__self:!0,__source:!0};function R(n,r,f){var e,u={},s=null,p=null;f!==void 0&&(s=""+f),r.key!==void 0&&(s=""+r.key),r.ref!==void 0&&(p=r.ref);for(e in r)d.call(r,e)&&!y.hasOwnProperty(e)&&(u[e]=r[e]);if(n&&n.defaultProps)for(e in r=n.defaultProps,r)u[e]===void 0&&(u[e]=r[e]);return{$$typeof:l,type:n,key:s,ref:p,props:u,_owner:v.current}}return t.Fragment=x,t.jsx=R,t.jsxs=R,t}var _;function j(){return _||(_=1,a.exports=h()),a.exports}var J=j(),i={},m;function k(){if(m)return i;m=1;var o=E();return i.createRoot=o.createRoot,i.hydrateRoot=o.hydrateRoot,i}var C=k();const S=O(C);export{S as R,J as j};
