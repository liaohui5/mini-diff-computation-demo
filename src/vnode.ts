export interface VNode {
  type: string;
  props: object | null;
  children: string | Array<VNode>;
  key?: string;
  el?: Element;
}

export function createVNode(type: string, props: object | null, children: string | Array<VNode>) {
  return {
    type,
    props,
    children,
    /* @ts-ignore */
    key: props && props.key,
  };
}

export const h = createVNode;
