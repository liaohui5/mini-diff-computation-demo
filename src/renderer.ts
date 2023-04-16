import { VNode } from './vnode';
import * as renderApi from './renderApi';

// 渲染入口
export function render(vnode: VNode, container: Element) {
  patch(null, vnode, container);
}

// 核心方法 patch
export function patch(oldVNode: VNode | null, newVNode: VNode, container: Element, anchor?: Element) {
  if (oldVNode) {
    // update children: 在 mount 的时候 oldVNode.el 会被赋值,
    // 但是 newVNode 没有 mount 的过程, 所以 el 不会被赋值,所
    // 以, 在更新之前, 应该给 newVNode.el 赋值, 然后再更新
    const el = <Element>(newVNode.el = oldVNode.el);
    updateElement(oldVNode, newVNode, el, anchor);
  } else {
    // mount
    mountElement(newVNode, container, anchor);
  }
}

// 挂载元素
function mountElement(vnode: VNode, container: Element, anchor?: Element) {
  const { type, children, key } = vnode;
  const el = renderApi.create(type);
  vnode.el = el;
  if (typeof children === 'string') {
    // string
    renderApi.setTextContent(el, children);
    key && el.setAttribute('data-key', key);
  } else {
    // array
    mountChildren(children, el);
  }
  renderApi.insert(el, container, anchor);
}

// 挂载所有子节点到元素中
function mountChildren(children: Array<VNode>, container: Element): void {
  for (const vnode of children) {
    patch(null, vnode, container);
  }
}

// 卸载元素所有子节点
function unmountChildren(children: Array<VNode>): void {
  for (const vnode of children) {
    renderApi.remove(<Element>vnode.el);
  }
}

// 更新元素
function updateElement(oldVNode: VNode, newVNode: VNode, container: Element, anchor?: Element) {
  // updateProps(....)
  const c1 = oldVNode.children;
  const c2 = newVNode.children;
  if (c1 === c2) {
    // 不相同才需要更新
    return;
  }

  // string
  if (typeof c2 === 'string') {
    typeof c1 !== 'string' && unmountChildren(c1);
    c1 !== c2 && renderApi.setTextContent(container, c2);
    return;
  }

  // Array
  if (typeof c1 === 'string') {
    renderApi.setTextContent(container, '');
    mountChildren(c2, container);
  } else {
    // minimum update by diff computation
    patchKeyedChildren(c1, c2, container, anchor);
  }
}

/**
 * 获取最长递增子序列(返回key) LIS
 * 传入: [6,3,5,8,4,9] 输出: 1,2,3,5 -> 其对应的值就是 3,5,8,9
 * 找最长的数值往上增的子序列
 */
function getSequence(arr: number[]): number[] {
  const p = arr.slice();
  const result = [0];
  let i: number, j: number, u: number, v: number, c: number;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}

// diff 算法核心: https://github.com/vuejs/core/blob/main/packages/runtime-core/src/renderer.ts#L1750
function patchKeyedChildren(c1: Array<VNode>, c2: Array<VNode>, container: Element, parentAnchor?: Element) {
  // 判断是否是相同的 vnode
  const isSameVNode = (oldVNode: VNode, newVNode: VNode): boolean => {
    return Boolean(oldVNode.type === newVNode.type && oldVNode.key === newVNode.key);
  };

  const l1 = c1.length;
  const l2 = c2.length;
  let i = 0;

  // 第一步: 从左向右对比更新
  // (a b) c
  // (a b) d e
  while (i < l1 && i < l2) {
    const n1 = c1[i];
    const n2 = c2[i];
    if (!isSameVNode(n1, n2)) {
      break;
    }
    console.info('[left-patch]递归:' + n1.key);
    patch(n1, n2, container);
    i++;
  }

  // 第二步: 有右向左对比更新
  // a (b c)
  // d e (b c)
  let e1 = l1 - 1;
  let e2 = l2 - 1;
  while (i <= e1 && i <= e2) {
    const n1 = c1[e1];
    const n2 = c2[e2];
    if (!isSameVNode(n1, n2)) {
      break;
    }
    console.info('[right-patch]递归:' + n1.key);
    patch(n1, n2, container);
    e1--;
    e2--;
  }

  // 新增/删除
  if (i > e1 && i <= e2) {
    // 第三步: 新增(需要计算插入的位置)
    // (a b)
    // (a b) c
    // 右侧新增: i = 2, e1 = 1, e2 = 2
    // (a b)
    // c (a b)
    // 左侧新增: i = 0, e1 = -1, e2 = 0
    const insertPos = e2 + 1;
    const anchor = insertPos < l2 ? <Element>c2[insertPos].el : parentAnchor;
    while (i <= e2) {
      console.info('[create-1]创建:' + c2[i].key);
      patch(null, c2[i], container, anchor);
      i++;
    }
  } else if (i > e2 && i <= e1) {
    // 第四步: 删除(删除多余的老节点)
    // 4. common sequence + unmount
    // (a b) c
    // (a b)
    // i = 2, e1 = 2, e2 = 1
    // a (b c)
    // (b c)
    // i = 0, e1 = 0, e2 = -1
    while (i <= e1) {
      console.info('[remove-1]删除:' + c1[i].key);
      renderApi.remove(<Element>c1[i].el);
      i++;
    }
  } else {
    // 第五步: 左右两边都对比完了,处理中间乱序乱序部分
    // [i ... e1 + 1]: a b [c d e x] f g
    // [i ... e2 + 1]: a b [e d c h] f g
    // i = 2, e1 = 4, e2 = 5
    // 分为三种情况: 移动(ec)/新增(h)/删除(x)
    let s1 = i;
    let s2 = i;

    // 5.1 为新子节点构建 key:index 映射
    const keyToNewIndexMap = new Map();
    for (let i = s2; i <= e2; i++) {
      keyToNewIndexMap.set(c2[i].key, i);
    }

    // 5.2 循环遍历剩余需要修补的旧子节点并尝试修补匹配的节点，同时删除不需要存在的节点
    let patched = 0; // 已经处理的个数
    let toBePatched = e2 - s2 + 1; // 待处理的个数
    let newIndexSoFar = 0; // 判断是否
    let moved = false; // 是否有节点需要移动位置
    const newIndexToOldIndexMap = new Array(toBePatched);
    for (let i = 0; i < toBePatched; i++) {
      newIndexToOldIndexMap[i] = 0;
    }

    // 遍历老节点, 根据key找新节点, 然后 patch 或者移除
    let newIndex: number | undefined;
    for (let i = s1; i <= e1; i++) {
      const prevChild = c1[i];
      if (patched >= toBePatched) {
        console.info('[remove-2]删除:' + prevChild.key);
        renderApi.remove(<Element>prevChild.el);
        continue;
      }

      // 如果有key,就根据key找, 没有就遍历所有找 index
      if (prevChild.key != null) {
        newIndex = keyToNewIndexMap.get(prevChild.key);
      } else {
        for (let j = s2; j <= e2; j++) {
          if (isSameVNode(prevChild, c2[j])) {
            newIndex = j;
            break;
          }
        }
      }

      // 5.3 判断newIndex是否有值,有值证明需要移动,没有值证明
      if (newIndex === undefined) {
        console.info('[remove-3]删除:' + prevChild.key);
        renderApi.remove(<Element>prevChild.el);
      } else {
        // 判断是否需要移动
        if (<number>newIndex >= newIndexSoFar) {
          newIndexSoFar = <number>newIndex;
        } else {
          moved = true;
        }
        newIndexToOldIndexMap[<number>newIndex - s2] = i + 1;

        // 递归对比
        console.info('[middle-patch]递归:' + prevChild.key);
        patch(prevChild, c2[<number>newIndex], container);
        patched++;
      }
    }

    // 移动并挂载, 只有节点移动时，才会生成最长稳定子序列
    const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
    let j = increasingNewIndexSequence.length - 1;
    for (let i = toBePatched - 1; i >= 0; i--) {
      const nextIndex = i + s2;
      const nextChild = c2[nextIndex];
      const anchorIndex = nextIndex + 1;
      const anchorDOM = anchorIndex < l2 ? <Element>c2[anchorIndex].el : undefined;

      if (newIndexToOldIndexMap[i] === 0) {
        console.info('[create-2]创建:' + nextChild.key);
        patch(null, nextChild, container, anchorDOM);
      } else if (moved) {
        if (j < 0 || i !== increasingNewIndexSequence[j]) {
          console.info('[move-1]移动:' + nextChild.key);
          renderApi.insert(<Element>nextChild.el, container, anchorDOM);
        } else {
          j--;
        }
      }
    }
  }
}
